// ==UserScript==
// @name         Autodarts Average Trend Arrow
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Show a short up/down arrow animation when AVG changes.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Average%20Trend%20Arrow.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Average%20Trend%20Arrow.user.js
// ==/UserScript==

(function () {
  "use strict";

  const AVG_SELECTOR = "p.css-1j0bqop";
  const STYLE_ID = "autodarts-average-trend-style";
  const ARROW_CLASS = "ad-ext-avg-trend-arrow";
  const VISIBLE_CLASS = "ad-ext-avg-trend-visible";
  const UP_CLASS = "ad-ext-avg-trend-up";
  const DOWN_CLASS = "ad-ext-avg-trend-down";
  const ANIMATE_CLASS = "ad-ext-avg-trend-animate";
  const ANIMATION_MS = 320;

  const lastValues = new WeakMap();
  const arrowElements = new WeakMap();
  const animationTimeouts = new WeakMap();

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.${ARROW_CLASS} {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 6px;
  vertical-align: middle;
  opacity: 0;
  transition: opacity 120ms ease-out;
}

.${VISIBLE_CLASS} {
  opacity: 1;
}

.${UP_CLASS} {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid #9fdb58;
}

.${DOWN_CLASS} {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #f87171;
}

.${ANIMATE_CLASS} {
  animation: ad-ext-avg-bounce ${ANIMATION_MS}ms ease-out 1;
}

@keyframes ad-ext-avg-bounce {
  0% { transform: scale(0.9); opacity: 0.5; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.95; }
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

  function parseAvg(text) {
    if (!text) {
      return null;
    }
    const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*[0-9]+(?:\.[0-9]+)?/);
    if (match) {
      return Number(match[1]);
    }
    const fallback = text.match(/([0-9]+(?:\.[0-9]+)?)/);
    return fallback ? Number(fallback[1]) : null;
  }

  function getArrow(node) {
    const existing = arrowElements.get(node);
    if (existing && node.contains(existing)) {
      return existing;
    }
    const arrow = document.createElement("span");
    arrow.className = ARROW_CLASS;
    node.appendChild(arrow);
    arrowElements.set(node, arrow);
    return arrow;
  }

  function animateArrow(arrow) {
    arrow.classList.remove(ANIMATE_CLASS);
    void arrow.offsetWidth;
    arrow.classList.add(ANIMATE_CLASS);
    const previousTimeout = animationTimeouts.get(arrow);
    if (previousTimeout) {
      clearTimeout(previousTimeout);
    }
    const timeout = setTimeout(() => {
      arrow.classList.remove(ANIMATE_CLASS);
      animationTimeouts.delete(arrow);
    }, ANIMATION_MS + 80);
    animationTimeouts.set(arrow, timeout);
  }

  function updateAverages() {
    const nodes = document.querySelectorAll(AVG_SELECTOR);
    nodes.forEach((node) => {
      const avg = parseAvg(node.textContent);
      if (avg === null) {
        return;
      }
      const previous = lastValues.get(node);
      lastValues.set(node, avg);
      if (previous === undefined || avg === previous) {
        return;
      }

      const arrow = getArrow(node);
      arrow.classList.remove(UP_CLASS, DOWN_CLASS);
      arrow.classList.add(VISIBLE_CLASS);

      if (avg > previous) {
        arrow.classList.add(UP_CLASS);
      } else {
        arrow.classList.add(DOWN_CLASS);
      }
      animateArrow(arrow);
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
      updateAverages();
    });
  }

  ensureStyle();
  updateAverages();

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
