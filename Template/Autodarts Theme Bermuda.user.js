// ==UserScript==
// @name         Autodarts Theme Bermuda
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
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

  const { attachTheme, createCssBuilder, commonThemeCss, commonLayoutCss } =
    window.autodartsThemeShared;

  // Style tag identifier und erwarteter Variantenname.
  const STYLE_ID = "autodarts-bermuda-custom-style";
  const VARIANT_NAME = "bermuda";

  const buildCss = createCssBuilder({
    fallbackThemeCss: commonThemeCss,
    fallbackLayoutCss: commonLayoutCss,
  });

  attachTheme({
    styleId: STYLE_ID,
    variantName: VARIANT_NAME,
    buildCss,
    matchMode: "includes",
  });
})();
