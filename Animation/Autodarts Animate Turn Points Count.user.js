// ==UserScript==
// @name         Autodarts Animate Turn Points Count
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Animiert die angezeigten Punkte der aktuellen Aufnahme, indem die Zahl kurz hoch- oder runterzählt, statt sofort zu springen.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Script-Ziel: Punktzahl der Aufnahme weich hoch/runter zählen statt springen.
  /**
   * Konfiguration für die Punkte-Animation.
   * @property {string} scoreSelector - Anzeige der Wurf-Punkte, z.B. "p.ad-ext-turn-points".
   * @property {number} animationMs - Dauer der Zähltween-Animation, z.B. 416.
   */
  const CONFIG = {
    scoreSelector: "p.ad-ext-turn-points",
    animationMs: 416,
  };

  // Speichert den letzten bekannten Wert pro Element.
  const lastValues = new WeakMap();
  // Merkt sich laufende Animationen, um sie abbrechen zu können.
  const activeAnimations = new WeakMap();
  // Schützt Elemente vor parallelen Updates.
  const animatingNodes = new WeakSet();

  /**
   * Liest eine Zahl aus einem Text, z.B. "-60" oder "100".
   * @param {string|null} text - Textinhalt der Punkteanzeige.
   * @example
   * parseScore("-60"); // => -60
   * @returns {number|null}
   */
  function parseScore(text) {
    if (!text) {
      return null;
    }
    const match = text.match(/-?\d+/);
    if (!match) {
      return null;
    }
    return Number(match[0]);
  }

  /**
   * Easing-Funktion für weiches Ausklingen.
   * @param {number} t - Fortschritt 0..1.
   * @example
   * easeOutCubic(0.5); // => 0.875
   * @returns {number}
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Animiert den Wert in der Anzeige von fromValue nach toValue.
   * @param {Element} element - Ziel-Element für die Anzeige.
   * @param {number} fromValue - Startwert, z.B. 0.
   * @param {number} toValue - Zielwert, z.B. 60.
   * @returns {void}
   */
  function animateValue(element, fromValue, toValue) {
    const start = performance.now();
    animatingNodes.add(element);

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / CONFIG.animationMs, 1);
      const eased = easeOutCubic(progress);
      const current = Math.round(fromValue + (toValue - fromValue) * eased);
      element.textContent = String(current);
      if (progress < 1) {
        const handle = requestAnimationFrame(step);
        activeAnimations.set(element, handle);
      } else {
        activeAnimations.delete(element);
        animatingNodes.delete(element);
        lastValues.set(element, toValue);
      }
    }

    const previousHandle = activeAnimations.get(element);
    if (previousHandle) {
      cancelAnimationFrame(previousHandle);
    }

    requestAnimationFrame(step);
  }

  /**
   * Vergleicht aktuelle Werte mit dem letzten Stand und startet bei Änderung.
   * @returns {void}
   */
  function updateScores() {
    const nodes = document.querySelectorAll(CONFIG.scoreSelector);
    nodes.forEach((node) => {
      if (animatingNodes.has(node)) {
        return;
      }
      const currentValue = parseScore(node.textContent);
      if (currentValue === null) {
        return;
      }
      if (!lastValues.has(node)) {
        lastValues.set(node, currentValue);
        return;
      }
      const previousValue = lastValues.get(node);
      if (previousValue !== currentValue) {
        animateValue(node, previousValue, currentValue);
      }
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
      updateScores();
    });
  }

  updateScores();

  // Beobachtet Änderungen an Text/DOM, um neue Punkte zu erkennen.
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
