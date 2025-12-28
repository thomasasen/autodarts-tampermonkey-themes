// ==UserScript==
// @name         Autodarts Animate Checkout
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Pulse remaining score when a checkout is available in X01.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout.user.js
// ==/UserScript==

(function () {
  "use strict";

  const STYLE_ID = "autodarts-animate-checkout-style";
  const HIGHLIGHT_CLASS = "ad-ext-checkout-possible";
  const SCORE_SELECTOR = "p.ad-ext-player-score";
  const ACTIVE_SCORE_SELECTOR =
    ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, " +
    ".ad-ext-player-active p.ad-ext-player-score";
  const SUGGESTION_SELECTOR = ".suggestion";
  const VARIANT_ELEMENT_ID = "ad-ext-game-variant";
  const PULSE_COLOR = "159, 219, 88";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
@keyframes ad-ext-checkout-pulse {
  0% {
    text-shadow: 0 0 0 rgba(${PULSE_COLOR}, 0);
  }
  50% {
    text-shadow: 0 0 14px rgba(${PULSE_COLOR}, 0.75);
  }
  100% {
    text-shadow: 0 0 0 rgba(${PULSE_COLOR}, 0);
  }
}

.${HIGHLIGHT_CLASS} {
  animation: ad-ext-checkout-pulse 1.6s ease-in-out infinite;
}
`;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          const fallbackTarget = document.head || document.documentElement;
          if (fallbackTarget && !document.getElementById(STYLE_ID)) {
            fallbackTarget.appendChild(style);
          }
        },
        { once: true }
      );
    }
  }

  function isX01Variant() {
    const variantEl = document.getElementById(VARIANT_ELEMENT_ID);
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    return variant.includes("x01");
  }

  function hasCheckoutSuggestion() {
    const suggestion = document.querySelector(SUGGESTION_SELECTOR);
    if (!suggestion) {
      return false;
    }
    const text = suggestion.textContent || "";
    if (!text.trim()) {
      return false;
    }
    const normalized = text.toUpperCase();
    return /D\d+|DB|BULL/.test(normalized);
  }

  function getScoreNodes() {
    const activeScores = document.querySelectorAll(ACTIVE_SCORE_SELECTOR);
    if (activeScores.length) {
      return activeScores;
    }
    return document.querySelectorAll(SCORE_SELECTOR);
  }

  function updateScoreHighlights() {
    const shouldHighlight = isX01Variant() && hasCheckoutSuggestion();
    const scoreNodes = getScoreNodes();
    scoreNodes.forEach((node) => {
      node.classList.toggle(HIGHLIGHT_CLASS, shouldHighlight);
    });
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateScoreHighlights();
    });
  }

  ensureStyle();
  updateScoreHighlights();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" ||
        mutation.type === "characterData" ||
        mutation.type === "attributes"
      ) {
        scheduleUpdate();
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
})();
