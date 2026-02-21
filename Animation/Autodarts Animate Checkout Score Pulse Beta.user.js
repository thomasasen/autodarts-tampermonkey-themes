// ==UserScript==
// @name         Autodarts Animate Checkout Score Pulse [Beta]
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.3-beta.1
// @description  Hebt den Score des aktiven Spielers hervor, sobald ein Checkout möglich ist.
// @xconfig-description  Beta: GSAP-gesteuerte Checkout-Animationen mit kontrolliertem Start/Stop je Score-Node.
// @xconfig-title  Checkout-Score-Puls [Beta]
// @xconfig-variant      x01
// @xconfig-readme-anchor  animation-autodarts-animate-checkout-score-pulse
// @xconfig-tech-anchor  animation-autodarts-animate-checkout-score-pulse
// @xconfig-background     assets/animation-checkout-score-pulse.gif

// @xconfig-settings-version 4
// @xconfig-beta         true
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/gsap.min.js
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Checkout%20Score%20Pulse%20Beta.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Checkout%20Score%20Pulse%20Beta.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtCheckoutScorePulseBeta";
  const previous = window[INSTANCE_KEY];
  if (previous && typeof previous.cleanup === "function") {
    try {
      previous.cleanup();
    } catch (_) {
      // ignore stale instance cleanup
    }
  }

  // xConfig: {"type":"select","label":"Effekt","description":"Wählt den Effekt für checkout-fähige Scores.","options":[{"value":"pulse","label":"Pulse"},{"value":"glow","label":"Glow"},{"value":"scale","label":"Scale"},{"value":"blink","label":"Blink"}]}
  const xConfig_EFFEKT = "scale";
  // xConfig: {"type":"select","label":"Farbthema","description":"Bestimmt die Highlight-Farbe des Scores.","options":[{"value":"159, 219, 88","label":"Grün (Standard)"},{"value":"56, 189, 248","label":"Cyan"},{"value":"245, 158, 11","label":"Amber"},{"value":"248, 113, 113","label":"Rot"}]}
  const xConfig_FARBTHEMA = "159, 219, 88";
  // xConfig: {"type":"select","label":"Intensität","description":"Legt fest, wie stark der Effekt sichtbar ist.","options":[{"value":"dezent","label":"Dezent"},{"value":"standard","label":"Standard"},{"value":"stark","label":"Stark"}]}
  const xConfig_INTENSITAET = "standard";
  // xConfig: {"type":"select","label":"Trigger-Quelle","description":"Bestimmt, ob der Effekt durch Vorschlag, Score oder beides ausgelöst wird.","options":[{"value":"suggestion-first","label":"Vorschlag zuerst"},{"value":"score-only","label":"Nur Score"},{"value":"suggestion-only","label":"Nur Vorschlag"}]}
  const xConfig_TRIGGER_QUELLE = "suggestion-first";
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

  const shared = window.autodartsAnimationShared || {};
  const gameStateShared = window.autodartsGameStateShared || null;
  const gsapLib = window.gsap || null;

  const ensureStyle = typeof shared.ensureStyle === "function" ? shared.ensureStyle : null;
  const createRafScheduler =
    typeof shared.createRafScheduler === "function"
      ? shared.createRafScheduler
      : function fallbackScheduler(callback) {
          let scheduled = false;
          return function schedule() {
            if (scheduled) {
              return;
            }
            scheduled = true;
            requestAnimationFrame(() => {
              scheduled = false;
              callback();
            });
          };
        };
  const observeMutations =
    typeof shared.observeMutations === "function"
      ? shared.observeMutations
      : function fallbackObserver(opts) {
          if (!opts || typeof opts.onChange !== "function") {
            return null;
          }
          const observer = new MutationObserver(() => opts.onChange());
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
          });
          return observer;
        };
  const isX01Variant =
    typeof shared.isX01Variant === "function"
      ? shared.isX01Variant
      : function fallbackVariantCheck() {
          const text = String(document.getElementById("ad-ext-game-variant")?.textContent || "")
            .trim()
            .toLowerCase();
          return text.includes("x01") || /\b\d+01\b/.test(text);
        };

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalizedValue = String(value || "").trim();
    return allowedValues.includes(normalizedValue) ? normalizedValue : fallbackValue;
  }

  function resolveDebugToggle(value) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
  }

  const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
  const DEBUG_PREFIX = "[xConfig][Checkout Score Pulse Beta]";

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

  const EFFECT = resolveStringChoice(xConfig_EFFEKT, "scale", ["pulse", "glow", "scale", "blink"]);
  const PULSE_COLOR = resolveStringChoice(xConfig_FARBTHEMA, "159, 219, 88", [
    "159, 219, 88",
    "56, 189, 248",
    "245, 158, 11",
    "248, 113, 113",
  ]);
  const RESOLVED_TRIGGER_SOURCE = resolveStringChoice(xConfig_TRIGGER_QUELLE, "suggestion-first", [
    "suggestion-first",
    "score-only",
    "suggestion-only",
  ]);

  const INTENSITY_PRESETS = {
    dezent: {
      pulseScale: 1.06,
      pulseMidOpacity: 0.96,
      pulseShadowMaxAlpha: 0.55,
      glowMinAlpha: 0.26,
      glowMaxAlpha: 0.72,
      glowMaxBlurPx: 11,
      scaleMax: 1.04,
      blinkMinOpacity: 0.55,
    },
    standard: {
      pulseScale: 1.1,
      pulseMidOpacity: 0.92,
      pulseShadowMaxAlpha: 0.8,
      glowMinAlpha: 0.35,
      glowMaxAlpha: 0.9,
      glowMaxBlurPx: 16,
      scaleMax: 1.08,
      blinkMinOpacity: 0.3,
    },
    stark: {
      pulseScale: 1.14,
      pulseMidOpacity: 0.88,
      pulseShadowMaxAlpha: 1,
      glowMinAlpha: 0.45,
      glowMaxAlpha: 1,
      glowMaxBlurPx: 22,
      scaleMax: 1.12,
      blinkMinOpacity: 0.18,
    },
  };

  const RESOLVED_INTENSITY_KEY = resolveStringChoice(xConfig_INTENSITAET, "standard", ["dezent", "standard", "stark"]);
  const INTENSITY = INTENSITY_PRESETS[RESOLVED_INTENSITY_KEY] || INTENSITY_PRESETS.standard;

  const STYLE_ID = "autodarts-animate-checkout-style-beta";
  const HIGHLIGHT_CLASS = "ad-ext-checkout-possible";
  const SCORE_SELECTOR = "p.ad-ext-player-score";
  const ACTIVE_SCORE_SELECTOR =
    ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, .ad-ext-player-active p.ad-ext-player-score";
  const SUGGESTION_SELECTOR = ".suggestion";
  const VARIANT_ELEMENT_ID = "ad-ext-game-variant";
  const IMPOSSIBLE_CHECKOUTS = new Set([169, 168, 166, 165, 163, 162, 159]);

  const EFFECT_CLASSES = {
    pulse: "ad-ext-checkout-possible--pulse",
    glow: "ad-ext-checkout-possible--glow",
    scale: "ad-ext-checkout-possible--scale",
    blink: "ad-ext-checkout-possible--blink",
  };

  const STYLE_TEXT = `
@keyframes ad-ext-checkout-pulse {
  0% { transform: scale(1); opacity: 1; text-shadow: 0 0 2px rgba(${PULSE_COLOR}, 0.2); }
  50% { transform: scale(${INTENSITY.pulseScale}); opacity: ${INTENSITY.pulseMidOpacity}; text-shadow: 0 0 ${INTENSITY.glowMaxBlurPx}px rgba(${PULSE_COLOR}, ${INTENSITY.pulseShadowMaxAlpha}); }
  100% { transform: scale(1); opacity: 1; text-shadow: 0 0 2px rgba(${PULSE_COLOR}, 0.2); }
}

.${HIGHLIGHT_CLASS} {
  display: inline-block;
  transform-origin: center;
  will-change: transform, opacity, text-shadow;
}

.${EFFECT_CLASSES.pulse} { animation: ad-ext-checkout-pulse 1.4s ease-in-out infinite; }
.${EFFECT_CLASSES.glow} { animation: ad-ext-checkout-glow 1.8s ease-in-out infinite; }
.${EFFECT_CLASSES.scale} { animation: ad-ext-checkout-scale 1.2s ease-in-out infinite; }
.${EFFECT_CLASSES.blink} { animation: ad-ext-checkout-blink 0.9s ease-in-out infinite; }

@keyframes ad-ext-checkout-glow {
  0% { text-shadow: 0 0 4px rgba(${PULSE_COLOR}, ${INTENSITY.glowMinAlpha}); }
  50% { text-shadow: 0 0 ${INTENSITY.glowMaxBlurPx}px rgba(${PULSE_COLOR}, ${INTENSITY.glowMaxAlpha}); }
  100% { text-shadow: 0 0 4px rgba(${PULSE_COLOR}, ${INTENSITY.glowMinAlpha}); }
}

@keyframes ad-ext-checkout-scale {
  0% { transform: scale(1); }
  50% { transform: scale(${INTENSITY.scaleMax}); }
  100% { transform: scale(1); }
}

@keyframes ad-ext-checkout-blink {
  0% { opacity: 1; }
  50% { opacity: ${INTENSITY.blinkMinOpacity}; }
  100% { opacity: 1; }
}
`;

  const nodeTweenMap = new WeakMap();
  const highlightedNodes = new Set();
  let observer = null;
  let unsubscribeState = null;
  let cleanedUp = false;

  function parseScore(text) {
    if (!text) {
      return null;
    }
    const match = text.match(/\d+/);
    if (!match) {
      return null;
    }
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function getActiveScoreValue() {
    if (gameStateShared && typeof gameStateShared.getActiveScore === "function") {
      const stateScore = gameStateShared.getActiveScore();
      if (Number.isFinite(stateScore)) {
        return stateScore;
      }
    }
    const node = document.querySelector(ACTIVE_SCORE_SELECTOR) || document.querySelector(SCORE_SELECTOR);
    return parseScore(node?.textContent || "");
  }

  function isCheckoutPossibleFromScore(score) {
    if (!Number.isFinite(score)) {
      return false;
    }
    if (score <= 1 || score > 170) {
      return false;
    }
    return !IMPOSSIBLE_CHECKOUTS.has(score);
  }

  function getCheckoutSuggestionState() {
    const suggestion = document.querySelector(SUGGESTION_SELECTOR);
    if (!suggestion) {
      return null;
    }

    const normalized = String(suggestion.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    if (!normalized) {
      return null;
    }
    if (/NO\s*(OUT|CHECKOUT|SHOT)/.test(normalized)) {
      return false;
    }
    if (/BUST/.test(normalized)) {
      return false;
    }
    if (/D\s*[-:]?\s*\d+/.test(normalized) || /DOUBLE\s*\d+/.test(normalized)) {
      return true;
    }
    if (/DB|BULLSEYE|BULL/.test(normalized)) {
      return true;
    }
    return null;
  }

  function getScoreNodes() {
    const activeScores = document.querySelectorAll(ACTIVE_SCORE_SELECTOR);
    if (activeScores.length) {
      return Array.from(activeScores);
    }
    return Array.from(document.querySelectorAll(SCORE_SELECTOR));
  }

  function killNodeTween(node, clearInline = true) {
    if (!node) {
      return;
    }

    const tween = nodeTweenMap.get(node);
    if (tween && typeof tween.kill === "function") {
      tween.kill();
    }
    nodeTweenMap.delete(node);

    if (gsapLib && typeof gsapLib.killTweensOf === "function") {
      gsapLib.killTweensOf(node);
    }

    if (clearInline) {
      node.style.transform = "";
      node.style.opacity = "";
      node.style.textShadow = "";
    }
  }

  function startNodeTween(node) {
    if (!node || !gsapLib || typeof gsapLib.to !== "function") {
      return;
    }

    killNodeTween(node, false);

    let tween = null;
    if (EFFECT === "pulse") {
      tween = gsapLib.to(node, {
        scale: INTENSITY.pulseScale,
        opacity: INTENSITY.pulseMidOpacity,
        textShadow: `0 0 ${INTENSITY.glowMaxBlurPx}px rgba(${PULSE_COLOR}, ${INTENSITY.pulseShadowMaxAlpha})`,
        duration: 0.7,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "50% 50%",
        overwrite: "auto",
      });
    } else if (EFFECT === "glow") {
      tween = gsapLib.to(node, {
        textShadow: `0 0 ${INTENSITY.glowMaxBlurPx}px rgba(${PULSE_COLOR}, ${INTENSITY.glowMaxAlpha})`,
        duration: 0.9,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        overwrite: "auto",
      });
    } else if (EFFECT === "blink") {
      tween = gsapLib.to(node, {
        opacity: INTENSITY.blinkMinOpacity,
        duration: 0.45,
        ease: "none",
        yoyo: true,
        repeat: -1,
        overwrite: "auto",
      });
    } else {
      tween = gsapLib.to(node, {
        scale: INTENSITY.scaleMax,
        duration: 0.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "50% 50%",
        overwrite: "auto",
      });
    }

    if (tween) {
      nodeTweenMap.set(node, tween);
    }
  }

  function setNodeHighlight(node, shouldHighlight) {
    if (!node) {
      return;
    }

    const effectClass = EFFECT_CLASSES[EFFECT] || EFFECT_CLASSES.pulse;
    const effectClassList = Object.values(EFFECT_CLASSES);

    if (shouldHighlight) {
      highlightedNodes.add(node);
      node.classList.add(HIGHLIGHT_CLASS);

      if (gsapLib) {
        effectClassList.forEach((cls) => node.classList.remove(cls));
        startNodeTween(node);
      } else {
        effectClassList.forEach((cls) => node.classList.toggle(cls, cls === effectClass));
      }
      return;
    }

    highlightedNodes.delete(node);
    node.classList.remove(HIGHLIGHT_CLASS);
    effectClassList.forEach((cls) => node.classList.remove(cls));
    killNodeTween(node, true);
  }

  function clearDetachedHighlights(activeNodeSet) {
    Array.from(highlightedNodes).forEach((node) => {
      if (!node.isConnected || !activeNodeSet.has(node)) {
        setNodeHighlight(node, false);
      }
    });
  }

  function isX01Active() {
    if (gameStateShared && typeof gameStateShared.isX01Variant === "function") {
      return gameStateShared.isX01Variant({
        allowMissing: true,
        allowEmpty: true,
        allowNumeric: true,
      });
    }

    return isX01Variant(VARIANT_ELEMENT_ID, {
      allowMissing: true,
      allowEmpty: true,
      allowNumeric: true,
    });
  }

  function updateScoreHighlights() {
    const suggestionState = getCheckoutSuggestionState();
    let shouldHighlight = false;

    if (isX01Active()) {
      if (RESOLVED_TRIGGER_SOURCE === "score-only") {
        shouldHighlight = isCheckoutPossibleFromScore(getActiveScoreValue());
      } else if (RESOLVED_TRIGGER_SOURCE === "suggestion-only") {
        shouldHighlight = suggestionState === true;
      } else {
        shouldHighlight =
          suggestionState !== null
            ? suggestionState
            : isCheckoutPossibleFromScore(getActiveScoreValue());
      }
    }

    const scoreNodes = getScoreNodes();
    const activeNodeSet = new Set(scoreNodes);
    scoreNodes.forEach((node) => setNodeHighlight(node, shouldHighlight));
    clearDetachedHighlights(activeNodeSet);
  }

  function cleanup() {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
      observer = null;
    }

    if (typeof unsubscribeState === "function") {
      unsubscribeState();
      unsubscribeState = null;
    }

    window.removeEventListener("resize", scheduleUpdate);
    document.removeEventListener("visibilitychange", scheduleUpdate);
    window.removeEventListener("beforeunload", cleanup);
    window.removeEventListener("pagehide", cleanup);

    Array.from(highlightedNodes).forEach((node) => setNodeHighlight(node, false));
    highlightedNodes.clear();

    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].cleanup === cleanup) {
      delete window[INSTANCE_KEY];
    }
  }

  if (typeof ensureStyle === "function") {
    ensureStyle(STYLE_ID, STYLE_TEXT);
  }

  const scheduleUpdate = createRafScheduler(updateScoreHighlights);

  observer = observeMutations({
    target: document.documentElement,
    onChange: scheduleUpdate,
  });

  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    unsubscribeState = gameStateShared.subscribe(scheduleUpdate);
  }

  window.addEventListener("resize", scheduleUpdate, { passive: true });
  document.addEventListener("visibilitychange", scheduleUpdate, { passive: true });
  window.addEventListener("beforeunload", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });

  window[INSTANCE_KEY] = {
    cleanup,
  };

  updateScoreHighlights();
  debugLog("init", {
    debug: DEBUG_ENABLED,
    usesGsap: Boolean(gsapLib),
    effect: EFFECT,
    trigger: RESOLVED_TRIGGER_SOURCE,
  });
})();



