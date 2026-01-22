// ==UserScript==
// @name         Autodarts Theme Cricket.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.0
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

  const { attachTheme, getVariantName } = window.autodartsThemeShared;
  const STYLE_ID = "autodarts-cricket-custom-style";
  const VARIANT_NAME = "cricket";

  // Preview placement: "standard" or "under-throws".
  const PREVIEW_PLACEMENT = "under-throws";
  const PREVIEW_HEIGHT_PX = 128;
  const PREVIEW_GAP_PX = 8;
  const PREVIEW_SPACE_CLASS = "ad-ext-turn-preview-space";

  const previewPlacementCss =
    PREVIEW_PLACEMENT === "under-throws"
      ? `
#ad-ext-turn.${PREVIEW_SPACE_CLASS}{
  padding-bottom: ${PREVIEW_HEIGHT_PX + PREVIEW_GAP_PX}px;
}
`
      : "";

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
    buildCss: () => customCss + previewPlacementCss,
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

    function isVariantActive() {
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
      if (!isVariantActive()) {
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
