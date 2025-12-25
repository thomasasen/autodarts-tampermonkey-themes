// ==UserScript==
// @name         Autodarts Theme X01.user
// @version      0.5
// @description  Autodarts Theme X01
// @author       Thomas Asen
// @match        *://play.autodarts.io/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Theme%20X01.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Theme%20X01.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Style tag identifier and expected variant name.
  const STYLE_ID = "autodarts-x01-custom-style";
  const VARIANT_NAME = "x01";

  // Basisthema, falls autodartsdesign.js nicht verfuegbar ist.
  const fallbackThemeCss = `
:root{
  --theme-bg: #000000;
  --theme-background: #000000;
  --theme-text-color: #000000;
  --theme-text-highlight-color: #9fdb58;
  --theme-navigation-bg: #434343;
  --theme-navigation-item-color: #666666;
  --theme-player-badge-bg: #9fdb58;
  --theme-player-name-bg: #9fdb58;
  --theme-current-bg: #0c343d;
}

div.css-gmuwbf { background-color: var(--theme-background); }
div.css-tkevr6 { background-color: var(--theme-background); }
div.chakra-stack.navigation.css-19ml6yu { background-color: var(--theme-navigation-bg); }
span.chakra-badge.css-1g1qw76 { font-size: 30px; background-color: var(--theme-player-name-bg); }
p.chakra-text.css-0 { font-size: 30px; }
div.ad-ext-player.ad-ext-player-active p.chakra-text.css-0 { font-size: 30px; }
div.ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score { font-size: 7em; }
button.chakra-button.css-d6eevf { background-color: var(--theme-navigation-item-color); }
p.chakra-text.css-1qlemha { background-color: var(--theme-current-bg); font-size: 30px; }
span.css-bs3vp6 { font-size: 30px; }
span.css-elma0c { background-color: #274e13; }
span.css-5nep5l { background-color: var(--theme-current-bg); }
div.css-rrf7rv { background-color: #274e13; border-color: #434343; }
div.css-nfhdnc { background-color: var(--theme-bg); }
span.chakra-badge.css-1j1ty0z { font-size: 30px; }
span.chakra-badge.css-1c4630i { font-size: 30px; }
span.chakra-badge.css-n2903v { font-size: 30px; }

div.chakra-stack.navigation.css-ege71s { background-color: #222; }
p.chakra-text.ad-ext-player-score.css-18w03sn { color: #9fdb58; }
span.css-3fr5p8 { background-color: #9fdb58; color: #222; }
p.chakra-text.ad-ext-player-score.css-1r7jzhg { color: #9fdb58; }
div.suggestion.css-1dkgpmk { font-size: 6px; background-color: #222; border-color: #434343; }
div.ad-ext-player.ad-ext-player-active.css-1en42kf { border-color: #434343; border-style: solid; }
div.chakra-menu__menu-list.css-yskgbr { background-color: #434343; }
button.chakra-tabs__tab.css-1vm7g5b { color: #9fdb58; }
span.chakra-switch__track.css-v4l15v { background-color: #38761d; }
button.chakra-tabs__tab.css-1pjn7in { color: #9fdb58; }
`;

  // Layout-Grundgeruest als Fallback (Grid, Header/Footer, Spieler/Board).
  const fallbackLayoutCss = `
/* Main layout: header, footer, then content */
.css-tkevr6 > .chakra-stack{
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  grid-template-rows: max-content max-content 1fr !important; /* footer sits right under header */
  grid-template-areas:
    "header header"
    "footer footer"
    "players board" !important;
  max-width: 100% !important;
}

/* Header layout */
.css-tkevr6 > .chakra-stack > div.css-0:first-child:not(.chakra-wrap){
  position: static !important;
  grid-column-start: 1 !important;
  grid-column-end: 3 !important;
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-area: header !important;
}
.chakra-wrap.css-0,
.css-k008qs{
  grid-column-start: 1 !important;
  grid-column-end: 3 !important;
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-area: header !important;
}

/* inaktiver Spieler */
.ad-ext-player:not(.ad-ext-player-active):not(.ad-ext-player-winner) > div > p {
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

.css-hjw8x4{
  max-height: 12%;
}

/* aktiver Spieler */
.css-rtn29s{
  border: 2px solid #9fdb58;
}
div.ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score {
  font-size: 9em;
}

div.ad-ext-player.ad-ext-player-active p.chakra-text.css-11cuipc {
  font-size: 1.5em;
}

/* Player Avatar */
.chakra-avatar{ --avatar-size: 2.5rem; }
/* Bot Avatar */
.css-7lnr9n{ width: 2.5rem; height: 2.5rem; }

/* Player: Layout */
#ad-ext-player-display {
  display:flex;
  flex-direction: column;
  align-items: stretch;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  grid-row-start: 3 !important;
  grid-row-end: 4 !important;
  grid-area: players !important;
  max-height: 80vh;
}

/* Player: Tag */
.css-1k3nd6z{ align-self: stretch; font-size: 36px; }
.css-g0ywsj{ min-width: auto; }
.css-1k3nd6z > span{ justify-content: center; height: 100%; }
.css-3fr5p8 { background-color: var(--theme-player-badge-bg); }
.css-3fr5p8 > p{ font-size: 30px; }

/* Player: Average */
.css-1j0bqop { font-size: 25px; }

/* Footer directly under header */
#ad-ext-turn{
  grid-column-start: 1 !important;
  grid-column-end: 3 !important;
  grid-row-start: 2 !important;
  grid-row-end: 3 !important;
  grid-area: footer !important;
}

/* Toolbar block next to board should live in board row */
.css-17xejub{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 3 !important;
  grid-row-end: 4 !important;
  grid-area: board !important;
}

div.css-y3hfdd{
  display: grid !important;
  grid-template-columns: 1fr auto !important;
  grid-template-rows: 1fr !important;
  gap: 0px !important;
  height: 25%;
}
div.css-y3hfdd > p{
  color: var(--theme-text-highlight-color);
  grid-row-start: 1 !important;
  grid-row-end: 3 !important;
  margin-bottom:0 !important;
}
.css-1r7jzhg{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 1 !important;
  grid-row-end: 3 !important;
}
.css-37hv0{
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
}
.css-37hv00{
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  display: flex !important;
  flex-wrap: nowrap !important;
}
.css-y3hfdd > .css-1igwmid{
  grid-row-start: 2 !important;
  grid-row-end: 3 !important;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  padding-left:55px !important;
}

/* Board */
.css-1kejrvi,
.css-14xtjvc{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 3 !important;
  grid-row-end: 4 !important;
  grid-area: board !important;
  align-self: start !important;
  height: 100% !important;
  position: relative !important; /* prevent sticky/absolute overlap with footer row */
  margin-top: 0 !important;
}
.css-tqsk66{ padding-bottom: 50px; }
.css-7bjx6y,
.css-1wegtvo{ top: inherit; bottom: 0; }
.css-1emway5 { grid-column: 1 / 3; }
`;

  // X01 nutzt dunkle Navigation unabhaengig vom Helper.
  const navigationOverride = `
div.chakra-stack.navigation.css-19ml6yu,
div.chakra-stack.navigation.css-ege71s,
.chakra-stack.navigation {
  background-color: #434343;
}
`;

  let styleTag;
  let scheduled = false;

  // Endgueltiges CSS aus Helper oder Fallbacks zusammensetzen.
  function buildCss() {
    const themeCss = window.autodartsDesign?.themeCommonCss ?? fallbackThemeCss;
    const layoutCss =
      window.autodartsDesign?.layoutCommonCss ?? fallbackLayoutCss;
    return `${themeCss}${layoutCss}${navigationOverride}`;
  }

  // Style-Tag anlegen/aktualisieren.
  function ensureStyle(css) {
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = STYLE_ID;
      document.head.appendChild(styleTag);
    }
    if (styleTag.textContent !== css) {
      styleTag.textContent = css;
    }
  }

  function removeStyle() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
      existing.remove();
    }
    styleTag = null;
  }

  // Variant-Name holen und normalisieren.
  function getVariantName() {
    const variantEl = document.getElementById("ad-ext-game-variant");
    return variantEl?.textContent?.trim().toLowerCase() || "";
  }

  // Kernlogik: Variante pruefen, Styles an- oder abschalten.
  function evaluateAndApply() {
    const variant = getVariantName();

    if (variant === VARIANT_NAME) {
      ensureStyle(buildCss());
    } else {
      removeStyle();
    }
  }

  // Debounce, damit DOM-Aenderungen nicht in eine Endlosschleife laufen.
  function scheduleEvaluation() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      evaluateAndApply();
    });
  }

  evaluateAndApply();

  // Beobachtet DOM-Aenderungen (Variante / Match-View) und aktualisiert Styles.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" ||
        mutation.type === "characterData" ||
        mutation.type === "attributes"
      ) {
        // Eigene Style-Updates ignorieren, sonst wuerde der Observer sich selbst triggern.
        if (
          styleTag &&
          (mutation.target === styleTag ||
            mutation.target.parentElement === styleTag)
        ) {
          continue;
        }
        scheduleEvaluation();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });

  // Einfache URL-ueberwachung, falls Navigation ohne Full-Reload passiert.
  let lastUrl = location.href;
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
    }
    scheduleEvaluation();
  }, 1000);
})();
