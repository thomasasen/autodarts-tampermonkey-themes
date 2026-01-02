// ==UserScript==
// @name         Autodarts Animate Turn Points Count
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Animates the turn points by counting up or down briefly instead of jumping.
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

  // Script goal: count turn points up/down smoothly instead of jumping.
  /**
   * Configuration for the point counter animation.
   * @property {string} scoreSelector - Selector for turn points, e.g. "p.ad-ext-turn-points".
   * @property {number} animationMs - Count animation duration in ms, e.g. 416.
   */
  const CONFIG = {
    scoreSelector: "p.ad-ext-turn-points",
    animationMs: 416,
  };

  // Stores the last known value per element.
  const lastValues = new WeakMap();
  // Tracks active animations so they can be canceled.
  const activeAnimations = new WeakMap();
  // Prevents overlapping updates while an element animates.
  const animatingNodes = new WeakSet();

  /**
   * Reads a number from text, e.g. "-60" or "100".
   * @param {string|null} text - Text content of the turn points element.
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
   * Easing function for smooth decay.
   * @param {number} t - Fortschritt 0..1.
   * @example
   * easeOutCubic(0.5); // => 0.875
   * @returns {number}
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Animates the display value from fromValue to toValue.
   * @param {Element} element - Target element for the display.
   * @param {number} fromValue - Starting value, e.g. 0.
   * @param {number} toValue - Target value, e.g. 60.
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
   * Compares current values with the last state and animates on change.
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
   * Coalesces DOM changes into a single update per frame.
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

  // Observes text/DOM changes to detect new turn points.
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
