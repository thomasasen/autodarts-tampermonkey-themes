// ==UserScript==
// @name         Autodarts Animate Triple Double Bull Hits
// @version      1.2
// @description  Markiert Triple-, Double- und Bull-Treffer in der Wurfliste sichtbar.
// @xconfig-description  Hebt T-, D- und Bull-Treffer in der Wurfliste klar hervor, damit wichtige Würfe sofort auffallen.
// @xconfig-title  Treffer-Highlights (Triple/Double/Bull)
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-triple-double-bull-hits
// @xconfig-tech-anchor  animation-autodarts-animate-triple-double-bull-hits
// @xconfig-background     assets/animation-animate-triple-double-bull-hits.gif
// @xconfig-settings-version 3
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

  const DEPRECATION_BANNER_GLOBAL_KEY = "__adLegacyDeprecationBannerState";
  const DEPRECATION_BANNER_STYLE_ID = "ad-legacy-deprecation-banner-style";
  const DEPRECATION_BANNER_ID = "ad-legacy-deprecation-banner";
  const DEPRECATION_COPY = Object.freeze({
    url: "https://github.com/thomasasen/autodarts-xconfig",
    title: "Dieses Skript ist veraltet (deprecated).",
    body: "Dieses Legacy-Repo wird von mir nicht weiter gepflegt und wurde durch autodarts-xconfig ersetzt.",
    benefits: "autodarts-xconfig bietet ein ueberarbeitetes Programmdesign, einen zentralen Installationspfad, mehr Stabilitaet und laufende Weiterentwicklung.",
    cta: "Zum Nachfolger autodarts-xconfig",
  });

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getDeprecationBannerState() {
    const existing = window[DEPRECATION_BANNER_GLOBAL_KEY];
    if (existing && typeof existing === "object") {
      existing.payload = DEPRECATION_COPY;
      return existing;
    }

    const next = {
      payload: DEPRECATION_COPY,
      waitingForDom: false,
    };
    window[DEPRECATION_BANNER_GLOBAL_KEY] = next;
    return next;
  }

  function ensureDeprecationBannerStyle() {
    const target = document.head || document.documentElement;
    if (!target) {
      return false;
    }

    const cssText = `
#${DEPRECATION_BANNER_ID} {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(960px, calc(100vw - 1rem));
  z-index: 2147483646;
  pointer-events: none;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 196, 88, 0.55);
  background: linear-gradient(135deg, rgba(54, 33, 5, 0.96), rgba(90, 45, 8, 0.92));
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.34);
  color: #fff4de;
  pointer-events: auto;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__copy {
  flex: 1 1 26rem;
  min-width: 0;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__title {
  margin: 0 0 0.2rem;
  font-size: 0.96rem;
  font-weight: 800;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__body {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.42;
  color: rgba(255, 244, 222, 0.94);
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 219, 143, 0.72);
  background: rgba(255, 247, 228, 0.14);
  color: #fff7e7;
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__link:hover {
  background: rgba(255, 247, 228, 0.22);
}
@media (max-width: 720px) {
  #${DEPRECATION_BANNER_ID} {
    width: calc(100vw - 0.75rem);
    top: 0.5rem;
  }
  #${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__inner {
    padding: 0.72rem 0.82rem;
  }
  #${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__link {
    width: 100%;
  }
}
`;

    const existingStyle = document.getElementById(DEPRECATION_BANNER_STYLE_ID);
    if (existingStyle) {
      if (existingStyle.textContent !== cssText) {
        existingStyle.textContent = cssText;
      }
      if (existingStyle.parentElement !== target) {
        target.appendChild(existingStyle);
      }
      return true;
    }

    const style = document.createElement("style");
    style.id = DEPRECATION_BANNER_STYLE_ID;
    style.textContent = cssText;
    target.appendChild(style);
    return true;
  }

  function ensureDeprecationBanner() {
    const host = document.body || document.documentElement;
    if (!host) {
      return false;
    }

    ensureDeprecationBannerStyle();
    const { payload } = getDeprecationBannerState();
    let banner = document.getElementById(DEPRECATION_BANNER_ID);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = DEPRECATION_BANNER_ID;
      banner.setAttribute("role", "note");
    }

    banner.innerHTML = `
      <div class="ad-legacy-deprecation-banner__inner">
        <div class="ad-legacy-deprecation-banner__copy">
          <p class="ad-legacy-deprecation-banner__title">${escapeHtml(payload.title)}</p>
          <p class="ad-legacy-deprecation-banner__body">${escapeHtml(payload.body)} ${escapeHtml(payload.benefits)}</p>
        </div>
        <a class="ad-legacy-deprecation-banner__link" href="${escapeHtml(payload.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.cta)}</a>
      </div>
    `;

    if (banner.parentElement !== host) {
      host.appendChild(banner);
    }
    return true;
  }

  function scheduleDeprecationBanner() {
    if (ensureDeprecationBanner()) {
      return;
    }

    const state = getDeprecationBannerState();
    if (state.waitingForDom) {
      return;
    }
    state.waitingForDom = true;

    const retry = () => {
      state.waitingForDom = false;
      ensureDeprecationBanner();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", retry, { once: true });
      return;
    }

    window.setTimeout(retry, 0);
  }

  scheduleDeprecationBanner();

  // xConfig: {"type":"toggle","label":"Triple hervorheben","description":"Markiert Triple-Treffer in der Wurfliste.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_TRIPLE_HERVORHEBEN = true;
  // xConfig: {"type":"toggle","label":"Double hervorheben","description":"Markiert Double-Treffer in der Wurfliste.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_DOUBLE_HERVORHEBEN = true;
  // xConfig: {"type":"toggle","label":"Bull hervorheben","description":"Markiert Bull-Treffer in der Wurfliste.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_BULL_HERVORHEBEN = true;
  // xConfig: {"type":"select","label":"Aktualisierungsmodus","description":"Wählt zwischen maximaler Reaktionsgeschwindigkeit und robuster Kompatibilität.","options":[{"value":0,"label":"Nur Live (Observer)"},{"value":3000,"label":"Kompatibel (zusätzliches Polling)"}]}
  const xConfig_AKTUALISIERUNGSMODUS = 3000;

	// xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
	const xConfig_DEBUG = false;


	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Triple Double Bull Hits]";

	function debugLog(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.log(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.log(`${DEBUG_PREFIX} ${event}`, payload);
	}

	function debugWarn(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.warn(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.warn(`${DEBUG_PREFIX} ${event}`, payload);
	}

	function debugError(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.error(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.error(`${DEBUG_PREFIX} ${event}`, payload);
	}
  function resolveToggle(value, fallbackValue) {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === 1 || value === "1") {
      return true;
    }
    if (value === 0 || value === "0") {
      return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "on", "aktiv", "active"].includes(normalized)) {
        return true;
      }
      if (["false", "no", "off", "inaktiv", "inactive"].includes(normalized)) {
        return false;
      }
    }
    return fallbackValue;
  }

  function resolveNumberChoice(value, fallbackValue, allowedValues) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
      ? numericValue
      : fallbackValue;
  }

  const RESOLVED_TRIPLE_HERVORHEBEN = resolveToggle(xConfig_TRIPLE_HERVORHEBEN, true);
  const RESOLVED_DOUBLE_HERVORHEBEN = resolveToggle(xConfig_DOUBLE_HERVORHEBEN, true);
  const RESOLVED_BULL_HERVORHEBEN = resolveToggle(xConfig_BULL_HERVORHEBEN, true);
  const RESOLVED_POLL_INTERVAL_MS = resolveNumberChoice(xConfig_AKTUALISIERUNGSMODUS, 3000, [0, 3000]);

  // Script goal: highlight triple/double/bull hits in the throw list.
  // Default values 1..20 for valid segments.
  const SEGMENT_VALUES = [
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  ];

  const HIT_TYPE_CATALOG = {
    triple: {
      key: "triple",
      prefix: "T",
      values: [...SEGMENT_VALUES],
      highlightColor: "#ffb347",
      gradientStops: ["#ff6b6b", "#ff9f1c", "#ffd166"],
    },
    double: {
      key: "double",
      prefix: "D",
      values: [...SEGMENT_VALUES],
      highlightColor: "#5ec8ff",
      gradientStops: ["#22d3ee", "#38bdf8", "#818cf8"],
    },
  };

  const ACTIVE_HIT_TYPES = [];
  if (RESOLVED_TRIPLE_HERVORHEBEN) {
    ACTIVE_HIT_TYPES.push(HIT_TYPE_CATALOG.triple);
  }
  if (RESOLVED_DOUBLE_HERVORHEBEN) {
    ACTIVE_HIT_TYPES.push(HIT_TYPE_CATALOG.double);
  }

  /**
   * Configuration for hit types and visuals.
   * @property {number} pollIntervalMs - Fallback interval in ms, e.g. 3000.
   * @property {Object} selectors - CSS selectors for the throw list and text.
   * @property {string[]} defaultGradientStops - Default gradient colors.
   * @property {Array} hitTypes - Hit types (T/D) with colors and gradients.
   * @property {Object} bull - Configuration for BULL (on/off).
   */
  const CONFIG = {
    pollIntervalMs: RESOLVED_POLL_INTERVAL_MS,
    selectors: {
      throwRow: ".ad-ext-turn-throw",
      throwText: ".ad-ext-turn-throw p.chakra-text",
      textNode: "p.chakra-text",
    },
    classes: {
      badge: "ad-ext-hit-badge",
      prefix: "ad-ext-hit-prefix",
      remainder: "ad-ext-hit-remainder",
    },
    defaultGradientStops: ["#22d3ee", "#9fdb58", "#f59e0b", "#34d399"],
    hitTypes: ACTIVE_HIT_TYPES,
    bull: {
      enabled: RESOLVED_BULL_HERVORHEBEN,
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

    return `\n        .highlight {\n            font-weight: bold;\n            text-shadow: 0 0 6px rgba(255, 255, 255, 0.3);\n        }\n\n${highlightBlocks}\n        .${CONFIG.classes.badge} {\n            border: none;\n            outline: none;\n            position: relative;\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            gap: 0.04em;\n            max-width: 100%;\n            color: #fdfdfd !important;\n            font-size: 20px;\n            font-weight: 500;\n            letter-spacing: 2px;\n            word-spacing: 4px;\n            line-height: 1;\n            text-transform: uppercase;\n            padding: 8px 14px;\n            border-radius: 12px;\n            overflow: hidden;\n            isolation: isolate;\n            transition: transform 120ms ease-out, box-shadow 120ms ease-out;\n        }\n\n        .${CONFIG.classes.badge}::before {\n            content: \"\";\n            position: absolute;\n            inset: -3px;\n            border-radius: inherit;\n            background: var(--animate-gradient, ${gradientValue(
      CONFIG.defaultGradientStops
    )});\n            background-size: 250% 250%;\n            filter: blur(3px);\n            opacity: 0.9;\n            animation: glow-flow 6s linear infinite;\n            z-index: -2;\n        }\n\n        .${CONFIG.classes.badge}::after {\n            content: \"\";\n            position: absolute;\n            inset: 1px;\n            border-radius: inherit;\n            background: rgba(5, 7, 16, 0.85);\n            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);\n            animation: panel-pulse 3s ease-in-out infinite;\n            z-index: -1;\n        }\n\n        .${CONFIG.classes.badge}:hover {\n            transform: translateY(-1px);\n            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);\n        }\n\n        .${CONFIG.classes.prefix},\n        .${CONFIG.classes.remainder} {\n            position: relative;\n            z-index: 1;\n        }\n\n${gradientBlocks}\n        @keyframes glow-flow {\n            0% {\n                background-position: 0% 50%;\n            }\n            50% {\n                background-position: 100% 50%;\n            }\n            100% {\n                background-position: 0% 50%;\n            }\n        }\n\n        @keyframes panel-pulse {\n            0% {\n                opacity: 0.85;\n                transform: translateY(0);\n            }\n            50% {\n                opacity: 1;\n                transform: translateY(-1px);\n            }\n            100% {\n                opacity: 0.85;\n                transform: translateY(0);\n            }\n        }\n    `;
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

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Applies classes and highlighted text for a hit.
   * @param {HTMLElement} pElement - Text element of the throw display.
   * @param {Object} meta - Hit metadata.
   * @param {string} prefixChar - Prefix like "T" or "D" (or empty).
   * @returns {void}
   */
  function decorateHit(pElement, meta, prefixChar) {
    const baseText = pElement.textContent.trim();
    if (!baseText) {
      return;
    }

    const highlightClasses = `highlight ${meta.highlightClass}`;
    if (prefixChar) {
      const remainder = escapeHtml(baseText.slice(prefixChar.length));
      pElement.innerHTML = `<span class="${CONFIG.classes.badge} ${meta.gradientClass}"><span class="${CONFIG.classes.prefix} ${highlightClasses}">${escapeHtml(prefixChar)}</span><span class="${CONFIG.classes.remainder}">${remainder}</span></span>`;
    } else {
      pElement.innerHTML = `<span class="${CONFIG.classes.badge} ${meta.gradientClass}"><span class="${CONFIG.classes.prefix} ${highlightClasses}">${escapeHtml(baseText)}</span></span>`;
    }
  }

  function resetHitDecoration(pElement) {
    if (pElement.querySelector(`span.${CONFIG.classes.badge}`)) {
      pElement.textContent = pElement.textContent.trim();
    }
  }

  /**
   * Finds all throw texts and decorates hit types.
   * @returns {void}
   */
  function animateHits() {
    let hitsDetected = 0;
    document
      .querySelectorAll(CONFIG.selectors.throwText)
      .forEach((pElement) => {
        const hitInfo = getHitMeta(pElement);
        if (hitInfo) {
          hitsDetected += 1;
          decorateHit(pElement, hitInfo.type, hitInfo.prefixChar);
          return;
        }
        resetHitDecoration(pElement);
      });
    if (hitsDetected > 0) {
      debugLog("trigger", { hitsDetected });
    }
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
    debugLog("applied", {
      pollIntervalMs: CONFIG.pollIntervalMs,
      tripleEnabled: RESOLVED_TRIPLE_HERVORHEBEN,
      doubleEnabled: RESOLVED_DOUBLE_HERVORHEBEN,
      bullEnabled: RESOLVED_BULL_HERVORHEBEN,
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
	debugLog("init", { debug: DEBUG_ENABLED });
})();

