// ==UserScript==
// @name         Autodarts Theme Shanghai.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.6
// @description  Autodarts Theme Shanghai
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Theme%20Shanghai.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Theme%20Shanghai.user.js
// ==/UserScript==

(function () {
  "use strict";

  const {
    attachTheme,
    createCssBuilder,
    commonThemeCss,
    commonLayoutCss,
  } = window.autodartsThemeShared;

  const STYLE_ID = "autodarts-shanghai-custom-style";
  const VARIANT_NAME = "shanghai";

  const buildCss = createCssBuilder({
    fallbackThemeCss: commonThemeCss,
    fallbackLayoutCss: commonLayoutCss,
  });

  attachTheme({
    styleId: STYLE_ID,
    variantName: VARIANT_NAME,
    buildCss,
  });
})();
