(function (global) {
  "use strict";

  if (
    global.autodartsGameStateShared &&
    global.autodartsGameStateShared.__initialized
  ) {
    return;
  }

  // Shared runtime state helper for userscripts.
  // It listens to websocket match payloads and offers safe read helpers
  // with DOM-based fallbacks.

  const CHANNEL_MATCHES = "autodarts.matches";

  const state = {
    match: null,
    updatedAt: 0,
    source: "none",
  };

  const subscribers = new Set();
  let interceptionInstalled = false;

  function safeClone(value) {
    if (value === null || value === undefined) {
      return value;
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function readVariantFromDom() {
    const variantEl = document.getElementById("ad-ext-game-variant");
    return variantEl?.textContent?.trim() || "";
  }

  function normalizeVariant(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getVariant() {
    const matchVariant = state.match?.variant;
    if (matchVariant) {
      return String(matchVariant);
    }
    return readVariantFromDom();
  }

  function getVariantNormalized() {
    return normalizeVariant(getVariant());
  }

  function isX01Variant(options = {}) {
    const variant = getVariantNormalized();
    if (!variant) {
      return Boolean(options.allowMissing || options.allowEmpty);
    }
    if (variant.includes("x01")) {
      return true;
    }
    if (options.allowNumeric) {
      return /\b\d+01\b/.test(variant);
    }
    return false;
  }

  function isCricketVariant(options = {}) {
    const variant = getVariantNormalized();
    if (!variant) {
      return Boolean(options.allowMissing || options.allowEmpty);
    }
    return variant === "cricket" || variant.startsWith("cricket ");
  }

  function getActivePlayerIndex() {
    const idx = state.match?.player;
    return Number.isFinite(idx) ? idx : null;
  }

  function getActivePlayerId() {
    const match = state.match;
    const idx = getActivePlayerIndex();
    if (!match || !Array.isArray(match.players) || !Number.isFinite(idx)) {
      return null;
    }
    const player = match.players[idx];
    const id = player && player.id;
    return id ? String(id) : null;
  }

  function parseTimestamp(value) {
    if (!value) {
      return 0;
    }
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : 0;
  }

  function selectNewestTurn(candidates) {
    if (!Array.isArray(candidates) || !candidates.length) {
      return null;
    }
    return candidates.reduce((best, candidate) => {
      if (!best) {
        return candidate;
      }
      const candidateRound = Number.isFinite(candidate?.round) ? candidate.round : -1;
      const bestRound = Number.isFinite(best?.round) ? best.round : -1;
      if (candidateRound !== bestRound) {
        return candidateRound > bestRound ? candidate : best;
      }
      const candidateTurn = Number.isFinite(candidate?.turn) ? candidate.turn : -1;
      const bestTurn = Number.isFinite(best?.turn) ? best.turn : -1;
      if (candidateTurn !== bestTurn) {
        return candidateTurn > bestTurn ? candidate : best;
      }
      const candidateTs = parseTimestamp(candidate?.createdAt);
      const bestTs = parseTimestamp(best?.createdAt);
      return candidateTs >= bestTs ? candidate : best;
    }, null);
  }

  function getActiveTurn() {
    const match = state.match;
    const turns = match?.turns;
    if (!Array.isArray(turns) || !turns.length) {
      return null;
    }

    const activePlayerId = getActivePlayerId();
    const unfinished = turns.filter((turn) => {
      if (!turn || typeof turn !== "object") {
        return false;
      }
      const finishedAt = String(turn.finishedAt || "").trim();
      return !finishedAt;
    });

    const unfinishedActive = activePlayerId
      ? unfinished.filter((turn) => String(turn.playerId || "") === activePlayerId)
      : [];
    const unfinishedPick = selectNewestTurn(unfinishedActive) || selectNewestTurn(unfinished);
    if (unfinishedPick) {
      return unfinishedPick;
    }

    const activeTurns = activePlayerId
      ? turns.filter((turn) => turn && String(turn.playerId || "") === activePlayerId)
      : [];
    return selectNewestTurn(activeTurns) || selectNewestTurn(turns) || turns[0];
  }

  function getActiveThrows() {
    const turn = getActiveTurn();
    if (!turn || !Array.isArray(turn.throws)) {
      return [];
    }
    return turn.throws;
  }

  function getActiveScore() {
    const match = state.match;
    const playerIdx = getActivePlayerIndex();
    const gameScores = match?.gameScores;
    if (Array.isArray(gameScores) && Number.isFinite(playerIdx)) {
      const gameScore = gameScores[playerIdx];
      if (Number.isFinite(gameScore)) {
        return gameScore;
      }
    }

    const turn = getActiveTurn();
    if (!turn) {
      return null;
    }
    const score = turn.score;
    return Number.isFinite(score) ? score : null;
  }

  function getOutMode() {
    const outMode = state.match?.settings?.outMode;
    return outMode ? String(outMode) : "";
  }

  function getCricketMode() {
    const mode = state.match?.settings?.mode;
    return mode ? String(mode) : "";
  }

  function emitUpdate() {
    const snapshot = getState();
    subscribers.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        // Keep runtime robust; ignore subscriber failures.
      }
    });
  }

  function applyMatch(match, source = "websocket") {
    if (!match || typeof match !== "object") {
      return;
    }
    state.match = match;
    state.updatedAt = Date.now();
    state.source = source;
    emitUpdate();
  }

  function processMessageData(rawData) {
    if (typeof rawData !== "string") {
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (error) {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (parsed.channel === CHANNEL_MATCHES && parsed.data && !parsed.data.body) {
      applyMatch(parsed.data, "websocket");
    }
  }

  function installWebSocketInterception() {
    if (interceptionInstalled) {
      return;
    }
    interceptionInstalled = true;

    try {
      const descriptor = Object.getOwnPropertyDescriptor(
        MessageEvent.prototype,
        "data"
      );
      if (!descriptor || typeof descriptor.get !== "function") {
        return;
      }

      const originalGetter = descriptor.get;
      descriptor.get = function getInterceptedMessageData() {
        const value = originalGetter.call(this);
        try {
          if (this.currentTarget instanceof WebSocket) {
            processMessageData(value);
          }
        } catch (error) {
          // Keep getter behavior unaffected for page scripts.
        }
        return value;
      };

      Object.defineProperty(MessageEvent.prototype, "data", descriptor);
    } catch (error) {
      // Fail-soft: helper continues to work with DOM fallbacks only.
    }
  }

  function getState() {
    return {
      match: safeClone(state.match),
      updatedAt: state.updatedAt,
      source: state.source,
    };
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }

  installWebSocketInterception();

  global.autodartsGameStateShared = {
    __initialized: true,
    getState,
    subscribe,
    getVariant,
    getVariantNormalized,
    isX01Variant,
    isCricketVariant,
    getOutMode,
    getCricketMode,
    getActivePlayerIndex,
    getActiveTurn,
    getActiveThrows,
    getActiveScore,
    applyMatch,
  };
})(typeof window !== "undefined" ? window : globalThis);
