// ==UserScript==
// @name         Autodarts Theme Shanghai.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.3
// @description  Visuelles Shanghai-Theme mit klar ausgerichtetem Layout.
// @xconfig-description  Aktiviert ein Shanghai-Theme mit konsistentem Aufbau und besserer Übersicht.
// @xconfig-title  Theme Shanghai
// @xconfig-variant      shanghai
// @xconfig-readme-anchor  template-autodarts-theme-shanghai
// @xconfig-tech-anchor  template-autodarts-theme-shanghai
// @xconfig-background     assets/template-theme-shanghai-xConfig.png
// @xconfig-settings-version 3
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Shanghai.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Shanghai.user.js
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

	const STYLE_ID = "autodarts-shanghai-custom-style";
	const VARIANT_NAME = "shanghai";
	// xConfig: {"type":"toggle","label":"AVG anzeigen","description":"Zeigt den AVG-Wert im Theme an oder blendet ihn aus.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
	const xConfig_AVG_ANZEIGE = true;

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
	const DEBUG_PREFIX = "[xConfig][Theme Shanghai]";

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

	// Preview placement: "standard" or "under-throws".
	const PREVIEW_PLACEMENT = "under-throws";
	const PREVIEW_HEIGHT_PX = 128;
	const PREVIEW_GAP_PX = 8;
	const PREVIEW_SPACE_CLASS = "ad-ext-turn-preview-space";

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

	const buildCss = createCssBuilder({fallbackThemeCss: commonThemeCss, fallbackLayoutCss: commonLayoutCss, extraCss: avgVisibilityCss + previewPlacementCss});

	attachTheme({styleId: STYLE_ID, variantName: VARIANT_NAME, buildCss});
	debugLog("applied", { styleId: STYLE_ID, variant: VARIANT_NAME });

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({variantName: VARIANT_NAME, previewHeightPx: PREVIEW_HEIGHT_PX, previewGapPx: PREVIEW_GAP_PX, previewSpaceClass: PREVIEW_SPACE_CLASS});
	}

	debugLog("init", { debug: DEBUG_ENABLED });
})();

