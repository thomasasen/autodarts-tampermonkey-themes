// ==UserScript==
// @name         Autodarts Animate Checkout
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.1
// @description  Lässt die Restpunktzahl des aktiven Spielers sanft aufleuchten, sobald in X01 ein Checkout möglich ist.
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

  // Script-Ziel: Restpunktzahl hervorheben, wenn Checkout in X01 möglich ist.
  /**
   * Selektoren und CSS-Klassen für die Checkout-Hervorhebung.
   * @property {string} STYLE_ID - ID für das Style-Element, z.B. "autodarts-animate-checkout-style".
   * @property {string} HIGHLIGHT_CLASS - Klasse für Puls-Effekt, z.B. "ad-ext-checkout-possible".
   * @property {string} SCORE_SELECTOR - Alle Score-Elemente, z.B. "p.ad-ext-player-score".
   * @property {string} ACTIVE_SCORE_SELECTOR - Aktiver Spieler, z.B. ".ad-ext-player-active p.ad-ext-player-score".
   * @property {string} SUGGESTION_SELECTOR - Checkout-Vorschlag, z.B. ".suggestion".
   * @property {string} VARIANT_ELEMENT_ID - Element mit Spielvariante, z.B. "ad-ext-game-variant".
   * @property {string} PULSE_COLOR - RGB ohne Alpha, z.B. "159, 219, 88".
   */
  const STYLE_ID = "autodarts-animate-checkout-style";
  const HIGHLIGHT_CLASS = "ad-ext-checkout-possible";
  const SCORE_SELECTOR = "p.ad-ext-player-score";
  const ACTIVE_SCORE_SELECTOR =
    ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, " +
    ".ad-ext-player-active p.ad-ext-player-score";
  const SUGGESTION_SELECTOR = ".suggestion";
  const VARIANT_ELEMENT_ID = "ad-ext-game-variant";
  const PULSE_COLOR = "159, 219, 88";

  /**
   * Fügt die CSS-Animation für den Puls-Effekt einmalig ein.
   * @returns {void}
   */
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
    text-shadow: 0 0 0 rgba(${PULSE_COLOR}, 0);
    filter: drop-shadow(0 0 0 rgba(${PULSE_COLOR}, 0));
  }
  50% {
    transform: scale(1.06);
    text-shadow: 0 0 16px rgba(${PULSE_COLOR}, 0.85);
    filter: drop-shadow(0 0 8px rgba(${PULSE_COLOR}, 0.6));
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 0 rgba(${PULSE_COLOR}, 0);
    filter: drop-shadow(0 0 0 rgba(${PULSE_COLOR}, 0));
  }
}

.${HIGHLIGHT_CLASS} {
  display: inline-block;
  transform-origin: center;
  will-change: transform, text-shadow, filter;
  animation: ad-ext-checkout-pulse 1.8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .${HIGHLIGHT_CLASS} {
    animation: none;
    text-shadow: 0 0 8px rgba(${PULSE_COLOR}, 0.6);
    filter: drop-shadow(0 0 6px rgba(${PULSE_COLOR}, 0.4));
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

  /**
   * Prüft, ob eine X01-Variante aktiv ist (z.B. 301/501).
   * @returns {boolean}
   */
  function isX01Variant() {
    const variantEl = document.getElementById(VARIANT_ELEMENT_ID);
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    return variant.includes("x01");
  }

  /**
   * Prüft, ob der Checkout-Vorschlag ein Double/Bull enthält.
   * @returns {boolean}
   */
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

  /**
   * Liefert Score-Elemente. Bevorzugt wird der aktive Spieler.
   * @returns {NodeListOf<Element>}
   */
  function getScoreNodes() {
    const activeScores = document.querySelectorAll(ACTIVE_SCORE_SELECTOR);
    if (activeScores.length) {
      return activeScores;
    }
    return document.querySelectorAll(SCORE_SELECTOR);
  }

  /**
   * Setzt oder entfernt die Puls-Klasse basierend auf Checkout-Zustand.
   * @returns {void}
   */
  function updateScoreHighlights() {
    const shouldHighlight = isX01Variant() && hasCheckoutSuggestion();
    const scoreNodes = getScoreNodes();
    scoreNodes.forEach((node) => {
      node.classList.toggle(HIGHLIGHT_CLASS, shouldHighlight);
    });
  }

  let scheduled = false;
  /**
   * Fasst DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
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

  // Beobachtet Änderungen an Text/DOM, um den Checkout-Status zu aktualisieren.
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
