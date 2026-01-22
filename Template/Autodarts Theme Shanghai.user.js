// ==UserScript==
// @name         Autodarts Theme Shanghai.user
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.0
// @description  Autodarts Theme Shanghai
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
    getVariantName,
  } = window.autodartsThemeShared;

  const STYLE_ID = "autodarts-shanghai-custom-style";
  const VARIANT_NAME = "shanghai";

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

  const buildCss = createCssBuilder({
    fallbackThemeCss: commonThemeCss,
    fallbackLayoutCss: commonLayoutCss,
    extraCss: previewPlacementCss,
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
