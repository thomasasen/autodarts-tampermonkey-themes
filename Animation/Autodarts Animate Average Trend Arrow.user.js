// ==UserScript==
// @name         Autodarts Animate Average Trend Arrow
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Zeigt bei AVG-Änderungen kurz einen Pfeil nach oben oder unten.
// @xconfig-description  Macht AVG-Trends sofort sichtbar, indem ein kurzer Pfeil direkt am AVG-Wert eingeblendet wird.
// @xconfig-title  AVG-Trendpfeil
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-average-trend-arrow
// @xconfig-background     assets/animation-average-trend-arrow-xConfig.png
// @xconfig-settings-version 4
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Average%20Trend%20Arrow.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Average%20Trend%20Arrow.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Animationsdauer","description":"Legt fest, wie lange der Trendpfeil sichtbar bleibt.","options":[{"value":220,"label":"Schnell"},{"value":320,"label":"Standard"},{"value":500,"label":"Langsam"}]}
	const xConfig_ANIMATIONSDAUER_MS = 320;
	// xConfig: {"type":"select","label":"Pfeil-Größe","description":"Bestimmt die Größe des Trendpfeils neben dem AVG.","options":[{"value":"klein","label":"Klein"},{"value":"standard","label":"Standard"},{"value":"groß","label":"Groß"}]}
	const xConfig_PFEIL_GROESSE = "standard";

	// xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
	const xConfig_DEBUG = false;


	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Average Trend Arrow]";

	function debugLog(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.log(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.log(`${DEBUG_PREFIX} ${event}`, payload);
	}

	function debugWarn(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.warn(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.warn(`${DEBUG_PREFIX} ${event}`, payload);
	}

	function debugError(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.error(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.error(`${DEBUG_PREFIX} ${event}`, payload);
	}
	function resolveNumberChoice(value, fallbackValue, allowedValues) {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
			? numericValue
			: fallbackValue;
	}

	function resolveStringChoice(value, fallbackValue, allowedValues) {
		const normalizedValue = String(value || "").trim();
		return allowedValues.includes(normalizedValue)
			? normalizedValue
			: fallbackValue;
	}

	const ANIMATION_MS = resolveNumberChoice(xConfig_ANIMATIONSDAUER_MS, 320, [
		220,
		320,
		500,
	]);
	const ARROW_SIZE_PRESETS = {
		klein: {
			marginLeftPx: 4,
			arrowHalfWidthPx: 4,
			arrowHeightPx: 6,
		},
		standard: {
			marginLeftPx: 6,
			arrowHalfWidthPx: 5,
			arrowHeightPx: 8,
		},
		"groß": {
			marginLeftPx: 8,
			arrowHalfWidthPx: 6,
			arrowHeightPx: 10,
		},
	};
	const RESOLVED_ARROW_SIZE_KEY = resolveStringChoice(xConfig_PFEIL_GROESSE, "standard", ["klein", "standard", "groß"]);
	const ARROW_SIZE = ARROW_SIZE_PRESETS[RESOLVED_ARROW_SIZE_KEY] || ARROW_SIZE_PRESETS.standard;

	const {ensureStyle, createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script-Ziel: AVG-Änderungen optisch mit einem kurzen Pfeil anzeigen.
	/**
   * Selektoren und CSS-Klassen für die Pfeil-Animation.
   * @property {string} AVG_SELECTOR - Bereich mit AVG-Wert, z.B. "p.css-1j0bqop".
   * @property {string} STYLE_ID - ID für das Style-Element, z.B. "autodarts-average-trend-style".
   * @property {string} ARROW_CLASS - Basis-Klasse für den Pfeil, z.B. "ad-ext-avg-trend-arrow".
   * @property {string} VISIBLE_CLASS - Sichtbarkeit, z.B. "ad-ext-avg-trend-visible".
   * @property {string} UP_CLASS - Stil für steigenden AVG, z.B. "ad-ext-avg-trend-up".
   * @property {string} DOWN_CLASS - Stil für fallenden AVG, z.B. "ad-ext-avg-trend-down".
   * @property {string} ANIMATE_CLASS - Trigger für Animation, z.B. "ad-ext-avg-trend-animate".
   * @property {number} ANIMATION_MS - Dauer in ms, z.B. 320.
   */
	const AVG_SELECTOR = "p.css-1j0bqop";
	const STYLE_ID = "autodarts-average-trend-style";
	const ARROW_CLASS = "ad-ext-avg-trend-arrow";
	const VISIBLE_CLASS = "ad-ext-avg-trend-visible";
	const UP_CLASS = "ad-ext-avg-trend-up";
	const DOWN_CLASS = "ad-ext-avg-trend-down";
	const ANIMATE_CLASS = "ad-ext-avg-trend-animate";

	// Speichert den letzten AVG-Wert pro Node, um Änderungen zu erkennen.
	const lastValues = new WeakMap();
	// Merkt sich den erzeugten Pfeil pro AVG-Node.
	const arrowElements = new WeakMap();
	// Zeitgeber je Pfeil, damit Animationen sauber zurückgesetzt werden.
	const animationTimeouts = new WeakMap();

	/**
   * Fügt die benötigten CSS-Regeln für Pfeile und Animation ein.
   * @returns {void}
   */
	const STYLE_TEXT = `
.${ARROW_CLASS} {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: ${ARROW_SIZE.marginLeftPx}px;
  vertical-align: middle;
  opacity: 0;
  transition: opacity 120ms ease-out;
}

.${VISIBLE_CLASS} {
  opacity: 1;
}

.${UP_CLASS} {
  border-left: ${ARROW_SIZE.arrowHalfWidthPx}px solid transparent;
  border-right: ${ARROW_SIZE.arrowHalfWidthPx}px solid transparent;
  border-bottom: ${ARROW_SIZE.arrowHeightPx}px solid #9fdb58;
}

.${DOWN_CLASS} {
  border-left: ${ARROW_SIZE.arrowHalfWidthPx}px solid transparent;
  border-right: ${ARROW_SIZE.arrowHalfWidthPx}px solid transparent;
  border-top: ${ARROW_SIZE.arrowHeightPx}px solid #f87171;
}

.${ANIMATE_CLASS} {
  animation: ad-ext-avg-bounce ${ANIMATION_MS}ms ease-out 1;
}

@keyframes ad-ext-avg-bounce {
  0% { transform: scale(0.9); opacity: 0.5; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.95; }
}
`;

	/**
   * Liest den AVG-Wert aus einem Text wie "72.3 / 3".
   * @param {string|null} text - Textinhalt des AVG-Elements.
   * @example
   * parseAvg("72.3 / 3"); // => 72.3
   * @returns {number|null} - Gefundener AVG oder null bei ungültigem Text.
   */
	function parseAvg(text) {
		if (! text) {
			return null;
		}
		const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*[0-9]+(?:\.[0-9]+)?/);
		if (match) {
			return Number(match[1]);
		}
		const fallback = text.match(/([0-9]+(?:\.[0-9]+)?)/);
		return fallback ? Number(fallback[1]) : null;
	}

	/**
   * Liefert den Pfeil-Span für ein AVG-Element oder legt ihn an.
   * @param {Element} node - AVG-Element.
   * @example
   * getArrow(document.querySelector("p.css-1j0bqop"));
   * @returns {HTMLSpanElement}
   */
	function getArrow(node) {
		const existing = arrowElements.get(node);
		if (existing && node.contains(existing)) {
			return existing;
		}
		const arrow = document.createElement("span");
		arrow.className = ARROW_CLASS;
		node.appendChild(arrow);
		arrowElements.set(node, arrow);
		return arrow;
	}

	/**
   * Startet die CSS-Animation am Pfeil und setzt sie später zurück.
   * @param {HTMLElement} arrow - Der Pfeil-Span.
   * @returns {void}
   */
	function animateArrow(arrow) {
		arrow.classList.remove(ANIMATE_CLASS);
		void arrow.offsetWidth;
		arrow.classList.add(ANIMATE_CLASS);
		const previousTimeout = animationTimeouts.get(arrow);
		if (previousTimeout) {
			clearTimeout(previousTimeout);
		}
		const timeout = setTimeout(() => {
			arrow.classList.remove(ANIMATE_CLASS);
			animationTimeouts.delete(arrow);
		}, ANIMATION_MS + 80);
		animationTimeouts.set(arrow, timeout);
	}

	/**
   * Aktualisiert alle AVG-Elemente und zeigt die passende Pfeilrichtung.
   * @returns {void}
   */
	function updateAverages() {
		const nodes = document.querySelectorAll(AVG_SELECTOR);
		nodes.forEach((node) => {
			const avg = parseAvg(node.textContent);
			if (avg === null) {
				return;
			}
			const previous = lastValues.get(node);
			lastValues.set(node, avg);
			if (previous === undefined || avg === previous) {
				return;
			}

			const arrow = getArrow(node);
			arrow.classList.remove(UP_CLASS, DOWN_CLASS);
			arrow.classList.add(VISIBLE_CLASS);

			if (avg > previous) {
				arrow.classList.add(UP_CLASS);
			} else {
				arrow.classList.add(DOWN_CLASS);
			} animateArrow(arrow);
		});
	}

	/**
   * Fasst viele DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateAverages);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateAverages();

	// Beobachtet Text- und DOM-Änderungen, um AVG-Aktualisierungen zu erkennen.
	debugLog("applied");
	observeMutations({onChange: scheduleUpdate});
	debugLog("init", { debug: DEBUG_ENABLED });
})();
