// ==UserScript==
// @name         Autodarts Animate Checkout
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.3.1
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
  const IMPOSSIBLE_CHECKOUTS = new Set([169, 168, 166, 165, 163, 162, 159]);

  // Effekt fuer den aktiven Checkout-Score: "pulse" | "glow" | "scale" | "blink"
  // pulse = skaliert + Licht, glow = nur Leuchten, scale = nur Groesse, blink = Ein/Aus
  const EFFECT = "scale";
  const EFFECT_CLASSES = {
    pulse: "ad-ext-checkout-possible--pulse",
    glow: "ad-ext-checkout-possible--glow",
    scale: "ad-ext-checkout-possible--scale",
    blink: "ad-ext-checkout-possible--blink",
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
@keyframes ad-ext-checkout-pulse {
  0% {
    transform: scale(1);
    opacity: 1;
    text-shadow: 0 0 2px rgba(${PULSE_COLOR}, 0.2);
  }
  50% {
    transform: scale(1.1);
    opacity: 0.92;
    text-shadow: 0 0 16px rgba(${PULSE_COLOR}, 0.8);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    text-shadow: 0 0 2px rgba(${PULSE_COLOR}, 0.2);
  }
}

.${HIGHLIGHT_CLASS} {
  display: inline-block;
  transform-origin: center;
}

.${EFFECT_CLASSES.pulse} {
  animation: ad-ext-checkout-pulse 1.4s ease-in-out infinite;
}

.${EFFECT_CLASSES.glow} {
  animation: ad-ext-checkout-glow 1.8s ease-in-out infinite;
}

.${EFFECT_CLASSES.scale} {
  animation: ad-ext-checkout-scale 1.2s ease-in-out infinite;
}

.${EFFECT_CLASSES.blink} {
  animation: ad-ext-checkout-blink 0.9s ease-in-out infinite;
}

@keyframes ad-ext-checkout-glow {
  0% {
    text-shadow: 0 0 4px rgba(${PULSE_COLOR}, 0.35);
  }
  50% {
    text-shadow: 0 0 16px rgba(${PULSE_COLOR}, 0.9);
  }
  100% {
    text-shadow: 0 0 4px rgba(${PULSE_COLOR}, 0.35);
  }
}

@keyframes ad-ext-checkout-scale {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes ad-ext-checkout-blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
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
    if (!variantEl) {
      return true;
    }
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    if (!variant) {
      return true;
    }
    if (variant.includes("x01")) {
      return true;
    }
    return /\b\d+01\b/.test(variant);
  }

  function parseScore(text) {
    if (!text) {
      return null;
    }
    const match = text.match(/\d+/);
    if (!match) {
      return null;
    }
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function getActiveScoreValue() {
    const node =
      document.querySelector(ACTIVE_SCORE_SELECTOR) ||
      document.querySelector(SCORE_SELECTOR);
    return parseScore(node?.textContent || "");
  }

  function isCheckoutPossibleFromScore(score) {
    if (!Number.isFinite(score)) {
      return false;
    }
    if (score <= 1 || score > 170) {
      return false;
    }
    return !IMPOSSIBLE_CHECKOUTS.has(score);
  }

  function getCheckoutSuggestionState() {
    const suggestion = document.querySelector(SUGGESTION_SELECTOR);
    if (!suggestion) {
      return null;
    }
    const text = suggestion.textContent || "";
    const normalized = text.replace(/\s+/g, " ").trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (/NO\s*(OUT|CHECKOUT|SHOT)/.test(normalized)) {
      return false;
    }
    if (/BUST/.test(normalized)) {
      return false;
    }
    if (/D\s*[-:]?\s*\d+/.test(normalized)) {
      return true;
    }
    if (/DOUBLE\s*\d+/.test(normalized)) {
      return true;
    }
    if (/DB|BULLSEYE|BULL/.test(normalized)) {
      return true;
    }
    return null;
  }

  function getScoreNodes() {
    const activeScores = document.querySelectorAll(ACTIVE_SCORE_SELECTOR);
    if (activeScores.length) {
      return activeScores;
    }
    return document.querySelectorAll(SCORE_SELECTOR);
  }

  function updateScoreHighlights() {
    const isX01 = isX01Variant();
    const suggestionState = getCheckoutSuggestionState();
    const shouldHighlight = isX01
      ? suggestionState !== null
        ? suggestionState
        : isCheckoutPossibleFromScore(getActiveScoreValue())
      : false;
    const effectClass = EFFECT_CLASSES[EFFECT] || EFFECT_CLASSES.pulse;
    const effectClassList = Object.values(EFFECT_CLASSES);
    const scoreNodes = getScoreNodes();
    scoreNodes.forEach((node) => {
      if (shouldHighlight) {
        node.classList.add(HIGHLIGHT_CLASS);
        effectClassList.forEach((cls) => {
          node.classList.toggle(cls, cls === effectClass);
        });
      } else {
        node.classList.remove(HIGHLIGHT_CLASS);
        effectClassList.forEach((cls) => {
          node.classList.remove(cls);
        });
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
