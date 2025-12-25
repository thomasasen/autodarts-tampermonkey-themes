// ==UserScript==
// @name         Autodarts Checkout Highlight
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.1
// @description  Pulse remaining score when a checkout is possible.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Checkout%20Highlight.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Checkout%20Highlight.user.js
// ==/UserScript==

(function () {
  "use strict";

  const STYLE_ID = "autodarts-checkout-highlight-style";
  const HIGHLIGHT_CLASS = "ad-ext-checkout-possible";
  const SCORE_SELECTOR = "p.ad-ext-player-score";
  const PULSE_COLOR = "159, 219, 88";

  const CHECKOUT_SCORES = buildCheckoutScores();

  function buildCheckoutScores() {
    const singles = [];
    const doubles = [];
    const triples = [];

    for (let i = 1; i <= 20; i += 1) {
      singles.push(i);
      doubles.push(i * 2);
      triples.push(i * 3);
    }

    singles.push(25);
    doubles.push(50);

    const allThrows = Array.from(new Set([...singles, ...doubles, ...triples]));
    const throwsWithZero = [0, ...allThrows];

    const possible = new Set();
    for (const first of throwsWithZero) {
      for (const second of throwsWithZero) {
        for (const last of doubles) {
          const total = first + second + last;
          if (total <= 170) {
            possible.add(total);
          }
        }
      }
    }

    return possible;
  }

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
    document.head.appendChild(style);
  }

  function parseScore(text) {
    if (!text) {
      return null;
    }
    const match = text.match(/\d+/);
    if (!match) {
      return null;
    }
    return Number(match[0]);
  }

  function updateScoreHighlights() {
    const scoreNodes = document.querySelectorAll(SCORE_SELECTOR);
    scoreNodes.forEach((node) => {
      const value = parseScore(node.textContent);
      if (value && CHECKOUT_SCORES.has(value)) {
        node.classList.add(HIGHLIGHT_CLASS);
      } else {
        node.classList.remove(HIGHLIGHT_CLASS);
      }
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
        mutation.type === "characterData"
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
  });
})();
