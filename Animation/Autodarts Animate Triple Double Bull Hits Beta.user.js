// ==UserScript==
// @name         Autodarts Animate Triple Double Bull Hits [Beta]
// @version      1.1-beta.1
// @description  Markiert Triple-, Double- und Bull-Treffer in der Wurfliste sichtbar.
// @xconfig-description  Beta: Anime.js-Kurzimpulse nur bei neuem Hit statt dauerhafter Daueranimation.
// @xconfig-title  Treffer-Highlights (Triple/Double/Bull) [Beta]
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-triple-double-bull-hits
// @xconfig-tech-anchor  animation-autodarts-animate-triple-double-bull-hits
// @xconfig-background     assets/animation-animate-triple-double-bull-hits.gif

// @xconfig-settings-version 3
// @xconfig-beta         true
// @author       Thomas Asen
// @match        *://play.autodarts.io/*
// @grant        none
// @run-at       document-start
// @license      MIT
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/anime.min.js
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Triple%20Double%20Bull%20Hits%20Beta.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Triple%20Double%20Bull%20Hits%20Beta.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtTripleDoubleBullHitsBeta";
  const previous = window[INSTANCE_KEY];
  if (previous && typeof previous.cleanup === "function") {
    try {
      previous.cleanup();
    } catch (_) {
      // ignore
    }
  }

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

  const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
  const DEBUG_PREFIX = "[xConfig][Triple Double Bull Hits Beta]";
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

  const CONFIG = {
    pollIntervalMs: resolveNumberChoice(xConfig_AKTUALISIERUNGSMODUS, 3000, [0, 3000]),
    triple: resolveToggle(xConfig_TRIPLE_HERVORHEBEN, true),
    double: resolveToggle(xConfig_DOUBLE_HERVORHEBEN, true),
    bull: resolveToggle(xConfig_BULL_HERVORHEBEN, true),
    selectors: {
      throwRow: ".ad-ext-turn-throw",
      throwText: ".ad-ext-turn-throw p.chakra-text",
      textNode: "p.chakra-text",
    },
  };

  const shared = window.autodartsAnimationShared || {};
  const createRafScheduler = typeof shared.createRafScheduler === "function"
    ? shared.createRafScheduler
    : (fn) => {
      let scheduled = false;
      return () => {
        if (scheduled) {
          return;
        }
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          fn();
        });
      };
    };
  const observeMutations = typeof shared.observeMutations === "function"
    ? shared.observeMutations
    : (opts) => {
      if (!opts || typeof opts.onChange !== "function") {
        return null;
      }
      const observer = new MutationObserver(() => opts.onChange());
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      return observer;
    };

  const gameStateShared = window.autodartsGameStateShared || null;
  const animeLib = window.anime || null;

  const STYLE_ID = "ad-ext-triple-double-bull-beta-style";
  const STYLE_TEXT = `
.highlight { font-weight: 700; text-shadow: 0 0 6px rgba(255,255,255,0.35); }
.highlight-triple { color: #ffb347; }
.highlight-double { color: #5ec8ff; }
.highlight-bull { color: #ffe97a; }
.animate-hit { border-radius: 12px; padding: 8px 14px; color: #fdfdfd !important; letter-spacing: 1.6px; text-transform: uppercase; }
.animate-hit-triple { background: linear-gradient(135deg, #ff6b6b, #ff9f1c, #ffd166); }
.animate-hit-double { background: linear-gradient(135deg, #22d3ee, #38bdf8, #818cf8); }
.animate-hit-bull { background: linear-gradient(135deg, #9fdb58, #4ade80, #86efac); }
`;

  const hitSignatureByNode = new WeakMap();
  const activeAnimeByNode = new WeakMap();
  let observer = null;
  let unsubscribe = null;
  let fallbackInterval = 0;
  let cleanedUp = false;
  let lastStateToken = "";

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = STYLE_TEXT;
      (document.head || document.documentElement)?.appendChild(style);
      return;
    }
    if (style.textContent !== STYLE_TEXT) {
      style.textContent = STYLE_TEXT;
    }
  }

  function stopNodeAnime(node) {
    const animeInstance = activeAnimeByNode.get(node);
    if (animeInstance && typeof animeInstance.pause === "function") {
      try {
        animeInstance.pause();
      } catch (_) {
        // ignore
      }
    }
    activeAnimeByNode.delete(node);
  }

  function parseHit(text) {
    const raw = String(text || "").trim().toUpperCase();
    if (!raw) {
      return null;
    }

    if (CONFIG.bull && ["BULL", "BULLSEYE", "DB", "SB", "25", "50"].includes(raw)) {
      return { type: "bull", prefix: "", valueText: raw === "50" ? "BULL" : raw };
    }

    const tdMatch = raw.match(/^([TD])(\d{1,2})$/);
    if (tdMatch) {
      const value = Number(tdMatch[2]);
      if (value < 1 || value > 20) {
        return null;
      }
      if (tdMatch[1] === "T" && CONFIG.triple) {
        return { type: "triple", prefix: "T", valueText: String(value) };
      }
      if (tdMatch[1] === "D" && CONFIG.double) {
        return { type: "double", prefix: "D", valueText: String(value) };
      }
    }

    return null;
  }

  function applyHighlight(node, hit) {
    const row = node.closest(CONFIG.selectors.throwRow);
    if (!row) {
      return;
    }

    row.classList.add("animate-hit");
    row.classList.remove("animate-hit-triple", "animate-hit-double", "animate-hit-bull");
    row.classList.add(`animate-hit-${hit.type}`);

    const raw = String(node.textContent || "").trim().toUpperCase();
    if (hit.prefix) {
      node.innerHTML = `<span class="highlight highlight-${hit.type}">${hit.prefix}</span>${raw.slice(1)}`;
    } else {
      node.innerHTML = `<span class="highlight highlight-${hit.type}">${raw}</span>`;
    }
  }

  function resetHighlight(node) {
    const row = node.closest(CONFIG.selectors.throwRow);
    if (row) {
      row.classList.remove("animate-hit", "animate-hit-triple", "animate-hit-double", "animate-hit-bull");
    }

    const original = node.getAttribute("data-ad-ext-hit-original");
    if (original !== null) {
      node.textContent = original;
      node.removeAttribute("data-ad-ext-hit-original");
      return;
    }

    const highlighted = node.querySelector("span.highlight");
    if (highlighted) {
      node.textContent = node.textContent || "";
    }
  }

  function animateImpulse(node, row, type) {
    if (!animeLib) {
      return;
    }

    stopNodeAnime(node);

    const anim = animeLib({
      targets: row,
      scale: [0.96, 1.06, 1],
      duration: 460,
      easing: "easeOutCubic",
    });
    activeAnimeByNode.set(node, anim);

    animeLib({
      targets: node,
      opacity: [0.85, 1],
      duration: 320,
      easing: "easeOutQuad",
      complete: () => {
        node.style.opacity = "";
      },
    });

    debugLog("hit-impulse", { type });
  }

  function updateHits() {
    document.querySelectorAll(CONFIG.selectors.throwText).forEach((node) => {
      const rawText = String(node.textContent || "").trim();
      if (!rawText) {
        resetHighlight(node);
        hitSignatureByNode.delete(node);
        stopNodeAnime(node);
        return;
      }

      if (!node.hasAttribute("data-ad-ext-hit-original")) {
        node.setAttribute("data-ad-ext-hit-original", rawText);
      }

      const hit = parseHit(rawText);
      if (!hit) {
        resetHighlight(node);
        hitSignatureByNode.delete(node);
        stopNodeAnime(node);
        return;
      }

      const signature = `${hit.type}:${rawText}`;
      const previous = hitSignatureByNode.get(node) || "";

      applyHighlight(node, hit);
      hitSignatureByNode.set(node, signature);

      if (signature !== previous) {
        const row = node.closest(CONFIG.selectors.throwRow);
        if (row) {
          animateImpulse(node, row, hit.type);
        }
      }
    });
  }

  function getStateToken() {
    if (!gameStateShared) {
      return "";
    }

    const turn = typeof gameStateShared.getActiveTurn === "function" ? gameStateShared.getActiveTurn() : null;
    const throws = typeof gameStateShared.getActiveThrows === "function" ? gameStateShared.getActiveThrows() : [];
    if (!turn) {
      return `nostate:${Array.isArray(throws) ? throws.length : 0}`;
    }

    const turnId = String(turn.id || `${turn.playerId || ""}:${turn.round || ""}:${turn.turn || ""}`);
    return `${turnId}|${Array.isArray(throws) ? throws.length : 0}`;
  }

  const scheduleUpdate = createRafScheduler(updateHits);

  function onStateChange() {
    const token = getStateToken();
    if (!token || token === lastStateToken) {
      return;
    }
    lastStateToken = token;
    scheduleUpdate();
  }

  function cleanup() {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
    observer = null;

    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
    unsubscribe = null;

    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = 0;
    }

    document.querySelectorAll(CONFIG.selectors.throwText).forEach((node) => {
      stopNodeAnime(node);
      resetHighlight(node);
    });

    const style = document.getElementById(STYLE_ID);
    if (style) {
      style.remove();
    }

    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("beforeunload", cleanup);
    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].cleanup === cleanup) {
      delete window[INSTANCE_KEY];
    }
  }

  ensureStyle();
  updateHits();

  observer = observeMutations({
    onChange: scheduleUpdate,
    options: {
      childList: true,
      subtree: true,
      characterData: true,
    },
  });

  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    unsubscribe = gameStateShared.subscribe(onStateChange);
  }

  if (CONFIG.pollIntervalMs > 0 && !unsubscribe) {
    fallbackInterval = setInterval(scheduleUpdate, CONFIG.pollIntervalMs);
  }

  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  window[INSTANCE_KEY] = { cleanup };

  debugLog("init", {
    anime: Boolean(animeLib),
    gameState: Boolean(gameStateShared),
    pollIntervalMs: CONFIG.pollIntervalMs,
    debug: DEBUG_ENABLED,
  });
})();

