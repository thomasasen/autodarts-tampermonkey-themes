// ==UserScript==
// @name         Autodarts Theme Bermuda
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1
// @description  Autodarts Theme Bermuda
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
		commonThemeCss,
		commonLayoutCss,
		initPreviewPlacement
	} = window.autodartsThemeShared;

	// Style tag identifier und erwarteter Variantenname.
	const STYLE_ID = "autodarts-bermuda-custom-style";
	const VARIANT_NAME = "bermuda";

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

	attachTheme({styleId: STYLE_ID, variantName: VARIANT_NAME, buildCss, matchMode: "includes"});

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({
			variantName: VARIANT_NAME,
			matchMode: "includes",
			previewHeightPx: PREVIEW_HEIGHT_PX,
			previewGapPx: PREVIEW_GAP_PX,
			previewSpaceClass: PREVIEW_SPACE_CLASS
		});
	}

})();
