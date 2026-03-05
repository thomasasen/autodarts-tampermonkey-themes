// ==UserScript==
// @name         Autodarts Theme Cricket.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.7
// @description  Visuelles Cricket-/Tactics-Theme für eine ruhigere und klarere Darstellung.
// @xconfig-description  Aktiviert ein Cricket-/Tactics-Theme mit stimmigem Layout, Farben und guter Lesbarkeit.
// @xconfig-title  Theme Cricket
// @xconfig-variant      cricket / tactics
// @xconfig-readme-anchor  template-autodarts-theme-cricket
// @xconfig-tech-anchor  template-autodarts-theme-cricket
// @xconfig-background     assets/template-theme-cricket-xConfig.png
// @xconfig-settings-version 4
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Cricket.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Cricket.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {attachTheme, initPreviewPlacement, buildThemeVisualSettingsCss} = window.autodartsThemeShared;
	const animationShared = window.autodartsAnimationShared || {};
	const SCRIPT_VERSION = "2.7";
	const FEATURE_KEY = "ad-ext/theme-cricket";
	const SOURCE_PATH = "Template/Autodarts Theme Cricket.user.js";
	const STYLE_ID = "autodarts-cricket-custom-style";
	const VARIANT_NAME = "cricket";
	// xConfig: {"type":"toggle","label":"AVG anzeigen","description":"Zeigt den AVG-Wert im Theme an oder blendet ihn aus.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
	const xConfig_AVG_ANZEIGE = true;

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
	const DEBUG_PREFIX = "[xConfig][Theme Cricket]";

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

	function normalizeSourcePath(value) {
		return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
	}

	function getCurrentExecution() {
		const runtimeApi = window.__adXConfigRuntime;
		const execution =
			runtimeApi && typeof runtimeApi.getCurrentExecution === "function"
				? runtimeApi.getCurrentExecution()
				: null;
		return execution && typeof execution === "object" ? execution : null;
	}

	function resolveExecutionSource() {
		const execution = getCurrentExecution();
		const currentSourcePath = normalizeSourcePath(execution?.sourcePath || "");
		return currentSourcePath === normalizeSourcePath(SOURCE_PATH)
			? "xconfig-loader"
			: "standalone-userscript";
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

	const customCss = `
:root{
  --theme-bg: #000000;
  --theme-text-highlight-color: #9fdb58;
  --theme-navigation-bg: #222222;
  --theme-navigation-item-color: #666666;
  --theme-player-badge-bg: #9fdb58;
  --theme-current-bg: #0c343d;
  --theme-border-color: #434343;
  --theme-alt-bg: #274e13;
}

.css-1k7iu8k {
  max-width: 96%;
}

#ad-ext-turn > .ad-ext-turn-throw, #ad-ext-turn > .score, #ad-ext-turn > .suggestion{
height:100px !important;
}

/* Compact player cards (Cricket/Tactics): keep font sizes, reduce vertical whitespace */
#ad-ext-player-display{
  gap: 0.35rem !important;
}

#ad-ext-player-display .ad-ext-player{
  min-height: 185px !important;
}

#ad-ext-player-display .ad-ext-player > .chakra-stack{
  min-height: 185px !important;
  padding-top: 0.3rem !important;
  padding-bottom: 0.3rem !important;
}

div.css-y3hfdd{
  gap: 0 !important;
}

p.chakra-text.css-1j0bqop{
font-size: 1.2rem !important;
}

div.ad-ext-player.ad-ext-player-active.css-1en42kf p.chakra-text.css-11cuipc{
font-size: 1.8rem !important;
}

/* Inactive player (X01 selectors) */
.ad-ext-player:not(.ad-ext-player-active):not(.ad-ext-player-winner) > div > p {
  font-size: 3em !important;
  color: gray !important;
}

.ad-ext-player.ad-ext-player-inactive p.chakra-text.ad-ext-player-score,
.ad-ext-player.ad-ext-player-inactive .ad-ext_winner-score-wrapper > p {
  font-size: 3em !important;
  color: gray !important;
}

.ad-ext-player-inactive .chakra-stack.css-37hv00 {
  height: auto !important;
  min-height: 2.2rem !important;
}

.ad-ext-player.ad-ext-player-inactive.css-1en42kf{
  display: block !important;
}

.ad-ext-player-inactive .chakra-text.css-11cuipc {
  font-size: x-large !important;
}

* {
  scrollbar-width: none !important;
}

.css-tkevr6{
  height:99%;
}

div.css-gmuwbf,
div.css-tkevr6,
div.css-nfhdnc {
  background-color: var(--theme-bg);
}

.ad-ext-player-name{
  font-size: 1rem !important;
}

.css-rtn29s {
  border: 2px solid #9fdb58 !important;
}

.css-c04tlr {
  height: calc(92% - 185px) !important;
}

.chakra-stack.navigation {
  background-color: var(--theme-navigation-bg);
}

p.chakra-text.css-1qlemha {
  background-color: var(--theme-current-bg);
  left: calc(var(--chakra-space-2) * -5);
  font-size: 36px;
  white-space: nowrap;
  line-height: 1.1;
  padding: 0 0.5rem;
  width: fit-content;
}

span.css-elma0c {
  background-color: var(--theme-alt-bg);
}

div.css-rrf7rv {
  background-color: var(--theme-alt-bg);
  border-color: var(--theme-border-color);
}

.css-3fr5p8 {
  background-color: var(--theme-player-badge-bg);
  color: #222222;
}

.ad-ext_winner-score-wrapper {
  display: contents !important;
}

.css-y3hfdd > p,
.css-y3hfdd > .ad-ext_winner-score-wrapper > p {
  color: var(--theme-text-highlight-color);
}

p.chakra-text.ad-ext-player-score.css-1r7jzhg {
  color: var(--theme-text-highlight-color);
}

div.ad-ext-player.ad-ext-player-active.css-1en42kf {
  border-color: var(--theme-border-color);
  border-style: solid;
}

div.chakra-menu__menu-list.css-yskgbr {
  background-color: var(--theme-border-color);
}

span.chakra-switch__track.css-v4l15v {
  background-color: #38761d;
}

.css-1yso2z2 {
  height: 100% !important;
}

.css-1f26ant {
  height: calc(100% - 230px);
}

.css-1f26ant > div {
  height: 80% !important;
  margin-bottom: 1px !important;
}
`;

	const claimFeatureInstance = animationShared.claimFeatureInstance;
	const releaseFeatureInstance = animationShared.releaseFeatureInstance;
	const executionSource = resolveExecutionSource();
	if (
		typeof claimFeatureInstance !== "function" ||
		typeof releaseFeatureInstance !== "function"
	) {
		debugError("animation-runtime-missing", {
			sourcePath: SOURCE_PATH,
			executionSource,
		});
		return;
	}

	let instanceReleased = false;
	let disposeThemeAttachment = null;
	let disposePreviewPlacement = null;
	function dispose(reason) {
		if (instanceReleased) {
			return;
		}
		instanceReleased = true;
		if (typeof disposePreviewPlacement === "function") {
			disposePreviewPlacement();
		}
		disposePreviewPlacement = null;
		if (typeof disposeThemeAttachment === "function") {
			disposeThemeAttachment();
		}
		disposeThemeAttachment = null;
		releaseFeatureInstance(FEATURE_KEY, instanceClaim.token);
		debugLog("disposed", { reason: reason || "dispose" });
	}

	const instanceClaim = claimFeatureInstance({
		featureKey: FEATURE_KEY,
		version: SCRIPT_VERSION,
		sourcePath: SOURCE_PATH,
		executionSource,
		onDispose: function () {
			dispose("replaced-by-newer-instance");
		},
	});
	if (!instanceClaim.active) {
		debugWarn("feature-instance-skipped", {
			featureKey: FEATURE_KEY,
			version: SCRIPT_VERSION,
			reason: instanceClaim.reason,
			ownerMeta: instanceClaim.ownerMeta,
			executionSource,
		});
		return;
	}

	disposeThemeAttachment = attachTheme({
		styleId: STYLE_ID,
		variantName: VARIANT_NAME,
		buildCss: () => customCss
			+ avgVisibilityCss
			+ previewPlacementCss
			+ buildThemeVisualSettingsCss({
				featureSourcePath: SOURCE_PATH,
				backgroundDisplayMode: xConfig_HINTERGRUND_DARSTELLUNG,
				backgroundOpacity: xConfig_HINTERGRUND_OPAZITAET,
				playerFieldTransparency: xConfig_SPIELERFELD_TRANSPARENZ
			})
	}) || null;
	debugLog("applied", { styleId: STYLE_ID, variant: VARIANT_NAME });

	if (PREVIEW_PLACEMENT === "under-throws") {
		disposePreviewPlacement = initPreviewPlacement({variantName: VARIANT_NAME, previewHeightPx: PREVIEW_HEIGHT_PX, previewGapPx: PREVIEW_GAP_PX, previewSpaceClass: PREVIEW_SPACE_CLASS}) || null;
	}

	debugLog("init", { debug: DEBUG_ENABLED, executionSource });
})();

