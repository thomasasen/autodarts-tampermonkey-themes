// ==UserScript==
// @name         Autodarts Theme Shanghai.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1
// @description  Layout- und Farb-Theme fuer Shanghai mit sauber ausgerichtetem Grid.
// @xconfig-description  Aktiviert ein Shanghai-Theme mit gemeinsamem Layout/Styling ueber den Theme-Shared-Helper.
// @xconfig-variant      shanghai
// @xconfig-readme-anchor  template-autodarts-theme-shanghai
// @xconfig-background     assets/template-theme-shanghai-xConfig.png
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

	const buildCss = createCssBuilder({fallbackThemeCss: commonThemeCss, fallbackLayoutCss: commonLayoutCss, extraCss: previewPlacementCss});

	attachTheme({styleId: STYLE_ID, variantName: VARIANT_NAME, buildCss});

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({variantName: VARIANT_NAME, previewHeightPx: PREVIEW_HEIGHT_PX, previewGapPx: PREVIEW_GAP_PX, previewSpaceClass: PREVIEW_SPACE_CLASS});
	}

})();
