// ==UserScript==
// @name         Autodarts Theme Shanghai.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.3
// @description  Layout- und Farb-Theme für Shanghai mit sauber ausgerichtetem Grid.
// @xconfig-description  Aktiviert ein Shanghai-Theme mit gemeinsamem Layout/Styling über den Theme-Shared-Helper.
// @xconfig-variant      shanghai
// @xconfig-readme-anchor  template-autodarts-theme-shanghai
// @xconfig-background     assets/template-theme-shanghai-xConfig.png
// @xconfig-settings-version 2
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
	// xConfig: {"type":"toggle","label":"AVG anzeigen","description":"Blendet den AVG-Wert im Shanghai-Theme ein oder aus.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
	const xConfig_AVG_ANZEIGE = true;

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

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({variantName: VARIANT_NAME, previewHeightPx: PREVIEW_HEIGHT_PX, previewGapPx: PREVIEW_GAP_PX, previewSpaceClass: PREVIEW_SPACE_CLASS});
	}

})();
