// ==UserScript==
// @name         Autodarts Animate Turn Points Count
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Animiert die Turn-Punkte beim Wechsel nach oben oder unten.
// @xconfig-description  Anime.js-Zahlentween mit GameState-Diff für stabileres Punkte-Counting.
// @xconfig-title  Turn-Punkte-Zähler
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-turn-points-count
// @xconfig-tech-anchor  animation-autodarts-animate-turn-points-count
// @xconfig-background     assets/animation-turn-points-count-detail-readme.gif

// @xconfig-settings-version 3
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/anime.min.js
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEYS = ["__adExtTurnPointsCount", "__adExtTurnPointsCountBeta"];
  INSTANCE_KEYS.forEach((instanceKey) => {
    const previous = window[instanceKey];
    if (previous && typeof previous.cleanup === "function") {
      try {
        previous.cleanup();
      } catch (_) {
        // ignore
      }
    }
  });

  // xConfig: {"type":"select","label":"Animationsdauer","description":"Bestimmt, wie schnell die Turn-Punkte hoch oder runter zählen.","options":[{"value":260,"label":"Schnell"},{"value":416,"label":"Standard"},{"value":650,"label":"Langsam"}]}
  const xConfig_ANIMATIONSDAUER_MS = 416;
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

  function resolveDebugToggle(value) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
  }

  function resolveNumberChoice(value, fallbackValue, allowedValues) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
      ? numericValue
      : fallbackValue;
  }

  const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
  const DEBUG_PREFIX = "[xConfig][Turn Points Count]";
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

  const RESOLVED_ANIMATION_MS = resolveNumberChoice(xConfig_ANIMATIONSDAUER_MS, 416, [260, 416, 650]);
  const CONFIG = {
    scoreSelector: "p.ad-ext-turn-points",
    animationMs: RESOLVED_ANIMATION_MS,
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

  const lastValues = new WeakMap();
  const activeRaf = new WeakMap();
  const activeAnime = new WeakMap();
  const animationTargets = new WeakMap();
  const renderedValues = new WeakMap();
  let observer = null;
  let unsubscribe = null;
  let lastStateToken = "";
  let cleanedUp = false;

  function parseScore(text) {
    if (!text) {
      return null;
    }
    const match = String(text).match(/-?\d+/);
    if (!match) {
      return null;
    }
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function stopAnimation(element) {
    const rafId = activeRaf.get(element);
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    activeRaf.delete(element);

    const animeInstance = activeAnime.get(element);
    if (animeInstance && typeof animeInstance.pause === "function") {
      try {
        animeInstance.pause();
      } catch (_) {
        // ignore
      }
    }
    activeAnime.delete(element);
    animationTargets.delete(element);
    renderedValues.delete(element);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateFallback(element, fromValue, toValue) {
    stopAnimation(element);
    const start = performance.now();
    animationTargets.set(element, toValue);
    renderedValues.set(element, fromValue);

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / CONFIG.animationMs, 1);
      const eased = easeOutCubic(progress);
      const current = Math.round(fromValue + (toValue - fromValue) * eased);
      element.textContent = String(current);
      renderedValues.set(element, current);

      if (progress < 1) {
        const id = requestAnimationFrame(step);
        activeRaf.set(element, id);
        return;
      }

      stopAnimation(element);
      lastValues.set(element, toValue);
      element.textContent = String(toValue);
    };

    const id = requestAnimationFrame(step);
    activeRaf.set(element, id);
  }

  function animateWithAnime(element, fromValue, toValue) {
    stopAnimation(element);
    const state = { value: fromValue };
    animationTargets.set(element, toValue);
    renderedValues.set(element, fromValue);

    const instance = animeLib({
      targets: state,
      value: toValue,
      round: 1,
      duration: CONFIG.animationMs,
      easing: "easeOutCubic",
      update: () => {
        const current = Number(state.value);
        element.textContent = String(current);
        renderedValues.set(element, current);
      },
      complete: () => {
        stopAnimation(element);
        lastValues.set(element, toValue);
        element.textContent = String(toValue);
      },
    });

    activeAnime.set(element, instance);
  }

  function animateValue(element, fromValue, toValue) {
    if (animeLib) {
      animateWithAnime(element, fromValue, toValue);
      return;
    }
    animateFallback(element, fromValue, toValue);
  }

  function updateScores() {
    const nodes = document.querySelectorAll(CONFIG.scoreSelector);

    nodes.forEach((node) => {
      const currentValue = parseScore(node.textContent);
      if (currentValue === null) {
        return;
      }

      if (!lastValues.has(node)) {
        lastValues.set(node, currentValue);
        return;
      }

      const target = animationTargets.get(node);
      const rendered = renderedValues.get(node);
      if ((activeAnime.has(node) || activeRaf.has(node)) && (currentValue === target || currentValue === rendered)) {
        return;
      }

      const previousValue = lastValues.get(node);
      if (previousValue !== currentValue) {
        const fromValue = Number.isFinite(rendered) ? rendered : previousValue;
        animateValue(node, Number(fromValue), currentValue);
      }
    });
  }

  function getStateToken() {
    if (!gameStateShared) {
      return "";
    }

    const turn = typeof gameStateShared.getActiveTurn === "function" ? gameStateShared.getActiveTurn() : null;
    const throws = typeof gameStateShared.getActiveThrows === "function" ? gameStateShared.getActiveThrows() : [];
    const score = typeof gameStateShared.getActiveScore === "function" ? gameStateShared.getActiveScore() : null;

    if (!turn) {
      return `nostate:${Number.isFinite(score) ? score : "na"}`;
    }

    const turnId = String(turn.id || `${turn.playerId || ""}:${turn.round || ""}:${turn.turn || ""}`);
    const throwCount = Array.isArray(throws) ? throws.length : 0;
    return `${turnId}|${throwCount}|${Number.isFinite(score) ? score : "na"}`;
  }

  const scheduleUpdate = createRafScheduler(updateScores);

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

    document.querySelectorAll(CONFIG.scoreSelector).forEach((node) => {
      stopAnimation(node);
      const finalValue = lastValues.get(node);
      if (Number.isFinite(finalValue)) {
        node.textContent = String(finalValue);
      }
    });

    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("beforeunload", cleanup);
    INSTANCE_KEYS.forEach((instanceKey) => {
      if (window[instanceKey] && window[instanceKey].cleanup === cleanup) {
        delete window[instanceKey];
      }
    });
  }

  updateScores();
  observer = observeMutations({ onChange: scheduleUpdate });
  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    unsubscribe = gameStateShared.subscribe(onStateChange);
  }

  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  window.__adExtTurnPointsCount = { cleanup };
  window.__adExtTurnPointsCountBeta = window.__adExtTurnPointsCount;

  debugLog("init", {
    anime: Boolean(animeLib),
    gameState: Boolean(gameStateShared),
    debug: DEBUG_ENABLED,
  });
})();

