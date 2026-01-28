// ==UserScript==
// @name         Autodarts Theme Cricket.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1
// @description  Autodarts Theme Cricket
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Cricket.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Cricket.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {attachTheme, initPreviewPlacement} = window.autodartsThemeShared;
	const STYLE_ID = "autodarts-cricket-custom-style";
	const VARIANT_NAME = "cricket";

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
  height: 20px !important;
}

.ad-ext-player.ad-ext-player-inactive.css-1en42kf{
  display: ruby-text !important;
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

	attachTheme({
		styleId: STYLE_ID,
		variantName: VARIANT_NAME,
		buildCss: () => customCss + previewPlacementCss
	});

	if (PREVIEW_PLACEMENT === "under-throws") {
		initPreviewPlacement({variantName: VARIANT_NAME, previewHeightPx: PREVIEW_HEIGHT_PX, previewGapPx: PREVIEW_GAP_PX, previewSpaceClass: PREVIEW_SPACE_CLASS});
	}

})();
