// ==UserScript==
// @name         Autodarts Animate Cam Zoom WM Style
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  WM-style camera zoom on the virtual dartboard (checkout double or T20 push-in) for X01 only.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cam%20Zoom%20WM%20Style.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cam%20Zoom%20WM%20Style.user.js
// ==/UserScript==

/*
 * WM-style CamZoom Verhalten (X01):
 * - Checkout aktiv: Zoom, wenn der naechste Suggested-Dart ein Double ist (Dxx oder DB/BULL).
 *   -> Hat Vorrang: Wenn ein Checkout-Doppel als naechstes suggested ist, kein T20-Push-In.
 * - Kein Checkout: wenn die ersten zwei Darts im Turn T20 sind -> leichter Push-In auf T20 vor Dart 3.
 * - Sonst kein Zoom.
 * - Render-Mode: "lens" nutzt eine schwebende Lupe und veraendert das Board nicht.
 */

(function () {
  "use strict";

  const {
    ensureStyle,
    createRafScheduler,
    observeMutations,
    isX01Variant,
    getBoardRadius,
    segmentAngles,
    polar,
    SVG_NS,
  } = window.autodartsAnimationShared;

  /**
   * Konfiguration fuer WM-TV-Style CamZoom.
   * Passe hier die Staerke, Dauer und Selektoren an.
   */
  const CONFIG = {
    variantElementId: "ad-ext-game-variant",
    suggestionSelector: ".suggestion",
    throwRowSelector: ".ad-ext-turn-throw",
    turnPlanSelector: ".ad-ext-turn-throw p.chakra-text",
    throwTextSelector: ".ad-ext-turn-throw p.chakra-text",
    turnContainerSelector: "#ad-ext-turn",
    activePlayerSelector: ".ad-ext-player-active", // falls vorhanden, nur Throws des aktiven Spielers nutzen
    searchShadowRoots: true, // auch offene Shadow Roots nach Throws/Suggestions durchsuchen
    throwOrder: "latest", // "latest" | "first" (welche 3 Throws zaehlen, wenn mehr vorhanden)
    allowBareNumbersInThrows: false, // wenn false, werden reine Zahlen (z.B. Platzhalter "3") ignoriert

    // Aktivierung
    requireX01: true,
    enableCheckoutZoom: true,
    enableT20Zoom: true,
    t20RequiresNoCheckout: true, // T20-Push-In nur wenn kein Checkout-Doppel als naechstes suggested ist
    respectReducedMotion: true,
    zoomMode: "lens", // "lens" | "transform"
    allowOverflow: true, // nur fuer "transform"-Modus (sonst ignoriert)
    overflowParentLevels: 2, // wie viele Parent-Container ebenfalls overflow:visible erhalten
    checkoutFallbackFromTurnPlan: true, // nutze Turn-Plan (z.B. "D12"), wenn keine Suggestion gefunden wird
    holdWhenTargetMissing: true, // haelt den Zoom kurz, falls Targets kurz verschwinden
    keepZoomUntilDartsCleared: true, // Zoom bleibt aktiv bis die Darts entfernt werden
    checkoutHoldMs: 1600, // Haltezeit fuer Checkout-Zoom
    t20HoldMs: 1100, // Haltezeit fuer T20-Push-In
    pollIntervalMs: 300, // Fallback-Polling falls DOM-Mutationen ausbleiben
    scorePollMs: 300, // zusaetzliche Pruefung bei Punkte-Aenderungen

    // Lupen-Optik
    lensDiameterPx: 270,
    lensBorderPx: 2,
    lensBorderColor: "rgba(255, 255, 255, 0.75)",
    lensShadow: "0 18px 36px rgba(0, 0, 0, 0.45)",
    lensBackground: "rgba(0, 0, 0, 0.25)",
    lensOpacity: 1,
    lensOffsetX: 0,
    lensOffsetY: 0,
    lensRefreshMs: 600,
    lensIncludeDartOverlay: true, // Dart-Overlay aus dem Marker-Script in der Lupe anzeigen
    lensDartOverlaySelector: "#ad-ext-dart-image-overlay",
    lensHideMarkerCircles: true, // kleine Treffer-Kreise in der Lupe ausblenden, wenn Dart-Overlay aktiv
    lensScaleMultiplier: 1.6, // Gewuenschte Vergroesserung relativ zum Board (1.0 = kein Zoom)
    lensMaxScale: 12, // Sicherheitslimit fuer die interne ViewBox-Skalierung
    lensAllowClicks: true, // Klicks in der Lupe auf das Board weiterleiten
    lensHideOnClick: true, // Falls Klick-Weiterleitung scheitert, Lupe kurz ausblenden
    lensClickSuppressMs: 4000, // Zeitfenster, in dem die Lupe nach Klicks deaktiv bleibt
    lensCursor: "crosshair",
    lensGlowColor: "rgba(190, 255, 140, 1)",
    lensGlowDurationMs: 3200,
    lensZIndex: 150, // hinter GIF-Animation (z-[180])

    // Zoom-Staerke
    zoomMultiplier: 1.7, // globaler Zoom-Faktor fuer Checkout/T20
    checkoutScale: 1.1,
    t20Scale: 1.06,
    maxScale: 1.4, // Sicherheitslimit fuer Transform-Zoom

    // Animations-Tempo
    zoomDurationMs: 420,
    zoomEasing: "easeInOutCubic", // linear | easeOutCubic | easeInOutCubic
    zoomOvershoot: 0.015, // kleiner Overshoot fuer echten Kamera-Push-In
    zoomOvershootRatio: 0.7, // Anteil der Zeit bis zum Overshoot (0..1)

    // Ring-Ratios (muss zum Board-SVG passen)
    ringRatios: {
      outerBullInner: 0.031112,
      outerBullOuter: 0.075556,
      tripleInner: 0.431112,
      tripleOuter: 0.475556,
      doubleInner: 0.711112,
      doubleOuter: 0.755556,
    },

    // Dart-Erkennung (fuer "keepZoomUntilDartsCleared")
    dartMarkerMinRadius: 1,
    dartMarkerMaxRadius: 6,

    // Checkout-Guards (gegen falsche Zooms ausserhalb von Checkout)
    useScoreCheckoutGuard: true,
    activeScoreSelector:
      ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, .ad-ext-player-active p.ad-ext-player-score",
    scoreSelector: "p.ad-ext-player-score",
    impossibleCheckoutScores: [169, 168, 166, 165, 163, 162, 159],
  };

  const STYLE_ID = "ad-ext-camzoom-style";
  const STYLE_TEXT = `
.ad-ext-camzoom-active {
  will-change: transform;
}
#ad-ext-camzoom-lens {
  position: fixed;
  left: -9999px;
  top: -9999px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
  z-index: var(--ad-ext-lens-z, 150);
  opacity: 0;
  background: rgba(0, 0, 0, 0.35);
  box-shadow: var(--ad-ext-lens-shadow, 0 18px 36px rgba(0, 0, 0, 0.45));
  border: 2px solid rgba(255, 255, 255, 0.75);
  transition: opacity 140ms ease-out;
  animation: ad-ext-camzoom-glow var(--ad-ext-lens-glow-duration, 1800ms) ease-in-out infinite;
}
#ad-ext-camzoom-lens svg {
  width: 100%;
  height: 100%;
  display: block;
}
#ad-ext-camzoom-lens text {
  fill: rgba(255, 255, 255, 0.95);
  stroke: rgba(0, 0, 0, 0.85);
  stroke-width: 1.6px;
  paint-order: stroke fill;
  font-weight: 700;
}

@keyframes ad-ext-camzoom-glow {
  0% {
    box-shadow:
      var(--ad-ext-lens-shadow, 0 18px 36px rgba(0, 0, 0, 0.45)),
      0 0 26px var(--ad-ext-lens-glow, rgba(190, 255, 140, 0.8)),
      0 0 56px rgba(190, 255, 140, 0.5);
  }
  50% {
    box-shadow:
      var(--ad-ext-lens-shadow, 0 18px 36px rgba(0, 0, 0, 0.45)),
      0 0 46px var(--ad-ext-lens-glow, rgba(190, 255, 140, 1)),
      0 0 110px rgba(190, 255, 140, 0.7);
  }
  100% {
    box-shadow:
      var(--ad-ext-lens-shadow, 0 18px 36px rgba(0, 0, 0, 0.45)),
      0 0 26px var(--ad-ext-lens-glow, rgba(190, 255, 140, 0.8)),
      0 0 56px rgba(190, 255, 140, 0.5);
  }
}
`;

  const IMPOSSIBLE_CHECKOUTS = new Set(
    Array.isArray(CONFIG.impossibleCheckoutScores)
      ? CONFIG.impossibleCheckoutScores
      : []
  );

  const EASING = {
    linear: (t) => t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  };

  const ROOT_CACHE_MS = 1000;

  const baseTransformByElement = new WeakMap();
  const overflowOriginal = new WeakMap();
  const overflowTouched = new Set();
  const LENS_ID = "ad-ext-camzoom-lens";
  let lensContainer = null;
  let lensSvg = null;
  let lensGroup = null;
  let lensSourceSvg = null;
  let lensLastRefresh = 0;
  let lensInitPending = false;
  let lensListenersAttached = false;
  let lensSuppressUntil = 0;
  let lensResumeTimer = null;
  let lastScoreValue = null;
  let cachedRoots = null;
  let cachedRootsAt = 0;
  let rootObserver = null;
  const observedRoots = new WeakSet();
  let activeZoom = null;
  let requestZoomUpdate = () => {};
  let lastUrl = location.href;

  function prefersReducedMotion() {
    if (!CONFIG.respectReducedMotion || !window.matchMedia) {
      return false;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    return Boolean(media && media.matches);
  }

  function isLensSuppressed(now) {
    if (!isLensMode()) {
      return false;
    }
    const current = Number.isFinite(now) ? now : performance.now();
    return lensSuppressUntil > current;
  }

  function suppressLens(durationMs) {
    if (!isLensMode()) {
      return;
    }
    const ms = Math.max(0, Number.parseInt(durationMs, 10) || 0);
    if (!ms) {
      return;
    }
    lensSuppressUntil = Math.max(lensSuppressUntil, performance.now() + ms);
    hideLens();
    if (lensResumeTimer) {
      clearTimeout(lensResumeTimer);
    }
    if (ms > 0) {
      lensResumeTimer = setTimeout(() => {
        requestZoomUpdate();
      }, ms + 30);
    }
  }

  function collectRoots() {
    const roots = [document];
    if (!CONFIG.searchShadowRoots) {
      return roots;
    }
    const rootNode = document.documentElement;
    if (!rootNode || typeof document.createTreeWalker !== "function") {
      return roots;
    }
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node && node.shadowRoot) {
        roots.push(node.shadowRoot);
      }
    }
    return roots;
  }

  function observeRoot(root) {
    if (!rootObserver || !root || observedRoots.has(root)) {
      return;
    }
    if (root.nodeType === Node.DOCUMENT_NODE) {
      return;
    }
    const target = root.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? root : null;
    if (!target) {
      return;
    }
    rootObserver.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    observedRoots.add(root);
  }

  function getSearchRoots() {
    if (!CONFIG.searchShadowRoots) {
      return [document];
    }
    const now = performance.now();
    if (cachedRoots && now - cachedRootsAt < ROOT_CACHE_MS) {
      return cachedRoots;
    }
    cachedRoots = collectRoots();
    cachedRootsAt = now;
    cachedRoots.forEach((root) => observeRoot(root));
    return cachedRoots;
  }

  function queryAllInRoots(selector) {
    if (!selector) {
      return [];
    }
    const results = [];
    const seen = new Set();
    const roots = getSearchRoots();
    roots.forEach((root) => {
      if (!root || typeof root.querySelectorAll !== "function") {
        return;
      }
      root.querySelectorAll(selector).forEach((node) => {
        if (!seen.has(node)) {
          seen.add(node);
          results.push(node);
        }
      });
    });
    return results;
  }

  function collectScopedNodes(selector) {
    if (!selector) {
      return [];
    }
    if (CONFIG.turnContainerSelector) {
      const scoped = [];
      const roots = getSearchRoots();
      roots.forEach((root) => {
        if (!root || typeof root.querySelectorAll !== "function") {
          return;
        }
        root.querySelectorAll(CONFIG.turnContainerSelector).forEach((turn) => {
          turn.querySelectorAll(selector).forEach((node) => scoped.push(node));
        });
      });
      if (scoped.length) {
        return scoped;
      }
    }
    if (CONFIG.activePlayerSelector) {
      const scoped = [];
      const roots = getSearchRoots();
      roots.forEach((root) => {
        if (!root || typeof root.querySelectorAll !== "function") {
          return;
        }
        root.querySelectorAll(CONFIG.activePlayerSelector).forEach((active) => {
          active.querySelectorAll(selector).forEach((node) => scoped.push(node));
        });
      });
      if (scoped.length) {
        return scoped;
      }
    }
    return queryAllInRoots(selector);
  }

  function collectNodesInContainer(containerSelector, itemSelector) {
    if (!containerSelector || !itemSelector) {
      return [];
    }
    const results = [];
    const roots = getSearchRoots();
    roots.forEach((root) => {
      if (!root || typeof root.querySelectorAll !== "function") {
        return;
      }
      root.querySelectorAll(containerSelector).forEach((container) => {
        container
          .querySelectorAll(itemSelector)
          .forEach((node) => results.push(node));
      });
    });
    return results;
  }

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function parseScore(text) {
    if (!text) {
      return null;
    }
    const match = String(text).match(/\d+/);
    if (!match) {
      return null;
    }
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function getActiveScoreValue() {
    if (!CONFIG.useScoreCheckoutGuard) {
      return null;
    }
    const activeNodes = queryAllInRoots(CONFIG.activeScoreSelector);
    if (activeNodes.length) {
      const score = parseScore(activeNodes[0].textContent || "");
      return score;
    }
    const fallbackNodes = queryAllInRoots(CONFIG.scoreSelector);
    if (fallbackNodes.length) {
      return parseScore(fallbackNodes[0].textContent || "");
    }
    return null;
  }

  function isCheckoutPossibleFromScore(score) {
    if (!Number.isFinite(score)) {
      return false;
    }
    if (score <= 1 || score > 50) {
      return false;
    }
    return !IMPOSSIBLE_CHECKOUTS.has(score);
  }

  function getDirectCheckoutTargetFromScore(score) {
    if (!Number.isFinite(score)) {
      return null;
    }
    if (score === 50) {
      return { ring: "DB" };
    }
    if (score % 2 !== 0) {
      return null;
    }
    const value = score / 2;
    if (value < 1 || value > 20) {
      return null;
    }
    return { ring: "D", value };
  }

  function getSuggestionCheckoutState(text) {
    const normalized = normalizeText(text || "").toUpperCase();
    if (!normalized) {
      return null;
    }
    if (/NO\s*(OUT|CHECKOUT|SHOT)/.test(normalized)) {
      return false;
    }
    if (/BUST/.test(normalized)) {
      return false;
    }
    if (/D\s*[-:]?\s*\d+/.test(normalized)) {
      return true;
    }
    if (/DOUBLE\s*\d+/.test(normalized)) {
      return true;
    }
    if (/DB|BULLSEYE|BULL/.test(normalized)) {
      return true;
    }
    return null;
  }

  function getThrowTextFromRow(row) {
    if (!row || row.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    const sources = [];
    row.querySelectorAll("p.chakra-text").forEach((node) => {
      if (node && node.textContent) {
        sources.push(node.textContent);
      }
    });
    if (row.textContent) {
      sources.push(row.textContent);
    }
    const ariaLabel = row.getAttribute("aria-label");
    if (ariaLabel) {
      sources.push(ariaLabel);
    }
    return normalizeText(sources.filter(Boolean).join(" "));
  }

  function getTurnContainer() {
    if (!CONFIG.turnContainerSelector) {
      return null;
    }
    const turns = queryAllInRoots(CONFIG.turnContainerSelector);
    return turns.length ? turns[0] : null;
  }

  function getSuggestionTextFromTurn(turn) {
    if (!turn || !CONFIG.suggestionSelector) {
      return "";
    }
    const suggestion = turn.querySelector(CONFIG.suggestionSelector);
    return suggestion ? normalizeText(suggestion.textContent || "") : "";
  }

  function isSuggestionBlockingT20(turn) {
    const text = getSuggestionTextFromTurn(turn);
    if (!text) {
      return false;
    }
    const sequence = parseSuggestionSequence(text);
    return !(
      sequence.length === 1 &&
      isT20Throw(sequence[0])
    );
  }

  function shouldShowT20Zoom(turn, boardSvg) {
    if (!turn) {
      return false;
    }
    const rows = Array.from(turn.querySelectorAll(CONFIG.throwRowSelector));
    if (rows.length < 2) {
      return false;
    }
    const first = parseThrowText(getThrowTextFromRow(rows[0]));
    const second = parseThrowText(getThrowTextFromRow(rows[1]));
    if (!isT20Throw(first) || !isT20Throw(second)) {
      return false;
    }
    const third = rows[2] ? parseThrowText(getThrowTextFromRow(rows[2])) : null;
    if (third) {
      return false;
    }
    if (isSuggestionBlockingT20(turn)) {
      return false;
    }
    if (boardSvg && countDartMarkers(boardSvg) >= 3) {
      return false;
    }
    return true;
  }

  function parseThrowFromNode(node, isRow) {
    if (!node) {
      return null;
    }
    const text = isRow ? getThrowTextFromRow(node) : node.textContent || "";
    return parseThrowText(text);
  }

  function collectParsedThrows(nodes, isRow) {
    const throwsList = [];
    nodes.forEach((node) => {
      const parsed = parseThrowFromNode(node, isRow);
      if (parsed) {
        throwsList.push(parsed);
      }
    });
    return throwsList;
  }

  function selectBestThrowNodes() {
    const scopes = [];
    if (CONFIG.turnContainerSelector) {
      scopes.push({
        weight: 3,
        nodes: collectNodesInContainer(
          CONFIG.turnContainerSelector,
          CONFIG.throwRowSelector
        ),
      });
    }
    if (CONFIG.activePlayerSelector) {
      scopes.push({
        weight: 2,
        nodes: collectNodesInContainer(
          CONFIG.activePlayerSelector,
          CONFIG.throwRowSelector
        ),
      });
    }
    scopes.push({
      weight: 1,
      nodes: queryAllInRoots(CONFIG.throwRowSelector),
    });

    let best = null;
    scopes.forEach((scope) => {
      if (!scope.nodes.length) {
        return;
      }
      const parsed = collectParsedThrows(scope.nodes, true);
      if (!parsed.length) {
        return;
      }
      if (
        !best ||
        parsed.length > best.parsed.length ||
        (parsed.length === best.parsed.length && scope.weight > best.weight)
      ) {
        best = {
          nodes: scope.nodes,
          parsed,
          weight: scope.weight,
          isRow: true,
        };
      }
    });

    if (best) {
      return best;
    }

    const textNodes = queryAllInRoots(CONFIG.throwTextSelector);
    if (!textNodes.length) {
      return null;
    }
    const parsed = collectParsedThrows(textNodes, false);
    if (!parsed.length) {
      return null;
    }
    return { nodes: textNodes, parsed, weight: 0, isRow: false };
  }

  function clampScale(value, maxScale) {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return 1;
    }
    const max = Number.isFinite(maxScale) ? maxScale : 1.4;
    return Math.max(1, Math.min(max, numeric));
  }

  function getZoomMultiplier() {
    const value = Number.parseFloat(CONFIG.zoomMultiplier);
    if (!Number.isFinite(value) || value <= 0) {
      return 1;
    }
    return value;
  }

  function getConfiguredScale(baseScale) {
    return clampScale(baseScale * getZoomMultiplier(), CONFIG.maxScale);
  }

  function getLensScale(baseScale, boardSvg) {
    const multiplier = Number.parseFloat(CONFIG.lensScaleMultiplier);
    const factor = Number.isFinite(multiplier) ? multiplier : 1;
    const maxScale = Number.parseFloat(CONFIG.lensMaxScale);
    const lensSize = Math.max(80, Number.parseFloat(CONFIG.lensDiameterPx) || 200);
    const rect =
      boardSvg && typeof boardSvg.getBoundingClientRect === "function"
        ? boardSvg.getBoundingClientRect()
        : null;
    const renderedWidth =
      rect && Number.isFinite(rect.width) && rect.width > 0 ? rect.width : 0;
    const magnification = Math.max(1, Number.parseFloat(baseScale) || 1) * factor;
    if (!renderedWidth) {
      return clampScale(magnification, maxScale);
    }
    const scaleValue = (renderedWidth / lensSize) * magnification;
    return clampScale(scaleValue, maxScale);
  }

  function getHoldMs(type) {
    if (type === "checkout") {
      return Math.max(0, Number.parseInt(CONFIG.checkoutHoldMs, 10) || 0);
    }
    return Math.max(0, Number.parseInt(CONFIG.t20HoldMs, 10) || 0);
  }

  function shouldHold(now) {
    return Boolean(
      CONFIG.holdWhenTargetMissing &&
        activeZoom &&
        activeZoom.type !== "t20" &&
        activeZoom.holdUntil &&
        now < activeZoom.holdUntil
    );
  }

  function shouldKeepZoomWithoutTarget() {
    if (!CONFIG.keepZoomUntilDartsCleared || !activeZoom) {
      return false;
    }
    if (activeZoom.type === "t20") {
      return false;
    }
    const throwsList = getCurrentThrows();
    if (throwsList.length > 0) {
      return true;
    }
    const boardSvg =
      activeZoom.boardSvg ||
      (activeZoom.board && activeZoom.board.ownerSVGElement);
    if (!boardSvg) {
      return false;
    }
    return countDartMarkers(boardSvg) > 0;
  }

  function isLensMode() {
    return CONFIG.zoomMode === "lens";
  }

  function isTransformMode() {
    return !isLensMode();
  }

  function isLensSvg(svg) {
    if (!svg) {
      return false;
    }
    if (svg.dataset && svg.dataset.adExtCamzoomLens) {
      return true;
    }
    return Boolean(svg.closest && svg.closest(`#${LENS_ID}`));
  }

  function findBoardSafe() {
    const svgs = queryAllInRoots("svg").filter(
      (svg) => !isLensSvg(svg)
    );
    if (!svgs.length) {
      return null;
    }

    let best = null;
    let bestScore = -1;

    for (const svg of svgs) {
      const numbers = new Set(
        [...svg.querySelectorAll("text")]
          .map((text) => Number.parseInt(text.textContent, 10))
          .filter((value) => value >= 1 && value <= 20)
      );
      const numberScore = numbers.size;
      const radius = getBoardRadius(svg);
      const score = numberScore * 1000 + radius;
      if (score > bestScore) {
        best = svg;
        bestScore = score;
      }
    }

    if (!best) {
      return null;
    }

    let bestGroup = null;
    let bestRadius = 0;

    for (const group of best.querySelectorAll("g")) {
      const radius = getBoardRadius(group);
      if (radius > bestRadius) {
        bestRadius = radius;
        bestGroup = group;
      }
    }

    const radius = bestRadius || getBoardRadius(best);
    if (!radius) {
      return null;
    }

    return {
      svg: best,
      group: bestGroup || best,
      radius,
    };
  }

  function ensureLens() {
    if (!isLensMode()) {
      return null;
    }
    if (lensContainer && document.body && document.body.contains(lensContainer)) {
      return lensContainer;
    }
    if (!document.body) {
      if (!lensInitPending) {
        lensInitPending = true;
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            lensInitPending = false;
            ensureLens();
          },
          { once: true }
        );
      }
      return null;
    }

    lensContainer = document.getElementById(LENS_ID);
    if (!lensContainer) {
      lensContainer = document.createElement("div");
      lensContainer.id = LENS_ID;
      lensContainer.setAttribute("aria-hidden", "true");
      lensContainer.dataset.adExtCamzoomLens = "true";
      document.body.appendChild(lensContainer);
    }

    lensSvg = lensContainer.querySelector("svg");
    if (!lensSvg) {
      lensSvg = document.createElementNS(SVG_NS, "svg");
      lensSvg.setAttribute("aria-hidden", "true");
      lensSvg.setAttribute("focusable", "false");
      lensSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      lensSvg.dataset.adExtCamzoomLens = "true";
      lensContainer.appendChild(lensSvg);
    }

    attachLensListeners();
    applyLensStyles();
    return lensContainer;
  }

  function attachLensListeners() {
    if (lensListenersAttached || !lensContainer) {
      return;
    }
    lensListenersAttached = true;
    lensContainer.addEventListener("click", handleLensPointer, true);
    lensContainer.addEventListener("pointerdown", handleLensPointer, true);
    lensContainer.addEventListener("pointerup", handleLensPointer, true);
  }

  function maybeSuppressLensClick(event) {
    if (!event || event.type !== "click") {
      return;
    }
    if (CONFIG.lensHideOnClick) {
      suppressLens(CONFIG.lensClickSuppressMs);
    }
  }

  function handleLensPointer(event) {
    if (!CONFIG.lensAllowClicks || !lensContainer) {
      maybeSuppressLensClick(event);
      return;
    }
    if (!activeZoom || activeZoom.mode !== "lens" || !activeZoom.boardSvg) {
      maybeSuppressLensClick(event);
      return;
    }
    const rect = lensContainer.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) {
      maybeSuppressLensClick(event);
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = Math.min(rect.width, rect.height) / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const insideCircle = dx * dx + dy * dy <= radius * radius;

    let targetPoint = null;
    if (insideCircle && activeZoom.lensViewBox) {
      const relX = (event.clientX - rect.left) / rect.width;
      const relY = (event.clientY - rect.top) / rect.height;
      const vb = activeZoom.lensViewBox;
      const svgX = vb.x + relX * vb.width;
      const svgY = vb.y + relY * vb.height;
      targetPoint = mapPointToScreen(activeZoom.boardSvg, {
        x: svgX,
        y: svgY,
      });
    } else {
      targetPoint = { x: event.clientX, y: event.clientY };
    }

    if (!targetPoint) {
      maybeSuppressLensClick(event);
      return;
    }

    const prevPointer = lensContainer.style.pointerEvents;
    lensContainer.style.pointerEvents = "none";
    const targetEl = document.elementFromPoint(
      targetPoint.x,
      targetPoint.y
    );
    lensContainer.style.pointerEvents = prevPointer;

    if (!targetEl) {
      maybeSuppressLensClick(event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const init = {
      bubbles: true,
      cancelable: true,
      clientX: targetPoint.x,
      clientY: targetPoint.y,
      screenX: Number.isFinite(event.screenX) ? event.screenX : targetPoint.x,
      screenY: Number.isFinite(event.screenY) ? event.screenY : targetPoint.y,
      button: event.button || 0,
      buttons: Number.isFinite(event.buttons) ? event.buttons : 1,
    };
    if ("pointerId" in event) {
      init.pointerId = event.pointerId;
      init.pointerType = event.pointerType || "mouse";
      init.isPrimary = event.isPrimary;
      init.width = event.width;
      init.height = event.height;
      init.pressure = event.pressure;
      init.tiltX = event.tiltX;
      init.tiltY = event.tiltY;
      init.twist = event.twist;
      init.azimuthAngle = event.azimuthAngle;
      init.altitudeAngle = event.altitudeAngle;
    }

    if (event.type === "click") {
      targetEl.dispatchEvent(new MouseEvent("click", init));
    } else {
      targetEl.dispatchEvent(
        typeof PointerEvent === "function"
          ? new PointerEvent(event.type, init)
          : new MouseEvent(event.type, init)
      );
    }

    maybeSuppressLensClick(event);
  }

  function applyLensStyles() {
    if (!lensContainer) {
      return;
    }
    const size = Math.max(80, Number.parseFloat(CONFIG.lensDiameterPx) || 200);
    const borderPx = Math.max(0, Number.parseFloat(CONFIG.lensBorderPx) || 0);
    const opacity = Math.max(
      0,
      Math.min(1, Number.parseFloat(CONFIG.lensOpacity) || 1)
    );
    const glowDuration = Math.max(
      0,
      Number.parseInt(CONFIG.lensGlowDurationMs, 10) || 0
    );
    const glowColor = CONFIG.lensGlowColor || "rgba(159, 219, 88, 0.6)";

    lensContainer.style.width = `${size}px`;
    lensContainer.style.height = `${size}px`;
    lensContainer.style.border = `${borderPx}px solid ${
      CONFIG.lensBorderColor || "rgba(255, 255, 255, 0.75)"
    }`;
    lensContainer.style.setProperty(
      "--ad-ext-lens-shadow",
      CONFIG.lensShadow || "none"
    );
    lensContainer.style.setProperty("--ad-ext-lens-glow", glowColor);
    lensContainer.style.setProperty(
      "--ad-ext-lens-z",
      String(Number.parseInt(CONFIG.lensZIndex, 10) || 150)
    );
    if (glowDuration > 0) {
      lensContainer.style.setProperty(
        "--ad-ext-lens-glow-duration",
        `${glowDuration}ms`
      );
      if (lensContainer.style.animation === "none") {
        lensContainer.style.animation = "";
      }
    } else {
      lensContainer.style.setProperty("--ad-ext-lens-glow-duration", "0ms");
      lensContainer.style.animation = "none";
    }
    lensContainer.style.boxShadow = "var(--ad-ext-lens-shadow)";
    lensContainer.style.background = CONFIG.lensBackground || "transparent";
    lensContainer.style.opacity = String(opacity);
    lensContainer.style.pointerEvents = CONFIG.lensAllowClicks ? "auto" : "none";
    lensContainer.style.cursor = CONFIG.lensAllowClicks
      ? CONFIG.lensCursor || "crosshair"
      : "default";
    lensContainer.style.borderRadius = "50%";
    lensContainer.style.overflow = "hidden";
    lensContainer.style.position = "fixed";
    lensContainer.style.zIndex =
      String(Number.parseInt(CONFIG.lensZIndex, 10) || 150);

    if (lensSvg) {
      lensSvg.style.width = "100%";
      lensSvg.style.height = "100%";
      lensSvg.style.display = "block";
    }
  }

  function hideLens() {
    if (!lensContainer) {
      return;
    }
    lensContainer.style.opacity = "0";
    lensContainer.style.left = "-9999px";
    lensContainer.style.top = "-9999px";
    lensContainer.style.pointerEvents = "none";
  }

  function syncLensContent(boardSvg, force) {
    if (!lensSvg || !boardSvg) {
      return false;
    }
    const now = performance.now();
    const refreshMs = Math.max(
      0,
      Number.parseInt(CONFIG.lensRefreshMs, 10) || 0
    );
    if (
      !force &&
      lensSourceSvg === boardSvg &&
      refreshMs > 0 &&
      now - lensLastRefresh < refreshMs
    ) {
      return false;
    }

    lensSourceSvg = boardSvg;
    lensLastRefresh = now;

    const clone = boardSvg.cloneNode(true);
    clone.querySelectorAll("defs").forEach((defs) => defs.remove());
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    lensSvg.innerHTML = "";
    lensGroup = document.createElementNS(SVG_NS, "g");
    lensGroup.dataset.adExtCamzoomLens = "true";
    lensGroup.innerHTML = clone.innerHTML;
    lensSvg.appendChild(lensGroup);

    const viewBox = getViewBox(boardSvg);
    if (viewBox) {
      lensSvg.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
      );
    }

    const preserve = boardSvg.getAttribute("preserveAspectRatio");
    if (preserve) {
      lensSvg.setAttribute("preserveAspectRatio", preserve);
    }
    return true;
  }

  function getViewBox(svg) {
    if (!svg) {
      return null;
    }
    const baseVal = svg.viewBox && svg.viewBox.baseVal;
    if (
      baseVal &&
      Number.isFinite(baseVal.width) &&
      Number.isFinite(baseVal.height) &&
      baseVal.width > 0 &&
      baseVal.height > 0
    ) {
      return {
        x: baseVal.x,
        y: baseVal.y,
        width: baseVal.width,
        height: baseVal.height,
      };
    }

    const attr = svg.getAttribute("viewBox");
    if (attr) {
      const parts = attr
        .trim()
        .split(/[ ,]+/)
        .map((value) => Number.parseFloat(value));
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        return {
          x: parts[0],
          y: parts[1],
          width: parts[2],
          height: parts[3],
        };
      }
    }

    const width = Number.parseFloat(svg.getAttribute("width"));
    const height = Number.parseFloat(svg.getAttribute("height"));
    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return { x: 0, y: 0, width, height };
    }

    try {
      const bbox = svg.getBBox();
      if (
        bbox &&
        Number.isFinite(bbox.width) &&
        Number.isFinite(bbox.height) &&
        bbox.width > 0 &&
        bbox.height > 0
      ) {
        return {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        };
      }
    } catch (error) {
      // ignore if not ready
    }

    return null;
  }

  function createSvgPoint(svg, x, y) {
    if (svg && typeof svg.createSVGPoint === "function") {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      return point;
    }
    if (typeof DOMPoint === "function") {
      return new DOMPoint(x, y);
    }
    return { x, y };
  }

  function transformPoint(point, matrix) {
    if (!point || !matrix) {
      return { x: point ? point.x : 0, y: point ? point.y : 0 };
    }
    if (typeof point.matrixTransform === "function") {
      const transformed = point.matrixTransform(matrix);
      return { x: transformed.x, y: transformed.y };
    }
    const x = point.x;
    const y = point.y;
    return {
      x: x * matrix.a + y * matrix.c + matrix.e,
      y: x * matrix.b + y * matrix.d + matrix.f,
    };
  }

  function mapPointToSvg(element, point) {
    if (!element || !point) {
      return null;
    }
    const svg = element.ownerSVGElement || element;
    const matrix = element.getCTM ? element.getCTM() : null;
    if (!matrix) {
      return { x: point.x, y: point.y };
    }
    const basePoint = createSvgPoint(svg, point.x, point.y);
    return transformPoint(basePoint, matrix);
  }

  function getSvgCenter(board) {
    if (!board || !board.svg) {
      return { x: 0, y: 0 };
    }
    const viewBox = getViewBox(board.svg);
    if (viewBox) {
      return {
        x: viewBox.x + viewBox.width / 2,
        y: viewBox.y + viewBox.height / 2,
      };
    }
    return { x: board.radius, y: board.radius };
  }

  function getTargetPointSvg(board, target) {
    if (!board || !target) {
      return null;
    }
    const center = getSvgCenter(board);
    if (target.ring === "DB") {
      return center;
    }

    const angles = segmentAngles(target.value);
    if (!angles) {
      return null;
    }
    const angle = (angles.start + angles.end) / 2;

    let ringRatio = 0;
    if (target.ring === "T") {
      ringRatio =
        (CONFIG.ringRatios.tripleInner + CONFIG.ringRatios.tripleOuter) / 2;
    } else if (target.ring === "D") {
      ringRatio =
        (CONFIG.ringRatios.doubleInner + CONFIG.ringRatios.doubleOuter) / 2;
    } else {
      ringRatio =
        (CONFIG.ringRatios.tripleOuter + CONFIG.ringRatios.doubleInner) / 2;
    }

    const offset = polar(board.radius * ringRatio, angle);
    return { x: center.x + offset.x, y: center.y + offset.y };
  }

  function mapPointToScreen(element, point) {
    if (!element || !point) {
      return null;
    }
    const svg = element.ownerSVGElement || element;
    const screenMatrix = element.getScreenCTM ? element.getScreenCTM() : null;
    if (screenMatrix) {
      const basePoint = createSvgPoint(svg, point.x, point.y);
      return transformPoint(basePoint, screenMatrix);
    }

    if (svg && svg.getBoundingClientRect) {
      const svgPoint = mapPointToSvg(element, point);
      const viewBox = getViewBox(svg);
      const rect = svg.getBoundingClientRect();
      if (svgPoint && viewBox && rect && rect.width && rect.height) {
        const scaleX = rect.width / viewBox.width;
        const scaleY = rect.height / viewBox.height;
        return {
          x: rect.left + (svgPoint.x - viewBox.x) * scaleX,
          y: rect.top + (svgPoint.y - viewBox.y) * scaleY,
        };
      }
    }

    return null;
  }

  function renderLens(scale) {
    if (!activeZoom || !lensContainer || !lensSvg) {
      return;
    }
    if (isLensSuppressed()) {
      hideLens();
      return;
    }
    const boardGroup = activeZoom.board;
    if (!boardGroup) {
      return;
    }
    const boardSvg =
      activeZoom.boardSvg || boardGroup.ownerSVGElement || boardGroup;
    if (!boardSvg) {
      return;
    }

    syncLensContent(boardSvg, false);

    const originSvg = activeZoom.originSvg;
    if (!originSvg) {
      return;
    }
    const screenPoint = mapPointToScreen(boardSvg, originSvg);
    if (!screenPoint) {
      return;
    }

    applyLensStyles();
    const size = Math.max(80, Number.parseFloat(CONFIG.lensDiameterPx) || 200);
    const offsetX = Number.parseFloat(CONFIG.lensOffsetX) || 0;
    const offsetY = Number.parseFloat(CONFIG.lensOffsetY) || 0;
    lensContainer.style.left = `${screenPoint.x - size / 2 + offsetX}px`;
    lensContainer.style.top = `${screenPoint.y - size / 2 + offsetY}px`;
    lensContainer.style.opacity = String(
      Math.max(0, Math.min(1, Number.parseFloat(CONFIG.lensOpacity) || 1))
    );
    if (CONFIG.lensAllowClicks) {
      lensContainer.style.pointerEvents = "auto";
    }

    const viewBox = getViewBox(boardSvg);
    if (!viewBox) {
      return;
    }
    const scaleValue = Math.max(1.01, getLensScale(scale, boardSvg));
    const vbWidth = viewBox.width / scaleValue;
    const vbHeight = viewBox.height / scaleValue;
    const vbX = originSvg.x - vbWidth / 2;
    const vbY = originSvg.y - vbHeight / 2;
    lensSvg.setAttribute("viewBox", `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
    activeZoom.lensViewBox = { x: vbX, y: vbY, width: vbWidth, height: vbHeight };
    if (lensGroup) {
      lensGroup.removeAttribute("transform");
    }
  }

  function getBoardCenter(board) {
    const group = board.group || board.svg;
    try {
      const bbox = group.getBBox();
      if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height)) {
        return {
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2,
        };
      }
    } catch (error) {
      // ignore if not yet rendered
    }
    return { x: 0, y: 0 };
  }

  function getTargetPoint(board, target) {
    if (!target) {
      return null;
    }
    const center = getBoardCenter(board);
    if (target.ring === "DB") {
      return center;
    }

    const angles = segmentAngles(target.value);
    if (!angles) {
      return null;
    }
    const angle = (angles.start + angles.end) / 2;

    let ringRatio = 0;
    if (target.ring === "T") {
      ringRatio =
        (CONFIG.ringRatios.tripleInner + CONFIG.ringRatios.tripleOuter) / 2;
    } else if (target.ring === "D") {
      ringRatio =
        (CONFIG.ringRatios.doubleInner + CONFIG.ringRatios.doubleOuter) / 2;
    } else {
      ringRatio =
        (CONFIG.ringRatios.tripleOuter + CONFIG.ringRatios.doubleInner) / 2;
    }

    const offset = polar(board.radius * ringRatio, angle);
    return { x: center.x + offset.x, y: center.y + offset.y };
  }

  function buildTransform(origin, scale) {
    if (!origin || scale === 1) {
      return "";
    }
    const x = Number(origin.x.toFixed(3));
    const y = Number(origin.y.toFixed(3));
    return `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`;
  }

  function applyTransform(element, transformValue) {
    if (!element) {
      return;
    }
    if (!baseTransformByElement.has(element)) {
      baseTransformByElement.set(
        element,
        element.getAttribute("transform") || ""
      );
    }
    const baseTransform = baseTransformByElement.get(element) || "";
    const merged = [baseTransform, transformValue].filter(Boolean).join(" ");
    if (merged) {
      element.setAttribute("transform", merged.trim());
    } else {
      element.removeAttribute("transform");
    }
  }

  function clearTransform(element) {
    if (!element) {
      return;
    }
    if (!baseTransformByElement.has(element)) {
      element.classList.remove("ad-ext-camzoom-active");
      restoreOverflow();
      return;
    }
    const baseTransform = baseTransformByElement.get(element) || "";
    if (baseTransform) {
      element.setAttribute("transform", baseTransform);
    } else {
      element.removeAttribute("transform");
    }
    element.classList.remove("ad-ext-camzoom-active");
    baseTransformByElement.delete(element);
    restoreOverflow();
  }

  function rememberOverflow(element) {
    if (!element || overflowOriginal.has(element)) {
      return;
    }
    overflowOriginal.set(element, element.style.overflow || "");
    overflowTouched.add(element);
  }

  function applyOverflow(boardSvg) {
    if (!isTransformMode() || !CONFIG.allowOverflow || !boardSvg) {
      return;
    }
    let current = boardSvg;
    let level = 0;
    const maxLevel = Math.max(0, CONFIG.overflowParentLevels || 0);
    while (current && level <= maxLevel) {
      rememberOverflow(current);
      current.style.overflow = "visible";
      current = current.parentElement;
      level += 1;
    }
  }

  function restoreOverflow() {
    if (!overflowTouched.size) {
      return;
    }
    overflowTouched.forEach((element) => {
      const original = overflowOriginal.get(element);
      if (original !== undefined) {
        element.style.overflow = original;
      } else {
        element.style.overflow = "";
      }
    });
    overflowTouched.clear();
  }

  function countDartMarkers(boardSvg) {
    if (!boardSvg) {
      return 0;
    }
    const minR = Math.max(0, Number.parseFloat(CONFIG.dartMarkerMinRadius) || 0);
    const maxR = Math.max(minR, Number.parseFloat(CONFIG.dartMarkerMaxRadius) || 6);
    const circles = boardSvg.querySelectorAll("circle");
    let count = 0;
    circles.forEach((circle) => {
      if (circle.closest && circle.closest("defs,mask,clipPath,pattern,symbol")) {
        return;
      }
      const r = Number.parseFloat(circle.getAttribute("r"));
      if (!Number.isFinite(r)) {
        return;
      }
      if (r >= minR && r <= maxR) {
        count += 1;
      }
    });
    return count;
  }

  function parseThrowText(text) {
    const cleaned = (text || "").trim().toUpperCase();
    if (!cleaned || cleaned === "-" || cleaned === "MISS") {
      return null;
    }
    if (
      !CONFIG.allowBareNumbersInThrows &&
      /^[0-9]{1,2}$/.test(cleaned)
    ) {
      return null;
    }

    const tokens =
      cleaned.match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];
    let fallback = null;
    for (const token of tokens) {
      if (token === "DB" || token === "BULL" || token === "BULLSEYE") {
        return { ring: "DB" };
      }
      if (token === "SB" || token === "OB") {
        return { ring: "SB" };
      }
      const prefix = token[0];
      const hasPrefix = prefix === "T" || prefix === "D" || prefix === "S";
      const value = Number.parseInt(hasPrefix ? token.slice(1) : token, 10);
      if (!Number.isFinite(value)) {
        continue;
      }
      if (prefix === "D" && value === 25) {
        return { ring: "DB" };
      }
      if (value < 1 || value > 20) {
        continue;
      }
      const candidate = { ring: hasPrefix ? prefix : "S", value };
      if (hasPrefix) {
        return candidate;
      }
      if (CONFIG.allowBareNumbersInThrows && !fallback) {
        fallback = candidate;
      }
    }
    return CONFIG.allowBareNumbersInThrows ? fallback : null;
  }

  function getCurrentThrows() {
    const best = selectBestThrowNodes();
    if (!best) {
      return [];
    }
    const throwsList = best.parsed;
    if (throwsList.length <= 3) {
      return throwsList;
    }
    const order = CONFIG.throwOrder === "first" ? "first" : "latest";
    return order === "first" ? throwsList.slice(0, 3) : throwsList.slice(-3);
  }

  function isT20Throw(entry) {
    return Boolean(entry && entry.ring === "T" && entry.value === 20);
  }

  function isT20Pair(list) {
    return (
      Array.isArray(list) &&
      list.length === 2 &&
      isT20Throw(list[0]) &&
      isT20Throw(list[1])
    );
  }

  function isTwoT20BeforeThird(boardSvg) {
    const throwsList = getCurrentThrows();
    if (throwsList.length < 2) {
      return false;
    }
    const firstTwo = throwsList.slice(0, 2);
    const lastTwo =
      throwsList.length >= 2 ? throwsList.slice(-2) : firstTwo;
    const hasT20Pair = isT20Pair(firstTwo) || isT20Pair(lastTwo);
    if (!hasT20Pair) {
      return false;
    }
    if (boardSvg && countDartMarkers(boardSvg) >= 3) {
      return false;
    }
    if (throwsList.length >= 3 && !boardSvg) {
      return false;
    }
    return true;
  }

  function parseFinalDouble(text) {
    const cleaned = (text || "").trim();
    if (!cleaned) {
      return null;
    }
    const tokens =
      cleaned.toUpperCase().match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];
    let lastDouble = null;
    for (const token of tokens) {
      if (token === "DB" || token === "BULLSEYE" || token === "BULL") {
        lastDouble = { ring: "DB" };
        continue;
      }
      if (token === "SB" || token === "OB") {
        continue;
      }

      const prefix = token[0];
      const value = Number.parseInt(
        prefix === "T" || prefix === "D" || prefix === "S"
          ? token.slice(1)
          : token,
        10
      );
      if (!Number.isFinite(value)) {
        continue;
      }
      if (prefix === "D" && value === 25) {
        lastDouble = { ring: "DB" };
        continue;
      }
      if (value < 1 || value > 20) {
        continue;
      }
      if (prefix === "D") {
        lastDouble = { ring: "D", value };
      }
    }
    return lastDouble;
  }

  function parseSuggestionSequence(text) {
    const cleaned = (text || "").trim();
    if (!cleaned) {
      return [];
    }
    const tokens =
      cleaned.toUpperCase().match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];
    const sequence = [];
    tokens.forEach((token) => {
      if (token === "DB" || token === "BULL" || token === "BULLSEYE") {
        sequence.push({ ring: "DB" });
        return;
      }
      if (token === "SB" || token === "OB") {
        return;
      }
      const prefix = token[0];
      const value = Number.parseInt(
        prefix === "T" || prefix === "D" || prefix === "S"
          ? token.slice(1)
          : token,
        10
      );
      if (!Number.isFinite(value)) {
        return;
      }
      if (prefix === "D" && value === 25) {
        sequence.push({ ring: "DB" });
        return;
      }
      if (value < 1 || value > 20) {
        return;
      }
      sequence.push({ ring: prefix === "T" || prefix === "D" || prefix === "S" ? prefix : "S", value });
    });
    return sequence;
  }

  function isCheckoutTarget(target) {
    return Boolean(target && (target.ring === "DB" || target.ring === "D"));
  }

  function getNextSuggestedTarget(sequence, throwsCount) {
    if (!Array.isArray(sequence) || !sequence.length) {
      return null;
    }
    const thrown = Math.max(
      0,
      Math.min(3, Number.parseInt(throwsCount, 10) || 0)
    );
    const remaining = Math.max(0, 3 - thrown);
    if (sequence.length > remaining) {
      const index = Math.min(sequence.length - 1, thrown);
      return sequence[index] || null;
    }
    return sequence[0] || null;
  }

  function getCheckoutTarget(throwsCount) {
    if (!CONFIG.enableCheckoutZoom) {
      return null;
    }
    const score = getActiveScoreValue();
    if (score === null || !isCheckoutPossibleFromScore(score)) {
      return null;
    }
    return getDirectCheckoutTargetFromScore(score);
  }

  function getDesiredZoom(board) {
    const throwsCount = getCurrentThrows().length;
    const checkoutTarget = getCheckoutTarget(throwsCount);
    const hasCheckout = Boolean(checkoutTarget);
    if (checkoutTarget) {
      const key =
        checkoutTarget.ring === "DB"
          ? "checkout:DB"
          : `checkout:D${checkoutTarget.value}`;
      return {
        key,
        type: "checkout",
        target: checkoutTarget,
        scale: getConfiguredScale(CONFIG.checkoutScale),
        board,
      };
    }

    if (
      CONFIG.enableT20Zoom &&
      (!CONFIG.t20RequiresNoCheckout || !hasCheckout) &&
      shouldShowT20Zoom(getTurnContainer(), board.svg)
    ) {
      return {
        key: "t20",
        type: "t20",
        target: { ring: "T", value: 20 },
        scale: getConfiguredScale(CONFIG.t20Scale),
        board,
      };
    }

    return null;
  }

  function startZoom(desired) {
    if (!desired || !desired.board) {
      return;
    }

    const board = desired.board;
    const boardGroup = board.group || board.svg;
    if (!boardGroup) {
      return;
    }
    const boardSvg = board.svg || boardGroup.ownerSVGElement || boardGroup;
    const mode = isLensMode() ? "lens" : "transform";

    const origin = getTargetPoint(board, desired.target);
    if (!origin) {
      return;
    }
    const originSvg = mode === "lens" ? getTargetPointSvg(board, desired.target) : null;
    if (mode === "lens" && !originSvg) {
      return;
    }

    if (mode === "lens") {
      ensureLens();
      syncLensContent(boardSvg, true);
    } else {
      applyOverflow(boardSvg);
    }

    const easing = EASING[CONFIG.zoomEasing] || EASING.easeInOutCubic;
    const now = performance.now();
    const scaleFrom =
      activeZoom && activeZoom.board === boardGroup
        ? activeZoom.currentScale || 1
        : 1;

    if (activeZoom) {
      if (activeZoom.animating) {
        cancelAnimationFrame(activeZoom.rafId);
      }
      if (activeZoom.board !== boardGroup && activeZoom.mode === "transform") {
        clearTransform(activeZoom.board);
      }
    }

    const overshoot =
      Math.max(0, Number.parseFloat(CONFIG.zoomOvershoot)) || 0;
    const overshootRatioRaw = Number.parseFloat(CONFIG.zoomOvershootRatio);
    const overshootRatio = Number.isFinite(overshootRatioRaw)
      ? Math.min(0.9, Math.max(0.5, overshootRatioRaw))
      : 0.7;
    const overshootScale =
      overshoot > 0 && desired.scale > scaleFrom
        ? clampScale(desired.scale + overshoot)
        : desired.scale;

    activeZoom = {
      key: desired.key,
      type: desired.type,
      mode,
      target: desired.target,
      scaleFrom,
      scaleTo: desired.scale,
      overshootScale,
      overshootRatio,
      origin,
      originSvg,
      board: boardGroup,
      boardSvg,
      easing,
      startTime: now,
      durationMs: Math.max(0, CONFIG.zoomDurationMs),
      currentScale: scaleFrom,
      animating: true,
      resetOnFinish: false,
      holdUntil: now + getHoldMs(desired.type),
    };

    if (mode === "transform") {
      boardGroup.classList.add("ad-ext-camzoom-active");
    }
    animateZoom();
  }

  function animateZoom() {
    if (!activeZoom) {
      return;
    }

    const now = performance.now();
    const elapsed = now - activeZoom.startTime;
    const duration = activeZoom.durationMs || 1;
    const progress = Math.min(1, Math.max(0, elapsed / duration));
    let scale;
    const hasOvershoot =
      activeZoom.overshootScale > activeZoom.scaleTo + 0.0001 &&
      activeZoom.scaleTo > activeZoom.scaleFrom;
    if (hasOvershoot) {
      const split = activeZoom.overshootRatio;
      if (progress < split) {
        const localT = progress / split;
        const eased = activeZoom.easing(localT);
        scale =
          activeZoom.scaleFrom +
          (activeZoom.overshootScale - activeZoom.scaleFrom) * eased;
      } else {
        const localT = (progress - split) / (1 - split);
        const eased = EASING.easeOutCubic(localT);
        scale =
          activeZoom.overshootScale +
          (activeZoom.scaleTo - activeZoom.overshootScale) * eased;
      }
    } else {
      const eased = activeZoom.easing(progress);
      scale =
        activeZoom.scaleFrom +
        (activeZoom.scaleTo - activeZoom.scaleFrom) * eased;
    }

    activeZoom.currentScale = scale;
    if (activeZoom.mode === "lens") {
      renderLens(scale);
    } else {
      const transformValue = buildTransform(activeZoom.origin, scale);
      applyTransform(activeZoom.board, transformValue);
    }

    if (progress < 1) {
      activeZoom.rafId = requestAnimationFrame(animateZoom);
      return;
    }

    activeZoom.animating = false;
    if (activeZoom.resetOnFinish && activeZoom.scaleTo === 1) {
      if (activeZoom.mode === "lens") {
        hideLens();
        activeZoom = null;
      } else {
        clearTransform(activeZoom.board);
        activeZoom = null;
      }
    }
  }

  function resetZoom() {
    if (!activeZoom) {
      return;
    }
    if (activeZoom.mode === "lens") {
      if (activeZoom.animating) {
        cancelAnimationFrame(activeZoom.rafId);
      }
      hideLens();
      activeZoom = null;
      return;
    }
    if (activeZoom.animating) {
      cancelAnimationFrame(activeZoom.rafId);
    }
    if (activeZoom.scaleTo === 1 && !activeZoom.animating) {
      clearTransform(activeZoom.board);
      activeZoom = null;
      return;
    }

    activeZoom.scaleFrom = activeZoom.currentScale || 1;
    activeZoom.scaleTo = 1;
    activeZoom.startTime = performance.now();
    activeZoom.animating = true;
    activeZoom.resetOnFinish = true;
    animateZoom();
  }

  function clearZoomInstant() {
    if (!activeZoom) {
      return;
    }
    if (activeZoom.animating) {
      cancelAnimationFrame(activeZoom.rafId);
    }
    if (activeZoom.mode === "lens") {
      hideLens();
      activeZoom = null;
      return;
    }
    clearTransform(activeZoom.board);
    activeZoom = null;
  }

  function updateZoom() {
    const now = performance.now();
    if (CONFIG.requireX01) {
      const isX01 = isX01Variant(CONFIG.variantElementId, {
        allowMissing: false,
        allowEmpty: false,
        allowNumeric: true,
      });
      if (!isX01) {
        if (shouldHold(now)) {
          return;
        }
        resetZoom();
        return;
      }
    }

    if (prefersReducedMotion()) {
      if (shouldHold(now)) {
        return;
      }
      resetZoom();
      return;
    }

    const board = findBoardSafe();
    if (!board) {
      if (shouldHold(now)) {
        return;
      }
      resetZoom();
      return;
    }
    const boardGroup = board.group || board.svg;
    const boardSvg = board.svg || boardGroup.ownerSVGElement || boardGroup;
    if (activeZoom && boardGroup && activeZoom.board !== boardGroup) {
      activeZoom.board = boardGroup;
      activeZoom.boardSvg = boardSvg;
      const newOrigin = getTargetPoint(board, activeZoom.target);
      if (newOrigin) {
        activeZoom.origin = newOrigin;
      }
      if (activeZoom.mode === "lens") {
        const newOriginSvg = getTargetPointSvg(board, activeZoom.target);
        if (newOriginSvg) {
          activeZoom.originSvg = newOriginSvg;
        }
      }
      if (activeZoom.animating) {
        cancelAnimationFrame(activeZoom.rafId);
        activeZoom.animating = false;
      }
      if (activeZoom.mode === "lens") {
        ensureLens();
        syncLensContent(boardSvg, true);
        renderLens(activeZoom.currentScale || activeZoom.scaleTo || 1);
      } else {
        applyOverflow(boardSvg);
        const transformValue = buildTransform(
          activeZoom.origin,
          activeZoom.currentScale || activeZoom.scaleTo || 1
        );
        applyTransform(boardGroup, transformValue);
        boardGroup.classList.add("ad-ext-camzoom-active");
      }
    }

    const desired = getDesiredZoom(board);
    if (!desired) {
      if (activeZoom && activeZoom.type === "t20") {
        clearZoomInstant();
        return;
      }
      if (shouldHold(now) || shouldKeepZoomWithoutTarget()) {
        if (activeZoom && activeZoom.mode === "lens") {
          renderLens(activeZoom.currentScale || activeZoom.scaleTo || 1);
        }
        return;
      }
      resetZoom();
      return;
    }

    if (activeZoom && activeZoom.key === desired.key) {
      activeZoom.holdUntil = now + getHoldMs(desired.type);
      activeZoom.type = desired.type;
      activeZoom.target = desired.target;
      activeZoom.board = boardGroup;
      activeZoom.boardSvg = boardSvg;
      const refreshedOrigin = getTargetPoint(board, desired.target);
      if (refreshedOrigin) {
        activeZoom.origin = refreshedOrigin;
      }
      if (activeZoom.mode === "lens") {
        const refreshedOriginSvg = getTargetPointSvg(board, desired.target);
        if (refreshedOriginSvg) {
          activeZoom.originSvg = refreshedOriginSvg;
        }
      }
      if (activeZoom.mode === "lens") {
        ensureLens();
        renderLens(activeZoom.currentScale || desired.scale || 1);
      }
      if (activeZoom.resetOnFinish || activeZoom.scaleTo !== desired.scale) {
        startZoom(desired);
      }
      return;
    }

    if (activeZoom && activeZoom.key !== desired.key) {
      clearZoomInstant();
    }

    startZoom(desired);
  }

  const scheduleUpdate = createRafScheduler(updateZoom);
  requestZoomUpdate = scheduleUpdate;

  ensureStyle(STYLE_ID, STYLE_TEXT);
  updateZoom();

  rootObserver = new MutationObserver(() => scheduleUpdate());
  getSearchRoots();

  observeMutations({ onChange: scheduleUpdate });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("scroll", scheduleUpdate, true);
  window.addEventListener("click", (event) => {
    if (!activeZoom) {
      return;
    }
    if (activeZoom.mode === "lens") {
      const target = event && event.target;
      const boardSvg =
        activeZoom.boardSvg ||
        (activeZoom.board && activeZoom.board.ownerSVGElement) ||
        activeZoom.board;
      const clickedLens =
        lensContainer && target && lensContainer.contains(target);
      const clickedBoard =
        boardSvg &&
        target &&
        typeof boardSvg.contains === "function" &&
        boardSvg.contains(target);
      if (clickedLens || clickedBoard) {
        suppressLens(CONFIG.lensClickSuppressMs);
      }
      return;
    }
    clearZoomInstant();
  });

  const pollMs = Math.max(0, Number.parseInt(CONFIG.pollIntervalMs, 10) || 0);
  if (pollMs > 0) {
    setInterval(scheduleUpdate, pollMs);
  }
  const scorePollMs = Math.max(0, Number.parseInt(CONFIG.scorePollMs, 10) || 0);
  if (scorePollMs > 0) {
    setInterval(() => {
      const currentScore = getActiveScoreValue();
      if (currentScore !== lastScoreValue) {
        lastScoreValue = currentScore;
        scheduleUpdate();
      }
    }, scorePollMs);
  }

  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleUpdate();
    }
  }, 800);
})();
