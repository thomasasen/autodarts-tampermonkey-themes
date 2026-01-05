// ==UserScript==
// @name         Autodarts Animate Single Bull Sound
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.1
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
   * @property {Object} selectors - CSS selectors for throw rows/text.
   * @property {number} pollIntervalMs - Optional polling interval (0 disables).
   */
  const CONFIG = {
    soundUrl: "https://gifs.thomasasen.goip.de/singlebull.mp3",
    volume: 0.9,
    targetPoints: 25,
    targetLabel: "BULL",
    selectors: {
      throwRow: ".ad-ext-turn-throw",
      throwText: "p.chakra-text",
    },
    pollIntervalMs: 0,
  };

  const targetLabelUpper = CONFIG.targetLabel.toUpperCase();
  const lastKeys = new WeakMap();

  const audio = new Audio(CONFIG.soundUrl);
  audio.preload = "auto";
  audio.volume = CONFIG.volume;
  let audioPrimed = false;

  /**
   * Normalizes text content into a single line.
   * @param {string|null|undefined} text - Raw text content.
   * @returns {string}
   */
  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  /**
   * Tokenizes a string into number and word chunks.
   * @param {string} text - Normalized throw text.
   * @returns {string[]}
   */
  function tokenize(text) {
    return text.match(/[A-Za-z]+|\d+/g) || [];
  }

  /**
   * Reads the text for a single throw row.
   * @param {Element} row - Throw row element.
   * @returns {string}
   */
  function getThrowText(row) {
    const textNode = row.querySelector(CONFIG.selectors.throwText);
    return normalizeText((textNode || row).textContent);
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
    const tokens = tokenize(text);
    const labelMatch = tokens.some(
      (token) => token.toUpperCase() === targetLabelUpper
    );
    if (!labelMatch) {
      return false;
    }
    const pointsToken = tokens.find((token) => /^\d+$/.test(token));
    if (!pointsToken) {
      return false;
    }
    return Number(pointsToken) === CONFIG.targetPoints;
  }

  /**
   * Tries to unlock audio playback after user interaction.
   * @returns {void}
   */
  function primeAudio() {
    if (audioPrimed) {
      return;
    }
    audioPrimed = true;
    try {
      const probe = audio.cloneNode(true);
      probe.muted = true;
      const result = probe.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch (error) {
      // Ignore autoplay restriction errors.
    }
  }

  /**
   * Plays the configured audio (ignored if blocked by autoplay rules).
   * @returns {void}
   */
  function playSound() {
    try {
      const sound = audio.cloneNode(true);
      sound.volume = CONFIG.volume;
      sound.currentTime = 0;
      const result = sound.play();
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
      const normalized = getThrowText(row);
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

  const observer = new MutationObserver(() => {
    scheduleScan();
  });

  /**
   * Initializes observers and optional polling.
   * @returns {void}
   */
  function start() {
    window.addEventListener("pointerdown", primeAudio, {
      once: true,
      capture: true,
    });
    window.addEventListener("keydown", primeAudio, { once: true, capture: true });
    scanThrows(true);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
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
