// ==UserScript==
// @name         Autodarts Theme X01.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.0
// @description  Autodarts Theme X01
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20X01.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20X01.user.js
// ==/UserScript==

(function () {
  "use strict";

  const { attachTheme, createCssBuilder, getVariantName } =
    window.autodartsThemeShared;

  // Style tag identifier and expected variant name.
  const STYLE_ID = "autodarts-x01-custom-style";
  const VARIANT_NAME = "x01";

  // Preview placement: "standard" or "under-throws".
  const PREVIEW_PLACEMENT = "under-throws";
  const PREVIEW_HEIGHT_PX = 128;
  const PREVIEW_GAP_PX = 8;
  const PREVIEW_SPACE_CLASS = "ad-ext-turn-preview-space";

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
.ad-ext_winner-score-wrapper{
  display: contents !important;
}
div.css-y3hfdd > p,
div.css-y3hfdd > .ad-ext_winner-score-wrapper > p{
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

  const previewPlacementCss =
    PREVIEW_PLACEMENT === "under-throws"
      ? `
#ad-ext-turn.${PREVIEW_SPACE_CLASS}{
  padding-bottom: ${PREVIEW_HEIGHT_PX + PREVIEW_GAP_PX}px;
}
`
      : "";

  const buildCss = createCssBuilder({
    fallbackThemeCss,
    fallbackLayoutCss,
    extraCss: navigationOverride + previewPlacementCss,
  });

  attachTheme({
    styleId: STYLE_ID,
    variantName: VARIANT_NAME,
    buildCss,
  });

  if (PREVIEW_PLACEMENT === "under-throws") {
    initPreviewPlacement();
  }

  function initPreviewPlacement() {
    let scheduled = false;
    let observedShadowRoot = null;
    let shadowObserver = null;
    const cardOverrides = new WeakMap();
    let lastCards = [];

    function scheduleUpdate() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updatePlacement();
      });
    }

    function isX01Active() {
      return getVariantName() === VARIANT_NAME;
    }

    function observeShadowRoot(root) {
      if (!root || root === observedShadowRoot) return;
      if (shadowObserver) shadowObserver.disconnect();
      observedShadowRoot = root;
      shadowObserver = new MutationObserver(scheduleUpdate);
      shadowObserver.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }

    function rememberCardStyle(card) {
      if (cardOverrides.has(card)) return;
      cardOverrides.set(card, {
        position: card.style.position,
        left: card.style.left,
        top: card.style.top,
        width: card.style.width,
        height: card.style.height,
        margin: card.style.margin,
        pointerEvents: card.style.pointerEvents,
        zIndex: card.style.zIndex,
      });
    }

    function restoreCardStyle(card) {
      const original = cardOverrides.get(card);
      if (!original) return;
      card.style.position = original.position;
      card.style.left = original.left;
      card.style.top = original.top;
      card.style.width = original.width;
      card.style.height = original.height;
      card.style.margin = original.margin;
      card.style.pointerEvents = original.pointerEvents;
      card.style.zIndex = original.zIndex;
    }

    function resetPlacement() {
      for (const card of lastCards) {
        restoreCardStyle(card);
      }
      lastCards = [];
      setPreviewSpace(false);
    }

    function setPreviewSpace(enabled) {
      const turnEl = document.getElementById("ad-ext-turn");
      if (!turnEl) return;
      turnEl.classList.toggle(PREVIEW_SPACE_CLASS, enabled);
    }

    function isEffectivelyHidden(node) {
      let current = node;
      while (current) {
        if (current.nodeType === 11) {
          current = current.host || null;
          continue;
        }
        if (current.nodeType !== 1) {
          current = current.parentNode || null;
          continue;
        }
        const style = window.getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden") {
          return true;
        }
        const opacity = parseFloat(style.opacity);
        if (!Number.isNaN(opacity) && opacity === 0) {
          return true;
        }
        current = current.parentNode || null;
      }
      return false;
    }

    function getPreviewCards(root) {
      const images = Array.from(
        root.querySelectorAll("img[src*=\"/images/board.png\"]")
      );
      const cards = [];
      for (const img of images) {
        const wrapper = img.closest("div");
        const card = wrapper?.parentElement;
        if (!wrapper || !card) continue;
        if (window.getComputedStyle(wrapper).position !== "relative") continue;
        if (window.getComputedStyle(card).overflow !== "hidden") continue;
        if (!cards.includes(card)) {
          cards.push(card);
        }
      }
      return cards;
    }

    function positionCard(card, rect) {
      rememberCardStyle(card);
      card.style.position = "fixed";
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.bottom + PREVIEW_GAP_PX}px`;
      card.style.width = `${rect.width}px`;
      card.style.height = `${PREVIEW_HEIGHT_PX}px`;
      card.style.margin = "0";
      card.style.pointerEvents = "none";
      card.style.zIndex = "200";
    }

    function updatePlacement() {
      if (!isX01Active()) {
        resetPlacement();
        return;
      }

      const zoomEl = document.querySelector("autodarts-tools-zoom");
      if (!zoomEl || isEffectivelyHidden(zoomEl)) {
        resetPlacement();
        return;
      }
      const shadowRoot = zoomEl.shadowRoot;
      if (!shadowRoot) {
        resetPlacement();
        return;
      }
      observeShadowRoot(shadowRoot);

      const throwEls = Array.from(
        document.querySelectorAll("#ad-ext-turn .ad-ext-turn-throw")
      );
      if (!throwEls.length) {
        resetPlacement();
        return;
      }

      const cards = getPreviewCards(shadowRoot);
      if (!cards.length) {
        resetPlacement();
        return;
      }
      const hasVisibleCard = cards.some(
        (card) => !isEffectivelyHidden(card)
      );
      if (!hasVisibleCard) {
        resetPlacement();
        return;
      }

      setPreviewSpace(true);
      lastCards = cards;
      const count = Math.min(cards.length, throwEls.length);
      for (let i = 0; i < count; i += 1) {
        positionCard(cards[i], throwEls[i].getBoundingClientRect());
      }
      for (let i = count; i < cards.length; i += 1) {
        positionCard(cards[i], {
          left: -9999,
          top: -9999,
          bottom: -9999,
          width: 0,
        });
      }
    }

    const documentObserver = new MutationObserver(scheduleUpdate);
    documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    scheduleUpdate();
  }
})();
