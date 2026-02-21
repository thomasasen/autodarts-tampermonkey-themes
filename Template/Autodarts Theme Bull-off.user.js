// ==UserScript==
// @name         Autodarts Theme Bull-off.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.3
// @description  Visuelles Bull-off-Theme mit Fokus auf Kontrast und klare Score-Darstellung.
// @xconfig-description  Aktiviert ein Bull-off-Theme mit bullfokussierter Farbgebung und gut lesbaren Kontrasten.
// @xconfig-title  Theme Bull-off
// @xconfig-variant      bull-off
// @xconfig-readme-anchor  template-autodarts-theme-bull-off
// @xconfig-background     assets/template-theme-bull-off-xConfig.png
// @xconfig-settings-version 3
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Bull-off.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Bull-off.user.js
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

	const STYLE_ID = "autodarts-bull-off-custom-style";
	const VARIANT_NAME = "bull-off";
	// xConfig: {"type":"select","label":"Kontrast-Preset","description":"Bestimmt, wie stark Kontraste und Leuchteffekte im Bull-off-Theme dargestellt werden.","options":[{"value":"soft","label":"Sanft"},{"value":"standard","label":"Standard"},{"value":"high","label":"Kräftig"}]}
	const xConfig_KONTRAST_PRESET = "standard";

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
	const DEBUG_PREFIX = "[xConfig][Theme Bull-off]";

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
	function resolveStringChoice(value, fallbackValue, allowedValues) {
		const normalizedValue = String(value || "").trim();
		return allowedValues.includes(normalizedValue)
			? normalizedValue
			: fallbackValue;
	}

	const KONTRAST_PRESET = {
		soft: {
			variantBorderAlpha: 0.12,
			turnBorderAlpha: 0.1,
			turnGradientAlpha: 0.1,
			activeBorderAlpha: 0.72,
			activeShadowAlpha: 0.24,
			activeInsetAlpha: 0.16,
			activeOverlayAlpha: 0.76,
			inactiveBorderAlpha: 0.26,
			scoreShadowAlpha: 0.42,
			panelBorderAlpha: 0.09,
			panelInsetAlpha: 0.03,
			buttonBorderAlpha: 0.11,
		},
		standard: {
			variantBorderAlpha: 0.18,
			turnBorderAlpha: 0.13,
			turnGradientAlpha: 0.14,
			activeBorderAlpha: 0.9,
			activeShadowAlpha: 0.36,
			activeInsetAlpha: 0.24,
			activeOverlayAlpha: 0.88,
			inactiveBorderAlpha: 0.36,
			scoreShadowAlpha: 0.55,
			panelBorderAlpha: 0.12,
			panelInsetAlpha: 0.04,
			buttonBorderAlpha: 0.15,
		},
		high: {
			variantBorderAlpha: 0.26,
			turnBorderAlpha: 0.22,
			turnGradientAlpha: 0.22,
			activeBorderAlpha: 1,
			activeShadowAlpha: 0.48,
			activeInsetAlpha: 0.34,
			activeOverlayAlpha: 0.94,
			inactiveBorderAlpha: 0.52,
			scoreShadowAlpha: 0.72,
			panelBorderAlpha: 0.22,
			panelInsetAlpha: 0.1,
			buttonBorderAlpha: 0.24,
		},
	};
	const RESOLVED_KONTRAST_PRESET = resolveStringChoice(xConfig_KONTRAST_PRESET, "standard", ["soft", "standard", "high"]);
	const KONTRAST_VALUES = KONTRAST_PRESET[RESOLVED_KONTRAST_PRESET] || KONTRAST_PRESET.standard;

	// Preview placement: "standard" or "under-throws".
	const PREVIEW_PLACEMENT = "standard";
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

	const bullOffCss = `
:root{
  --theme-bg: #050607;
  --theme-background: #050607;
  --theme-text-highlight-color: #f2f5ff;
  --theme-navigation-bg: #272b32;
  --theme-navigation-item-color: #535c68;
  --theme-player-badge-bg: #66bb6a;
  --theme-player-name-bg: #66bb6a;
  --theme-current-bg: #4d2020;
  --theme-border-color: #3a4049;
  --theme-alt-bg: #1f2e25;
  --bull-green: #66bb6a;
  --bull-red: #ef5350;
  --bull-variant-border-alpha: ${KONTRAST_VALUES.variantBorderAlpha};
  --bull-turn-border-alpha: ${KONTRAST_VALUES.turnBorderAlpha};
  --bull-turn-gradient-alpha: ${KONTRAST_VALUES.turnGradientAlpha};
  --bull-active-border-alpha: ${KONTRAST_VALUES.activeBorderAlpha};
  --bull-active-shadow-alpha: ${KONTRAST_VALUES.activeShadowAlpha};
  --bull-active-inset-alpha: ${KONTRAST_VALUES.activeInsetAlpha};
  --bull-active-overlay-alpha: ${KONTRAST_VALUES.activeOverlayAlpha};
  --bull-inactive-border-alpha: ${KONTRAST_VALUES.inactiveBorderAlpha};
  --bull-score-shadow-alpha: ${KONTRAST_VALUES.scoreShadowAlpha};
  --bull-panel-border-alpha: ${KONTRAST_VALUES.panelBorderAlpha};
  --bull-panel-inset-alpha: ${KONTRAST_VALUES.panelInsetAlpha};
  --bull-button-border-alpha: ${KONTRAST_VALUES.buttonBorderAlpha};
}

div.css-gmuwbf,
div.css-tkevr6,
div.css-nfhdnc {
  background:
    radial-gradient(circle at 20% 15%, rgba(102, 187, 106, 0.12), transparent 38%),
    radial-gradient(circle at 82% 85%, rgba(239, 83, 80, 0.16), transparent 44%),
    #06080c;
}

#ad-ext-game-variant{
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, var(--bull-variant-border-alpha));
  border-radius: 999px;
  padding: 0.1rem 0.75rem;
  background: linear-gradient(90deg, rgba(102, 187, 106, 0.26), rgba(239, 83, 80, 0.24));
}

#ad-ext-turn > .score,
#ad-ext-turn > .ad-ext-turn-throw,
#ad-ext-turn > .suggestion{
  border: 1px solid rgba(255, 255, 255, var(--bull-turn-border-alpha));
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(102, 187, 106, var(--bull-turn-gradient-alpha)), rgba(239, 83, 80, var(--bull-turn-gradient-alpha)));
}

#ad-ext-player-display .ad-ext-player{
  border-radius: 14px;
  overflow: hidden;
  backdrop-filter: blur(1px);
}

#ad-ext-player-display .ad-ext-player.ad-ext-player-active{
  border: 2px solid rgba(102, 187, 106, var(--bull-active-border-alpha)) !important;
  box-shadow:
    0 10px 26px rgba(0, 0, 0, var(--bull-active-shadow-alpha)),
    inset 0 0 0 1px rgba(102, 187, 106, var(--bull-active-inset-alpha));
  background:
    linear-gradient(135deg, rgba(102, 187, 106, 0.12), rgba(239, 83, 80, 0.16)),
    rgba(12, 16, 21, var(--bull-active-overlay-alpha));
}

#ad-ext-player-display .ad-ext-player.ad-ext-player-inactive{
  border-color: rgba(239, 83, 80, var(--bull-inactive-border-alpha)) !important;
}

#ad-ext-player-display .ad-ext-player .ad-ext-player-score{
  font-size: 7.2em !important;
  letter-spacing: 0.03em;
  text-shadow: 0 0 18px rgba(0, 0, 0, var(--bull-score-shadow-alpha));
}

#ad-ext-player-display .ad-ext-player.ad-ext-player-active .ad-ext-player-score{
  color: #ffffff !important;
}

#ad-ext-player-display .ad-ext-player.ad-ext-player-inactive .ad-ext-player-score{
  color: #9ca8b9 !important;
}

span.css-3fr5p8{
  background: linear-gradient(90deg, var(--bull-green), var(--bull-red));
  color: #101215;
}

.css-1kejrvi .css-tqsk66,
.css-14xtjvc .css-tqsk66{
  border: 1px solid rgba(255, 255, 255, var(--bull-panel-border-alpha));
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, var(--bull-panel-inset-alpha));
}

.css-7bjx6y .chakra-button{
  border: 1px solid rgba(255, 255, 255, var(--bull-button-border-alpha));
  background-color: rgba(23, 28, 35, 0.82);
}

.css-7bjx6y .chakra-button:hover{
  background-color: rgba(40, 48, 60, 0.92);
}

/* Bull-off layout tuning:
   - turn box as wide as player column
   - board spans two rows for maximum size */
.css-tkevr6 > .chakra-stack{
  grid-template-areas:
    "header header"
    "footer board"
    "players board" !important;
  grid-template-columns: 0.94fr 1.06fr !important;
  grid-template-rows: max-content 96px 1fr !important;
}

#ad-ext-turn{
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  grid-row-start: 2 !important;
  grid-row-end: 3 !important;
  grid-area: footer !important;
  width: 100% !important;
  padding-right: 0.5rem !important;
}

#ad-ext-turn > .score,
#ad-ext-turn > .ad-ext-turn-throw,
#ad-ext-turn > .suggestion{
  width: 100% !important;
  min-height: 84px;
}

#ad-ext-turn > .score > img{
  width: 100% !important;
  max-width: none !important;
  height: 68px;
  object-fit: contain;
}

.css-1kejrvi,
.css-14xtjvc{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 2 !important;
  grid-row-end: 4 !important;
  grid-area: board !important;
  height: 100% !important;
  align-self: stretch !important;
}

.css-14xtjvc .css-tqsk66,
.css-1kejrvi .css-tqsk66{
  padding-bottom: 0 !important;
  height: calc(100% - 52px) !important;
}

.css-14xtjvc svg[viewBox="0 0 1000 1000"],
.css-1kejrvi svg[viewBox="0 0 1000 1000"]{
  width: min(100%, 92vh) !important;
  height: min(100%, 92vh) !important;
}

@media (max-width: 1200px){
  #ad-ext-player-display .ad-ext-player .ad-ext-player-score{
    font-size: 6.2em !important;
  }
}

@media (max-width: 900px){
  #ad-ext-player-display .ad-ext-player .ad-ext-player-score{
    font-size: 5.2em !important;
  }
}
`;

	const buildCss = createCssBuilder({
		fallbackThemeCss: commonThemeCss,
		fallbackLayoutCss: commonLayoutCss,
		extraCss: previewPlacementCss + bullOffCss
	});

	attachTheme({
		styleId: STYLE_ID,
		variantName: VARIANT_NAME,
		matchMode: "includes",
		buildCss
	});
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
