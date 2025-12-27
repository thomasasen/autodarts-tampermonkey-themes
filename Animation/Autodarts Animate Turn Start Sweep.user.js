// ==UserScript==
// @name         Autodarts Animate Turn Start Sweep
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Beim Wechsel des aktiven Spielers läuft ein kurzer Lichtstreifen über dessen Zeile/Karte, damit du den Zugstart sofort erkennst.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Script-Ziel: Beim Spielerwechsel eine kurze Licht-Sweep-Animation anzeigen.
  /**
   * Konfiguration der Sweep-Animation.
   * @property {string} activeSelector - CSS-Selektor für den aktiven Spieler, z.B. ".ad-ext-player-active".
   * @property {string} sweepClass - Klasse, die die Animation triggert, z.B. "ad-ext-turn-sweep".
   * @property {number} sweepDurationMs - Dauer der Animation in ms, z.B. 420.
   * @property {number} sweepDelayMs - Verzögerung vor Start in ms, z.B. 0.
   * @property {string} sweepWidth - Breite des Lichtstreifens, z.B. "45%".
   * @property {string} sweepColor - Farbe des Lichtstreifens, z.B. "rgba(255, 255, 255, 0.35)".
   */
  const CONFIG = {
    activeSelector: ".ad-ext-player-active",
    sweepClass: "ad-ext-turn-sweep",
    sweepDurationMs: 420,
    sweepDelayMs: 0,
    sweepWidth: "45%",
    sweepColor: "rgba(255, 255, 255, 0.35)",
  };

  const STYLE_ID = "autodarts-turn-sweep-style";
  const timeouts = new WeakMap();
  let lastActive = null;

  /**
   * Fügt die benötigten CSS-Regeln einmalig in die Seite ein.
   * @returns {void}
   */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.${CONFIG.sweepClass} {
  position: relative;
  overflow: hidden;
}

.${CONFIG.sweepClass}::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${CONFIG.sweepWidth};
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${CONFIG.sweepColor} 50%, rgba(255, 255, 255, 0) 100%);
  transform: translateX(-140%);
  animation: ad-ext-turn-sweep ${CONFIG.sweepDurationMs}ms ease-out ${CONFIG.sweepDelayMs}ms 1;
  pointer-events: none;
}

@keyframes ad-ext-turn-sweep {
  0% { transform: translateX(-140%); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateX(240%); opacity: 0; }
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
   * Startet die Sweep-Animation für ein Element.
   * @param {Element|null} node - Ziel-Element, z.B. die aktive Spielerzeile.
   * @example
   * runSweep(document.querySelector(".ad-ext-player-active"));
   * @returns {void}
   */
  function runSweep(node) {
    if (!node) {
      return;
    }
    node.classList.remove(CONFIG.sweepClass);
    void node.offsetWidth;
    node.classList.add(CONFIG.sweepClass);
    const previous = timeouts.get(node);
    if (previous) {
      clearTimeout(previous);
    }
    const timeout = setTimeout(() => {
      node.classList.remove(CONFIG.sweepClass);
      timeouts.delete(node);
    }, CONFIG.sweepDurationMs + CONFIG.sweepDelayMs + 80);
    timeouts.set(node, timeout);
  }

  /**
   * Ermittelt den aktiven Spieler und startet bei Wechsel die Animation.
   * @returns {void}
   */
  function updateActive() {
    const current = document.querySelector(CONFIG.activeSelector);
    if (current === lastActive) {
      return;
    }
    lastActive = current;
    if (current) {
      runSweep(current);
    }
  }

  let scheduled = false;
  /**
   * Fasst viele DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateActive();
    });
  }

  ensureStyle();
  updateActive();

  // Beobachtet Klassenwechsel, damit der aktive Spieler erkannt wird.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" ||
        mutation.type === "attributes"
      ) {
        scheduleUpdate();
        break;
      }
    }
  });

  const observeTarget = document.documentElement;
  if (observeTarget) {
    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        const fallbackTarget = document.documentElement;
        if (fallbackTarget) {
          observer.observe(fallbackTarget, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
          });
        }
      },
      { once: true }
    );
  }
})();
