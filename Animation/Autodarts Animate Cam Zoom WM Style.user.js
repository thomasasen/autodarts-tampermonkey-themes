// ==UserScript==
// @name         Autodarts Animate Cam Zoom WM Style
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.1
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
 *
 * Lens-Mode (NEU):
 * - Kein SVG-Clone mehr.
 * - Die Lupe rendert live das, was auf dem Screen unter ihr liegt, indem sie Board-SVG und optionale Overlays
 *   per <use> in ein Lens-SVG spiegelt und in Screen-Koordinaten abbildet.
 * - Dadurch werden Darts aus "Dart Marker Darts" automatisch im Zoom sichtbar, wenn das Overlay existiert.
 * - Das Script funktioniert weiterhin allein (Overlay optional, keine Abhaengigkeit).
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
			SVG_NS
		} = window.autodartsAnimationShared;

		const XLINK_NS = "http://www.w3.org/1999/xlink";

		/**
   * Konfiguration fuer WM-TV-Style CamZoom.
   */
		const CONFIG = {
			variantElementId: "ad-ext-game-variant",
			suggestionSelector: ".suggestion",
			throwRowSelector: ".ad-ext-turn-throw",
			turnPlanSelector: ".ad-ext-turn-throw p.chakra-text",
			throwTextSelector: ".ad-ext-turn-throw p.chakra-text",
			turnContainerSelector: "#ad-ext-turn",
			activePlayerSelector: ".ad-ext-player-active",
			searchShadowRoots: true,
			throwOrder: "latest",
			allowBareNumbersInThrows: false,

			// Aktivierung
			requireX01: true,
			enableCheckoutZoom: true,
			enableT20Zoom: true,
			t20RequiresNoCheckout: true,
			respectReducedMotion: true,
			zoomMode: "lens", // "lens" | "transform"
			allowOverflow: true,
			overflowParentLevels: 2,
			checkoutFallbackFromTurnPlan: true,
			holdWhenTargetMissing: true,
			keepZoomUntilDartsCleared: true,
			checkoutHoldMs: 1600,
			t20HoldMs: 1100,
			pollIntervalMs: 300,
			scorePollMs: 300,

			// Lupen-Optik
			lensDiameterPx: 270,
			lensBorderPx: 2,
			lensBorderColor: "rgba(255, 255, 255, 0.75)",
			lensShadow: "0 18px 36px rgba(0, 0, 0, 0.45)",
			lensBackground: "rgba(0, 0, 0, 0.25)",
			lensOpacity: 1,
			lensOffsetX: 0,
			lensOffsetY: 0,

			// Overlay (optional)
			lensDartOverlaySelector: "#ad-ext-dart-image-overlay",

			// Screen-Lupe: Skalierung
			// baseScale kommt aus dem Zoom (checkoutScale/t20Scale * zoomMultiplier)
			// lensScaleMultiplier ist der optische Magnifier-Faktor der Lupe.
			lensScaleMultiplier: 1.6,
			lensMaxScale: 12,

			lensAllowClicks: true,
			lensHideOnClick: true,
			lensClickSuppressMs: 4000,
			lensCursor: "crosshair",
			lensGlowColor: "rgba(190, 255, 140, 1)",
			lensGlowDurationMs: 3200,
			lensZIndex: 150,

			// Zoom-Staerke
			zoomMultiplier: 1.7,
			checkoutScale: 1.1,
			t20Scale: 1.06,
			maxScale: 1.4,

			// Animations-Tempo
			zoomDurationMs: 420,
			zoomEasing: "easeInOutCubic",
			zoomOvershoot: 0.015,
			zoomOvershootRatio: 0.7,

			// Ring-Ratios
			ringRatios: {
				outerBullInner: 0.031112,
				outerBullOuter: 0.075556,
				tripleInner: 0.431112,
				tripleOuter: 0.475556,
				doubleInner: 0.711112,
				doubleOuter: 0.755556
			},

			// Dart-Erkennung
			dartMarkerMinRadius: 1,
			dartMarkerMaxRadius: 6,

			// Checkout-Guards
			useScoreCheckoutGuard: true,
			activeScoreSelector: ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, .ad-ext-player-active p.ad-ext-player-score",
			scoreSelector: "p.ad-ext-player-score",
			impossibleCheckoutScores: [
				169,
				168,
				166,
				165,
				163,
				162,
				159
			]
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
  pointer-events: none; /* Events werden vom Container geforwarded */
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

		const IMPOSSIBLE_CHECKOUTS = new Set(Array.isArray(CONFIG.impossibleCheckoutScores) ? CONFIG.impossibleCheckoutScores : []);

		const EASING = {
			linear: (t) => t,
			easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
			easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
		};

		const ROOT_CACHE_MS = 1000;

		const baseTransformByElement = new WeakMap();
		const overflowOriginal = new WeakMap();
		const overflowTouched = new Set();
		const LENS_ID = "ad-ext-camzoom-lens";

		let lensContainer = null;
		let lensSvg = null;
		let lensScene = null;
		let lensBoardUse = null;
		let lensOverlayUse = null;

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
			if (! CONFIG.respectReducedMotion || !window.matchMedia) {
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
			if (! ms) {
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
			if (! CONFIG.searchShadowRoots) {
				return roots;
			}
			const rootNode = document.documentElement;
			if (! rootNode || typeof document.createTreeWalker !== "function") {
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
			if (! rootObserver || ! root || observedRoots.has(root)) {
				return;
			}
			if (root.nodeType === Node.DOCUMENT_NODE) {
				return;
			}
			const target = root.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? root : null;
			if (! target) {
				return;
			}
			rootObserver.observe(target, {
				childList: true,
				subtree: true,
				characterData: true,
				attributes: true
			});
			observedRoots.add(root);
		}

		function getSearchRoots() {
			if (! CONFIG.searchShadowRoots) {
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
			if (! selector) {
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
					if (! seen.has(node)) {
						seen.add(node);
						results.push(node);
					}
				});
			});
			return results;
		}

		function collectNodesInContainer(containerSelector, itemSelector) {
			if (! containerSelector || ! itemSelector) {
				return [];
			}
			const results = [];
			const roots = getSearchRoots();
			roots.forEach((root) => {
				if (!root || typeof root.querySelectorAll !== "function") {
					return;
				}
				root.querySelectorAll(containerSelector).forEach((container) => {
					container.querySelectorAll(itemSelector).forEach((node) => results.push(node));
				});
			});
			return results;
		}

		function normalizeText(text) {
			return String(text || "").replace(/\s+/g, " ").trim();
		}

		function parseScore(text) {
			if (! text) {
				return null;
			}
			const match = String(text).match(/\d+/);
			if (! match) {
				return null;
			}
			const value = Number(match[0]);
			return Number.isFinite(value) ? value : null;
		}

		function getActiveScoreValue() {
			if (! CONFIG.useScoreCheckoutGuard) {
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
			return ! IMPOSSIBLE_CHECKOUTS.has(score);
		}

		function getDirectCheckoutTargetFromScore(score) {
			if (!Number.isFinite(score)) {
				return null;
			}
			if (score === 50) {
				return {ring: "DB"};
			}
			if (score % 2 !== 0) {
				return null;
			}
			const value = score / 2;
			if (value < 1 || value > 20) {
				return null;
			}
			return {ring: "D", value};
		}

		function getThrowTextFromRow(row) {
			if (! row || row.nodeType !== Node.ELEMENT_NODE) {
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
			if (! CONFIG.turnContainerSelector) {
				return null;
			}
			const turns = queryAllInRoots(CONFIG.turnContainerSelector);
			return turns.length ? turns[0] : null;
		}

		function getSuggestionTextFromTurn(turn) {
			if (! turn || ! CONFIG.suggestionSelector) {
				return "";
			}
			const suggestion = turn.querySelector(CONFIG.suggestionSelector);
			return suggestion ? normalizeText(suggestion.textContent || "") : "";
		}

		function parseSuggestionSequence(text) {
			const cleaned = (text || "").trim();
			if (! cleaned) {
				return [];
			}
			const tokens = cleaned.toUpperCase().match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];
			const sequence = [];
			tokens.forEach((token) => {
				if (token === "DB" || token === "BULL" || token === "BULLSEYE") {
					sequence.push({ring: "DB"});
					return;
				}
				if (token === "SB" || token === "OB") {
					return;
				}
				const prefix = token[0];
				const value = Number.parseInt(prefix === "T" || prefix === "D" || prefix === "S" ? token.slice(1) : token, 10);
				if (!Number.isFinite(value)) {
					return;
				}
				if (prefix === "D" && value === 25) {
					sequence.push({ring: "DB"});
					return;
				}
				if (value < 1 || value > 20) {
					return;
				}
				sequence.push({
					ring: prefix === "T" || prefix === "D" || prefix === "S" ? prefix : "S",
					value
				});
			});
			return sequence;
		}

		function parseThrowText(text) {
			const cleaned = (text || "").trim().toUpperCase();
			if (! cleaned || cleaned === "-" || cleaned === "MISS") {
				return null;
			}
			if (! CONFIG.allowBareNumbersInThrows && /^[0-9]{1,2}$/.test(cleaned)) {
				return null;
			}

			const tokens = cleaned.match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];
			let fallback = null;
			for (const token of tokens) {
				if (token === "DB" || token === "BULL" || token === "BULLSEYE") {
					return {ring: "DB"};
				}
				if (token === "SB" || token === "OB") {
					return {ring: "SB"};
				}
				const prefix = token[0];
				const hasPrefix = prefix === "T" || prefix === "D" || prefix === "S";
				const value = Number.parseInt(hasPrefix ? token.slice(1) : token, 10);
				if (!Number.isFinite(value)) {
					continue;
				}
				if (prefix === "D" && value === 25) {
					return {ring: "DB"};
				}
				if (value < 1 || value > 20) {
					continue;
				}
				const candidate = {
					ring: hasPrefix ? prefix : "S",
					value
				};
				if (hasPrefix) {
					return candidate;
				}
				if (CONFIG.allowBareNumbersInThrows && ! fallback) {
					fallback = candidate;
				}
			}
			return CONFIG.allowBareNumbersInThrows ? fallback : null;
		}

		function collectParsedThrows(nodes, isRow) {
			const throwsList = [];
			nodes.forEach((node) => {
				const text = isRow ? getThrowTextFromRow(node) : node.textContent || "";
				const parsed = parseThrowText(text);
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
					nodes: collectNodesInContainer(CONFIG.turnContainerSelector, CONFIG.throwRowSelector)
				});
			}

			if (CONFIG.activePlayerSelector) {
				scopes.push({
					weight: 2,
					nodes: collectNodesInContainer(CONFIG.activePlayerSelector, CONFIG.throwRowSelector)
				});
			}

			scopes.push({
				weight: 1,
				nodes: queryAllInRoots(CONFIG.throwRowSelector)
			});

			let best = null;
			scopes.forEach((scope) => {
				if (!scope.nodes.length) {
					return;
				}
				const parsed = collectParsedThrows(scope.nodes, true);
				if (! parsed.length) {
					return;
				}
				if (! best || parsed.length > best.parsed.length || (parsed.length === best.parsed.length && scope.weight > best.weight)) {
					best = {
						nodes: scope.nodes,
						parsed,
						weight: scope.weight,
						isRow: true
					};
				}
			});

			if (best) {
				return best;
			}

			const textNodes = queryAllInRoots(CONFIG.throwTextSelector);
			if (! textNodes.length) {
				return null;
			}
			const parsed = collectParsedThrows(textNodes, false);
			if (! parsed.length) {
				return null;
			}
			return {nodes: textNodes, parsed, weight: 0, isRow: false};
		}

		function getCurrentThrows() {
			const best = selectBestThrowNodes();
			if (! best) {
				return [];
			}
			const throwsList = best.parsed;
			if (throwsList.length<= 3) {
      return throwsList;
    }
    const order = CONFIG.throwOrder === "first" ? "first" : "latest";
    return order === "first" ? throwsList.slice(0, 3) : throwsList.slice(-3);
  }

  function isT20Throw(entry) {
    return Boolean(entry && entry.ring === "T" && entry.value === 20);
  }

  function isSuggestionBlockingT20(turn) {
    const text = getSuggestionTextFromTurn(turn);
    if (!text) {
      return false;
    }
    const sequence = parseSuggestionSequence(text);
    return !(sequence.length === 1 && isT20Throw(sequence[0]));
  }

  function countDartMarkers(boardSvg) {
    if (!boardSvg) {
      return 0;
    }
    const minR = Math.max(0, Number.parseFloat(CONFIG.dartMarkerMinRadius) || 0);
    const maxR = Math.max(
      minR, Number.parseFloat(CONFIG.dartMarkerMaxRadius) || 6
    );
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
			}) 

				return count;
			
		}

		function shouldShowT20Zoom(turn, boardSvg) {
			if (! turn) {
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

		function getHoldMs(type) {
			if (type === "checkout") {
				return Math.max(0, Number.parseInt(CONFIG.checkoutHoldMs, 10) || 0);
			}
			return Math.max(0, Number.parseInt(CONFIG.t20HoldMs, 10) || 0);
		}

		function shouldHold(now) {
			return Boolean(CONFIG.holdWhenTargetMissing && activeZoom && activeZoom.type !== "t20" && activeZoom.holdUntil && now < activeZoom.holdUntil);
		}

		function shouldKeepZoomWithoutTarget() {
			if (! CONFIG.keepZoomUntilDartsCleared || ! activeZoom) {
				return false;
			}
			if (activeZoom.type === "t20") {
				return false;
			}
			const throwsList = getCurrentThrows();
			if (throwsList.length > 0) {
				return true;
			}
			const boardSvg = activeZoom.boardSvg || (activeZoom.board && activeZoom.board.ownerSVGElement);
			if (! boardSvg) {
				return false;
			}
			return countDartMarkers(boardSvg) > 0;
		}

		function isLensMode() {
			return CONFIG.zoomMode === "lens";
		}

		function isLensSvg(svg) {
			if (! svg) {
				return false;
			}
			if (svg.dataset && svg.dataset.adExtCamzoomLens) {
				return true;
			}
			return Boolean(svg.closest && svg.closest(`#${LENS_ID}`));
		}

		function findBoardSafe() {
			const svgs = queryAllInRoots("svg").filter((svg) => ! isLensSvg(svg));
			if (! svgs.length) {
				return null;
			}

			let best = null;
			let bestScore = -1;

			for (const svg of svgs) {
				const numbers = new Set([... svg.querySelectorAll("text")].map((text) => Number.parseInt(text.textContent, 10)).filter((value) => value >= 1 && value <= 20));
				const numberScore = numbers.size;
				const radius = getBoardRadius(svg);
				const score = numberScore * 1000 + radius;
				if (score > bestScore) {
					best = svg;
					bestScore = score;
				}
			}

			if (! best) {
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
			if (! radius) {
				return null;
			}

			return {
				svg: best,
				group: bestGroup || best,
				radius
			};
		}

		function ensureLens() {
			if (! isLensMode()) {
				return null;
			}
			if (lensContainer && document.body && document.body.contains(lensContainer)) {
				return lensContainer;
			}
			if (!document.body) {
				if (! lensInitPending) {
					lensInitPending = true;
					document.addEventListener("DOMContentLoaded", () => {
						lensInitPending = false;
						ensureLens();
					}, {once: true});
				}
				return null;
			}

			lensContainer = document.getElementById(LENS_ID);
			if (! lensContainer) {
				lensContainer = document.createElement("div");
				lensContainer.id = LENS_ID;
				lensContainer.setAttribute("aria-hidden", "true");
				lensContainer.dataset.adExtCamzoomLens = "true";
				document.body.appendChild(lensContainer);
			}

			lensSvg = lensContainer.querySelector("svg");
			if (! lensSvg) {
				lensSvg = document.createElementNS(SVG_NS, "svg");
				lensSvg.setAttribute("aria-hidden", "true");
				lensSvg.setAttribute("focusable", "false");
				lensSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
				lensSvg.dataset.adExtCamzoomLens = "true";
				lensContainer.appendChild(lensSvg);
			}

			if (! lensScene) {
				lensScene = document.createElementNS(SVG_NS, "g");
				lensScene.dataset.adExtCamzoomLens = "true";
				lensSvg.appendChild(lensScene);
			}

			attachLensListeners();
			applyLensStyles();
			return lensContainer;
		}

		function attachLensListeners() {
			if (lensListenersAttached || ! lensContainer) {
				return;
			}
			lensListenersAttached = true;
			lensContainer.addEventListener("click", handleLensPointer, true);
			lensContainer.addEventListener("pointerdown", handleLensPointer, true);
			lensContainer.addEventListener("pointerup", handleLensPointer, true);
		}

		function maybeSuppressLensInteraction(event) {
			// WICHTIG: In vielen Browsern wird der "click" nach preventDefault()/stopPropagation()
			// bei pointer-events nicht mehr feuern. Daher hide/suppress auch auf pointerdown.
			if (! event) {
				return;
			}
			const type = String(event.type || "");
			const wantsHide = Boolean(CONFIG.lensHideOnClick && (type === "click" || type === "pointerdown" || type === "mousedown" || type === "touchstart"));
			if (! wantsHide) {
				return;
			}
			suppressLens(CONFIG.lensClickSuppressMs);
		}

		function handleLensPointer(event) {
			if (! CONFIG.lensAllowClicks || ! lensContainer) {
				maybeSuppressLensInteraction(event);
				return;
			}
			if (! activeZoom || activeZoom.mode !== "lens") {
				maybeSuppressLensInteraction(event);
				return;
			}

			const rect = lensContainer.getBoundingClientRect();
			if (! rect || ! rect.width || ! rect.height) {
				maybeSuppressLensInteraction(event);
				return;
			}

			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const radius = Math.min(rect.width, rect.height) / 2;
			const dx = event.clientX - centerX;
			const dy = event.clientY - centerY;
			const insideCircle = dx * dx + dy * dy <= radius * radius;

			// Lens-ViewBox ist jetzt in Screen-Koordinaten (clientX/clientY)
			let targetPoint = null;
			if (insideCircle && activeZoom.lensViewBox) {
				const relX = (event.clientX - rect.left) / rect.width;
				const relY = (event.clientY - rect.top) / rect.height;
				const vb = activeZoom.lensViewBox;
				const screenX = vb.x + relX * vb.width;
				const screenY = vb.y + relY * vb.height;
				targetPoint = {
					x: screenX,
					y: screenY
				};
			} else {
				targetPoint = {
					x: event.clientX,
					y: event.clientY
				};
			}

			if (! targetPoint) {
				maybeSuppressLensInteraction(event);
				return;
			}

			const prevPointer = lensContainer.style.pointerEvents;
			lensContainer.style.pointerEvents = "none";
			const targetEl = document.elementFromPoint(targetPoint.x, targetPoint.y);
			lensContainer.style.pointerEvents = prevPointer;

			if (! targetEl) {
				maybeSuppressLensInteraction(event);
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
				buttons: Number.isFinite(event.buttons) ? event.buttons : 1
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
				targetEl.dispatchEvent(typeof PointerEvent === "function" ? new PointerEvent(event.type, init) : new MouseEvent(event.type, init));
			} maybeSuppressLensInteraction(event);
		}

		function applyLensStyles() {
			if (! lensContainer) {
				return;
			}
			const size = Math.max(80, Number.parseFloat(CONFIG.lensDiameterPx) || 200);
			const borderPx = Math.max(0, Number.parseFloat(CONFIG.lensBorderPx) || 0);
			const opacity = Math.max(0, Math.min(1, Number.parseFloat(CONFIG.lensOpacity) || 1));
			const glowDuration = Math.max(0, Number.parseInt(CONFIG.lensGlowDurationMs, 10) || 0);
			const glowColor = CONFIG.lensGlowColor || "rgba(159, 219, 88, 0.6)";

			lensContainer.style.width = `${size}px`;
			lensContainer.style.height = `${size}px`;
			lensContainer.style.border = `${borderPx}px solid ${
				CONFIG.lensBorderColor || "rgba(255, 255, 255, 0.75)"
			}`;
			lensContainer.style.setProperty("--ad-ext-lens-shadow", CONFIG.lensShadow || "none");
			lensContainer.style.setProperty("--ad-ext-lens-glow", glowColor);
			lensContainer.style.setProperty("--ad-ext-lens-z", String(Number.parseInt(CONFIG.lensZIndex, 10) || 150));

			if (glowDuration > 0) {
				lensContainer.style.setProperty("--ad-ext-lens-glow-duration", `${glowDuration}ms`);
				if (lensContainer.style.animation === "none") {
					lensContainer.style.animation = "";
				}
			} else {
				lensContainer.style.setProperty("--ad-ext-lens-glow-duration", "0ms");
				lensContainer.style.animation = "none";
			} lensContainer.style.boxShadow = "var(--ad-ext-lens-shadow)";
			lensContainer.style.background = CONFIG.lensBackground || "transparent";
			lensContainer.style.opacity = String(opacity);
			lensContainer.style.pointerEvents = CONFIG.lensAllowClicks ? "auto" : "none";
			lensContainer.style.cursor = CONFIG.lensAllowClicks ? CONFIG.lensCursor || "crosshair" : "default";
			lensContainer.style.borderRadius = "50%";
			lensContainer.style.overflow = "hidden";
			lensContainer.style.position = "fixed";
			lensContainer.style.zIndex = String(Number.parseInt(CONFIG.lensZIndex, 10) || 150);

			if (lensSvg) {
				lensSvg.style.width = "100%";
				lensSvg.style.height = "100%";
				lensSvg.style.display = "block";
			}
		}

		function hideLens() {
			if (! lensContainer) {
				return;
			}
			lensContainer.style.opacity = "0";
			lensContainer.style.left = "-9999px";
			lensContainer.style.top = "-9999px";
			lensContainer.style.pointerEvents = "none";
		}

		function ensureElementId(el, prefix) {
			if (! el) {
				return null;
			}
			const existing = el.getAttribute && el.getAttribute("id");
			if (existing) {
				return existing;
			}
			const id = `${prefix}-${
				Math.random().toString(16).slice(2)
			}-${
				Date.now().toString(16)
			}`;
			try {
				el.setAttribute("id", id);
			} catch (e) {
				return null;
			}
			return id;
		}

		function setUseHref(useEl, id) {
			if (! useEl || ! id) {
				return;
			}
			const href = `#${id}`;
			useEl.setAttribute("href", href);
			useEl.setAttributeNS(XLINK_NS, "href", href);
		}

		function getViewBox(svg) {
			if (! svg) {
				return null;
			}
			const baseVal = svg.viewBox && svg.viewBox.baseVal;
			if (baseVal && Number.isFinite(baseVal.width) && Number.isFinite(baseVal.height) && baseVal.width > 0 && baseVal.height > 0) {
				return {x: baseVal.x, y: baseVal.y, width: baseVal.width, height: baseVal.height};
			}

			const attr = svg.getAttribute("viewBox");
			if (attr) {
				const parts = attr.trim().split(/[ ,]+/).map((value) => Number.parseFloat(value));
				if (parts.length === 4 && parts.every(Number.isFinite)) {
					return {x: parts[0], y: parts[1], width: parts[2], height: parts[3]};
				}
			}

			const width = Number.parseFloat(svg.getAttribute("width"));
			const height = Number.parseFloat(svg.getAttribute("height"));
			if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
				return {x: 0, y: 0, width, height};
			}

			try {
				const bbox = svg.getBBox();
				if (bbox && bbox.width > 0 && bbox.height > 0) {
					return {x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height};
				}
			} catch (e) { // ignore
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
			return {x, y};
		}

		function transformPoint(point, matrix) {
			if (! point || ! matrix) {
				return {
					x: point ? point.x : 0,
					y: point ? point.y : 0
				};
			}
			if (typeof point.matrixTransform === "function") {
				const transformed = point.matrixTransform(matrix);
				return {x: transformed.x, y: transformed.y};
			}
			const x = point.x;
			const y = point.y;
			return {
				x: x * matrix.a + y * matrix.c + matrix.e,
				y: x * matrix.b + y * matrix.d + matrix.f
			};
		}

		function mapPointToScreen(element, point) {
			if (! element || ! point) {
				return null;
			}
			const svg = element.ownerSVGElement || element;
			const screenMatrix = element.getScreenCTM ? element.getScreenCTM() : null;
			if (screenMatrix) {
				const basePoint = createSvgPoint(svg, point.x, point.y);
				return transformPoint(basePoint, screenMatrix);
			}

			if (svg && svg.getBoundingClientRect) {
				const viewBox = getViewBox(svg);
				const rect = svg.getBoundingClientRect();
				if (viewBox && rect && rect.width && rect.height) {
					const scaleX = rect.width / viewBox.width;
					const scaleY = rect.height / viewBox.height;
					return {
						x: rect.left + (point.x - viewBox.x) * scaleX,
						y: rect.top + (point.y - viewBox.y) * scaleY
					};
				}
			}

			return null;
		}

		function computeSvgToScreenTransform(svgEl) {
			if (! svgEl || typeof svgEl.getBoundingClientRect !== "function") {
				return null;
			}
			const rect = svgEl.getBoundingClientRect();
			if (! rect || rect.width<= 0 || rect.height <= 0) {
      return null;
    }
    const vb = getViewBox(svgEl) || { x: 0, y: 0, width: rect.width, height: rect.height };
    const sx = rect.width / vb.width;
    const sy = rect.height / vb.height;
    return `translate(${rect.left} ${rect.top}) scale(${sx} ${sy}) translate(${-vb.x} ${-vb.y})`;
  }

  function ensureLensSceneFor(boardSvg, boardRefEl) {
    if (!lensSvg || !lensScene || !boardSvg || !boardRefEl) {
      return;
    }

    // Board <use>
    if (!lensBoardUse) {
      lensBoardUse = document.createElementNS(SVG_NS, "use");
      lensBoardUse.dataset.adExtCamzoomLens = "true";
      lensBoardUse.setAttribute("pointer-events", "none");
      lensScene.appendChild(lensBoardUse);
    }

    const boardId = ensureElementId(boardRefEl, "ad-ext-camzoom-board");
    if (boardId) {
      setUseHref(lensBoardUse, boardId);
      const tBoard = computeSvgToScreenTransform(boardSvg);
      if (tBoard) {
        lensBoardUse.setAttribute("transform", tBoard);
      } else {
        lensBoardUse.removeAttribute("transform");
      }
    }

    // Optional: Dart Overlay <use>
    const overlay =
      CONFIG.lensDartOverlaySelector &&
      typeof document.querySelector === "function"
        ? document.querySelector(CONFIG.lensDartOverlaySelector)
        : null;

    if (overlay && overlay.isConnected && overlay.tagName && overlay.tagName.toLowerCase() === "svg") {
      if (!lensOverlayUse) {
        lensOverlayUse = document.createElementNS(SVG_NS, "use");
        lensOverlayUse.dataset.adExtCamzoomLens = "true";
        lensOverlayUse.setAttribute("pointer-events", "none");
        lensScene.appendChild(lensOverlayUse);
      }
      const overlayId = ensureElementId(overlay, "ad-ext-camzoom-overlay");
      if (overlayId) {
        setUseHref(lensOverlayUse, overlayId);
        const tOverlay = computeSvgToScreenTransform(overlay);
        if (tOverlay) {
          lensOverlayUse.setAttribute("transform", tOverlay);
        } else {
          lensOverlayUse.removeAttribute("transform");
        }
      }
    } else if (lensOverlayUse) {
      // Overlay nicht vorhanden -> entfernen, damit keine stale Referenz bleibt
      lensOverlayUse.remove();
      lensOverlayUse = null;
    }
  }

  function getSvgCenter(board) {
    if (!board || !board.svg) {
      return { x: 0, y: 0 };
    }
    const viewBox = getViewBox(board.svg);
    if (viewBox) {
      return {
        x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2, };
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

  function getBoardCenter(board) {
    const group = board.group || board.svg;
    try {
      const bbox = group.getBBox();
      if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height)) {
        return {
          x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2, };
      }
    } catch (error) {
      // ignore
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

  function getScreenLensScale(baseScale) {
    const lensMul = Number.parseFloat(CONFIG.lensScaleMultiplier);
    const factor = Number.isFinite(lensMul) ? lensMul : 1;
    const maxScale = Number.parseFloat(CONFIG.lensMaxScale);
    const base = Math.max(1, Number.parseFloat(baseScale) || 1);
    return clampScale(base * factor, Number.isFinite(maxScale) ? maxScale : 12);
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
    const boardSvg = activeZoom.boardSvg || boardGroup.ownerSVGElement || boardGroup;
    if (!boardSvg) {
      return;
    }

    // Lens-Scene aufbauen/aktualisieren (Board + optionales Overlay)
    ensureLens();
    ensureLensSceneFor(boardSvg, boardGroup);

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

    // Lens-ViewBox in Screen-Koordinaten
    const zoom = Math.max(1.01, getScreenLensScale(scale));
    const vbWidth = size / zoom;
    const vbHeight = size / zoom;
    const vbX = screenPoint.x - vbWidth / 2;
    const vbY = screenPoint.y - vbHeight / 2;

    lensSvg.setAttribute("viewBox", `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
    activeZoom.lensViewBox = { x: vbX, y: vbY, width: vbWidth, height: vbHeight };
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
      baseTransformByElement.set(element, element.getAttribute("transform") || "");
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
    if (isLensMode() || !CONFIG.allowOverflow || !boardSvg) {
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

  function isCheckoutTarget(target) {
    return Boolean(target && (target.ring === "DB" || target.ring === "D"));
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
      const key = checkoutTarget.ring === "DB" ? "checkout:DB" : `checkout:D${checkoutTarget.value}`;
      return {
        key, type: "checkout", target: checkoutTarget, scale: getConfiguredScale(CONFIG.checkoutScale), board, };
    }

    if (
      CONFIG.enableT20Zoom &&
      (!CONFIG.t20RequiresNoCheckout || !hasCheckout) &&
      shouldShowT20Zoom(getTurnContainer(), board.svg)
    ) {
      return {
        key: "t20", type: "t20", target: { ring: "T", value: 20 }, scale: getConfiguredScale(CONFIG.t20Scale), board, };
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
    } else {
      applyOverflow(boardSvg);
    }

    const easing = EASING[CONFIG.zoomEasing] || EASING.easeInOutCubic;
    const now = performance.now();
    const scaleFrom =
      activeZoom && activeZoom.board === boardGroup ? activeZoom.currentScale || 1 : 1;

    if (activeZoom) {
      if (activeZoom.animating) {
        cancelAnimationFrame(activeZoom.rafId);
      }
      if (activeZoom.board !== boardGroup && activeZoom.mode === "transform") {
        clearTransform(activeZoom.board);
      }
    }

    const overshoot = Math.max(0, Number.parseFloat(CONFIG.zoomOvershoot)) || 0;
    const overshootRatioRaw = Number.parseFloat(CONFIG.zoomOvershootRatio);
    const overshootRatio = Number.isFinite(overshootRatioRaw)
      ? Math.min(0.9, Math.max(0.5, overshootRatioRaw))
      : 0.7;

    const overshootScale =
      overshoot> 0 && desired.scale > scaleFrom ? clampScale(desired.scale + overshoot) : desired.scale;

			activeZoom =
				{
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
				lensViewBox: null
			};

			if (mode === "transform") {
				boardGroup.classList.add("ad-ext-camzoom-active");
			}

			animateZoom();
		}

		function animateZoom() {
			if (! activeZoom) {
				return;
			}

			const now = performance.now();
			const elapsed = now - activeZoom.startTime;
			const duration = activeZoom.durationMs || 1;
			const progress = Math.min(1, Math.max(0, elapsed / duration));

			let scale;
			const hasOvershoot = activeZoom.overshootScale > activeZoom.scaleTo + 0.0001 && activeZoom.scaleTo > activeZoom.scaleFrom;

			if (hasOvershoot) {
				const split = activeZoom.overshootRatio;
				if (progress < split) {
					const localT = progress / split;
					const eased = activeZoom.easing(localT);
					scale = activeZoom.scaleFrom + (activeZoom.overshootScale - activeZoom.scaleFrom) * eased;
				} else {
					const localT = (progress - split) / (1 - split);
					const eased = EASING.easeOutCubic(localT);
					scale = activeZoom.overshootScale + (activeZoom.scaleTo - activeZoom.overshootScale) * eased;
				}
			} else {
				const eased = activeZoom.easing(progress);
				scale = activeZoom.scaleFrom + (activeZoom.scaleTo - activeZoom.scaleFrom) * eased;
			} activeZoom.currentScale = scale;

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
			if (! activeZoom) {
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

			if (activeZoom.scaleTo === 1 && ! activeZoom.animating) {
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
			if (! activeZoom) {
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
					allowNumeric: true
				});
				if (! isX01) {
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
			if (! board) {
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
					renderLens(activeZoom.currentScale || activeZoom.scaleTo || 1);
				} else {
					applyOverflow(boardSvg);
					const transformValue = buildTransform(activeZoom.origin, activeZoom.currentScale || activeZoom.scaleTo || 1);
					applyTransform(boardGroup, transformValue);
					boardGroup.classList.add("ad-ext-camzoom-active");
				}
			}

			const desired = getDesiredZoom(board);

			if (! desired) {
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

		observeMutations({onChange: scheduleUpdate});
		window.addEventListener("resize", scheduleUpdate);
		window.addEventListener("scroll", scheduleUpdate, true);
		window.addEventListener("click", (event) => {
			if (! activeZoom) {
				return;
			}
			if (activeZoom.mode === "lens") {
				const target = event && event.target;
				const clickedLens = lensContainer && target && lensContainer.contains(target);
				if (clickedLens) {
					suppressLens(CONFIG.lensClickSuppressMs);
				}
				return;
			}
			clearZoomInstant();
		});

		// Extra safety: pointerdown in capture-phase wird immer gefeuert (auch wenn wir spaeter stopPropagation machen).
		window.addEventListener("pointerdown", (event) => {
			if (! activeZoom || ! lensContainer || activeZoom.mode !== "lens") {
				return;
			}
			const target = event && event.target;
			if (target && lensContainer.contains(target)) {
				suppressLens(CONFIG.lensClickSuppressMs);
			}
		}, true);

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
	}
)();
