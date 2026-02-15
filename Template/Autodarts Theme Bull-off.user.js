// ==UserScript==
// @name         Autodarts Theme Bull-off.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Layout- und Farb-Theme fuer Bull-off mit Fokus auf aktive Scores und Board-Kontrast.
// @xconfig-description  Aktiviert ein Bull-off Theme mit bull-fokussierter Farbgebung und verbessertem Score-Kontrast.
// @xconfig-variant      bull-off
// @xconfig-readme-anchor  template-autodarts-theme-bull-off
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
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.1rem 0.75rem;
  background: linear-gradient(90deg, rgba(102, 187, 106, 0.26), rgba(239, 83, 80, 0.24));
}

#ad-ext-turn > .score,
#ad-ext-turn > .ad-ext-turn-throw,
#ad-ext-turn > .suggestion{
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(102, 187, 106, 0.14), rgba(239, 83, 80, 0.14));
}

#ad-ext-player-display .ad-ext-player{
  border-radius: 14px;
  overflow: hidden;
  backdrop-filter: blur(1px);
}

#ad-ext-player-display .ad-ext-player.ad-ext-player-active{
  border: 2px solid rgba(102, 187, 106, 0.9) !important;
  box-shadow:
    0 10px 26px rgba(0, 0, 0, 0.36),
    inset 0 0 0 1px rgba(102, 187, 106, 0.24);
  background:
    linear-gradient(135deg, rgba(102, 187, 106, 0.12), rgba(239, 83, 80, 0.16)),
    rgba(12, 16, 21, 0.88);
}

#ad-ext-player-display .ad-ext-player.ad-ext-player-inactive{
  border-color: rgba(239, 83, 80, 0.36) !important;
}

#ad-ext-player-display .ad-ext-player .ad-ext-player-score{
  font-size: 7.2em !important;
  letter-spacing: 0.03em;
  text-shadow: 0 0 18px rgba(0, 0, 0, 0.55);
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.css-7bjx6y .chakra-button{
  border: 1px solid rgba(255, 255, 255, 0.15);
  background-color: rgba(23, 28, 35, 0.82);
}

.css-7bjx6y .chakra-button:hover{
  background-color: rgba(40, 48, 60, 0.92);
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
