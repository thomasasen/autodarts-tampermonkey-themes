// ==UserScript==
// @name         Autodarts Animate Single Bull Sound
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Plays a configurable sound when a single bull (25/BULL) is thrown in the throw list.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Script goal: play a sound when a single bull (25/BULL) appears in the throw list.
  /**
   * Configuration for the single bull sound trigger.
   * @property {string} soundUrl - URL to the audio file.
   * @property {number} volume - Audio volume 0..1.
   * @property {number} targetPoints - Points value for single bull.
   * @property {string} targetLabel - Label text to match (case-insensitive).
   * @property {Object} selectors - CSS selectors for throw rows.
   * @property {number} pollIntervalMs - Optional polling interval (0 disables).
   */
  const CONFIG = {
    soundUrl: "https://gifs.thomasasen.goip.de/singlebull.mp3",
    volume: 0.9,
    targetPoints: 25,
    targetLabel: "BULL",
    selectors: {
      throwRow: ".ad-ext-turn-throw",
    },
    pollIntervalMs: 0,
  };

  const targetLabelUpper = CONFIG.targetLabel.toUpperCase();
  const lastKeys = new WeakMap();

  const audio = new Audio(CONFIG.soundUrl);
  audio.preload = "auto";
  audio.volume = CONFIG.volume;

  /**
   * Normalizes text content into a single line.
   * @param {string|null|undefined} text - Raw text content.
   * @returns {string}
   */
  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  /**
   * Checks whether the text matches a single bull entry.
   * @param {string} text - Normalized throw text.
   * @returns {boolean}
   */
  function isSingleBull(text) {
    if (!text) {
      return false;
    }
    const upper = text.toUpperCase();
    if (!upper.includes(targetLabelUpper)) {
      return false;
    }
    const pointsMatch = text.match(/\d+/);
    if (!pointsMatch) {
      return false;
    }
    return Number(pointsMatch[0]) === CONFIG.targetPoints;
  }

  /**
   * Plays the configured audio (ignored if blocked by autoplay rules).
   * @returns {void}
   */
  function playSound() {
    try {
      audio.currentTime = 0;
      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch (error) {
      // Ignore playback errors (autoplay restrictions).
    }
  }

  /**
   * Scans throw rows and triggers sounds for new single bull hits.
   * @param {boolean} silent - When true, update state without playing audio.
   * @returns {void}
   */
  function scanThrows(silent) {
    const rows = document.querySelectorAll(CONFIG.selectors.throwRow);
    rows.forEach((row) => {
      const normalized = normalizeText(row.textContent);
      const key = normalized || "__empty__";
      const previousKey = lastKeys.get(row);
      if (previousKey === key) {
        return;
      }
      lastKeys.set(row, key);
      if (!silent && isSingleBull(normalized)) {
        playSound();
      }
    });
  }

  let scheduled = false;
  /**
   * Coalesces DOM changes into a single scan per frame.
   * @returns {void}
   */
  function scheduleScan() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scanThrows(false);
    });
  }

  /**
   * Checks whether a mutation touches the throw list rows.
   * @param {MutationRecord} mutation - Mutation from the observer.
   * @returns {boolean}
   */
  function mutationTouchesThrowRow(mutation) {
    if (mutation.type === "characterData") {
      const parent = mutation.target.parentElement;
      return Boolean(parent && parent.closest(CONFIG.selectors.throwRow));
    }
    return Array.from(mutation.addedNodes).some((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      return (
        node.matches(CONFIG.selectors.throwRow) ||
        node.querySelector(CONFIG.selectors.throwRow)
      );
    });
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(mutationTouchesThrowRow)) {
      scheduleScan();
    }
  });

  /**
   * Initializes observers and optional polling.
   * @returns {void}
   */
  function start() {
    scanThrows(true);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    if (CONFIG.pollIntervalMs > 0) {
      setInterval(() => scanThrows(false), CONFIG.pollIntervalMs);
    }
  }

  if (document.readyState === "loading") {
    window.addEventListener("load", start);
  } else {
    start();
  }
})();
