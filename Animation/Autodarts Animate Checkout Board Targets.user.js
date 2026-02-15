// ==UserScript==
// @name         Autodarts Animate Checkout Board Targets
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Hebt mögliche Checkout-Ziele auf dem Board hervor und animiert sie in X01.
// @xconfig-description  Markiert mögliche Checkout-Felder (Double/Bull) auf dem Dartboard und animiert sie mit Blink, Pulse oder Glow in X01.
// @xconfig-variant      x01
// @xconfig-readme-anchor  animation-autodarts-animate-checkout-board-targets
// @xconfig-background     assets/animation-checkout-board-targets.gif
// @xconfig-settings-version 2
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Board%20Targets.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Board%20Targets.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Effekt","description":"Legt den Animationseffekt für Board-Ziele fest.","options":[{"value":"pulse","label":"Pulse"},{"value":"blink","label":"Blink"},{"value":"glow","label":"Glow"}]}
	const xConfig_EFFEKT = "pulse";
	// xConfig: {"type":"select","label":"Zielumfang","description":"Markiert nur das erste Ziel oder alle Ziele der Empfehlung.","options":[{"value":"first","label":"Erstes Ziel"},{"value":"all","label":"Alle Ziele"}]}
	const xConfig_ZIELUMFANG = "first";
	// xConfig: {"type":"select","label":"Single-Ring","description":"Wählt, welcher Single-Ring bei Single-Zielen hervorgehoben wird.","options":[{"value":"both","label":"Beide Ringe"},{"value":"inner","label":"Nur innen"},{"value":"outer","label":"Nur außen"}]}
	const xConfig_SINGLE_RING = "both";
	// xConfig: {"type":"select","label":"Farbthema","description":"Farbthema für Füllung und Kontur der Zielbereiche.","options":[{"value":"violet","label":"Violett (Standard)"},{"value":"cyan","label":"Cyan"},{"value":"amber","label":"Amber"}]}
	const xConfig_FARBTHEMA = "violet";

	function resolveStringChoice(value, fallbackValue, allowedValues) {
		const normalizedValue = String(value || "").trim();
		return allowedValues.includes(normalizedValue)
			? normalizedValue
			: fallbackValue;
	}

	const BOARD_THEME_PRESETS = {
		violet: {
			color: "rgba(168, 85, 247, 0.85)",
			strokeColor: "rgba(168, 85, 247, 0.95)",
		},
		cyan: {
			color: "rgba(56, 189, 248, 0.85)",
			strokeColor: "rgba(34, 211, 238, 0.95)",
		},
		amber: {
			color: "rgba(245, 158, 11, 0.85)",
			strokeColor: "rgba(251, 191, 36, 0.95)",
		},
	};

	const RESOLVED_EFFECT = resolveStringChoice(xConfig_EFFEKT, "pulse", ["pulse", "blink", "glow"]);
	const RESOLVED_TARGET_SCOPE = resolveStringChoice(xConfig_ZIELUMFANG, "first", ["first", "all"]);
	const RESOLVED_SINGLE_RING = resolveStringChoice(xConfig_SINGLE_RING, "both", ["both", "inner", "outer"]);
	const RESOLVED_THEME_KEY = resolveStringChoice(xConfig_FARBTHEMA, "violet", ["violet", "cyan", "amber"]);
	const RESOLVED_THEME = BOARD_THEME_PRESETS[RESOLVED_THEME_KEY] || BOARD_THEME_PRESETS.violet;

	const gameStateShared = window.autodartsGameStateShared || null;

	const {
		SVG_NS,
		ensureStyle,
		createRafScheduler,
		observeMutations,
		isX01Variant,
		findBoard,
		ensureOverlayGroup,
		clearOverlay,
		segmentAngles,
		createWedge,
		createBull
	} = window.autodartsAnimationShared;

	// Script goal: visualize checkout targets on the board (blink/pulse/glow).
	/**
   * Configuration for checkout target highlighting.
   * @property {string} suggestionSelector - CSS selector for the checkout suggestion, e.g. ".suggestion".
   * @property {string} variantElementId - Element id that holds the game variant text.
   * @property {boolean} requireX01 - Only enable in X01, e.g. true.
   * @property {string} highlightTargets - "first" or "all", e.g. "first".
   * @property {string} effect - "pulse" | "blink" | "glow".
   * @property {string} color - Fill color for targets, e.g. "rgba(168, 85, 247, 0.85)".
   * @property {string} strokeColor - Stroke color for targets, e.g. "rgba(168, 85, 247, 0.95)".
   * @property {number} strokeWidthRatio - Stroke width relative to the board radius.
   * @property {number} animationMs - Animation duration in ms.
   * @property {string} singleRing - "inner" | "outer" | "both".
   * @property {number} edgePaddingPx - Extra padding in px.
   * @property {Object} ringRatios - Ring boundaries as a fraction of the board radius.
   */
	const CONFIG = {
		suggestionSelector: ".suggestion",
		variantElementId: "ad-ext-game-variant",
		requireX01: true,
		highlightTargets: RESOLVED_TARGET_SCOPE, // "first" | "all"
		effect: RESOLVED_EFFECT, // "pulse" | "blink" | "glow"
		color: RESOLVED_THEME.color,
		strokeColor: RESOLVED_THEME.strokeColor,
		strokeWidthRatio: 0.008,
		animationMs: 1000,
		singleRing: RESOLVED_SINGLE_RING, // "inner" | "outer" | "both"
		edgePaddingPx: 1,
		ringRatios: {
			outerBullInner: 0.031112,
			outerBullOuter: 0.075556,
			tripleInner: 0.431112,
			tripleOuter: 0.475556,
			doubleInner: 0.711112,
			doubleOuter: 0.755556
		}
	};

	const STYLE_ID = "ad-ext-checkout-board-style";
	const OVERLAY_ID = "ad-ext-checkout-targets";
	const TARGET_CLASS = "ad-ext-checkout-target";
	const OUTLINE_CLASS = "ad-ext-checkout-target-outline";
	const EFFECT_CLASSES = {
		pulse: "ad-ext-checkout-target--pulse",
		blink: "ad-ext-checkout-target--blink",
		glow: "ad-ext-checkout-target--glow"
	};

	// Cache the last suggestion text to avoid unnecessary redraws.
	let lastSuggestion = null;

	/**
   * Injects the required CSS rules once.
   * @returns {void}
   */
	const STYLE_TEXT = `
.${TARGET_CLASS} {
  fill: var(--ad-ext-target-color);
  stroke: var(--ad-ext-target-stroke);
  stroke-width: var(--ad-ext-target-stroke-width);
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0.9;
  pointer-events: none;
}

.${OUTLINE_CLASS} {
  fill: none;
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: var(--ad-ext-target-outline-width);
  opacity: 0.6;
  pointer-events: none;
  animation: ad-ext-checkout-outline-pulse var(--ad-ext-target-duration) ease-in-out infinite;
}

.${
		EFFECT_CLASSES.pulse
	} {
  animation:
    ad-ext-checkout-pulse var(--ad-ext-target-duration) ease-in-out infinite,
    ad-ext-checkout-outline-pulse var(--ad-ext-target-duration) ease-in-out infinite;
}

.${
		EFFECT_CLASSES.blink
	} {
  animation:
    ad-ext-checkout-blink var(--ad-ext-target-duration) steps(2, end) infinite,
    ad-ext-checkout-outline-pulse var(--ad-ext-target-duration) ease-in-out infinite;
}

.${
		EFFECT_CLASSES.glow
	} {
  animation:
    ad-ext-checkout-glow var(--ad-ext-target-duration) ease-in-out infinite,
    ad-ext-checkout-outline-pulse var(--ad-ext-target-duration) ease-in-out infinite;
  filter: drop-shadow(0 0 12px var(--ad-ext-target-color));
}

@keyframes ad-ext-checkout-pulse {
  0% { opacity: 0.25; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0.25; transform: scale(0.98); }
}

@keyframes ad-ext-checkout-blink {
  0% { opacity: 0.1; }
  50% { opacity: 1; }
  100% { opacity: 0.1; }
}

@keyframes ad-ext-checkout-glow {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

@keyframes ad-ext-checkout-outline-pulse {
  0% {
    stroke-opacity: 0.35;
    stroke-width: calc(var(--ad-ext-target-outline-width) - 0.5px);
  }
  50% {
    stroke-opacity: 1;
    stroke-width: calc(var(--ad-ext-target-outline-width) + 1.5px);
  }
  100% {
    stroke-opacity: 0.35;
    stroke-width: calc(var(--ad-ext-target-outline-width) - 0.5px);
  }
}
`;

	/**
   * Returns true when an X01 variant is active (e.g. 301/501).
   * @returns {boolean}
   */
	/**
   * Parses checkout targets from the suggestion text.
   * @param {string} text - Text like "T20 D10" or "BULL".
   * @example
   * parseTargets("T20 D10"); // => [{ ring: "T", value: 20 }, { ring: "D", value: 10 }]
   * @returns {Array<{ring: string, value?: number}>}
   */
	function parseTargets(text) {
		if (! text) {
			return [];
		}

		const tokens = text.toUpperCase().match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];

		const targets = [];
		let hasExplicit = false;

		for (const token of tokens) {
			if (token === "DB" || token === "BULLSEYE") {
				targets.push({
					target: {
						ring: "DB"
					},
					isSummary: false
				});
				hasExplicit = true;
				continue;
			}
			if (token === "BULL" || token === "SB" || token === "OB") {
				targets.push({
					target: {
						ring: "SB"
					},
					isSummary: false
				});
				hasExplicit = true;
				continue;
			}

			const prefix = token[0];
			const value = Number.parseInt(prefix === "T" || prefix === "D" || prefix === "S" ? token.slice(1) : token, 10);

			if (!Number.isFinite(value)) {
				continue;
			}

			if (value === 25) {
				if (prefix === "D") {
					targets.push({
						target: {
							ring: "DB"
						},
						isSummary: false
					});
					hasExplicit = true;
				} else {
					const isSummary = prefix !== "S";
					targets.push({
						target: {
							ring: "SB"
						},
						isSummary
					});
					if (! isSummary) {
						hasExplicit = true;
					}
				}
				continue;
			}

			if (value < 1 || value > 20) {
				continue;
			}

			const ring = prefix === "T" || prefix === "D" || prefix === "S" ? prefix : "S";
			const isSummary = prefix !== "T" && prefix !== "D" && prefix !== "S";
			targets.push({
				target: {
					ring,
					value
				},
				isSummary
			});
			if (! isSummary) {
				hasExplicit = true;
			}
		}

		const filtered = hasExplicit ? targets.filter((entry) => !entry.isSummary) : targets;

		return filtered.map((entry) => entry.target);
	}

	/**
   * Applies CSS classes and variables for styling and animation.
   * @param {SVGElement} element - Target shape in the overlay.
   * @param {number} radius - Board radius, e.g. 200.
   * @returns {void}
   */
	function applyTargetStyles(element, radius) {
		element.classList.add(TARGET_CLASS);
		const effectClass = EFFECT_CLASSES[CONFIG.effect] || EFFECT_CLASSES.pulse;
		element.classList.add(effectClass);
		const strokeWidth = Math.max(1, radius * CONFIG.strokeWidthRatio);
		element.style.setProperty("--ad-ext-target-color", CONFIG.color);
		element.style.setProperty("--ad-ext-target-stroke", CONFIG.strokeColor);
		element.style.setProperty("--ad-ext-target-stroke-width", `${strokeWidth}px`);
		element.style.setProperty(
			"--ad-ext-target-outline-width",
			`${
				strokeWidth + 1.5
			}px`
		);
		element.style.setProperty("--ad-ext-target-duration", `${
			CONFIG.animationMs
		}ms`);
		if (element.dataset.noStroke === "true") {
			element.style.stroke = "none";
			element.style.strokeWidth = "0";
		}
	}

	/**
   * Creates a white outline shape based on the target element.
   * @param {SVGElement} shape - Original target element.
   * @returns {SVGElement}
   */
	function createOutlineShape(shape) {
		const outline = document.createElementNS(SVG_NS, shape.tagName);
		for (const attr of shape.attributes) {
			outline.setAttribute(attr.name, attr.value);
		}
		return outline;
	}

	/**
   * Applies styles for the pulsing white outline.
   * @param {SVGElement} element - Outline-Shape im Overlay.
   * @param {number} radius - Board radius, e.g. 200.
   * @returns {void}
   */
	function applyOutlineStyles(element, radius) {
		element.classList.add(OUTLINE_CLASS);
		const strokeWidth = Math.max(1, radius * CONFIG.strokeWidthRatio);
		element.style.setProperty(
			"--ad-ext-target-outline-width",
			`${
				strokeWidth + 1.5
			}px`
		);
		element.style.setProperty("--ad-ext-target-duration", `${
			CONFIG.animationMs
		}ms`);
	}

	/**
   * Builds the shapes (wedge/ring/circle) for a target.
   * @param {number} radius - Board radius, e.g. 200.
   * @param {{ring: string, value?: number}} target - Target, e.g. { ring: "D", value: 20 }.
   * @returns {SVGElement[]}
   */
	function buildTargetShapes(radius, target) {
		const ratios = CONFIG.ringRatios;
		const shapes = [];

		if (target.ring === "DB") {
			shapes.push(createBull(radius, 0, ratios.outerBullInner, true, {edgePaddingPx: CONFIG.edgePaddingPx}));
			return shapes;
		}

		if (target.ring === "SB") {
			shapes.push(createBull(radius, ratios.outerBullInner, ratios.outerBullOuter, false, {
				edgePaddingPx: CONFIG.edgePaddingPx,
				noStroke: true
			}));
			return shapes;
		}

		const angles = segmentAngles(target.value);
		if (! angles) {
			return shapes;
		}

		if (target.ring === "T") {
			shapes.push(createWedge(radius, ratios.tripleInner, ratios.tripleOuter, angles.start, angles.end, CONFIG.edgePaddingPx));
			return shapes;
		}

		if (target.ring === "D") {
			shapes.push(createWedge(radius, ratios.doubleInner, ratios.doubleOuter, angles.start, angles.end, CONFIG.edgePaddingPx));
			return shapes;
		}

		const innerSingle = () => createWedge(radius, ratios.outerBullOuter, ratios.tripleInner, angles.start, angles.end, CONFIG.edgePaddingPx);

		const outerSingle = () => createWedge(radius, ratios.tripleOuter, ratios.doubleInner, angles.start, angles.end, CONFIG.edgePaddingPx);

		if (CONFIG.singleRing === "inner") {
			shapes.push(innerSingle());
		} else if (CONFIG.singleRing === "both") {
			shapes.push(innerSingle(), outerSingle());
		} else {
			shapes.push(outerSingle());
		}

		return shapes;
	}

	/**
   * Main update: parse the checkout suggestion and draw targets on the board.
   * @returns {void}
   */
	function updateTargets() {
		const suggestionEl = document.querySelector(CONFIG.suggestionSelector);
		const text = suggestionEl ?. textContent ?. trim() || "";

		const isX01 = CONFIG.requireX01 ? gameStateShared && typeof gameStateShared.isX01Variant === "function" ? gameStateShared.isX01Variant({
			allowMissing: false,
			allowEmpty: false,
			allowNumeric: false
		}) : isX01Variant(CONFIG.variantElementId, {
			allowMissing: false,
			allowEmpty: false,
			allowNumeric: false
		}) : true;

		if (! isX01) {
			lastSuggestion = null;
			const board = findBoard();
			if (board) {
				clearOverlay(ensureOverlayGroup(board.group, OVERLAY_ID));
			}
			return;
		}

		if (text === lastSuggestion) {
			return;
		}
		lastSuggestion = text;

		const targets = parseTargets(text);
		const selected = CONFIG.highlightTargets === "all" ? targets : targets.slice(0, 1);
		const board = findBoard();
		if (! board) {
			return;
		}

		const overlay = ensureOverlayGroup(board.group, OVERLAY_ID);
		clearOverlay(overlay);

		if (! selected.length) {
			return;
		}

		selected.forEach((target) => {
			const shapes = buildTargetShapes(board.radius, target);
			shapes.forEach((shape) => {
				applyTargetStyles(shape, board.radius);
				overlay.appendChild(shape);
				const outline = createOutlineShape(shape);
				applyOutlineStyles(outline, board.radius);
				overlay.appendChild(outline);
			});
		});
	}

	/**
   * Coalesces DOM changes into a single update per frame.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateTargets);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateTargets();

	// Observes text and DOM changes to update checkout targets.
	observeMutations({onChange: scheduleUpdate});
})();
