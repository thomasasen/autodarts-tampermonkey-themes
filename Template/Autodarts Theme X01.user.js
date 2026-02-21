// ==UserScript==
// @name         Autodarts Theme X01.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.4
// @description  Visuelles X01-Theme mit Fokus auf klare Scores und gut lesbare Spielerbereiche.
// @xconfig-description  Aktiviert ein X01-Theme für mehr Struktur und schnellere Lesbarkeit im Match.
// @xconfig-title  Theme X01
// @xconfig-variant      x01
// @xconfig-readme-anchor  template-autodarts-theme-x01
// @xconfig-tech-anchor  template-autodarts-theme-x01
// @xconfig-background     assets/template-theme-x01-xConfig.png
// @xconfig-settings-version 3
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20X01.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20X01.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {
		attachTheme,
		createCssBuilder,
		commonThemeCss,
		commonLayoutCss,
		initPreviewPlacement
	} = window.autodartsThemeShared;

	// Style tag identifier and expected variant name.
	const STYLE_ID = "autodarts-x01-custom-style";
	const VARIANT_NAME = "x01";
	// xConfig: {"type":"toggle","label":"AVG anzeigen","description":"Zeigt den AVG-Wert im Theme an oder blendet ihn aus.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
	const xConfig_AVG_ANZEIGE = true;

	// xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
	const xConfig_DEBUG = false;

	// Preview placement: "standard" or "under-throws".
	const PREVIEW_PLACEMENT = "under-throws";
	const PREVIEW_HEIGHT_PX = 128;
	const PREVIEW_GAP_PX = 8;
	const PREVIEW_SPACE_CLASS = "ad-ext-turn-preview-space";

	// Stat sizing (px). Adjust to taste.
	const STAT_AVG_FONT_SIZE_PX = 36;
	const STAT_LEG_FONT_SIZE_PX = 38;
	const STAT_AVG_LINE_HEIGHT = 1.15;
	const STAT_AVG_ARROW_WIDTH_PX = 12;
	const STAT_AVG_ARROW_HEIGHT_PX = 23;
	const STAT_AVG_ARROW_MARGIN_LEFT_PX = 8;
	const INACTIVE_STAT_SCALE = 0.6;


	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Theme X01]";

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

	const RESOLVED_SHOW_AVG = resolveToggle(xConfig_AVG_ANZEIGE, true);


	// X01-spezifische Layout-Overrides.
	const x01LayoutOverrides = `
.css-hjw8x4{
  max-height: 12%;
}

div.ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score {
  font-size: 9em;
}

div.ad-ext-player.ad-ext-player-active p.chakra-text.css-11cuipc {
  font-size: 1.5em;
}

div.css-y3hfdd{
  gap: 0px !important;
  height: 25%;
}
`;
	// X01 nutzt dunkle Navigation unabhängig vom Helper.
	const navigationOverride = `
div.chakra-stack.navigation.css-19ml6yu,
div.chakra-stack.navigation.css-ege71s,
.chakra-stack.navigation {
  background-color: #434343;
}
`;

	const previewPlacementCss = PREVIEW_PLACEMENT === "under-throws" ? `
#ad-ext-turn.${PREVIEW_SPACE_CLASS}{
  padding-bottom: ${
		PREVIEW_HEIGHT_PX + PREVIEW_GAP_PX
	}px;
}
` : "";

	const avgVisibilityCss = RESOLVED_SHOW_AVG ? "" : `
p.chakra-text.css-1j0bqop{
  display: none !important;
}

.ad-ext-avg-trend-arrow{
  display: none !important;
}
`;

	const statsSizingCss = `
.ad-ext-player {
  --ad-ext-stat-scale: 1;
}

.ad-ext-player.ad-ext-player-inactive {
  --ad-ext-stat-scale: ${INACTIVE_STAT_SCALE};
}

p.chakra-text.css-1j0bqop {
  font-size: calc(${STAT_AVG_FONT_SIZE_PX}px * var(--ad-ext-stat-scale));
  line-height: ${STAT_AVG_LINE_HEIGHT};
}

span.css-3fr5p8 > p,
span.chakra-badge.css-n2903v,
span.chakra-badge.css-1j1ty0z,
span.chakra-badge.css-1c4630i {
  font-size: calc(${STAT_LEG_FONT_SIZE_PX}px * var(--ad-ext-stat-scale));
}

.ad-ext-player.ad-ext-player-inactive span.css-3fr5p8 > p {
  font-size: calc(${STAT_LEG_FONT_SIZE_PX}px * var(--ad-ext-stat-scale)) !important;
}

.ad-ext-avg-trend-arrow {
  margin-left: calc(${STAT_AVG_ARROW_MARGIN_LEFT_PX}px * var(--ad-ext-stat-scale));
}

.ad-ext-avg-trend-arrow.ad-ext-avg-trend-up {
  border-left: calc(${STAT_AVG_ARROW_WIDTH_PX}px * var(--ad-ext-stat-scale)) solid transparent;
  border-right: calc(${STAT_AVG_ARROW_WIDTH_PX}px * var(--ad-ext-stat-scale)) solid transparent;
  border-bottom: calc(${STAT_AVG_ARROW_HEIGHT_PX}px * var(--ad-ext-stat-scale)) solid #9fdb58;
}

.ad-ext-avg-trend-arrow.ad-ext-avg-trend-down {
  border-left: calc(${STAT_AVG_ARROW_WIDTH_PX}px * var(--ad-ext-stat-scale)) solid transparent;
  border-right: calc(${STAT_AVG_ARROW_WIDTH_PX}px * var(--ad-ext-stat-scale)) solid transparent;
  border-top: calc(${STAT_AVG_ARROW_HEIGHT_PX}px * var(--ad-ext-stat-scale)) solid #f87171;
}
`;

	const buildCss = createCssBuilder({
		fallbackThemeCss: commonThemeCss,
		fallbackLayoutCss: commonLayoutCss,
		extraCss: navigationOverride + previewPlacementCss + avgVisibilityCss + statsSizingCss + x01LayoutOverrides
	});

	attachTheme({styleId: STYLE_ID, variantName: VARIANT_NAME, buildCss});
	debugLog("applied", { styleId: STYLE_ID, variant: VARIANT_NAME });

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({variantName: VARIANT_NAME, previewHeightPx: PREVIEW_HEIGHT_PX, previewGapPx: PREVIEW_GAP_PX, previewSpaceClass: PREVIEW_SPACE_CLASS});
	}

	debugLog("init", { debug: DEBUG_ENABLED });
})();

