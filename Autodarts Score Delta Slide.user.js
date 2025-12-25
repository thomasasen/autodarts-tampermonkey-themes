// ==UserScript==
// @name         Autodarts Score Delta Slide
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.1
// @description  Animate turn-point changes with a count-up tween.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Score%20Delta%20Slide.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Score%20Delta%20Slide.user.js
// ==/UserScript==

(function () {
  "use strict";

  const SCORE_SELECTOR = "p.ad-ext-turn-points";
  const ANIMATION_MS = 320;

  const lastValues = new WeakMap();
  const activeAnimations = new WeakMap();

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

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateValue(element, fromValue, toValue) {
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / ANIMATION_MS, 1);
      const eased = easeOutCubic(progress);
      const current = Math.round(fromValue + (toValue - fromValue) * eased);
      element.textContent = String(current);
      if (progress < 1) {
        const handle = requestAnimationFrame(step);
        activeAnimations.set(element, handle);
      } else {
        activeAnimations.delete(element);
      }
    }

    const previousHandle = activeAnimations.get(element);
    if (previousHandle) {
      cancelAnimationFrame(previousHandle);
    }

    requestAnimationFrame(step);
  }

  function updateScores() {
    const nodes = document.querySelectorAll(SCORE_SELECTOR);
    nodes.forEach((node) => {
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
        lastValues.set(node, currentValue);
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
      updateScores();
    });
  }

  updateScores();

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
