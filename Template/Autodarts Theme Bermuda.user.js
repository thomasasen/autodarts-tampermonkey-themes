// ==UserScript==
// @name         Autodarts Theme Bermuda
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Visuelles Bermuda-Theme mit klarerer Trennung wichtiger Bereiche.
// @xconfig-description  Aktiviert ein Bermuda-Theme mit konsistentem Layout und besserer Lesbarkeit.
// @xconfig-title  Theme Bermuda
// @xconfig-variant      bermuda
// @xconfig-readme-anchor  template-autodarts-theme-bermuda
// @xconfig-tech-anchor  template-autodarts-theme-bermuda
// @xconfig-background     assets/template-theme-bermuda-xConfig.png
// @xconfig-settings-version 4
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Bermuda.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Bermuda.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {
		attachTheme,
		createCssBuilder,
		buildThemeVisualSettingsCss,
		commonThemeCss,
		commonLayoutCss,
		initPreviewPlacement
	} = window.autodartsThemeShared;

	// Style tag identifier und erwarteter Variantenname.
	const STYLE_ID = "autodarts-bermuda-custom-style";
	const VARIANT_NAME = "bermuda";
	const SOURCE_PATH = "Template/Autodarts Theme Bermuda.user.js";

	// xConfig: {"type":"select","label":"Hintergrund-Darstellung","description":"Legt fest, wie das hochgeladene Hintergrundbild angezeigt wird.","options":[{"value":"fill","label":"Füllen (Cover)"},{"value":"fit","label":"Einpassen (Contain)"},{"value":"stretch","label":"Strecken"},{"value":"center","label":"Zentriert"},{"value":"tile","label":"Kacheln"}]}
	const xConfig_HINTERGRUND_DARSTELLUNG = "fill";

	// xConfig: {"type":"select","label":"Hintergrundbild-Deckkraft","description":"Steuert die Sichtbarkeit des hochgeladenen Hintergrundbilds.","options":[{"value":100,"label":"100% (voll sichtbar)"},{"value":85,"label":"85%"},{"value":70,"label":"70%"},{"value":55,"label":"55%"},{"value":40,"label":"40%"},{"value":25,"label":"25%"},{"value":10,"label":"10%"}]}
	const xConfig_HINTERGRUND_OPAZITAET = 25;

	// xConfig: {"type":"select","label":"Spielerfelder-Transparenz","description":"Regelt, wie transparent die Spielerfelder dargestellt werden (Texte bleiben unverändert).","options":[{"value":0,"label":"0% (keine Transparenz)"},{"value":5,"label":"5%"},{"value":10,"label":"10%"},{"value":15,"label":"15%"},{"value":30,"label":"30%"},{"value":45,"label":"45%"},{"value":60,"label":"60%"}]}
	const xConfig_SPIELERFELD_TRANSPARENZ = 10;

	// xConfig: {"type":"action","label":"Hintergrundbild hochladen","description":"Wählt ein eigenes Hintergrundbild für dieses Theme. Das Bild wird komprimiert und persistent gespeichert.","action":"theme-background-upload","buttonLabel":"Bild hochladen"}
	const xConfig_HINTERGRUND_BILD_HOCHLADEN = "theme-background-upload";

	// xConfig: {"type":"action","label":"Hintergrundbild entfernen","description":"Entfernt das gespeicherte Hintergrundbild für dieses Theme.","action":"theme-background-clear","buttonLabel":"Bild entfernen"}
	const xConfig_HINTERGRUND_BILD_ENTFERNEN = "theme-background-clear";

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
	const DEBUG_PREFIX = "[xConfig][Theme Bermuda]";

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

	const buildCss = createCssBuilder({
		fallbackThemeCss: commonThemeCss,
		fallbackLayoutCss: commonLayoutCss,
		extraCss: previewPlacementCss,
		visualSettingsCss: () => buildThemeVisualSettingsCss({
			featureSourcePath: SOURCE_PATH,
			backgroundDisplayMode: xConfig_HINTERGRUND_DARSTELLUNG,
			backgroundOpacity: xConfig_HINTERGRUND_OPAZITAET,
			playerFieldTransparency: xConfig_SPIELERFELD_TRANSPARENZ
		})
	});

	attachTheme({styleId: STYLE_ID, variantName: VARIANT_NAME, buildCss, matchMode: "includes"});
	debugLog("applied", { styleId: STYLE_ID, variant: VARIANT_NAME });

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({
			variantName: VARIANT_NAME,
			matchMode: "includes",
			previewHeightPx: PREVIEW_HEIGHT_PX,
			previewGapPx: PREVIEW_GAP_PX,
			previewSpaceClass: PREVIEW_SPACE_CLASS
		});
	}

	debugLog("init", { debug: DEBUG_ENABLED });
})();

