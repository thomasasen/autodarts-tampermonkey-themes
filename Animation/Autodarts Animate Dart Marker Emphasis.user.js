// ==UserScript==
// @name         Autodarts Animate Dart Marker Emphasis
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Macht Trefferpunkte auf dem virtuellen Dartboard durch Größe, Farbe und Effekte besser sichtbar.
// @xconfig-description  Passt Marker auf dem virtuellen Dartboard an und hebt sie auf Wunsch mit Glow oder Pulse hervor. Kein Support für Live Dartboard.
// @xconfig-title  Dart-Marker-Hervorhebung
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-dart-marker-emphasis
// @xconfig-background     assets/animation-dart-marker-emphasis-xConfig.gif
// @xconfig-settings-version 4
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Emphasis.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Emphasis.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Marker-Größe","description":"Bestimmt die Größe der Marker auf dem Board.","options":[{"value":4,"label":"Klein"},{"value":6,"label":"Standard"},{"value":9,"label":"Groß"}]}
	const xConfig_MARKER_GROESSE = 6;
	// xConfig: {"type":"select","label":"Marker-Farbe","description":"Wählt die Hauptfarbe der Marker.","options":[{"value":"rgb(49, 130, 206)","label":"Blau (Standard)"},{"value":"rgb(34, 197, 94)","label":"Grün"},{"value":"rgb(248, 113, 113)","label":"Rot"},{"value":"rgb(250, 204, 21)","label":"Gelb"},{"value":"rgb(255, 255, 255)","label":"Weiß"}]}
	const xConfig_MARKER_FARBE = "rgb(49, 130, 206)";
	// xConfig: {"type":"select","label":"Effekt","description":"Legt fest, ob die Marker zusätzlich glühen oder pulsieren.","options":[{"value":"glow","label":"Glow"},{"value":"pulse","label":"Pulse"},{"value":"none","label":"Kein Effekt"}]}
	const xConfig_EFFEKT = "glow";
	// xConfig: {"type":"select","label":"Marker-Sichtbarkeit","description":"Steuert die allgemeine Sichtbarkeit der Marker.","options":[{"value":65,"label":"Dezent (65%)"},{"value":85,"label":"Standard (85%)"},{"value":100,"label":"Voll sichtbar (100%)"}]}
	const xConfig_MARKER_OPAZITAET = 85;
	// xConfig: {"type":"select","label":"Outline-Farbe","description":"Fügt optional einen Rand für mehr Kontrast hinzu.","options":[{"value":"aus","label":"Aus"},{"value":"weiß","label":"Weiß"},{"value":"schwarz","label":"Schwarz"}]}
	const xConfig_OUTLINE = "aus";

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
	const DEBUG_PREFIX = "[xConfig][Dart Marker Emphasis]";

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

	const MARKER_RADIUS = resolveNumberChoice(xConfig_MARKER_GROESSE, 6, [4, 6, 9]);
	const MARKER_FILL = resolveStringChoice(xConfig_MARKER_FARBE, "rgb(49, 130, 206)", [
		"rgb(49, 130, 206)",
		"rgb(34, 197, 94)",
		"rgb(248, 113, 113)",
		"rgb(250, 204, 21)",
		"rgb(255, 255, 255)",
	]);
	const EFFECT = resolveStringChoice(xConfig_EFFEKT, "glow", ["glow", "pulse", "none"]);
	const MARKER_OPACITY_PERCENT = resolveNumberChoice(xConfig_MARKER_OPAZITAET, 85, [65, 85, 100]);
	const MARKER_OPACITY = MARKER_OPACITY_PERCENT / 100;
	const OUTLINE_KEY = resolveStringChoice(xConfig_OUTLINE, "aus", ["aus", "weiß", "schwarz"]);
	const OUTLINE_COLOR_BY_KEY = {
		aus: "",
		"weiß": "rgb(255, 255, 255)",
		schwarz: "rgb(0, 0, 0)",
	};
	const MARKER_OUTLINE_COLOR = OUTLINE_COLOR_BY_KEY[OUTLINE_KEY] || "";

	const {ensureStyle, createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script goal: make dart markers larger/more visible and optionally animate them.
	/**
   * Marker options for size, color, and effect.
   * @property {number} MARKER_RADIUS - Radius in px, e.g. 6.
   * @property {string} MARKER_FILL - Fill color, e.g. "rgb(49, 130, 206)".
   * @property {string} EFFECT - "pulse" | "glow" | "none".
   */

	const STYLE_ID = "autodarts-size-strokes-style";
	const MARKER_SELECTOR = 'svg[viewBox="0 0 1000 1000"] circle';
	const EXCLUDED_OVERLAY_SELECTOR = "#ad-ext-checkout-targets, #ad-ext-cricket-targets, #ad-ext-dart-image-overlay, #ad-ext-winner-fireworks";
	const MARKER_HIDDEN_DATASET_KEY = "adExtOriginalOpacity";
	const BASE_CLASS = "ad-ext-dart-marker";
	const EFFECT_CLASSES = {
		pulse: "ad-ext-dart-marker--pulse",
		glow: "ad-ext-dart-marker--glow"
	};

	function isHiddenByDartOverlay(marker) {
		return Boolean(
			marker &&
			marker.dataset &&
			Object.prototype.hasOwnProperty.call(marker.dataset, MARKER_HIDDEN_DATASET_KEY)
		);
	}

	/**
   * Injects CSS rules for the marker effects.
   * @returns {void}
   */
	const STYLE_TEXT = `
.${BASE_CLASS} {
  transform-box: fill-box;
  transform-origin: center;
}

.${
		EFFECT_CLASSES.pulse
	} {
  animation: ad-ext-dart-pulse 1.6s ease-in-out infinite;
}

.${
		EFFECT_CLASSES.glow
	} {
  animation: ad-ext-dart-glow 1.8s ease-in-out infinite;
}

@keyframes ad-ext-dart-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.85; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes ad-ext-dart-glow {
  0% { stroke-width: 2; opacity: 0.9; }
  50% { stroke-width: 5; opacity: 1; }
  100% { stroke-width: 2; opacity: 0.9; }
}

`;

	/**
   * Applies size, color, and effect to a marker.
   * @param {SVGCircleElement} marker - Dart-Markierung als SVG-Kreis.
   * @example
   * applyMarkerStyles(document.querySelector("circle"));
   * @returns {void}
   */
	function applyMarkerStyles(marker) {
		marker.setAttribute("r", String(MARKER_RADIUS));
		marker.style.fill = MARKER_FILL;
		const isHiddenByOverlay = isHiddenByDartOverlay(marker);
		marker.style.opacity = isHiddenByOverlay ? "0" : String(MARKER_OPACITY);
		if (! isHiddenByOverlay && MARKER_OUTLINE_COLOR) {
			marker.style.stroke = MARKER_OUTLINE_COLOR;
			marker.style.strokeWidth = "1.5";
		} else {
			marker.style.stroke = "none";
			marker.style.strokeWidth = "0";
		}
		marker.classList.add(BASE_CLASS);
		Object.values(EFFECT_CLASSES).forEach((effectClass) => {
			marker.classList.remove(effectClass);
		});
		if (! isHiddenByOverlay && EFFECT !== "none" && EFFECT_CLASSES[EFFECT]) {
			marker.classList.add(EFFECT_CLASSES[EFFECT]);
		}
	}

	function getCircleClassName(marker) {
		if (!marker || !marker.className) {
			return "";
		}
		if (typeof marker.className === "string") {
			return marker.className;
		}
		if (typeof marker.className.baseVal === "string") {
			return marker.className.baseVal;
		}
		return "";
	}

	function isLikelyDartMarker(marker) {
		if (!(marker instanceof SVGCircleElement)) {
			return false;
		}
		if (marker.closest(EXCLUDED_OVERLAY_SELECTOR)) {
			return false;
		}

		const radius = Number.parseFloat(marker.getAttribute("r"));
		if (Number.isFinite(radius) && radius > 18) {
			return false;
		}

		const className = getCircleClassName(marker).toLowerCase();
		const styleAttr = String(marker.getAttribute("style") || "").toLowerCase();
		const filterAttr = String(marker.getAttribute("filter") || "").toLowerCase();
		const datasetKeys = Object.keys(marker.dataset || {}).join(" ").toLowerCase();
		const markerLike =
			styleAttr.includes("shadow-2dp") ||
			filterAttr.includes("shadow-2dp") ||
			filterAttr.includes("shadow") ||
			className.includes("dart") ||
			className.includes("marker") ||
			className.includes("hit") ||
			datasetKeys.includes("hit") ||
			datasetKeys.includes("marker");

		return markerLike;
	}

	/**
   * Finds all markers in the DOM and updates their styles.
   * @returns {void}
   */
	function updateMarkers() {
		const markers = document.querySelectorAll(MARKER_SELECTOR);
		markers.forEach((marker) => {
			if (isLikelyDartMarker(marker)) {
				applyMarkerStyles(marker);
			}
		});
	}

	/**
   * Coalesces DOM changes into a single update per frame.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateMarkers);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateMarkers();

	// Observes board changes to restyle new markers.
	debugLog("applied");
	observeMutations({onChange: scheduleUpdate});
	debugLog("init", { debug: DEBUG_ENABLED });
})();
