// ==UserScript==
// @name         Autodarts Animate Triple Double Bull Hits
// @version      1.0
// @description  Markiert Triple-, Double- und Bull-Treffer in der Wurfliste mit Animation.
// @xconfig-description  Hebt T-, D- und Bull-Treffer in der Wurfliste mit animierten Farbverlaeufen hervor.
// @xconfig-variant      all
// @author       Thomas Asen
// @match        *://play.autodarts.io/*
// @grant        none
// @run-at       document-start
// @license      MIT
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Triple%20Double%20Bull%20Hits.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Triple%20Double%20Bull%20Hits.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Script goal: highlight triple/double/bull hits in the throw list.
  // Default values 1..20 for valid segments.
  const SEGMENT_VALUES = [
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  ];

  /**
   * Configuration for hit types and visuals.
   * @property {number} pollIntervalMs - Fallback interval in ms, e.g. 3000.
   * @property {Object} selectors - CSS selectors for the throw list and text.
   * @property {string[]} defaultGradientStops - Default gradient colors.
   * @property {Array} hitTypes - Hit types (T/D) with colors and gradients.
   * @property {Object} bull - Configuration for BULL (on/off).
   */
  const CONFIG = {
    pollIntervalMs: 3000,
    selectors: {
      throwRow: ".ad-ext-turn-throw",
      throwText: ".ad-ext-turn-throw p.chakra-text",
      textNode: "p.chakra-text",
    },
    defaultGradientStops: ["#22d3ee", "#9fdb58", "#f59e0b", "#34d399"],
    hitTypes: [
      {
        key: "triple",
        prefix: "T",
        values: [...SEGMENT_VALUES],
        highlightColor: "#ffb347",
        gradientStops: ["#ff6b6b", "#ff9f1c", "#ffd166"],
      },
      {
        key: "double",
        prefix: "D",
        values: [...SEGMENT_VALUES],
        highlightColor: "#5ec8ff",
        gradientStops: ["#22d3ee", "#38bdf8", "#818cf8"],
      },
    ],
    bull: {
      enabled: true,
      key: "bull",
      label: "BULL",
      highlightColor: "#ffe97a",
      gradientStops: ["#9fdb58", "#4ade80", "#86efac"],
    },
  };

  /**
   * Expands hit types with derived properties.
   * @param {Object} type - Hit type, e.g. { key: "triple", prefix: "T" }.
   * @returns {Object}
   */
  const withDerivedProps = (type) => ({
    ...type,
    valuesSet: Array.isArray(type.values) ? new Set(type.values) : null,
    highlightClass: `highlight-${type.key}`,
    gradientClass: `animate-hit-${type.key}`,
    labelUpper: type.label ? type.label.toUpperCase() : undefined,
  });

  // Precomputed lookup tables and classes for fast matching.
  const HIT_TYPES = CONFIG.hitTypes.map(withDerivedProps);
  const TYPE_BY_PREFIX = HIT_TYPES.reduce((map, type) => {
    map[type.prefix.toUpperCase()] = type;
    return map;
  }, {});
  const BULL_TYPE = CONFIG.bull.enabled ? withDerivedProps(CONFIG.bull) : null;
  const DECORATABLE_TYPES = [...HIT_TYPES, ...(BULL_TYPE ? [BULL_TYPE] : [])];
  const GRADIENT_VARIANTS = DECORATABLE_TYPES.map((type) => type.gradientClass);

  let stylesInjected = false;
  let initialized = false;

  /**
   * Builds a CSS gradient string for a hit card.
   * @param {string[]} stops - Color stops like ["#ff6b6b", "#ffd166"].
   * @returns {string}
   */
  function gradientValue(stops) {
    const palette =
      Array.isArray(stops) && stops.length
        ? stops
        : CONFIG.defaultGradientStops;
    return `linear-gradient(135deg, ${palette.join(", ")})`;
  }

  /**
   * Builds the full CSS definition for highlights and animations.
   * @returns {string}
   */
  function buildStyles() {
    const highlightBlocks = DECORATABLE_TYPES.map(
      (type) =>
        `        .${type.highlightClass} {\n            color: ${type.highlightColor};\n        }\n`
    ).join("\n");

    const gradientBlocks = DECORATABLE_TYPES.map(
      (type) =>
        `        .${
          type.gradientClass
        } {\n            --animate-gradient: ${gradientValue(
          type.gradientStops
        )};\n        }\n`
    ).join("\n");

    return `\n        .highlight {\n            font-weight: bold;\n            text-shadow: 0 0 6px rgba(255, 255, 255, 0.3);\n        }\n\n${highlightBlocks}\n        .animate-hit {\n            border: none;\n            outline: none;\n            position: relative;\n            color: #fdfdfd !important;\n            font-size: 20px;\n            font-weight: 500;\n            letter-spacing: 2px;\n            word-spacing: 4px;\n            text-transform: uppercase;\n            padding: 8px 14px;\n            border-radius: 12px;\n            overflow: hidden;\n            isolation: isolate;\n            transition: transform 120ms ease-out, box-shadow 120ms ease-out;\n        }\n\n        .animate-hit::before {\n            content: \"\";\n            position: absolute;\n            inset: -3px;\n            border-radius: inherit;\n            background: var(--animate-gradient, ${gradientValue(
      CONFIG.defaultGradientStops
    )});\n            background-size: 250% 250%;\n            filter: blur(3px);\n            opacity: 0.9;\n            animation: glow-flow 6s linear infinite;\n            z-index: -2;\n        }\n\n        .animate-hit::after {\n            content: \"\";\n            position: absolute;\n            inset: 1px;\n            border-radius: inherit;\n            background: rgba(5, 7, 16, 0.85);\n            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);\n            animation: panel-pulse 3s ease-in-out infinite;\n            z-index: -1;\n        }\n\n        .animate-hit:hover {\n            transform: translateY(-1px);\n            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);\n        }\n\n${gradientBlocks}\n        @keyframes glow-flow {\n            0% {\n                background-position: 0% 50%;\n            }\n            50% {\n                background-position: 100% 50%;\n            }\n            100% {\n                background-position: 0% 50%;\n            }\n        }\n\n        @keyframes panel-pulse {\n            0% {\n                opacity: 0.85;\n                transform: translateY(0);\n            }\n            50% {\n                opacity: 1;\n                transform: translateY(-1px);\n            }\n            100% {\n                opacity: 0.85;\n                transform: translateY(0);\n            }\n        }\n    `;
  }

  /**
   * Injects the CSS styles into the document head once.
   * @returns {void}
   */
  function injectCSS() {
    if (stylesInjected) {
      return;
    }

    const style = document.createElement("style");
    style.type = "text/css";
    style.textContent = buildStyles();
    document.head.appendChild(style);
    stylesInjected = true;
  }

  /**
   * Checks whether a text is a hit type (T/D/BULL) and returns metadata.
   * @param {HTMLElement} pElement - Text node of the throw display.
   * @example
   * getHitMeta({ textContent: "T20" });
   * @returns {{type: Object, prefixChar: string} | null}
   */
  function getHitMeta(pElement) {
    const rawText = pElement.textContent.trim();
    if (!rawText) {
      return null;
    }

    const prefixChar = rawText.charAt(0);
    const lookupKey = prefixChar.toUpperCase();
    const typeMatch = TYPE_BY_PREFIX[lookupKey];

    if (typeMatch) {
      const hitValue = parseInt(rawText.slice(1), 10);
      if (
        Number.isNaN(hitValue) ||
        (typeMatch.valuesSet && !typeMatch.valuesSet.has(hitValue))
      ) {
        return null;
      }
      return { type: typeMatch, prefixChar };
    }

    if (BULL_TYPE && rawText.toUpperCase() === BULL_TYPE.labelUpper) {
      return { type: BULL_TYPE, prefixChar: "" };
    }

    return null;
  }

  /**
   * Applies classes and highlighted text for a hit.
   * @param {HTMLElement} pElement - Text element of the throw display.
   * @param {Object} meta - Hit metadata.
   * @param {string} prefixChar - Prefix like "T" or "D" (or empty).
   * @returns {void}
   */
  function decorateHit(pElement, meta, prefixChar) {
    const throwRow = pElement.closest(CONFIG.selectors.throwRow);
    if (!throwRow) {
      return;
    }

    throwRow.classList.add("animate-hit");
    if (GRADIENT_VARIANTS.length) {
      throwRow.classList.remove(...GRADIENT_VARIANTS);
    }
    throwRow.classList.add(meta.gradientClass);

    const baseText = pElement.textContent.trim();
    if (!baseText) {
      return;
    }

    const highlightClasses = `highlight ${meta.highlightClass}`;
    if (prefixChar) {
      const remainder = baseText.slice(prefixChar.length);
      pElement.innerHTML = `<span class="${highlightClasses}">${prefixChar}</span>${remainder}`;
    } else {
      pElement.innerHTML = `<span class="${highlightClasses}">${baseText}</span>`;
    }
  }

  /**
   * Finds all throw texts and decorates hit types.
   * @returns {void}
   */
  function animateHits() {
    document
      .querySelectorAll(CONFIG.selectors.throwText)
      .forEach((pElement) => {
        const hitInfo = getHitMeta(pElement);
        if (hitInfo) {
          decorateHit(pElement, hitInfo.type, hitInfo.prefixChar);
        }
      });
  }

  /**
   * Checks whether a mutation touches the throw display.
   * @param {MutationRecord} mutation - Mutation from the observer.
   * @returns {boolean}
   */
  function mutationTouchesThrowText(mutation) {
    if (mutation.type === "characterData") {
      const parent = mutation.target.parentElement;
      return Boolean(parent && parent.matches(CONFIG.selectors.textNode));
    }

    return Array.from(mutation.addedNodes).some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches(CONFIG.selectors.textNode) ||
          node.querySelector(CONFIG.selectors.textNode))
    );
  }

  // Observes DOM changes in the throw list.
  const observer = new MutationObserver((mutationsList) => {
    if (mutationsList.some(mutationTouchesThrowText)) {
      animateHits();
    }
  });

  /**
   * Initializes styles and starts observers/intervals.
   * @returns {void}
   */
  function start() {
    if (initialized) {
      return;
    }

    initialized = true;
    injectCSS();
    animateHits();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    if (CONFIG.pollIntervalMs > 0) {
      setInterval(animateHits, CONFIG.pollIntervalMs);
    }
  }

  if (document.readyState === "loading") {
    window.addEventListener("load", start);
  } else {
    start();
  }
})();
