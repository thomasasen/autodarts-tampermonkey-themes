// ==UserScript==
// @name         Autodarts Score Delta Slide
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.3
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

  const CONFIG = {
    scoreSelector: "p.ad-ext-turn-points",
    animationMs: 416,
  };

  const lastValues = new WeakMap();
  const activeAnimations = new WeakMap();
  const animatingNodes = new WeakSet();

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
