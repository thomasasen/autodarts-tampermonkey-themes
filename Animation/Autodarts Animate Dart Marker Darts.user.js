// ==UserScript==
// @name         Autodarts Animate Dart Marker Darts
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.5
// @description  Stellt konfigurierbare Bilder von Dartpfeilen auf dem Board dar. Nur mit dem "virtuellen Dartboard"; nicht mit dem "Live Dartboard".
// @xconfig-description  WICHTIG: Funktioniert nur mit dem "virtuellen Dartboard" und nicht mit dem "Live Dartboard". Stellt konfigurierbare Bilder von Dartpfeilen auf dem Board dar, inklusive optionalem Flugeffekt, als wären es echte Darts. Bilder der auswählbaren Designs findest du über "📖 Anleitung".
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-dart-marker-darts
// @xconfig-background     assets/animation-dart-marker-darts-xConfig.png
// @xconfig-settings-version 4
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Darts.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Darts.user.js
// ==/UserScript==

(function () {
	"use strict";

	const INSTANCE_KEY = "__adExtDartMarkerDartsInstance";
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
		getBoardRadius
	} = window.autodartsAnimationShared;

	const RUNTIME_GLOBAL_KEY = "__adXConfigRuntime";
	const XCONFIG_STORAGE_KEY = "ad-xconfig:config";
	const XCONFIG_FEATURE_ID = "a-marker-darts";
	const XCONFIG_FEATURE_SOURCE = "Animation/Autodarts Animate Dart Marker Darts.user.js";
	const DART_BASE_URL = "https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/";
	const DART_DESIGN_OPTIONS = [
		"Dart_autodarts.png",
		"Dart_blackblue.png",
		"Dart_blackgreen.png",
		"Dart_blackred.png",
		"Dart_blue.png",
		"Dart_camoflage.png",
		"Dart_green.png",
		"Dart_pride.png",
		"Dart_red.png",
		"Dart_white.png",
		"Dart_whitetrible.png",
		"Dart_yellow.png",
		"Dart_yellowscull.png"
	];

	function slugifyFeatureId(value) {
		return String(value || "")
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function readXConfigFeatureSettingsFromRuntime() {
		const runtimeApi = window[RUNTIME_GLOBAL_KEY];
		if (! runtimeApi || typeof runtimeApi.getFeatureState !== "function") {
			return null;
		}

		const fallbackFeatureId = slugifyFeatureId(XCONFIG_FEATURE_SOURCE);
		const runtimeFeatureState =
			runtimeApi.getFeatureState(XCONFIG_FEATURE_ID) ||
			runtimeApi.getFeatureState(XCONFIG_FEATURE_SOURCE) ||
			runtimeApi.getFeatureState(fallbackFeatureId);

		if (! runtimeFeatureState || typeof runtimeFeatureState !== "object") {
			return null;
		}
		const settings = runtimeFeatureState.settings;
		return settings && typeof settings === "object" ? settings : null;
	}

	function readXConfigFeatureSettings() {
		const runtimeSettings = readXConfigFeatureSettingsFromRuntime();
		if (runtimeSettings) {
			return runtimeSettings;
		}

		try {
			const rawConfig = localStorage.getItem(XCONFIG_STORAGE_KEY);
			if (! rawConfig) {
				return {};
			}

			const parsedConfig = JSON.parse(rawConfig);
			const features = parsedConfig && typeof parsedConfig === "object" ? parsedConfig.features : null;
			if (! features || typeof features !== "object") {
				return {};
			}

			const fallbackFeatureId = slugifyFeatureId(XCONFIG_FEATURE_SOURCE);
			const featureState = features[XCONFIG_FEATURE_ID] || features[fallbackFeatureId];
			if (! featureState || typeof featureState !== "object") {
				return {};
			}

			const settings = featureState.settings;
			return settings && typeof settings === "object" ? settings : {};
		} catch (_) {
			return {};
		}
	}

	function readXConfigSetting(variableName) {
		const settings = readXConfigFeatureSettings();
		if (! settings || typeof settings !== "object") {
			return undefined;
		}

		if (Object.prototype.hasOwnProperty.call(settings, variableName)) {
			return settings[variableName];
		}

		const shortKey = String(variableName || "").replace(/^xConfig_/, "");
		if (shortKey && Object.prototype.hasOwnProperty.call(settings, shortKey)) {
			return settings[shortKey];
		}

		return undefined;
	}

	function resolveXConfigSelect(variableName, defaultValue, allowedValues) {
		const currentValue = readXConfigSetting(variableName);
		if (currentValue === undefined || currentValue === null) {
			return defaultValue;
		}

		const asString = String(currentValue);
		if (Array.isArray(allowedValues) && allowedValues.includes(asString)) {
			return asString;
		}

		return defaultValue;
	}

	function resolveXConfigToggle(variableName, defaultValue) {
		const currentValue = readXConfigSetting(variableName);
		if (typeof currentValue === "boolean") {
			return currentValue;
		}
		if (typeof currentValue === "string") {
			const normalized = currentValue.trim().toLowerCase();
			if (["true", "1", "yes", "on", "aktiv", "active"].includes(normalized)) {
				return true;
			}
			if (["false", "0", "no", "off", "inaktiv", "inactive"].includes(normalized)) {
				return false;
			}
		}
		if (currentValue === 1) {
			return true;
		}
		if (currentValue === 0) {
			return false;
		}
		return defaultValue;
	}

	// xConfig: {"type":"select","label":"Dart Design","description":"Wählt das Dart-Bild für die Hitmarker auf dem Board.","options":[{"value":"Dart_autodarts.png","label":"Autodarts (Standard)"},{"value":"Dart_blackblue.png","label":"Black Blue"},{"value":"Dart_blackgreen.png","label":"Black Green"},{"value":"Dart_blackred.png","label":"Black Red"},{"value":"Dart_blue.png","label":"Blue"},{"value":"Dart_camoflage.png","label":"Camouflage"},{"value":"Dart_green.png","label":"Green"},{"value":"Dart_pride.png","label":"Pride"},{"value":"Dart_red.png","label":"Red"},{"value":"Dart_white.png","label":"White"},{"value":"Dart_whitetrible.png","label":"White Triple"},{"value":"Dart_yellow.png","label":"Yellow"},{"value":"Dart_yellowscull.png","label":"Yellow Skull"}]}
	const xConfig_DART_DESIGN = "Dart_autodarts.png";
	// xConfig: {"type":"toggle","label":"Dart Fluganimation","description":"Aktiviert Flug-, Einschlag- und Wobble-Animation für neue Darts.","options":[{"value":true,"label":"Aktiv"},{"value":false,"label":"Inaktiv"}]}
	const xConfig_ANIMATE_DARTS = true;
	// xConfig: {"type":"select","label":"Dart-Größe","description":"Skaliert die Dart-Bilder auf dem Board kleiner oder größer.","options":[{"value":"90","label":"Klein (90%)"},{"value":"100","label":"Standard (100%)"},{"value":"115","label":"Groß (115%)"}]}
	const xConfig_DART_GROESSE = "100";
	// xConfig: {"type":"toggle","label":"Original-Marker ausblenden","description":"Blendet die originalen runden Trefferpunkte aus, wenn Dart-Bilder angezeigt werden.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
	const xConfig_ORIGINAL_MARKER_AUSBLENDEN = false;
	// xConfig: {"type":"select","label":"Fluggeschwindigkeit","description":"Bestimmt, wie schnell die Dart-Fluganimation abgespielt wird.","options":[{"value":"schnell","label":"Schnell"},{"value":"standard","label":"Standard"},{"value":"cinematic","label":"Cinematic"}]}
	const xConfig_FLUGGESCHWINDIGKEIT = "standard";

	// xConfig: {"type":"toggle","label":"Debug","description":"Nur auf Anweisung aktivieren. Schreibt technische Diagnose-Logs in die Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
	const xConfig_DEBUG = false;

	const DART_DESIGN = resolveXConfigSelect("xConfig_DART_DESIGN", xConfig_DART_DESIGN, DART_DESIGN_OPTIONS);
	const ANIMATE_DARTS = resolveXConfigToggle("xConfig_ANIMATE_DARTS", xConfig_ANIMATE_DARTS);
	const DART_SIZE_PERCENT = Number(resolveXConfigSelect("xConfig_DART_GROESSE", xConfig_DART_GROESSE, ["90", "100", "115"]));
	const DART_SIZE_MULTIPLIER = Number.isFinite(DART_SIZE_PERCENT) ? DART_SIZE_PERCENT / 100 : 1;
	const HIDE_ORIGINAL_MARKERS = resolveXConfigToggle("xConfig_ORIGINAL_MARKER_AUSBLENDEN", xConfig_ORIGINAL_MARKER_AUSBLENDEN);
	const FLIGHT_SPEED_PRESETS = {
		schnell: 250,
		standard: 320,
		cinematic: 460,
	};
	const RESOLVED_FLIGHT_SPEED_KEY = resolveXConfigSelect("xConfig_FLUGGESCHWINDIGKEIT", xConfig_FLUGGESCHWINDIGKEIT, ["schnell", "standard", "cinematic"]);
	const RESOLVED_FLIGHT_DURATION_MS = FLIGHT_SPEED_PRESETS[RESOLVED_FLIGHT_SPEED_KEY] || FLIGHT_SPEED_PRESETS.standard;

	/**
   * Konfiguration für die Dart-Bildplatzierung (ANIMATE_DARTS oben umschalten).
   * - dartImageUrl: PNG-URL oder Data-URI.
   * - dartLengthRatio: Länge relativ zum Board-Radius.
   * - dartAspectRatio: Breite/Höhe des PNG (zur Beibehaltung des Seitenverhältnisses).
   * - tipOffsetXRatio/YRatio: Position der Spitze im Bild als Anteil (0..1).
   * - rotateToCenter: Darts drehen, so dass die Spitze zum Board-Zentrum zeigt.
   * - baseAngleDeg: Winkel der PNG-Spitzenrichtung (links=180, rechts=0).
   * - dartTransparency: Transparenz des Dart-Bildes (0=opak, 1=voll transparent).
   * - hideMarkers: Original-Trefferpunkte ausblenden, wenn Darts angezeigt werden.
   * - animateDarts: Flug- und Einschlagsanimation aktivieren.
   * - animationStyle: "arc" oder "linear".
   * - flightDurationMs: Dauer der Fluganimation.
   * - flightDistanceRatio: Startabstand des Darts relativ zur Dart-Länge.
   * - arcHeightRatio: Bogenhöhe relativ zur Dart-Länge.
   * - variationArcRatio: Zufallsvariation der Bogenhöhe (0.1 = +/-10%).
   * - variationDurationRatio: Zufallsvariation der Flugdauer (0.1 = +/-10%).
   * - enableShadow: Weichen Schlagschatten unter dem Dart anzeigen.
   * - shadowOpacity: Grund-Opazität des Schattens (0..1).
   * - shadowBlurPx: Basis-Blur für den Schatten in Pixeln.
   * - shadowOffsetXRatio/YRatio: Schatten-Offset relativ zur Dart-Länge.
   * - shadowImpactOpacityBoost: Zusätzliche Opazität beim Einschlag.
   * - shadowImpactDurationMs: Dauer des Schatten-Impulses beim Einschlag.
   * - flightEasing: Easing für die Fluganimation.
   * - wobbleDurationMs: Dauer des Einschlag-Wackelns.
   * - wobbleAngleDeg: Maximale Wackelrotation in Grad.
   * - wobbleEasing: Easing für das Wackeln.
   * - blurPx: Stärke des Bewegungsblurs während des Flugs.
   * - scaleFrom: Start-Skalierung während des Flugs.
   * - fadeFrom: Start-Opazität während des Flugs.
   */
	const CONFIG = {
		dartImageUrl: `${DART_BASE_URL}${DART_DESIGN}`,
		dartLengthRatio: 0.416 * DART_SIZE_MULTIPLIER,
		dartAspectRatio: 472 / 198,
		tipOffsetXRatio: 0,
		tipOffsetYRatio: 130 / 198,
		rotateToCenter: true,
		baseAngleDeg: 180,
		dartTransparency: 0,
		hideMarkers: HIDE_ORIGINAL_MARKERS,
		animateDarts: ANIMATE_DARTS,
		animationStyle: "arc",
		flightDurationMs: RESOLVED_FLIGHT_DURATION_MS,
		flightDistanceRatio: 1.2,
		arcHeightRatio: 0.16,
		variationArcRatio: 0.1,
		variationDurationRatio: 0.06,
		enableShadow: true,
		shadowOpacity: 0.28,
		shadowBlurPx: 2,
		shadowOffsetXRatio: 0.06,
		shadowOffsetYRatio: 0.08,
		shadowImpactOpacityBoost: 0.12,
		shadowImpactDurationMs: 160,
		flightEasing: "cubic-bezier(0.15, 0.7, 0.2, 1)",
		wobbleDurationMs: 280,
		wobbleAngleDeg: 4,
		wobbleEasing: "cubic-bezier(0.2, 0.6, 0.2, 1)",
		blurPx: 2,
		scaleFrom: 0.94,
		fadeFrom: 0.2,
		markerSelector: 'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"], ' + 'circle[filter*="shadow"], circle[style*="filter"], ' + 'circle[class*="dart"], circle[class*="marker"], circle[class*="hit"], ' + 'circle[data-hit], circle[data-marker]'
	};

	const STYLE_ID = "ad-ext-dart-image-style";
	const OVERLAY_ID = "ad-ext-dart-image-overlay";
	const OVERLAY_CLASS = "ad-ext-dart-image-overlay";
	const OVERLAY_SCENE_ID = "ad-ext-dart-image-overlay-scene";
	const DART_CLASS = "ad-ext-dart-image";
	const DART_SHADOW_CLASS = "ad-ext-dart-shadow";
	const DART_FLIGHT_CLASS = "ad-ext-dart-flight";
	const DART_WOBBLE_CLASS = "ad-ext-dart-wobble";
	const SHADOW_FILTER_ID = "ad-ext-dart-shadow-filter";
	const SVG_NS = "http://www.w3.org/2000/svg";
	const XLINK_NS = "http://www.w3.org/1999/xlink";
	const MARKER_OPACITY_KEY = "adExtOriginalOpacity";
	const dartByMarker = new Map();

	// Funktion: ensureStyle
	// Zweck: Fügt die benötigten CSS-Regeln für Overlay/Darts einmalig ein.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: STYLE_ID, OVERLAY_CLASS, DART_* Klassen, document.
	// Wird genutzt von: Initialisierung (ensureStyle()).
	const STYLE_TEXT = `
.${OVERLAY_CLASS} {
  position: fixed;
  overflow: visible;
  pointer-events: none;
  z-index: 5;
}

.${DART_FLIGHT_CLASS} {
  pointer-events: none;
  will-change: transform, opacity, filter;
}

.${DART_CLASS} {
  pointer-events: none;
  user-select: none;
  transform-box: fill-box;
}

.${DART_SHADOW_CLASS} {
  pointer-events: none;
  user-select: none;
  transform-box: fill-box;
}
`;

	// Funktion: getSvgScale
	// Zweck: Bildschirm-Skalierung des SVG aus der CTM ableiten.
	// Parameter: svg (SVG-Element).
	// Rückgabe: number (Skalierungsfaktor, Fallback 1).
	// Nutzt: svg.getScreenCTM().
	// Wird genutzt von: updateDarts().

	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Dart Marker Darts]";

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
	function getSvgScale(svg) {
		const matrix = svg.getScreenCTM();
		if (! matrix) {
			return 1;
		}
		const scaleX = Math.hypot(matrix.a, matrix.b);
		const scaleY = Math.hypot(matrix.c, matrix.d);
		if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) {
			return 1;
		}
		return Math.min(scaleX, scaleY);
	}

	// Funktion: ensureOverlaySvg
	// Zweck: Overlay-SVG erstellen oder wiederverwenden.
	// Parameter: keine.
	// Rückgabe: SVG-Element (Overlay).
	// Nutzt: OVERLAY_ID, SVG_NS, document.body.
	// Wird genutzt von: updateDarts(), clearDarts(), removeOverlay().
	function ensureOverlaySvg() {
		let overlay = document.getElementById(OVERLAY_ID);
		if (overlay && overlay.tagName.toLowerCase() !== "svg") {
			overlay.remove();
			overlay = null;
		}
		if (! overlay) {
			overlay = document.createElementNS(SVG_NS, "svg");
			overlay.id = OVERLAY_ID;
			overlay.classList.add(OVERLAY_CLASS);
			overlay.setAttribute("aria-hidden", "true");
			overlay.setAttribute("focusable", "false");
			(document.body || document.documentElement).appendChild(overlay);
		}
		overlay.dataset.adExtDartMarkerOverlay = "true";
		ensureOverlayScene(overlay);
		return overlay;
	}

	function ensureOverlayScene(overlay) {
		if (! overlay) {
			return null;
		}
		let scene = overlay.querySelector(`#${OVERLAY_SCENE_ID}`);
		if (scene && scene.tagName.toLowerCase() !== "g") {
			scene.remove();
			scene = null;
		}
		if (! scene) {
			scene = document.createElementNS(SVG_NS, "g");
			scene.id = OVERLAY_SCENE_ID;
			overlay.appendChild(scene);
		}
		scene.dataset.adExtDartOverlayScene = "true";
		return scene;
	}

	// Funktion: ensureShadowFilter
	// Zweck: Filter für schwarzen/grauen Schatten definieren/aktualisieren.
	// Parameter: overlay (SVG-Element).
	// Rückgabe: filter-Element oder null.
	// Nutzt: CONFIG.enableShadow, SHADOW_FILTER_ID, SVG_NS.
	// Wird genutzt von: updateDarts().
	function ensureShadowFilter(overlay) {
		if (! overlay || ! CONFIG.enableShadow) {
			return null;
		}

		let defs = overlay.querySelector("defs");
		if (! defs) {
			defs = document.createElementNS(SVG_NS, "defs");
			overlay.appendChild(defs);
		}

		let filter = overlay.querySelector(`#${SHADOW_FILTER_ID}`);
		if (! filter) {
			filter = document.createElementNS(SVG_NS, "filter");
			filter.id = SHADOW_FILTER_ID;
			filter.setAttribute("x", "-50%");
			filter.setAttribute("y", "-50%");
			filter.setAttribute("width", "200%");
			filter.setAttribute("height", "200%");
			filter.setAttribute("color-interpolation-filters", "sRGB");

			const colorMatrix = document.createElementNS(SVG_NS, "feColorMatrix");
			colorMatrix.setAttribute("type", "matrix");
			colorMatrix.setAttribute("in", "SourceGraphic");
			colorMatrix.setAttribute("result", "shadowColor");
			colorMatrix.setAttribute("values", "0 0 0 0 0 " + "0 0 0 0 0 " + "0 0 0 0 0 " + "0 0 0 1 0");
			filter.appendChild(colorMatrix);

			const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
			blur.setAttribute("in", "shadowColor");
			blur.setAttribute("result", "shadowBlur");
			blur.setAttribute("stdDeviation", "0");
			filter.appendChild(blur);

			defs.appendChild(filter);
		}

		const blurPx = Math.max(0, Number.parseFloat(CONFIG.shadowBlurPx) || 0);
		const blurNode = filter.querySelector("feGaussianBlur");
		if (blurNode) {
			blurNode.setAttribute("stdDeviation", String(blurPx));
		}

		return filter;
	}

	// Funktion: clearOverlay
	// Zweck: Overlay-Inhalt vollständig entfernen.
	// Parameter: overlay (SVG-Element).
	// Rückgabe: void.
	// Nutzt: removeChild().
	// Wird genutzt von: clearDarts().
	function clearOverlay(overlay) {
		if (! overlay) {
			return;
		}
		const scene = ensureOverlayScene(overlay);
		if (scene) {
			while (scene.firstChild) {
				scene.removeChild(scene.firstChild);
			}
		}
		Array.from(overlay.children).forEach((child) => {
			if (child === scene) {
				return;
			}
			if (child.tagName && child.tagName.toLowerCase() === "defs") {
				return;
			}
			child.remove();
		});
	}

	// Funktion: removeOverlay
	// Zweck: Overlay entfernen und internen Zustand leeren.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: OVERLAY_ID, dartByMarker.clear().
	// Wird genutzt von: updateDarts(), handleLocationChange().
	function removeOverlay() {
		const overlay = document.getElementById(OVERLAY_ID);
		if (overlay) {
			overlay.remove();
		}
		dartByMarker.clear();
	}

	// Funktion: clearDarts
	// Zweck: Alle Darts aus dem Overlay entfernen.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: clearOverlay(), dartByMarker.clear().
	// Wird genutzt von: updateDarts().
	function clearDarts() {
		const overlay = document.getElementById(OVERLAY_ID);
		if (overlay) {
			clearOverlay(overlay);
		}
		dartByMarker.clear();
	}

	// Funktion: resetMarkers
	// Zweck: Original-Marker wieder sichtbar machen.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: CONFIG.markerSelector, setMarkerHidden().
	// Wird genutzt von: updateDarts(), handleLocationChange().
	function resetMarkers() {
		collectMarkersInDocument().forEach((marker) => setMarkerHidden(marker, false));
	}

	// Funktion: isMarkerCandidate
	// Zweck: Marker-Kandidaten anhand von Attributen erkennen.
	// Parameter: circle (SVGCircleElement).
	// Rückgabe: boolean.
	// Nutzt: class/style/filter/data-* Attribute.
	// Wird genutzt von: collectMarkers().
	function isMarkerCandidate(circle) {
		if (! circle || circle.tagName.toLowerCase() !== "circle") {
			return false;
		}
		if (circle.hasAttribute("data-hit") || circle.hasAttribute("data-marker")) {
			return true;
		}
		const className = circle.getAttribute("class") || "";
		const style = circle.getAttribute("style") || "";
		const filter = circle.getAttribute("filter") || "";
		return /shadow|marker|hit|dart|drop-shadow|filter/i.test(`${className} ${style} ${filter}`);
	}

	// Funktion: collectMarkers
	// Zweck: Marker im Board-SVG finden (Primär-Selektor + Fallback).
	// Parameter: svg (SVGElement).
	// Rückgabe: Array<SVGCircleElement>.
	// Nutzt: CONFIG.markerSelector, isMarkerCandidate().
	// Wird genutzt von: updateDarts(), collectMarkersInDocument().
	function collectMarkers(svg) {
		if (! svg) {
			return [];
		}
		const primarySet = new Set(svg.querySelectorAll(CONFIG.markerSelector));
		const circles = Array.from(svg.querySelectorAll("circle"));
		const merged = circles.filter((circle) => primarySet.has(circle) || isMarkerCandidate(circle));
		if (merged.length) {
			return merged;
		}
		return Array.from(primarySet);
	}

	// Funktion: collectMarkersInDocument
	// Zweck: Marker über alle SVGs sammeln.
	// Parameter: keine.
	// Rückgabe: Array<SVGCircleElement>.
	// Nutzt: collectMarkers().
	// Wird genutzt von: resetMarkers().
	function collectMarkersInDocument() {
		const markers = new Set();
		document.querySelectorAll("svg").forEach((svg) => {
			collectMarkers(svg).forEach((marker) => markers.add(marker));
		});
		return Array.from(markers);
	}

	// Funktion: getDartSize
	// Zweck: Dart-Bildgröße aus Board-Radius ableiten.
	// Parameter: radiusPx (number).
	// Rückgabe: {width, height}.
	// Nutzt: CONFIG.dartLengthRatio, CONFIG.dartAspectRatio.
	// Wird genutzt von: updateDarts().
	function getDartSize(radiusPx) {
		const length = Math.max(1, radiusPx * CONFIG.dartLengthRatio);
		const height = Math.max(1, length / CONFIG.dartAspectRatio);
		return {width: length, height};
	}

	// Funktion: getOverlayPadding
	// Zweck: Overlay-Padding für Flugbahn und Bild berechnen.
	// Parameter: size ({width, height}).
	// Rückgabe: number (Padding in px).
	// Nutzt: CONFIG.tipOffsetXRatio, CONFIG.flightDistanceRatio, CONFIG.arcHeightRatio.
	// Wird genutzt von: updateDarts().
	function getOverlayPadding(size) {
		const tailRatio = Math.max(0, 1 - CONFIG.tipOffsetXRatio);
		let padding = Math.max(16, size.width * tailRatio);
		if (CONFIG.animateDarts) {
			const arcExtra = CONFIG.animationStyle === "arc" ? CONFIG.arcHeightRatio : 0;
			const flightPadding = size.width * (CONFIG.flightDistanceRatio + arcExtra);
			padding = Math.max(padding, flightPadding);
		}
		return padding;
	}

	// Funktion: updateOverlayLayout
	// Zweck: Overlay-Position/Size setzen und viewBox aktualisieren.
	// Parameter: overlay (SVG), boardRect (DOMRect), paddingPx (number).
	// Rückgabe: DOMRect des Overlays.
	// Nutzt: overlay.style, overlay.getBoundingClientRect().
	// Wird genutzt von: updateDarts().
	function updateOverlayLayout(overlay, boardRect, paddingPx) {
		const width = boardRect.width + paddingPx * 2;
		const height = boardRect.height + paddingPx * 2;
		const left = boardRect.left - paddingPx;
		const top = boardRect.top - paddingPx;

		overlay.style.left = `${left}px`;
		overlay.style.top = `${top}px`;
		overlay.style.width = `${width}px`;
		overlay.style.height = `${height}px`;
		overlay.setAttribute("width", String(width));
		overlay.setAttribute("height", String(height));
		overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);

		return overlay.getBoundingClientRect();
	}

	// Funktion: isBoardVisible
	// Zweck: Sichtbarkeit des Boards prüfen (Size/Display/Opacity).
	// Parameter: svg (SVG), rect (DOMRect).
	// Rückgabe: boolean.
	// Nutzt: window.getComputedStyle().
	// Wird genutzt von: updateDarts().
	function isBoardVisible(svg, rect) {
		if (! svg || ! svg.isConnected) {
			return false;
		}
		if (! rect || rect.width<= 1 || rect.height <= 1) {
      return false;
    }
    const style = window.getComputedStyle(svg);
    if (!style) {
      return true;
    }
    if (style.display === "none") {
      return false;
    }
    if (style.visibility === "hidden" || style.visibility === "collapse") {
      return false;
    }
    const opacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(opacity) && opacity <= 0) {
      return false;
    }
    return true;
  }

  // Funktion: setMarkerHidden
  // Zweck: Marker ein-/ausblenden und Original-Opazität merken.
  // Parameter: marker (SVGElement), hidden (boolean).
  // Rückgabe: void.
  // Nutzt: MARKER_OPACITY_KEY im dataset.
  // Wird genutzt von: resetMarkers(), updateDarts().
  function setMarkerHidden(marker, hidden) {
    if (hidden) {
      if (marker.dataset[MARKER_OPACITY_KEY] === undefined) {
        marker.dataset[MARKER_OPACITY_KEY] = marker.style.opacity || "";
      }
      marker.style.opacity = "0";
      return;
    }

    if (marker.dataset[MARKER_OPACITY_KEY] !== undefined) {
      marker.style.opacity = marker.dataset[MARKER_OPACITY_KEY];
      delete marker.dataset[MARKER_OPACITY_KEY];
    } else {
      marker.style.opacity = "";
    }
  }

  // Funktion: getMarkerScreenPoint
  // Zweck: Bildschirm-Position eines Markers bestimmen.
  // Parameter: marker (SVGElement).
  // Rückgabe: {x, y} oder null.
  // Nutzt: getBoundingClientRect(), SVGPoint, getScreenCTM().
  // Wird genutzt von: updateDarts().
  function getMarkerScreenPoint(marker) {
    if (!marker || typeof marker.getBoundingClientRect !== "function") {
      return null;
    }

    const rect = marker.getBoundingClientRect();
    if (
      Number.isFinite(rect.width)
      && Number.isFinite(rect.height)
      && rect.width > 0
      && rect.height > 0
    ) {
      return {
        x: rect.left + rect.width / 2, y: rect.top + rect.height / 2
      };
    }

    const svg = marker.ownerSVGElement;
    if (!svg || typeof svg.createSVGPoint !== "function") {
      return null;
    }

    let x = Number.parseFloat(marker.getAttribute("cx"));
    let y = Number.parseFloat(marker.getAttribute("cy"));

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const bbox = marker.getBBox();
      x = bbox.x + bbox.width / 2;
      y = bbox.y + bbox.height / 2;
    }

    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;

    const matrix = marker.getScreenCTM();
    if (!matrix) {
      return null;
    }

    const screenPoint = point.matrixTransform(matrix);
    if (!Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) {
      return null;
    }
    return { x: screenPoint.x, y: screenPoint.y };
  }

  // Funktion: canAnimateDarts
  // Zweck: Animationen nur bei erlaubten Bedingungen zulassen.
  // Parameter: keine.
  // Rückgabe: boolean.
  // Nutzt: CONFIG.animateDarts, Element.animate, matchMedia().
  // Wird genutzt von: animateDart(), updateDarts().
  function canAnimateDarts() {
    if (!CONFIG.animateDarts) {
      return false;
    }
    if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") {
      return false;
    }
    if (typeof window.matchMedia === "function") {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reducedMotion && reducedMotion.matches) {
        return false;
      }
    }
    return true;
  }

  // Funktion: getDartOffsets
  // Zweck: Offset der Dart-Spitze im Bild berechnen.
  // Parameter: size ({width, height}).
  // Rückgabe: {offsetX, offsetY}.
  // Nutzt: CONFIG.tipOffsetXRatio/YRatio.
  // Wird genutzt von: updateDartElement().
  function getDartOffsets(size) {
    return {
      offsetX: size.width * CONFIG.tipOffsetXRatio, offsetY: size.height * CONFIG.tipOffsetYRatio
    };
  }

  // Funktion: getDartOpacity
  // Zweck: Opazität aus Transparenzwert ableiten.
  // Parameter: keine.
  // Rückgabe: number (0..1).
  // Nutzt: CONFIG.dartTransparency.
  // Wird genutzt von: updateDartElement(), getShadowSettings(), animateDart().
  function getDartOpacity() {
    const transparency = Number.parseFloat(CONFIG.dartTransparency);
    if (!Number.isFinite(transparency)) {
      return 1;
    }
    return Math.min(1, Math.max(0, 1 - transparency));
  }

  // Funktion: getShadowSettings
  // Zweck: Schatten-Parameter aus Config berechnen.
  // Parameter: size ({width, height}), dartOpacity (number).
  // Rückgabe: {enabled, baseOpacity, blurPx, offsetX, offsetY}.
  // Nutzt: CONFIG.shadow*.
  // Wird genutzt von: updateDartElement(), animateDart().
  function getShadowSettings(size, dartOpacity) {
    const enabled = Boolean(CONFIG.enableShadow);
    const opacity = Number.parseFloat(CONFIG.shadowOpacity);
    const blurPx = Number.parseFloat(CONFIG.shadowBlurPx);
    const offsetXRatio = Number.parseFloat(CONFIG.shadowOffsetXRatio);
    const offsetYRatio = Number.parseFloat(CONFIG.shadowOffsetYRatio);

    return {
      enabled, baseOpacity: Math.min(1, Math.max(0, (Number.isFinite(opacity) ? opacity : 0) * dartOpacity)), blurPx: Math.max(0, Number.isFinite(blurPx) ? blurPx : 0), offsetX: size.width * (Number.isFinite(offsetXRatio) ? offsetXRatio : 0), offsetY: size.width * (Number.isFinite(offsetYRatio) ? offsetYRatio : 0)
    };
  }

  // Funktion: nowMs
  // Zweck: Zeitstempel in Millisekunden liefern.
  // Parameter: keine.
  // Rückgabe: number.
  // Nutzt: performance.now() oder Date.now().
  // Wird genutzt von: animateDart(), updateDarts().
  function nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }

  // Funktion: createMotionProfile
  // Zweck: Zufallsvariationen für Arc und Dauer erzeugen.
  // Parameter: keine.
  // Rückgabe: {arcScale, durationScale}.
  // Nutzt: CONFIG.variationArcRatio, CONFIG.variationDurationRatio.
  // Wird genutzt von: createDartElements(), animateDart().
  function createMotionProfile() {
    const arcVar = Number.parseFloat(CONFIG.variationArcRatio);
    const durationVar = Number.parseFloat(CONFIG.variationDurationRatio);
    const arcDelta = Number.isFinite(arcVar) ? arcVar : 0;
    const durationDelta = Number.isFinite(durationVar) ? durationVar : 0;

    const arcScale = Math.max(0, 1 + (Math.random() * 2 - 1) * arcDelta);
    const durationScale = Math.max(0.6, 1 + (Math.random() * 2 - 1) * durationDelta);

    return {arcScale, durationScale};
  }

  // Funktion: createDartElements
  // Zweck: SVG-Gruppen für Dart und Schatten erzeugen.
  // Parameter: center ({x, y}), size, boardCenter.
  // Rückgabe: entry-Objekt für dartByMarker.
  // Nutzt: createMotionProfile(), updateDartElement().
  // Wird genutzt von: updateDarts().
  function createDartElements(center, size, boardCenter) {
    const flightGroup = document.createElementNS(SVG_NS, "g");
    flightGroup.classList.add(DART_FLIGHT_CLASS);

    const rotateGroup = document.createElementNS(SVG_NS, "g");
    const shadow = document.createElementNS(SVG_NS, "image");
    shadow.classList.add(DART_SHADOW_CLASS);
    const image = document.createElementNS(SVG_NS, "image");
    image.classList.add(DART_CLASS, DART_WOBBLE_CLASS);
    rotateGroup.appendChild(shadow);
    rotateGroup.appendChild(image);
    flightGroup.appendChild(rotateGroup);

    const entry = {
      container: flightGroup, rotateGroup, shadow, image, animated: false, motion: createMotionProfile(), flightAnimation: null, flightStartedAt: 0, wobbleAnimation: null, settleUntil: 0
    };

    updateDartElement(entry, center, size, boardCenter);
    return entry;
  }

  // Funktion: updateDartElement
  // Zweck: Position, Größe, Rotation und Schatten aktualisieren.
  // Parameter: entry, center, size, boardCenter.
  // Rückgabe: void.
  // Nutzt: getDartOffsets(), getDartOpacity(), getShadowSettings().
  // Wird genutzt von: createDartElements(), updateDarts().
  function updateDartElement(entry, center, size, boardCenter) {
    const image = entry.image;
    const shadow = entry.shadow;
    let rotationDeg = 0;
    image.setAttribute("href", CONFIG.dartImageUrl);
    image.setAttributeNS(XLINK_NS, "href", CONFIG.dartImageUrl);
    image.setAttribute("width", String(size.width));
    image.setAttribute("height", String(size.height));

    const offsets = getDartOffsets(size);
    const x = center.x - offsets.offsetX;
    const y = center.y - offsets.offsetY;
    image.setAttribute("x", String(x));
    image.setAttribute("y", String(y));

    const dartOpacity = getDartOpacity();
    const shadowSettings = getShadowSettings(size, dartOpacity);

    if (size.width> 0 && size.height > 0) {
			const originX = Math.min(100, Math.max(0, (offsets.offsetX / size.width) * 100));
			const originY = Math.min(100, Math.max(0, (offsets.offsetY / size.height) * 100));
			const origin = `${originX}% ${originY}%`;
			image.style.transformOrigin = origin;
			if (shadow) {
				shadow.style.transformOrigin = origin;
			}
		} else {
			image.style.transformOrigin = "";
			if (shadow) {
				shadow.style.transformOrigin = "";
			}
		}

		image.style.opacity = String(dartOpacity);

		if (CONFIG.rotateToCenter && boardCenter) {
			const dx = boardCenter.x - center.x;
			const dy = boardCenter.y - center.y;
			const angleToCenter = (Math.atan2(dy, dx) * 180) / Math.PI;
			const rotation = angleToCenter - CONFIG.baseAngleDeg;
			rotationDeg = rotation;
			entry.rotateGroup.setAttribute("transform", `rotate(${rotation} ${
				center.x
			} ${
				center.y
			})`);
		} else {
			entry.rotateGroup.removeAttribute("transform");
		}

		if (shadow) {
			shadow.setAttribute("href", CONFIG.dartImageUrl);
			shadow.setAttributeNS(XLINK_NS, "href", CONFIG.dartImageUrl);
			shadow.setAttribute("width", String(size.width));
			shadow.setAttribute("height", String(size.height));
			shadow.setAttribute("x", String(x));
			shadow.setAttribute("y", String(y));
			shadow.setAttribute("filter", shadowSettings.enabled ? `url(#${SHADOW_FILTER_ID})` : "");
			shadow.style.opacity = shadowSettings.enabled ? String(shadowSettings.baseOpacity) : "0";
			shadow.style.filter = "";
			shadow.style.display = shadowSettings.enabled ? "" : "none";

			if (shadowSettings.enabled) {
				const tipRatioX = Number.isFinite(CONFIG.tipOffsetXRatio) ? CONFIG.tipOffsetXRatio : 0;
				const tailLength = Math.max(1, size.width * Math.max(0.05, Math.abs(1 - tipRatioX)));
				const theta = (rotationDeg * Math.PI) / 180;
				const localX = shadowSettings.offsetX * Math.cos(theta) + shadowSettings.offsetY * Math.sin(theta);
				const localY = -shadowSettings.offsetX * Math.sin(theta) + shadowSettings.offsetY * Math.cos(theta);
				const scaleX = Math.max(0.2, 1 + localX / tailLength);
				const skewYDeg = (Math.atan2(localY, tailLength) * 180) / Math.PI;
				shadow.style.transform = `scale(${scaleX}, 1) skewY(${skewYDeg}deg)`;
			} else {
				shadow.style.transform = "";
			}
		}

	}

	// Funktion: getFlightOffsets
	// Zweck: Start- und Mid-Offsets für die Flugbahn berechnen.
	// Parameter: center, boardCenter, size, arcHeightRatio.
	// Rückgabe: {start, mid}.
	// Nutzt: CONFIG.flightDistanceRatio, CONFIG.animationStyle.
	// Wird genutzt von: animateDart().
	function getFlightOffsets(center, boardCenter, size, arcHeightRatio) {
		let dx = center.x - boardCenter.x;
		let dy = center.y - boardCenter.y;
		let length = Math.hypot(dx, dy);
		if (!Number.isFinite(length) || length < 0.001) {
			dx = 1;
			dy = 0;
			length = 1;
		}

		const dirX = dx / length;
		const dirY = dy / length;
		const startDistance = size.width * CONFIG.flightDistanceRatio;
		const start = {
			x: dirX * startDistance,
			y: dirY * startDistance
		};
		const mid = {
			x: start.x * 0.5,
			y: start.y * 0.5
		};

		if (CONFIG.animationStyle === "arc") {
			const arcRatio = Number.isFinite(arcHeightRatio) ? arcHeightRatio : CONFIG.arcHeightRatio;
			const arcHeight = size.width * arcRatio;
			if (arcHeight > 0) {
				const gravityScale = 0.35 + 0.65 * Math.abs(dirY);
				mid.y += arcHeight * gravityScale;
			}
		}

		return {start, mid};
	}

	// Funktion: animateDart
	// Zweck: Flug- und Einschlag-Animationen starten.
	// Parameter: entry, center, boardCenter, size.
	// Rückgabe: void.
	// Nutzt: canAnimateDarts(), getFlightOffsets(), getShadowSettings(), nowMs().
	// Wird genutzt von: updateDarts().
	function animateDart(entry, center, boardCenter, size) {
		if (entry.animated || !canAnimateDarts()) {
			return;
		}

		entry.animated = true;

		const motion = entry.motion || createMotionProfile();
		entry.motion = motion;
		const arcHeightRatio = Math.max(0, CONFIG.arcHeightRatio * motion.arcScale);

		const startTime = nowMs();
		const flightGroup = entry.container;
		const image = entry.image;
		const shadow = entry.shadow;
		const flightDuration = Math.max(0, CONFIG.flightDurationMs * motion.durationScale);
		const wobbleDuration = Math.max(0, CONFIG.wobbleDurationMs);
		const blurFrom = Math.max(0, CONFIG.blurPx);
		const fadeFrom = Math.min(1, Math.max(0, CONFIG.fadeFrom));
		const scaleFrom = Math.max(0.1, CONFIG.scaleFrom);
		const scaleMid = Math.min(1, (scaleFrom + 1) / 2);
		const fadeMid = Math.min(1, fadeFrom + 0.7);
		const blurMid = blurFrom * 0.4;
		const wobbleAngle = Math.max(0, CONFIG.wobbleAngleDeg);

		const offsets = getFlightOffsets(center, boardCenter, size, arcHeightRatio);
		const flightKeyframes = [
			{
				transform: `translate(${
					offsets.start.x
				}px, ${
					offsets.start.y
				}px) scale(${scaleFrom})`,
				opacity: fadeFrom,
				filter: `blur(${blurFrom}px)`
			}, {
				transform: `translate(${
					offsets.mid.x
				}px, ${
					offsets.mid.y
				}px) scale(${scaleMid})`,
				opacity: fadeMid,
				filter: `blur(${blurMid}px)`
			}, {
				transform: "translate(0px, 0px) scale(1)",
				opacity: 1,
				filter: "blur(0px)"
			}
		];

		const flightAnimation = flightGroup.animate(flightKeyframes, {
			duration: flightDuration,
			easing: CONFIG.flightEasing,
			fill: "both"
		});

		entry.flightAnimation = flightAnimation;
		entry.flightStartedAt = startTime;
		entry.settleUntil = Math.max(entry.settleUntil || 0, startTime + flightDuration + 140);

		const cleanupFlight = () => {
			if (entry.flightAnimation !== flightAnimation) {
				return;
			}
			entry.flightAnimation = null;
			entry.flightStartedAt = 0;
			flightGroup.style.transform = "";
			flightGroup.style.opacity = "";
			flightGroup.style.filter = "";
		};
		flightAnimation.onfinish = cleanupFlight;
		flightAnimation.oncancel = cleanupFlight;

		const impactBoost = Number.parseFloat(CONFIG.shadowImpactOpacityBoost);
		const impactDuration = Number.parseFloat(CONFIG.shadowImpactDurationMs);
		if (shadow && impactDuration > 0 && impactBoost > 0 && CONFIG.enableShadow) {
			const shadowSettings = getShadowSettings(size, getDartOpacity());
			if (shadowSettings.enabled && shadowSettings.baseOpacity > 0) {
				const maxOpacity = Math.min(1, shadowSettings.baseOpacity + impactBoost);
				const shadowKeyframes = [
					{
						opacity: shadowSettings.baseOpacity
					}, {
						opacity: maxOpacity
					}, {
						opacity: shadowSettings.baseOpacity
					}
				];
				shadow.animate(shadowKeyframes, {
					duration: impactDuration,
					delay: flightDuration,
					easing: CONFIG.wobbleEasing
				});
			}
		}

		if (wobbleDuration > 0 && wobbleAngle > 0) {
			const wobbleKeyframes = [
				{
					transform: "rotate(0deg)"
				},
				{
					transform: `rotate(${ - wobbleAngle
					}deg)`
				},
				{
					transform: `rotate(${
						wobbleAngle * 0.6
					}deg)`
				},
				{
					transform: `rotate(${ - wobbleAngle * 0.35
					}deg)`
				}, {
					transform: "rotate(0deg)"
				}
			];

			const wobbleAnimation = image.animate(wobbleKeyframes, {
				duration: wobbleDuration,
				delay: flightDuration,
				easing: CONFIG.wobbleEasing,
				fill: "both"
			});

			entry.wobbleAnimation = wobbleAnimation;
			const cleanupWobble = () => {
				if (entry.wobbleAnimation !== wobbleAnimation) {
					return;
				}
				entry.wobbleAnimation = null;
				image.style.transform = "";
			};
			wobbleAnimation.onfinish = cleanupWobble;
			wobbleAnimation.oncancel = cleanupWobble;
		}
	}

	// Funktion: updateDarts
	// Zweck: Haupt-Update von Markern zu Darts inkl. Layout/Animation.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: findBoard(), getSvgScale(), getDartSize(), getOverlayPadding(), ensureOverlaySvg(), ensureShadowFilter(), updateOverlayLayout(), getMarkerScreenPoint(), createDartElements(), animateDart(), updateDartElement(), scheduleRetry().
	// Wird genutzt von: scheduleUpdate(), Initialisierung.
	function updateDarts() {
		const board = findBoard();
		if (! board) {
			removeOverlay();
			resetMarkers();
			return;
		}

		const boardRect = board.svg.getBoundingClientRect();
		if (! isBoardVisible(board.svg, boardRect)) {
			removeOverlay();
			resetMarkers();
			return;
		}

		const markers = collectMarkers(board.svg);
		if (! markers.length) {
			clearDarts();
			return;
		}

		const shouldHideMarkers = CONFIG.hideMarkers && Boolean(CONFIG.dartImageUrl);

		if (! shouldHideMarkers) {
			markers.forEach((marker) => setMarkerHidden(marker, false));
		}

		if (! CONFIG.dartImageUrl) {
			clearDarts();
			return;
		}

		const scale = getSvgScale(board.svg);
		const radiusPx = getBoardRadius(board.svg) * scale;
		const size = getDartSize(radiusPx);
		const paddingPx = getOverlayPadding(size);
		const overlay = ensureOverlaySvg();
		ensureShadowFilter(overlay);
		const overlayScene = ensureOverlayScene(overlay);
		if (! overlayScene) {
			return;
		}
		const overlayRect = updateOverlayLayout(overlay, boardRect, paddingPx);

		const boardCenter = {
			x: boardRect.width / 2 + paddingPx,
			y: boardRect.height / 2 + paddingPx
		};

		const markerSet = new Set(markers);
		let removedAny = false;
		for (const [marker, entry] of dartByMarker.entries()) {
			if (! markerSet.has(marker) || !marker.isConnected) {
				if (entry.container && entry.container.parentNode) {
					entry.container.remove();
				}
				dartByMarker.delete(marker);
				setMarkerHidden(marker, false);
				removedAny = true;
			}
		}

		const shouldAnimate = canAnimateDarts();
		const now = nowMs();
		const durationVar = Number.parseFloat(CONFIG.variationDurationRatio);
		const durationScaleMax = 1 + (Number.isFinite(durationVar) ? Math.abs(durationVar) : 0);
		const flightDurationBaseMs = CONFIG.flightDurationMs * durationScaleMax;
		const settleDurationMs = Math.max(220, flightDurationBaseMs + 160);
		const flightTimeoutMs = Math.max(240, flightDurationBaseMs + 180);
		const retryDelayMs = Math.max(60, Math.min(140, Math.round(flightDurationBaseMs / 3)));

		let createdAny = false;
		let needsRetry = false;
		const markerEntries = [];

		markers.forEach((marker, index) => {
			const screenPoint = getMarkerScreenPoint(marker);
			if (! screenPoint) {
				needsRetry = true;
				return;
			}

			const center = {
				x: screenPoint.x - overlayRect.left,
				y: screenPoint.y - overlayRect.top
			};

			let entry = dartByMarker.get(marker);
			if (! entry) {
				entry = createDartElements(center, size, boardCenter);
				entry.settleUntil = now + settleDurationMs;
				overlayScene.appendChild(entry.container);
				dartByMarker.set(marker, entry);
				createdAny = true;
				if (shouldAnimate) {
					animateDart(entry, center, boardCenter, size);
				}
			} else {
				if (entry.flightAnimation && entry.flightStartedAt && now - entry.flightStartedAt > flightTimeoutMs) {
					try {
						entry.flightAnimation.finish();
					} catch (error) {
						entry.flightAnimation.cancel();
					}
				}
				updateDartElement(entry, center, size, boardCenter);
			}

			if (shouldHideMarkers) {
				setMarkerHidden(marker, true);
			}

			if (entry.settleUntil && now < entry.settleUntil) {
				needsRetry = true;
			}

			markerEntries.push({entry, center, index});
		});

		if (createdAny || removedAny) {
			markerEntries.sort((a, b) => {
				const deltaY = a.center.y - b.center.y;
				if (Math.abs(deltaY) > 0.001) {
					return deltaY;
				}
				return a.index - b.index;
			});

			for (const item of markerEntries) {
				if (item.entry && item.entry.container) {
					overlayScene.appendChild(item.entry.container);
				}
			}
		}

		if (needsRetry) {
			scheduleRetry(retryDelayMs);
		}
	}

	// Funktion: scheduleUpdate
	// Zweck: updateDarts per rAF takten und Duplikate vermeiden.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: requestAnimationFrame(), updateDarts().
	// Wird genutzt von: Observer/Events/handleLocationChange().
	const scheduleUpdate = createRafScheduler(updateDarts);

	let retryTimer = 0;
	// Funktion: scheduleRetry
	// Zweck: Verzögertes Update bei instabilem Layout.
	// Parameter: delayMs (number).
	// Rückgabe: void.
	// Nutzt: setTimeout(), scheduleUpdate().
	// Wird genutzt von: updateDarts().
	function scheduleRetry(delayMs) {
		if (retryTimer) {
			return;
		}
		retryTimer = window.setTimeout(() => {
			retryTimer = 0;
			scheduleUpdate();
		}, Math.max(0, delayMs));
	}

	let lastUrl = location.href;
	// Funktion: handleLocationChange
	// Zweck: Bei URL-Änderung Overlay zurücksetzen.
	// Parameter: keine.
	// Rückgabe: void.
	// Nutzt: removeOverlay(), resetMarkers(), scheduleUpdate().
	// Wird genutzt von: watchLocationChanges().
	function handleLocationChange() {
		if (location.href === lastUrl) {
			return;
		}
		lastUrl = location.href;
		removeOverlay();
		resetMarkers();
		scheduleUpdate();
	}

	// Funktion: watchLocationChanges
	// Zweck: SPA-Navigation über Events/Observer beobachten.
	// Parameter: keine.
	// Rückgabe: function (Cleanup).
	// Nutzt: popstate/hashchange/currententrychange, MutationObserver, Fallback-Interval, handleLocationChange().
	// Wird genutzt von: Initialisierung.
	function watchLocationChanges() {
		const onPotentialLocationChange = () => {
			handleLocationChange();
		};

		window.addEventListener("popstate", onPotentialLocationChange);
		window.addEventListener("hashchange", onPotentialLocationChange);

		const navigationApi = typeof window.navigation === "object" ? window.navigation : null;
		const hasCurrentEntryChangeEvent = Boolean(navigationApi && typeof navigationApi.addEventListener === "function" && typeof navigationApi.removeEventListener === "function");
		if (hasCurrentEntryChangeEvent) {
			navigationApi.addEventListener("currententrychange", onPotentialLocationChange);
		}

		let fallbackInterval = 0;
		const stopFallbackInterval = () => {
			if (! fallbackInterval) {
				return;
			}
			window.clearInterval(fallbackInterval);
			fallbackInterval = 0;
		};
		const startFallbackInterval = () => {
			if (fallbackInterval) {
				return;
			}
			fallbackInterval = window.setInterval(handleLocationChange, 1000);
		};
		const needsFallbackInterval = ! hasCurrentEntryChangeEvent;

		let locationObserver = null;
		const startLocationObserver = () => {
			if (locationObserver || typeof MutationObserver !== "function") {
				return Boolean(locationObserver);
			}

			const root = document.documentElement || document.body;
			if (! root) {
				return false;
			}

			locationObserver = new MutationObserver(onPotentialLocationChange);
			locationObserver.observe(root, {
				childList: true,
				subtree: true
			});
			if (! needsFallbackInterval) {
				stopFallbackInterval();
			}
			return true;
		};

		let domReadyListener = null;
		const observerStarted = startLocationObserver();
		if (! observerStarted) {
			domReadyListener = () => {
				if (startLocationObserver()) {
					if (! needsFallbackInterval) {
						stopFallbackInterval();
					}
				}
			};
			document.addEventListener("DOMContentLoaded", domReadyListener, {once: true});
		}
		if (needsFallbackInterval || ! observerStarted) {
			startFallbackInterval();
		}

		const cleanupLocationWatch = () => {
			window.removeEventListener("popstate", onPotentialLocationChange);
			window.removeEventListener("hashchange", onPotentialLocationChange);
			if (hasCurrentEntryChangeEvent) {
				navigationApi.removeEventListener("currententrychange", onPotentialLocationChange);
			}

			if (domReadyListener) {
				document.removeEventListener("DOMContentLoaded", domReadyListener);
				domReadyListener = null;
			}

			if (locationObserver) {
				locationObserver.disconnect();
				locationObserver = null;
			}

			stopFallbackInterval();
			window.removeEventListener("pagehide", cleanupLocationWatch);
			window.removeEventListener("beforeunload", cleanupLocationWatch);
		};

		window.addEventListener("pagehide", cleanupLocationWatch, {once: true});
		window.addEventListener("beforeunload", cleanupLocationWatch, {once: true});
		return cleanupLocationWatch;
	}

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateDarts();

	debugLog("applied");
	const domObserver = observeMutations({onChange: scheduleUpdate});

	window.addEventListener("resize", scheduleUpdate);
	window.addEventListener("scroll", scheduleUpdate, true);
	const cleanupLocationWatch = watchLocationChanges();

	let cleanedUp = false;
	const instanceId = Symbol("adExtDartMarkerDarts");
	function cleanupInstance() {
		if (cleanedUp) {
			return;
		}
		cleanedUp = true;

		if (retryTimer) {
			window.clearTimeout(retryTimer);
			retryTimer = 0;
		}

		if (domObserver && typeof domObserver.disconnect === "function") {
			domObserver.disconnect();
		}

		window.removeEventListener("resize", scheduleUpdate);
		window.removeEventListener("scroll", scheduleUpdate, true);

		if (typeof cleanupLocationWatch === "function") {
			cleanupLocationWatch();
		}

		removeOverlay();
		resetMarkers();

		if (window[INSTANCE_KEY] && window[INSTANCE_KEY].id === instanceId) {
			delete window[INSTANCE_KEY];
		}
	}

	window[INSTANCE_KEY] = {
		id: instanceId,
		cleanup: cleanupInstance
	};

	window.addEventListener("pagehide", cleanupInstance, {once: true});
	window.addEventListener("beforeunload", cleanupInstance, {once: true});
	debugLog("init", { debug: DEBUG_ENABLED });
})();
