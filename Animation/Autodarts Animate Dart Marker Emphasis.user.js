// ==UserScript==
// @name         Autodarts Animate Dart Marker Emphasis
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1
// @description  Macht Dart-Trefferpunkte sichtbarer durch Groesse, Farbe und optionalen Glow/Pulse.
// @xconfig-description  Passt Dart-Marker auf dem Board an und kann sie mit Glow oder Pulse hervorheben.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-dart-marker-emphasis
// @xconfig-background     assets/animation-dart-marker-emphasis-xConfig.gif
// @xconfig-settings-version 2
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

	// xConfig: {"type":"select","label":"Marker-Größe","description":"Bestimmt die Größe der Dart-Marker auf dem Board.","options":[{"value":4,"label":"Klein"},{"value":6,"label":"Standard"},{"value":9,"label":"Groß"}]}
	const xConfig_MARKER_GROESSE = 6;
	// xConfig: {"type":"select","label":"Marker-Farbe","description":"Wählt die Füllfarbe der Dart-Marker.","options":[{"value":"rgb(49, 130, 206)","label":"Blau (Standard)"},{"value":"rgb(34, 197, 94)","label":"Grün"},{"value":"rgb(248, 113, 113)","label":"Rot"},{"value":"rgb(250, 204, 21)","label":"Gelb"},{"value":"rgb(255, 255, 255)","label":"Weiß"}]}
	const xConfig_MARKER_FARBE = "rgb(49, 130, 206)";
	// xConfig: {"type":"select","label":"Effekt","description":"Legt die Hervorhebung der Marker fest.","options":[{"value":"glow","label":"Glow"},{"value":"pulse","label":"Pulse"},{"value":"none","label":"Kein Effekt"}]}
	const xConfig_EFFEKT = "glow";

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

	const {ensureStyle, createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script goal: make dart markers larger/more visible and optionally animate them.
	/**
   * Marker options for size, color, and effect.
   * @property {number} MARKER_RADIUS - Radius in px, e.g. 6.
   * @property {string} MARKER_FILL - Fill color, e.g. "rgb(49, 130, 206)".
   * @property {string} EFFECT - "pulse" | "glow" | "none".
   */

	const STYLE_ID = "autodarts-size-strokes-style";
	// Matches board hit markers rendered with the shadow filter.
	const MARKER_SELECTOR = 'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]';
	const BASE_CLASS = "ad-ext-dart-marker";
	const EFFECT_CLASSES = {
		pulse: "ad-ext-dart-marker--pulse",
		glow: "ad-ext-dart-marker--glow"
	};

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
		marker.classList.add(BASE_CLASS);
		Object.values(EFFECT_CLASSES).forEach((effectClass) => {
			marker.classList.remove(effectClass);
		});
		if (EFFECT !== "none" && EFFECT_CLASSES[EFFECT]) {
			marker.classList.add(EFFECT_CLASSES[EFFECT]);
		}
	}

	/**
   * Finds all markers in the DOM and updates their styles.
   * @returns {void}
   */
	function updateMarkers() {
		const markers = document.querySelectorAll(MARKER_SELECTOR);
		markers.forEach(applyMarkerStyles);
	}

	/**
   * Coalesces DOM changes into a single update per frame.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateMarkers);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateMarkers();

	// Observes board changes to restyle new markers.
	observeMutations({onChange: scheduleUpdate});
})();
