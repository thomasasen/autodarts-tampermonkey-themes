// ==UserScript==
// @name         Autodarts Animate Bull Ripple [Beta]
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0-beta.1
// @description  Zeigt bei Bull-Treffern einen kurzen Ripple-Effekt auf dem virtuellen Board.
// @xconfig-description  Beta: mo.js Ripple/Burst bei Bull-Hits mit Throw-Diffing und fail-soft SVG-Fallback.
// @xconfig-title  Bull Ripple [Beta]
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-bull-ripple
// @xconfig-tech-anchor  animation-autodarts-animate-bull-ripple
// @xconfig-background     assets/animation-checkout-board-targets.gif

// @xconfig-settings-version 1
// @xconfig-beta         true
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/mo.umd.min.js
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Bull%20Ripple%20Beta.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Bull%20Ripple%20Beta.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtBullRippleBeta";
  const previous = window[INSTANCE_KEY];
  if (previous && typeof previous.cleanup === "function") {
    try {
      previous.cleanup();
    } catch (_) {
      // ignore stale instance cleanup
    }
  }

  // xConfig: {"type":"select","label":"Ripple-Stil","description":"Wählt den visuellen Stil für Bull-Hits.","options":[{"value":"burst-ring","label":"Burst + Ring"},{"value":"burst","label":"Nur Burst"},{"value":"ring","label":"Nur Ring"}]}
  const xConfig_RIPPLE_STIL = "burst-ring";
  // xConfig: {"type":"select","label":"Intensität","description":"Bestimmt Radius und Dauer des Ripple-Effekts.","options":[{"value":"dezent","label":"Dezent"},{"value":"standard","label":"Standard"},{"value":"stark","label":"Stark"}]}
  const xConfig_INTENSITAET = "standard";
  // xConfig: {"type":"toggle","label":"Nur Double Bull","description":"Zeigt den Ripple nur für Double-Bull Treffer.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_NUR_DOUBLE_BULL = false;
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

  const shared = window.autodartsAnimationShared || {};
  const gameState = window.autodartsGameStateShared || null;
  const mojsLib = window.mojs || null;

  const ensureStyle = typeof shared.ensureStyle === "function" ? shared.ensureStyle : null;
  const findBoard = typeof shared.findBoard === "function" ? shared.findBoard : null;
  const ensureOverlayGroup = typeof shared.ensureOverlayGroup === "function" ? shared.ensureOverlayGroup : null;
  const clearOverlay = typeof shared.clearOverlay === "function" ? shared.clearOverlay : null;

  const STYLE_ID = "ad-ext-bull-ripple-beta-style";
  const OVERLAY_ID = "ad-ext-bull-ripple-beta-overlay";

  const STYLE_TEXT = `
#${OVERLAY_ID} .ad-ext-bull-ripple-ring {
  fill: none;
  stroke: rgba(56, 189, 248, 0.92);
  stroke-width: 2.2;
  transform-origin: center;
  animation: adExtBullRippleFallback 620ms cubic-bezier(.2,.75,.2,1) forwards;
  pointer-events: none;
}
@keyframes adExtBullRippleFallback {
  0% { opacity: .95; transform: scale(.3); }
  100% { opacity: 0; transform: scale(2.1); }
}
`;

  const INTENSITY_PRESETS = {
    dezent: { radius: 58, duration: 460 },
    standard: { radius: 74, duration: 560 },
    stark: { radius: 92, duration: 680 },
  };

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalized = String(value || "").trim();
    return allowedValues.includes(normalized) ? normalized : fallbackValue;
  }

  function resolveToggle(value, fallbackValue) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    if (["1", "true", "yes", "on", "aktiv", "active"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off", "inaktiv", "inactive"].includes(normalized)) {
      return false;
    }
    return fallbackValue;
  }

  const RESOLVED_STYLE = resolveStringChoice(xConfig_RIPPLE_STIL, "burst-ring", ["burst-ring", "burst", "ring"]);
  const RESOLVED_INTENSITY = resolveStringChoice(xConfig_INTENSITAET, "standard", ["dezent", "standard", "stark"]);
  const RESOLVED_ONLY_DB = resolveToggle(xConfig_NUR_DOUBLE_BULL, false);
  const RESOLVED_DEBUG = resolveToggle(xConfig_DEBUG, false);
  const INTENSITY = INTENSITY_PRESETS[RESOLVED_INTENSITY] || INTENSITY_PRESETS.standard;

  function debugLog(event, payload) {
    if (!RESOLVED_DEBUG) {
      return;
    }
    if (typeof payload === "undefined") {
      console.log(`[xConfig][Bull Ripple Beta] ${event}`);
      return;
    }
    console.log(`[xConfig][Bull Ripple Beta] ${event}`, payload);
  }

  function classifyBullHit(throwData) {
    if (!throwData || typeof throwData !== "object") {
      return null;
    }

    const values = [
      throwData.segment,
      throwData.bed,
      throwData.ring,
      throwData.field,
      throwData.target,
      throwData.name,
      throwData.hit,
      throwData.type,
      throwData.multiplier,
      throwData.value,
      throwData.score,
    ]
      .map((value) => String(value ?? "").trim().toUpperCase())
      .filter(Boolean)
      .join("|");

    const numericScore = Number(throwData.score);
    const numericValue = Number(throwData.value);
    const numericMultiplier = Number(throwData.multiplier);

    if (
      values.includes("DOUBLE BULL") ||
      values.includes("BULLSEYE") ||
      values.includes("DB") ||
      numericScore === 50 ||
      (numericValue === 25 && numericMultiplier === 2)
    ) {
      return "DB";
    }

    if (
      values.includes("SINGLE BULL") ||
      values.includes("SB") ||
      values.includes("BULL") ||
      numericScore === 25 ||
      numericValue === 25
    ) {
      return "SB";
    }

    return null;
  }

  function getThrowToken(turn, throwData, throwIndex) {
    const base = [
      turn?.id || "",
      turn?.playerId || "",
      Number.isFinite(turn?.round) ? turn.round : "",
      Number.isFinite(turn?.turn) ? turn.turn : "",
      throwData?.id || "",
      throwData?.createdAt || "",
      throwData?.score ?? "",
      throwData?.segment ?? "",
      throwData?.value ?? "",
      throwIndex,
    ];
    return base.join("|");
  }

  function toScreenPoint(board, localPoint) {
    if (!board?.group || !localPoint) {
      return null;
    }
    const svg = board.group.ownerSVGElement || board.svg;
    if (!svg || typeof svg.createSVGPoint !== "function") {
      return null;
    }
    const ctm = typeof board.group.getScreenCTM === "function" ? board.group.getScreenCTM() : null;
    if (!ctm) {
      return null;
    }
    const p = svg.createSVGPoint();
    p.x = localPoint.x;
    p.y = localPoint.y;
    const mapped = p.matrixTransform(ctm);
    if (!Number.isFinite(mapped?.x) || !Number.isFinite(mapped?.y)) {
      return null;
    }
    return { x: mapped.x, y: mapped.y };
  }

  function emitFallbackRing(board, localPoint) {
    if (!ensureOverlayGroup || !clearOverlay) {
      return;
    }
    const overlay = ensureOverlayGroup(board.group, OVERLAY_ID);
    if (!overlay) {
      return;
    }
    clearOverlay(overlay);

    const ring = document.createElementNS(shared.SVG_NS || "http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("cx", String(localPoint.x));
    ring.setAttribute("cy", String(localPoint.y));
    ring.setAttribute("r", String(Math.max(8, board.radius * 0.03)));
    ring.classList.add("ad-ext-bull-ripple-ring");
    overlay.appendChild(ring);

    setManagedTimeout(() => {
      ring.remove();
      if (overlay.childNodes.length === 0) {
        clearOverlay(overlay);
      }
    }, 760);
  }

  function emitMoRipple(board, localPoint) {
    if (!mojsLib || typeof mojsLib.Burst !== "function") {
      return false;
    }

    const screenPoint = toScreenPoint(board, localPoint);
    if (!screenPoint) {
      return false;
    }

    try {
      if (RESOLVED_STYLE !== "ring") {
        const burst = new mojsLib.Burst({
          left: screenPoint.x,
          top: screenPoint.y,
          radius: { 0: INTENSITY.radius },
          count: 12,
          children: {
            shape: ["circle", "line"],
            stroke: ["#67e8f9", "#38bdf8", "#f8fafc"],
            strokeWidth: { 5: 0 },
            radius: { 8: 0 },
            duration: INTENSITY.duration,
            easing: "quad.out",
          },
        });
        burst.replay();
      }

      if (typeof mojsLib.Shape === "function" && RESOLVED_STYLE !== "burst") {
        const ring = new mojsLib.Shape({
          shape: "circle",
          left: screenPoint.x,
          top: screenPoint.y,
          fill: "none",
          stroke: "rgba(56, 189, 248, 0.92)",
          strokeWidth: { 5: 0 },
          radius: { 8: INTENSITY.radius },
          duration: INTENSITY.duration + 80,
          easing: "quad.out",
        });
        ring.replay();
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  function emitBullRipple(hitType) {
    if (RESOLVED_ONLY_DB && hitType !== "DB") {
      return;
    }

    if (typeof findBoard !== "function") {
      return;
    }

    const board = findBoard();
    if (!board?.group) {
      return;
    }

    const jitter = hitType === "SB" ? board.radius * 0.02 : 0;
    const localPoint = {
      x: jitter ? (Math.random() - 0.5) * jitter : 0,
      y: jitter ? (Math.random() - 0.5) * jitter : 0,
    };

    const usedMo = emitMoRipple(board, localPoint);
    if (!usedMo) {
      emitFallbackRing(board, localPoint);
    }

    debugLog("ripple", { hitType, usedMo });
  }

  const state = {
    lastThrowToken: "",
    unsubscribeState: null,
    fallbackIntervalId: 0,
    timeoutIds: new Set(),
    cleanedUp: false,
  };

  function setManagedTimeout(callback, delayMs) {
    const handle = setTimeout(() => {
      state.timeoutIds.delete(handle);
      callback();
    }, Math.max(0, Number(delayMs) || 0));
    state.timeoutIds.add(handle);
    return handle;
  }

  function processLatestThrow() {
    const turn = typeof gameState?.getActiveTurn === "function" ? gameState.getActiveTurn() : null;
    const throws = typeof gameState?.getActiveThrows === "function" ? gameState.getActiveThrows() : [];
    if (!turn || !Array.isArray(throws) || throws.length === 0) {
      return;
    }

    const index = throws.length - 1;
    const lastThrow = throws[index];
    const throwToken = getThrowToken(turn, lastThrow, index);
    if (!throwToken || throwToken === state.lastThrowToken) {
      return;
    }
    state.lastThrowToken = throwToken;

    const hitType = classifyBullHit(lastThrow);
    if (!hitType) {
      return;
    }

    emitBullRipple(hitType);
  }

  function cleanup() {
    if (state.cleanedUp) {
      return;
    }
    state.cleanedUp = true;

    if (typeof state.unsubscribeState === "function") {
      state.unsubscribeState();
      state.unsubscribeState = null;
    }

    if (state.fallbackIntervalId) {
      clearInterval(state.fallbackIntervalId);
      state.fallbackIntervalId = 0;
    }

    state.timeoutIds.forEach((handle) => clearTimeout(handle));
    state.timeoutIds.clear();

    window.removeEventListener("beforeunload", cleanup);
    window.removeEventListener("pagehide", cleanup);

    if (typeof findBoard === "function" && ensureOverlayGroup && clearOverlay) {
      const board = findBoard();
      if (board?.group) {
        clearOverlay(ensureOverlayGroup(board.group, OVERLAY_ID));
      }
    }

    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].cleanup === cleanup) {
      delete window[INSTANCE_KEY];
    }
  }

  if (typeof ensureStyle === "function") {
    ensureStyle(STYLE_ID, STYLE_TEXT);
  }

  if (gameState && typeof gameState.subscribe === "function") {
    state.unsubscribeState = gameState.subscribe(processLatestThrow);
  } else {
    state.fallbackIntervalId = setInterval(processLatestThrow, 1200);
  }

  window.addEventListener("beforeunload", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });

  window[INSTANCE_KEY] = {
    cleanup,
  };

  debugLog("init", {
    style: RESOLVED_STYLE,
    intensity: RESOLVED_INTENSITY,
    onlyDoubleBull: RESOLVED_ONLY_DB,
    usesMojs: Boolean(mojsLib && typeof mojsLib.Burst === "function"),
  });
})();


