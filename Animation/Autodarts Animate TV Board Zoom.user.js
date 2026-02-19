// ==UserScript==
// @name         Autodarts Animate TV Board Zoom
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.22
// @description  Simuliert TV-ähnliche Board-Zooms vor dem dritten Dart in X01 (strict). Nur mit dem "virtuellen Dartboard"; nicht mit dem "Live Dartboard".
// @xconfig-description  WICHTIG: Funktioniert nur mit dem "virtuellen Dartboard" und nicht mit dem "Live Dartboard". Zoomt in X01 wie eine TV-Übertragung auf wahrscheinliche Zielbereiche vor Dart 3 (strict: T20,T20 oder klarer 1-Dart-Checkout).
// @xconfig-variant      x01
// @xconfig-readme-anchor  animation-autodarts-animate-tv-board-zoom
// @xconfig-background     assets/animation-Autodarts-Animate-TV-Board-Zoom.gif
// @xconfig-settings-version 8
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20TV%20Board%20Zoom.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20TV%20Board%20Zoom.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtTvBoardZoomInstance";
  const existingInstance = window[INSTANCE_KEY];
  if (existingInstance && typeof existingInstance.cleanup === "function") {
    try {
      existingInstance.cleanup();
    } catch (_) {
      // Ignore stale instance cleanup errors.
    }
  }

  const {
    ensureStyle,
    createRafScheduler,
    observeMutations,
    findBoard,
    segmentAngles,
    isX01Variant,
  } = window.autodartsAnimationShared;

  const gameStateShared = window.autodartsGameStateShared || null;

  // xConfig: {"type":"select","label":"Zoom-Stufe","description":"Bestimmt, wie nah das Board herangezoomt wird.","options":[{"value":"2.35","label":"Dezent (2.35x)"},{"value":"2.75","label":"Mittel (2.75x)"},{"value":"3.15","label":"Nah (3.15x)"}]}
  const xConfig_ZOOM_STUFE = "2.75";
  // xConfig: {"type":"select","label":"Zoom-Geschwindigkeit","description":"Legt fest, wie schnell Ein- und Auszoom-Animation laufen.","options":[{"value":"schnell","label":"Schnell"},{"value":"mittel","label":"Mittel"},{"value":"langsam","label":"Langsam"}]}
  const xConfig_ZOOM_GESCHWINDIGKEIT = "mittel";
  // xConfig: {"type":"toggle","label":"Checkout-Zoom","description":"Aktiviert Zoom bei eindeutigem 1-Dart-Checkout (D1-D20/BULL).","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_CHECKOUT_ZOOM = true;

  const RING_RATIOS = {
    outerBullInner: 0.031112,
    outerBullOuter: 0.075556,
    tripleInner: 0.431112,
    tripleOuter: 0.475556,
    doubleInner: 0.711112,
    doubleOuter: 0.755556,
  };

  const ZOOM_SPEED_PRESETS = {
    schnell: {
      zoomInMs: 140,
      zoomOutMs: 180,
      holdAfterThirdMs: 320,
    },
    mittel: {
      zoomInMs: 180,
      zoomOutMs: 220,
      holdAfterThirdMs: 450,
    },
    langsam: {
      zoomInMs: 240,
      zoomOutMs: 300,
      holdAfterThirdMs: 620,
    },
  };

  const RESOLVED_ZOOM_SPEED = resolveStringChoice(
    xConfig_ZOOM_GESCHWINDIGKEIT,
    "mittel",
    ["schnell", "mittel", "langsam"]
  );
  const ZOOM_SPEED = ZOOM_SPEED_PRESETS[RESOLVED_ZOOM_SPEED] || ZOOM_SPEED_PRESETS.mittel;

  const CONFIG = {
    zoomLevel: resolveNumberChoice(xConfig_ZOOM_STUFE, 2.75, [2.35, 2.75, 3.15]),
    zoomInMs: ZOOM_SPEED.zoomInMs,
    zoomOutMs: ZOOM_SPEED.zoomOutMs,
    holdAfterThirdMs: ZOOM_SPEED.holdAfterThirdMs,
    checkoutZoomEnabled: resolveToggle(xConfig_CHECKOUT_ZOOM, true),
    minEffectiveZoom: 1.5,
    maxEffectiveZoom: 4.4,
    focusBoxMinX: 0.14,
    focusBoxMaxX: 0.86,
    focusBoxMinY: 0.1,
    focusBoxMaxY: 0.88,
    // Generic profile fallback (non-special cases)
    centerAnchorBaseX: 0.47,
    centerAnchorBaseY: 0.52,
    centerAnchorGainX: 0.1,
    centerAnchorGainY: 0.06,
    centerAnchorMinX: 0.38,
    centerAnchorMaxX: 0.62,
    centerAnchorMinY: 0.42,
    centerAnchorMaxY: 0.66,
    targetBiasX: 0.35,
    targetBiasY: 0.45,
    targetAnchorBaseX: 0.5,
    targetAnchorBaseY: 0.56,
    targetAnchorGainX: 0.08,
    targetAnchorGainY: 0.1,
    targetAnchorMinX: 0.42,
    targetAnchorMaxX: 0.58,
    targetAnchorMinY: 0.44,
    targetAnchorMaxY: 0.72,
    // T20 setup exception: horizontal target-center like TV close-up
    t20CenterAnchorBaseX: 0.43,
    t20CenterAnchorBaseY: 0.52,
    t20CenterAnchorGainX: 0.12,
    t20CenterAnchorGainY: 0.06,
    t20CenterAnchorMinX: 0.34,
    t20CenterAnchorMaxX: 0.58,
    t20CenterAnchorMinY: 0.42,
    t20CenterAnchorMaxY: 0.64,
    t20TargetBiasX: 1,
    t20TargetBiasY: 0.8,
    t20TargetAnchorBaseX: 0.5,
    t20TargetAnchorBaseY: 0.56,
    t20TargetAnchorGainX: 0,
    t20TargetAnchorGainY: 0.08,
    t20TargetAnchorMinX: 0.5,
    t20TargetAnchorMaxX: 0.5,
    t20TargetAnchorMinY: 0.46,
    t20TargetAnchorMaxY: 0.74,
    t20LockTargetX: true,
    t20LockTargetY: false,
    // Checkout doubles: inward + slightly lower framing for upper doubles (e.g. D12)
    checkoutDoubleCenterAnchorBaseX: 0.5,
    checkoutDoubleCenterAnchorBaseY: 0.58,
    checkoutDoubleCenterAnchorGainX: 0.14,
    checkoutDoubleCenterAnchorGainY: 0.1,
    checkoutDoubleCenterAnchorMinX: 0.34,
    checkoutDoubleCenterAnchorMaxX: 0.66,
    checkoutDoubleCenterAnchorMinY: 0.38,
    checkoutDoubleCenterAnchorMaxY: 0.72,
    checkoutDoubleTargetBiasX: 0.82,
    checkoutDoubleTargetBiasY: 1,
    checkoutDoubleTargetAnchorBaseX: 0.5,
    checkoutDoubleTargetAnchorBaseY: 0.66,
    checkoutDoubleTargetAnchorGainX: 0.1,
    checkoutDoubleTargetAnchorGainY: 0.2,
    checkoutDoubleTargetAnchorMinX: 0.4,
    checkoutDoubleTargetAnchorMaxX: 0.6,
    checkoutDoubleTargetAnchorMinY: 0.44,
    checkoutDoubleTargetAnchorMaxY: 0.84,
    checkoutDoubleLockTargetX: false,
    checkoutDoubleLockTargetY: true,
    bullCenterAnchorBaseX: 0.5,
    bullCenterAnchorBaseY: 0.5,
    bullCenterAnchorGainX: 0.05,
    bullCenterAnchorGainY: 0.05,
    bullCenterAnchorMinX: 0.42,
    bullCenterAnchorMaxX: 0.58,
    bullCenterAnchorMinY: 0.42,
    bullCenterAnchorMaxY: 0.58,
    bullTargetBiasX: 0.5,
    bullTargetBiasY: 0.5,
    bullTargetAnchorBaseX: 0.5,
    bullTargetAnchorBaseY: 0.52,
    bullTargetAnchorGainX: 0.03,
    bullTargetAnchorGainY: 0.03,
    bullTargetAnchorMinX: 0.45,
    bullTargetAnchorMaxX: 0.55,
    bullTargetAnchorMinY: 0.45,
    bullTargetAnchorMaxY: 0.6,
    bullLockTargetX: false,
    bullLockTargetY: false,
    lockTargetX: false,
    lockTargetY: false,
    slackRebalanceFactor: 0.2,
    t20SlackRebalanceFactor: 0.14,
    checkoutDoubleSlackRebalanceFactor: 0.18,
    bullSlackRebalanceFactor: 0.24,
    easingIn: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    easingOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const STYLE_ID = "ad-ext-tv-board-zoom-style";
  const ZOOM_CLASS = "ad-ext-tv-board-zoom";
  const ZOOM_HOST_CLASS = "ad-ext-tv-board-zoom-host";
  const STRICT_ACTIVE_REMAINING_SCORE_SELECTOR =
    "#ad-ext-player-display .ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score.css-1r7jzhg, " +
    "#ad-ext-player-display .ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score.css-18w03sn, " +
    ".ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score.css-1r7jzhg, " +
    ".ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score.css-18w03sn";
  const ACTIVE_REMAINING_SCORE_SELECTOR =
    "#ad-ext-player-display .ad-ext-player.ad-ext-player-active p.ad-ext-player-score, " +
    ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, " +
    ".ad-ext-player-active p.ad-ext-player-score";
  const FALLBACK_REMAINING_SCORE_SELECTOR = "p.ad-ext-player-score";

  const STYLE_TEXT = `
.${ZOOM_CLASS} {
  will-change: transform;
  transform-origin: 0 0;
}

.${ZOOM_HOST_CLASS} {
  overflow: hidden !important;
}
`;

  const state = {
    lastTurnId: "",
    lastThrowCount: 0,
    holdUntilTs: 0,
    activeZoomIntent: null,
    zoomedElement: null,
    zoomHost: null,
    lastAppliedTransform: "",
    dismissedTurnId: "",
    dismissedThrowCount: -1,
    dismissedUntilTs: 0,
    releaseTimeoutId: 0,
  };

  const originalStyleCache = new WeakMap();
  const originalHostStyleCache = new WeakMap();

  function resolveToggle(value, fallbackValue) {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === 1 || value === "1") {
      return true;
    }
    if (value === 0 || value === "0") {
      return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "on", "aktiv", "active"].includes(normalized)) {
        return true;
      }
      if (["false", "no", "off", "inaktiv", "inactive"].includes(normalized)) {
        return false;
      }
    }
    return fallbackValue;
  }

  function resolveNumberChoice(value, fallbackValue, allowedValues) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
      ? numericValue
      : fallbackValue;
  }

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalizedValue = String(value || "").trim().toLowerCase();
    return allowedValues.includes(normalizedValue)
      ? normalizedValue
      : fallbackValue;
  }

  function parseViewBox(svg) {
    const base = svg?.viewBox?.baseVal;
    if (base && Number.isFinite(base.width) && base.width > 0) {
      return {
        x: Number(base.x),
        y: Number(base.y),
        width: Number(base.width),
        height: Number(base.height),
      };
    }

    const raw = String(svg?.getAttribute("viewBox") || "").trim();
    if (raw) {
      const parts = raw.split(/[,\s]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
        return {
          x: parts[0],
          y: parts[1],
          width: parts[2],
          height: parts[3],
        };
      }
    }

    return {
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
    };
  }

  function getBoardMetrics(board) {
    const svg = board?.svg;
    const group = board?.group || svg;
    const viewBox = parseViewBox(svg);

    let center = {
      x: viewBox.x + viewBox.width / 2,
      y: viewBox.y + viewBox.height / 2,
    };
    let radius = Math.min(viewBox.width, viewBox.height) / 2;

    if (Number.isFinite(board?.radius) && board.radius > 0) {
      radius = Number(board.radius);
    }

    if (group?.transform?.baseVal) {
      try {
        const localTransform = group.transform.baseVal.consolidate()?.matrix;
        if (localTransform) {
          const translatedX = Number(localTransform.e);
          const translatedY = Number(localTransform.f);
          if (Number.isFinite(translatedX) && Number.isFinite(translatedY)) {
            center = { x: translatedX, y: translatedY };
          }

          const scaleX = Math.hypot(localTransform.a, localTransform.b);
          const scaleY = Math.hypot(localTransform.c, localTransform.d);
          const scale =
            Number.isFinite(scaleX) && Number.isFinite(scaleY)
              ? (scaleX + scaleY) / 2
              : 1;
          if (scale > 0) {
            radius *= scale;
          }
        }
      } catch (_) {
        // fail-soft
      }
    }

    return { viewBox, center, radius };
  }

  function normalizeSegmentName(name) {
    const raw = String(name || "").trim().toUpperCase();
    if (!raw) {
      return "";
    }

    if (
      raw === "BULL" ||
      raw === "BULLSEYE" ||
      raw === "DBULL" ||
      raw === "DB" ||
      raw === "50"
    ) {
      return "BULL";
    }

    const direct = raw.match(/^([SDT])\s*(\d{1,2})$/);
    if (direct) {
      const value = Number(direct[2]);
      if (value >= 1 && value <= 20) {
        return `${direct[1]}${value}`;
      }
    }

    if (/^\d{1,2}$/.test(raw)) {
      const value = Number(raw);
      if (value >= 1 && value <= 20) {
        return `S${value}`;
      }
    }

    return raw;
  }

  function getThrowSegmentName(throwEntry) {
    const fromSegment = throwEntry?.segment?.name;
    if (fromSegment) {
      return normalizeSegmentName(fromSegment);
    }
    return normalizeSegmentName(throwEntry?.entry);
  }

  function getTurnId(turn) {
    const id = String(turn?.id || "").trim();
    if (id) {
      return id;
    }

    const round = Number.isFinite(turn?.round) ? turn.round : -1;
    const turnNumber = Number.isFinite(turn?.turn) ? turn.turn : -1;
    const playerId = String(turn?.playerId || "").trim();
    return `fallback:${round}:${turnNumber}:${playerId}`;
  }

  function toViewBoxCoordFromThrowCoord(value, axisLength, axisOffset) {
    const normalized1000 = value * (1000 / 3) + 500;
    return axisOffset + (normalized1000 / 1000) * axisLength;
  }

  function getCenterFromThrowCoords(throws, viewBox) {
    const coords = throws
      .slice(0, 2)
      .map((entry) => entry?.coords)
      .filter((coordsEntry) =>
        Number.isFinite(coordsEntry?.x) && Number.isFinite(coordsEntry?.y)
      );

    if (coords.length < 2) {
      return null;
    }

    const avgX = (coords[0].x + coords[1].x) / 2;
    const avgY = (coords[0].y + coords[1].y) / 2;

    return {
      x: toViewBoxCoordFromThrowCoord(avgX, viewBox.width, viewBox.x),
      y: toViewBoxCoordFromThrowCoord(avgY, viewBox.height, viewBox.y),
    };
  }

  function segmentFallbackPoint(segmentName, boardMetrics) {
    const normalized = normalizeSegmentName(segmentName);
    if (!normalized) {
      return null;
    }

    if (normalized === "BULL") {
      return {
        x: boardMetrics.center.x,
        y: boardMetrics.center.y,
      };
    }

    const match = normalized.match(/^([SDT])(\d{1,2})$/);
    if (!match) {
      return null;
    }

    const ring = match[1];
    const value = Number(match[2]);
    if (!Number.isFinite(value) || value < 1 || value > 20) {
      return null;
    }

    const angles = segmentAngles(value);
    if (!angles) {
      return null;
    }

    const centerAngle = (angles.start + angles.end) / 2;
    const radians = (centerAngle * Math.PI) / 180;

    let ratio = 0.5;
    if (ring === "T") {
      ratio = (RING_RATIOS.tripleInner + RING_RATIOS.tripleOuter) / 2;
    } else if (ring === "D") {
      ratio = (RING_RATIOS.doubleInner + RING_RATIOS.doubleOuter) / 2;
    } else {
      ratio = (RING_RATIOS.outerBullOuter + RING_RATIOS.tripleInner) / 2;
    }

    const radial = boardMetrics.radius * ratio;
    return {
      x: boardMetrics.center.x + radial * Math.sin(radians),
      y: boardMetrics.center.y - radial * Math.cos(radians),
    };
  }

  function getCheckoutTargetSegment(score) {
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore)) {
      return "";
    }
    if (numericScore === 50) {
      return "BULL";
    }
    if (numericScore >= 2 && numericScore <= 40 && numericScore % 2 === 0) {
      return `D${numericScore / 2}`;
    }
    return "";
  }

  function isOneDartCheckoutSegment(segmentName) {
    const normalized = normalizeSegmentName(segmentName);
    return normalized === "BULL" || /^D([1-9]|1\d|20)$/.test(normalized);
  }

  function getSuggestionTexts() {
    return Array.from(document.querySelectorAll(".suggestion"))
      .map((element) => String(element?.textContent || "").trim())
      .filter((text) => Boolean(text));
  }

  function getSuggestionText() {
    return getSuggestionTexts()[0] || "";
  }

  function isElementVisible(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }
    return true;
  }

  function parseExplicitSegments(text) {
    const raw = String(text || "").toUpperCase();
    if (!raw) {
      return [];
    }

    const tokens = raw.match(/\b(?:DB|BULLSEYE|BULL|[TDS](?:[1-9]|1\d|20))\b/g) || [];
    return tokens
      .map((token) => {
        if (token === "DB" || token === "BULLSEYE" || token === "BULL") {
          return "BULL";
        }
        return normalizeSegmentName(token);
      })
      .filter((segment) => Boolean(segment));
  }

  function getSuggestionCheckoutSegment() {
    const texts = getSuggestionTexts();
    if (!texts.length) {
      const fallbackText = getSuggestionText();
      if (fallbackText) {
        texts.push(fallbackText);
      }
    }

    for (const text of texts) {
      const explicitSegments = parseExplicitSegments(text);
      if (explicitSegments.length !== 1) {
        continue;
      }
      const segment = explicitSegments[0];
      if (isOneDartCheckoutSegment(segment)) {
        return segment;
      }
    }
    return "";
  }

  // Fallback when `.suggestion` is unavailable: read explicit checkout segment
  // from visible top-band UI labels (e.g. "34" + "D17").
  function getTopBandCheckoutSegment() {
    const topLimit = window.innerHeight * 0.45;
    const centerX = window.innerWidth / 2;
    let best = null;

    const candidates = Array.from(document.querySelectorAll("div, span, p"));
    for (const element of candidates) {
      if (!isElementVisible(element)) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.top > topLimit || rect.bottom < 0) {
        continue;
      }

      const text = String(element.textContent || "").trim();
      if (!text || text.length > 24) {
        continue;
      }

      const explicitSegments = parseExplicitSegments(text);
      if (explicitSegments.length !== 1) {
        continue;
      }

      const segment = explicitSegments[0];
      if (!isOneDartCheckoutSegment(segment)) {
        continue;
      }

      const distanceToCenter = Math.abs(rect.left + rect.width / 2 - centerX);
      if (!best || distanceToCenter < best.distanceToCenter) {
        best = { segment, distanceToCenter };
      }
    }

    return best?.segment || "";
  }

  function getCheckoutSegmentFromScoreSources() {
    // Checkout zoom is strictly based on remaining score (no suggestion parsing).
    // Use visible player score only; shared game score can be stale in some views.
    const domRemainingScore = getActiveRemainingScoreFromDom();
    if (!Number.isFinite(domRemainingScore)) {
      return "";
    }

    const segment = getCheckoutTargetSegment(domRemainingScore);
    return segment && isOneDartCheckoutSegment(segment) ? segment : "";
  }

  function isSensibleThirdT20Score(remainingScore) {
    if (!Number.isFinite(remainingScore)) {
      // If score cannot be resolved, keep legacy strict fallback behavior.
      return true;
    }
    // In double-out, a third T20 (60) is pointless if it busts the leg.
    // Bust happens for remaining scores below 62 (<=61).
    return remainingScore >= 62;
  }

  function parseScoreText(text) {
    const raw = String(text || "");
    const match = raw.match(/-?\d+/);
    if (!match) {
      return Number.NaN;
    }
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  function pickBestScoreFromNodes(nodes) {
    let bestCandidate = null;
    for (const node of nodes || []) {
      if (!isElementVisible(node)) {
        continue;
      }
      const value = parseScoreText(node?.textContent);
      if (!Number.isFinite(value) || value < 0) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const area =
        Number.isFinite(rect?.width) && Number.isFinite(rect?.height)
          ? rect.width * rect.height
          : 0;
      let fontSize = 0;
      try {
        fontSize = Number.parseFloat(window.getComputedStyle(node).fontSize) || 0;
      } catch (_) {
        // fail-soft
      }

      // Prefer the visually dominant score node in the active player card.
      const weight = fontSize * 10000 + area;
      if (!bestCandidate || weight > bestCandidate.weight) {
        bestCandidate = { value, weight };
      }
    }
    return bestCandidate?.value ?? Number.NaN;
  }

  function getActiveRemainingScoreFromDom() {
    const strictActiveValue = pickBestScoreFromNodes(
      document.querySelectorAll(STRICT_ACTIVE_REMAINING_SCORE_SELECTOR)
    );
    if (Number.isFinite(strictActiveValue)) {
      return strictActiveValue;
    }

    const activeValue = pickBestScoreFromNodes(
      document.querySelectorAll(ACTIVE_REMAINING_SCORE_SELECTOR)
    );
    if (Number.isFinite(activeValue)) {
      return activeValue;
    }

    return pickBestScoreFromNodes(
      document.querySelectorAll(FALLBACK_REMAINING_SCORE_SELECTOR)
    );
  }

  function createZoomIntent(point, segmentName, reason) {
    return {
      point: point || null,
      segmentName: normalizeSegmentName(segmentName),
      reason: String(reason || ""),
    };
  }

  function isDoubleSegment(segmentName) {
    return /^D([1-9]|1\d|20)$/.test(String(segmentName || ""));
  }

  function getPlacementProfile(zoomIntent) {
    const intent = zoomIntent || {};
    const segmentName = normalizeSegmentName(intent.segmentName);
    const reason = String(intent.reason || "");

    if (reason === "t20_setup") {
      return {
        baseX: CONFIG.t20CenterAnchorBaseX,
        baseY: CONFIG.t20CenterAnchorBaseY,
        gainX: CONFIG.t20CenterAnchorGainX,
        gainY: CONFIG.t20CenterAnchorGainY,
        minX: CONFIG.t20CenterAnchorMinX,
        maxX: CONFIG.t20CenterAnchorMaxX,
        minY: CONFIG.t20CenterAnchorMinY,
        maxY: CONFIG.t20CenterAnchorMaxY,
        targetBiasX: CONFIG.t20TargetBiasX,
        targetBiasY: CONFIG.t20TargetBiasY,
        targetBaseX: CONFIG.t20TargetAnchorBaseX,
        targetBaseY: CONFIG.t20TargetAnchorBaseY,
        targetGainX: CONFIG.t20TargetAnchorGainX,
        targetGainY: CONFIG.t20TargetAnchorGainY,
        targetMinX: CONFIG.t20TargetAnchorMinX,
        targetMaxX: CONFIG.t20TargetAnchorMaxX,
        targetMinY: CONFIG.t20TargetAnchorMinY,
        targetMaxY: CONFIG.t20TargetAnchorMaxY,
        lockTargetX: CONFIG.t20LockTargetX,
        lockTargetY: CONFIG.t20LockTargetY,
        slackFactor: CONFIG.t20SlackRebalanceFactor,
      };
    }

    if (reason === "checkout" && isDoubleSegment(segmentName)) {
      return {
        baseX: CONFIG.checkoutDoubleCenterAnchorBaseX,
        baseY: CONFIG.checkoutDoubleCenterAnchorBaseY,
        gainX: CONFIG.checkoutDoubleCenterAnchorGainX,
        gainY: CONFIG.checkoutDoubleCenterAnchorGainY,
        minX: CONFIG.checkoutDoubleCenterAnchorMinX,
        maxX: CONFIG.checkoutDoubleCenterAnchorMaxX,
        minY: CONFIG.checkoutDoubleCenterAnchorMinY,
        maxY: CONFIG.checkoutDoubleCenterAnchorMaxY,
        targetBiasX: CONFIG.checkoutDoubleTargetBiasX,
        targetBiasY: CONFIG.checkoutDoubleTargetBiasY,
        targetBaseX: CONFIG.checkoutDoubleTargetAnchorBaseX,
        targetBaseY: CONFIG.checkoutDoubleTargetAnchorBaseY,
        targetGainX: CONFIG.checkoutDoubleTargetAnchorGainX,
        targetGainY: CONFIG.checkoutDoubleTargetAnchorGainY,
        targetMinX: CONFIG.checkoutDoubleTargetAnchorMinX,
        targetMaxX: CONFIG.checkoutDoubleTargetAnchorMaxX,
        targetMinY: CONFIG.checkoutDoubleTargetAnchorMinY,
        targetMaxY: CONFIG.checkoutDoubleTargetAnchorMaxY,
        lockTargetX: CONFIG.checkoutDoubleLockTargetX,
        lockTargetY: CONFIG.checkoutDoubleLockTargetY,
        slackFactor: CONFIG.checkoutDoubleSlackRebalanceFactor,
      };
    }

    if (segmentName === "BULL") {
      return {
        baseX: CONFIG.bullCenterAnchorBaseX,
        baseY: CONFIG.bullCenterAnchorBaseY,
        gainX: CONFIG.bullCenterAnchorGainX,
        gainY: CONFIG.bullCenterAnchorGainY,
        minX: CONFIG.bullCenterAnchorMinX,
        maxX: CONFIG.bullCenterAnchorMaxX,
        minY: CONFIG.bullCenterAnchorMinY,
        maxY: CONFIG.bullCenterAnchorMaxY,
        targetBiasX: CONFIG.bullTargetBiasX,
        targetBiasY: CONFIG.bullTargetBiasY,
        targetBaseX: CONFIG.bullTargetAnchorBaseX,
        targetBaseY: CONFIG.bullTargetAnchorBaseY,
        targetGainX: CONFIG.bullTargetAnchorGainX,
        targetGainY: CONFIG.bullTargetAnchorGainY,
        targetMinX: CONFIG.bullTargetAnchorMinX,
        targetMaxX: CONFIG.bullTargetAnchorMaxX,
        targetMinY: CONFIG.bullTargetAnchorMinY,
        targetMaxY: CONFIG.bullTargetAnchorMaxY,
        lockTargetX: CONFIG.bullLockTargetX,
        lockTargetY: CONFIG.bullLockTargetY,
        slackFactor: CONFIG.bullSlackRebalanceFactor,
      };
    }

    return {
      baseX: CONFIG.centerAnchorBaseX,
      baseY: CONFIG.centerAnchorBaseY,
      gainX: CONFIG.centerAnchorGainX,
      gainY: CONFIG.centerAnchorGainY,
      minX: CONFIG.centerAnchorMinX,
      maxX: CONFIG.centerAnchorMaxX,
      minY: CONFIG.centerAnchorMinY,
      maxY: CONFIG.centerAnchorMaxY,
      targetBiasX: CONFIG.targetBiasX,
      targetBiasY: CONFIG.targetBiasY,
      targetBaseX: CONFIG.targetAnchorBaseX,
      targetBaseY: CONFIG.targetAnchorBaseY,
      targetGainX: CONFIG.targetAnchorGainX,
      targetGainY: CONFIG.targetAnchorGainY,
      targetMinX: CONFIG.targetAnchorMinX,
      targetMaxX: CONFIG.targetAnchorMaxX,
      targetMinY: CONFIG.targetAnchorMinY,
      targetMaxY: CONFIG.targetAnchorMaxY,
      lockTargetX: CONFIG.lockTargetX,
      lockTargetY: CONFIG.lockTargetY,
      slackFactor: CONFIG.slackRebalanceFactor,
    };
  }

  function isX01Active() {
    if (gameStateShared && typeof gameStateShared.isX01Variant === "function") {
      return gameStateShared.isX01Variant({
        allowNumeric: true,
        allowMissing: false,
        allowEmpty: false,
      });
    }

    return isX01Variant("ad-ext-game-variant", {
      allowNumeric: true,
      allowMissing: false,
      allowEmpty: false,
    });
  }

  function clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value));
  }

  function parseScaleFromTransform(transformText) {
    const raw = String(transformText || "").trim();
    if (!raw || raw === "none") {
      return 1;
    }

    const matrixMatch = raw.match(/^matrix\(([^)]+)\)$/);
    if (matrixMatch) {
      const parts = matrixMatch[1].split(",").map((entry) => Number(entry.trim()));
      if (parts.length >= 4 && parts.slice(0, 4).every(Number.isFinite)) {
        const scaleX = Math.hypot(parts[0], parts[1]);
        const scaleY = Math.hypot(parts[2], parts[3]);
        const averageScale = (scaleX + scaleY) / 2;
        return Number.isFinite(averageScale) && averageScale > 0 ? averageScale : 1;
      }
    }

    const matrix3dMatch = raw.match(/^matrix3d\(([^)]+)\)$/);
    if (matrix3dMatch) {
      const parts = matrix3dMatch[1].split(",").map((entry) => Number(entry.trim()));
      if (parts.length === 16 && parts.every(Number.isFinite)) {
        const scaleX = Math.hypot(parts[0], parts[1], parts[2]);
        const scaleY = Math.hypot(parts[4], parts[5], parts[6]);
        const averageScale = (scaleX + scaleY) / 2;
        return Number.isFinite(averageScale) && averageScale > 0 ? averageScale : 1;
      }
    }

    return 1;
  }

  function getBaseTransformText(element) {
    if (!element) {
      return "";
    }

    const cached = originalStyleCache.get(element);
    if (cached && typeof cached.baseTransform === "string") {
      return cached.baseTransform;
    }

    try {
      return window.getComputedStyle(element).transform || "";
    } catch (_) {
      return "";
    }
  }

  function getScreenPointFromViewBoxPoint(svg, point, viewBox) {
    if (
      svg &&
      typeof svg.createSVGPoint === "function" &&
      typeof svg.getScreenCTM === "function"
    ) {
      try {
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = point.x;
          svgPoint.y = point.y;
          const transformed = svgPoint.matrixTransform(ctm);
          if (
            Number.isFinite(transformed?.x) &&
            Number.isFinite(transformed?.y)
          ) {
            return {
              x: transformed.x,
              y: transformed.y,
            };
          }
        }
      } catch (_) {
        // fail-soft
      }
    }

    const svgRect = svg?.getBoundingClientRect?.();
    if (svgRect && svgRect.width > 0 && svgRect.height > 0) {
      const normalizedX = (point.x - viewBox.x) / viewBox.width;
      const normalizedY = (point.y - viewBox.y) / viewBox.height;
      return {
        x: svgRect.left + normalizedX * svgRect.width,
        y: svgRect.top + normalizedY * svgRect.height,
      };
    }

    return null;
  }

  function toLocalPoint(screenPoint, targetRect, scaleX, scaleY) {
    return {
      x: (screenPoint.x - targetRect.left) / scaleX,
      y: (screenPoint.y - targetRect.top) / scaleY,
    };
  }

  function projectViewBoxPointToTargetLocal(
    point,
    viewBox,
    svg,
    targetRect,
    scaleX,
    scaleY,
    layoutWidth,
    layoutHeight
  ) {
    const normalizedX = (point.x - viewBox.x) / viewBox.width;
    const normalizedY = (point.y - viewBox.y) / viewBox.height;
    const safeNormalizedX = Number.isFinite(normalizedX) ? normalizedX : 0.5;
    const safeNormalizedY = Number.isFinite(normalizedY) ? normalizedY : 0.5;

    const svgRect = svg?.getBoundingClientRect?.();
    if (
      svgRect &&
      svgRect.width > 0 &&
      svgRect.height > 0 &&
      targetRect &&
      targetRect.width > 0 &&
      targetRect.height > 0 &&
      Number.isFinite(scaleX) &&
      scaleX > 0 &&
      Number.isFinite(scaleY) &&
      scaleY > 0
    ) {
      const svgLocalLeft = (svgRect.left - targetRect.left) / scaleX;
      const svgLocalTop = (svgRect.top - targetRect.top) / scaleY;
      const svgLocalWidth = svgRect.width / scaleX;
      const svgLocalHeight = svgRect.height / scaleY;
      return {
        x: svgLocalLeft + safeNormalizedX * svgLocalWidth,
        y: svgLocalTop + safeNormalizedY * svgLocalHeight,
      };
    }

    return {
      x: safeNormalizedX * layoutWidth,
      y: safeNormalizedY * layoutHeight,
    };
  }

  function buildZoomTransform(zoomIntent, boardMetrics, svg, zoomTarget, viewportElement) {
    const targetPoint = zoomIntent?.point || null;
    if (!targetPoint) {
      return null;
    }

    const viewBox = boardMetrics?.viewBox || parseViewBox(svg);
    const baseTransformText = getBaseTransformText(zoomTarget);
    const baseScale = parseScaleFromTransform(baseTransformText);
    const compensatedZoom =
      CONFIG.zoomLevel /
      (Number.isFinite(baseScale) && baseScale > 0 ? baseScale : 1);
    const zoom = clamp(
      compensatedZoom,
      CONFIG.minEffectiveZoom,
      CONFIG.maxEffectiveZoom
    );

    const targetRect = zoomTarget?.getBoundingClientRect?.();
    const viewportRect = viewportElement?.getBoundingClientRect?.() || targetRect || null;
    const layoutWidth = Number(zoomTarget?.offsetWidth || zoomTarget?.clientWidth || 0);
    const layoutHeight = Number(zoomTarget?.offsetHeight || zoomTarget?.clientHeight || 0);
    const hasRects =
      targetRect &&
      viewportRect &&
      targetRect.width > 0 &&
      targetRect.height > 0 &&
      viewportRect.width > 0 &&
      viewportRect.height > 0 &&
      layoutWidth > 0 &&
      layoutHeight > 0;

    if (hasRects) {
      const scaleX = targetRect.width / layoutWidth;
      const scaleY = targetRect.height / layoutHeight;
      const targetScreenPoint = getScreenPointFromViewBoxPoint(
        svg,
        targetPoint,
        viewBox
      );
      const targetLocal = targetScreenPoint
        ? toLocalPoint(targetScreenPoint, targetRect, scaleX, scaleY)
        : projectViewBoxPointToTargetLocal(
            targetPoint,
            viewBox,
            svg,
            targetRect,
            scaleX,
            scaleY,
            layoutWidth,
            layoutHeight
          );
      const offsetParent =
        zoomTarget?.offsetParent instanceof HTMLElement
          ? zoomTarget.offsetParent
          : document.documentElement;
      const offsetParentRect = offsetParent?.getBoundingClientRect?.() || {
        left: 0,
        top: 0,
      };
      const baseLeft = Number(zoomTarget?.offsetLeft || 0);
      const baseTop = Number(zoomTarget?.offsetTop || 0);
      const anchorXInParent =
        viewportRect.left + viewportRect.width / 2 - offsetParentRect.left;
      const anchorYInParent =
        viewportRect.top + viewportRect.height / 2 - offsetParentRect.top;

      const tx = anchorXInParent - baseLeft - zoom * targetLocal.x;
      const ty = anchorYInParent - baseTop - zoom * targetLocal.y;

      return {
        transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${zoom})`,
        signature: `${zoom.toFixed(4)}:${baseScale.toFixed(4)}:${tx.toFixed(2)}:${ty.toFixed(2)}`,
        clampedTarget: {
          x: targetPoint.x,
          y: targetPoint.y,
        },
      };
    }

    // Fallback when metric mapping is incomplete: strict center in normalized space.
    const targetNormalizedX = (targetPoint.x - viewBox.x) / viewBox.width;
    const targetNormalizedY = (targetPoint.y - viewBox.y) / viewBox.height;
    const txPercent = (0.5 - zoom * targetNormalizedX) * 100;
    const tyPercent = (0.5 - zoom * targetNormalizedY) * 100;

    return {
      transform: `translate(${txPercent.toFixed(4)}%, ${tyPercent.toFixed(4)}%) scale(${zoom})`,
      signature: `${zoom.toFixed(4)}:${baseScale.toFixed(4)}:${txPercent.toFixed(4)}:${tyPercent.toFixed(4)}`,
      clampedTarget: {
        x: targetPoint.x,
        y: targetPoint.y,
      },
    };
  }

  function cacheOriginalStyle(element) {
    if (!element || originalStyleCache.has(element)) {
      return;
    }

    let baseTransform = "";
    try {
      const computedTransform = window.getComputedStyle(element).transform;
      if (computedTransform && computedTransform !== "none") {
        baseTransform = computedTransform;
      }
    } catch (_) {
      // fail-soft
    }

    originalStyleCache.set(element, {
      transform: element.style.transform,
      transition: element.style.transition,
      transformOrigin: element.style.transformOrigin,
      willChange: element.style.willChange,
      baseTransform,
    });
  }

  function getBaseTransform(element) {
    const original = originalStyleCache.get(element);
    return original?.baseTransform || "";
  }

  function restoreStyle(element) {
    if (!element) {
      return;
    }

    const original = originalStyleCache.get(element);
    if (original) {
      element.style.transform = original.transform;
      element.style.transition = original.transition;
      element.style.transformOrigin = original.transformOrigin;
      element.style.willChange = original.willChange;
    } else {
      element.style.transform = "";
      element.style.transition = "";
      element.style.transformOrigin = "";
      element.style.willChange = "";
    }
    element.classList.remove(ZOOM_CLASS);
  }

  function resolveZoomTarget(svg) {
    if (!svg || !(svg instanceof Element)) {
      return null;
    }

    const boardShowAnimations = svg.closest(".showAnimations");
    if (boardShowAnimations instanceof HTMLElement) {
      return boardShowAnimations;
    }

    const boardFrame = svg.closest(".css-13u3cwk");
    if (boardFrame instanceof HTMLElement) {
      return boardFrame;
    }

    return svg;
  }

  function resolveClipHost(zoomTarget) {
    if (!zoomTarget || !(zoomTarget instanceof Element)) {
      return null;
    }

    const uniqueCandidates = new Set([
      zoomTarget.closest(".css-tqsk66"),
      zoomTarget.parentElement,
      zoomTarget.closest(".showAnimations"),
      zoomTarget.parentElement?.parentElement,
    ]);

    const candidates = [...uniqueCandidates].filter(
      (entry) => entry instanceof HTMLElement && entry !== zoomTarget
    );

    return candidates[0] || null;
  }

  function resolveViewportElement(zoomTarget, clipHost) {
    if (clipHost instanceof HTMLElement) {
      return clipHost;
    }

    const preferredViewport = zoomTarget?.closest(".css-tqsk66");

    if (preferredViewport instanceof HTMLElement) {
      return preferredViewport;
    }

    const legacyViewport = zoomTarget?.closest(".css-1kejrvi");
    if (legacyViewport instanceof HTMLElement) {
      return legacyViewport;
    }

    return zoomTarget instanceof HTMLElement ? zoomTarget : null;
  }

  function cacheHostStyle(host) {
    if (!host || originalHostStyleCache.has(host)) {
      return;
    }

    originalHostStyleCache.set(host, {
      overflow: host.style.overflow,
      overflowX: host.style.overflowX,
      overflowY: host.style.overflowY,
    });
  }

  function restoreHostStyle(host) {
    if (!host) {
      return;
    }

    const original = originalHostStyleCache.get(host);
    if (original) {
      host.style.overflow = original.overflow;
      host.style.overflowX = original.overflowX;
      host.style.overflowY = original.overflowY;
    } else {
      host.style.overflow = "";
      host.style.overflowX = "";
      host.style.overflowY = "";
    }
    host.classList.remove(ZOOM_HOST_CLASS);
  }

  function applyZoom(zoomTarget, host, transform, signature, zoomIntent) {
    if (!zoomTarget) {
      return;
    }

    if (state.zoomedElement && state.zoomedElement !== zoomTarget) {
      restoreStyle(state.zoomedElement);
      state.zoomedElement = null;
      state.lastAppliedTransform = "";
    }
    if (state.zoomHost && state.zoomHost !== host) {
      restoreHostStyle(state.zoomHost);
      state.zoomHost = null;
    }

    if (host) {
      cacheHostStyle(host);
      host.classList.add(ZOOM_HOST_CLASS);
      host.style.overflow = "hidden";
      host.style.overflowX = "hidden";
      host.style.overflowY = "hidden";
      state.zoomHost = host;
    }

    cacheOriginalStyle(zoomTarget);
    zoomTarget.classList.add(ZOOM_CLASS);
    zoomTarget.style.transformOrigin = "0 0";
    zoomTarget.style.willChange = "transform";
    zoomTarget.style.transition = `transform ${CONFIG.zoomInMs}ms ${CONFIG.easingIn}`;

    const baseTransform = getBaseTransform(zoomTarget);
    const composedTransform = baseTransform
      ? `${baseTransform} ${transform}`
      : transform;
    const composedSignature = baseTransform
      ? `${baseTransform}|${signature}`
      : signature;

    if (
      state.zoomedElement === zoomTarget &&
      state.lastAppliedTransform === composedSignature
    ) {
      state.activeZoomIntent = zoomIntent;
      return;
    }

    zoomTarget.style.transform = composedTransform;
    state.zoomedElement = zoomTarget;
    state.lastAppliedTransform = composedSignature;
    state.activeZoomIntent = zoomIntent;
  }

  function resetZoom(options = {}) {
    const immediate = Boolean(options.immediate);

    if (state.releaseTimeoutId) {
      clearTimeout(state.releaseTimeoutId);
      state.releaseTimeoutId = 0;
    }

    if (!state.zoomedElement) {
      state.activeZoomIntent = null;
      state.lastAppliedTransform = "";
      if (state.zoomHost) {
        restoreHostStyle(state.zoomHost);
        state.zoomHost = null;
      }
      return;
    }

    const zoomTarget = state.zoomedElement;
    if (immediate) {
      restoreStyle(zoomTarget);
      state.zoomedElement = null;
      state.lastAppliedTransform = "";
      if (state.zoomHost) {
        restoreHostStyle(state.zoomHost);
        state.zoomHost = null;
      }
      state.activeZoomIntent = null;
      return;
    }

    zoomTarget.style.transition = `transform ${CONFIG.zoomOutMs}ms ${CONFIG.easingOut}`;
    zoomTarget.style.transform = "";

    const releaseDelay = CONFIG.zoomOutMs + 40;
    const expectedTarget = zoomTarget;
    const expectedHost = state.zoomHost;
    state.releaseTimeoutId = setTimeout(() => {
      state.releaseTimeoutId = 0;
      if (state.zoomedElement === expectedTarget) {
        restoreStyle(expectedTarget);
        state.zoomedElement = null;
        state.lastAppliedTransform = "";
      }
      if (state.zoomHost === expectedHost && expectedHost) {
        restoreHostStyle(expectedHost);
        state.zoomHost = null;
      }
    }, releaseDelay);

    state.activeZoomIntent = null;
  }

  function shouldHoldZoom(nowTs, turnId, throwCount) {
    if (!state.activeZoomIntent) {
      return false;
    }
    if (turnId !== state.lastTurnId) {
      return false;
    }
    if (throwCount !== 3) {
      return false;
    }
    return nowTs <= state.holdUntilTs;
  }

  function isDismissedForState(nowTs, turnId, throwCount) {
    if (state.dismissedUntilTs <= nowTs) {
      return false;
    }
    return (
      state.dismissedTurnId === turnId &&
      state.dismissedThrowCount === throwCount
    );
  }

  function clearDismissState() {
    state.dismissedTurnId = "";
    state.dismissedThrowCount = -1;
    state.dismissedUntilTs = 0;
  }

  function dismissCurrentZoom() {
    state.dismissedTurnId = state.lastTurnId;
    state.dismissedThrowCount = state.lastThrowCount;
    state.dismissedUntilTs = Date.now() + 2200;
    state.holdUntilTs = 0;
    state.activeZoomIntent = null;
    resetZoom();
  }

  function computeZoomIntent(boardMetrics) {
    if (!isX01Active()) {
      return null;
    }

    const turn =
      typeof gameStateShared?.getActiveTurn === "function"
        ? gameStateShared.getActiveTurn()
        : null;
    const throws =
      typeof gameStateShared?.getActiveThrows === "function"
        ? gameStateShared.getActiveThrows()
        : [];

    if (!turn || !Array.isArray(throws)) {
      return null;
    }

    const turnId = getTurnId(turn);
    const throwCount = throws.length;
    const nowTs = Date.now();

    const turnChanged = turnId !== state.lastTurnId;
    if (turnChanged) {
      state.holdUntilTs = 0;
      state.activeZoomIntent = null;
    } else if (
      state.activeZoomIntent &&
      state.lastThrowCount === 2 &&
      throwCount === 3
    ) {
      state.holdUntilTs = nowTs + CONFIG.holdAfterThirdMs;
    }

    state.lastTurnId = turnId;
    state.lastThrowCount = throwCount;

    if (state.dismissedUntilTs && !isDismissedForState(nowTs, turnId, throwCount)) {
      clearDismissState();
    }
    if (isDismissedForState(nowTs, turnId, throwCount)) {
      return null;
    }

    if (CONFIG.checkoutZoomEnabled && throwCount <= 2) {
      const checkoutSegment = getCheckoutSegmentFromScoreSources();
      if (checkoutSegment) {
        const targetPoint = segmentFallbackPoint(checkoutSegment, boardMetrics);
        if (targetPoint) {
          return createZoomIntent(targetPoint, checkoutSegment, "checkout");
        }
      }
    }

    if (throwCount === 2) {
      const firstName = getThrowSegmentName(throws[0]);
      const secondName = getThrowSegmentName(throws[1]);
      const remainingScore = getActiveRemainingScoreFromDom();

      if (
        firstName === "T20" &&
        secondName === "T20" &&
        isSensibleThirdT20Score(remainingScore)
      ) {
        // Strict TV mode: only keep T20 setup when it does not imply bust.
        const fallback = segmentFallbackPoint("T20", boardMetrics);
        const byCoords = getCenterFromThrowCoords(throws, boardMetrics.viewBox);
        const targetPoint = fallback || byCoords;
        if (targetPoint) {
          return createZoomIntent(targetPoint, "T20", "t20_setup");
        }
      }
    }

    if (shouldHoldZoom(nowTs, turnId, throwCount)) {
      return state.activeZoomIntent;
    }

    return null;
  }

  function update() {
    const board = findBoard();
    if (!board?.svg) {
      resetZoom();
      return;
    }

    const zoomTarget = resolveZoomTarget(board.svg);
    if (!zoomTarget) {
      resetZoom();
      return;
    }

    const clipHost = resolveClipHost(zoomTarget);
    const viewportElement = resolveViewportElement(zoomTarget, clipHost);
    const boardMetrics = getBoardMetrics(board);
    const zoomIntent = computeZoomIntent(boardMetrics);

    if (!zoomIntent?.point) {
      resetZoom();
      return;
    }

    const zoomData = buildZoomTransform(
      zoomIntent,
      boardMetrics,
      board.svg,
      zoomTarget,
      viewportElement
    );
    if (!zoomData) {
      resetZoom();
      return;
    }
    applyZoom(
      zoomTarget,
      clipHost,
      zoomData.transform,
      zoomData.signature,
      zoomIntent
    );
  }

  function onPointerDown(event) {
    if (event instanceof MouseEvent && event.button !== 0) {
      return;
    }
    dismissCurrentZoom();
  }

  function onBeforeUnload() {
    resetZoom({ immediate: true });
    clearDismissState();
  }

  ensureStyle(STYLE_ID, STYLE_TEXT);

  const scheduleUpdate = createRafScheduler(update);

  const domObserver = observeMutations({
    target: document.documentElement,
    onChange: scheduleUpdate,
  });

  let unsubscribeGameState = null;
  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    unsubscribeGameState = gameStateShared.subscribe(scheduleUpdate);
  }

  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("orientationchange", scheduleUpdate, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
  document.addEventListener("visibilitychange", scheduleUpdate);
  window.addEventListener("beforeunload", onBeforeUnload);

  let domReadyListener = null;
  if (document.readyState === "loading") {
    domReadyListener = () => {
      scheduleUpdate();
    };
    document.addEventListener("DOMContentLoaded", domReadyListener, { once: true });
  }

  let cleanedUp = false;
  const instanceId = Symbol("adExtTvBoardZoom");
  function cleanupInstance() {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    if (domObserver && typeof domObserver.disconnect === "function") {
      domObserver.disconnect();
    }

    if (typeof unsubscribeGameState === "function") {
      unsubscribeGameState();
      unsubscribeGameState = null;
    }

    window.removeEventListener("resize", scheduleUpdate);
    window.removeEventListener("orientationchange", scheduleUpdate);
    window.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("visibilitychange", scheduleUpdate);
    window.removeEventListener("beforeunload", onBeforeUnload);
    if (domReadyListener) {
      document.removeEventListener("DOMContentLoaded", domReadyListener);
      domReadyListener = null;
    }

    onBeforeUnload();

    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].id === instanceId) {
      delete window[INSTANCE_KEY];
    }
  }

  window[INSTANCE_KEY] = {
    id: instanceId,
    cleanup: cleanupInstance,
  };

  window.addEventListener("pagehide", cleanupInstance, { once: true });
  window.addEventListener("beforeunload", cleanupInstance, { once: true });

  scheduleUpdate();
})();
