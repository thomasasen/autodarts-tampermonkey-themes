// ==UserScript==
// @name         Autodarts Animate Turn Start Sweep [Beta]
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1-beta.1
// @description  Zeigt beim Wechsel des aktiven Spielers einen kurzen Lichtstreifen.
// @xconfig-description  Beta: Eventbasierter Sweep über GameState-Diff plus GSAP-Fallback-sichere Trigger.
// @xconfig-title  Spielerwechsel-Sweep [Beta]
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-turn-start-sweep
// @xconfig-tech-anchor  animation-autodarts-animate-turn-start-sweep
// @xconfig-background     assets/animation-turn-start-sweep-xConfig.gif

// @xconfig-settings-version 3
// @xconfig-beta         true
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/gsap.min.js
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep%20Beta.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep%20Beta.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtTurnStartSweepBeta";
  const previous = window[INSTANCE_KEY];
  if (previous && typeof previous.cleanup === "function") {
    try {
      previous.cleanup();
    } catch (_) {
      // ignore
    }
  }

  // xConfig: {"type":"select","label":"Sweep-Geschwindigkeit","description":"Legt fest, wie schnell der Lichtstreifen läuft.","options":[{"value":300,"label":"Schnell"},{"value":420,"label":"Standard"},{"value":620,"label":"Langsam"}]}
  const xConfig_SWEEP_GESCHWINDIGKEIT_MS = 420;
  // xConfig: {"type":"select","label":"Sweep-Stil","description":"Bestimmt, wie dezent oder kräftig der Sweep erscheint.","options":[{"value":"subtle","label":"Dezent"},{"value":"standard","label":"Standard"},{"value":"strong","label":"Stark"}]}
  const xConfig_SWEEP_STIL = "standard";
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
  const DEBUG_PREFIX = "[xConfig][Turn Start Sweep Beta]";
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

  function resolveNumberChoice(value, fallbackValue, allowedValues) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
      ? numericValue
      : fallbackValue;
  }

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalizedValue = String(value || "").trim();
    return allowedValues.includes(normalizedValue)
      ? normalizedValue
      : fallbackValue;
  }

  const SWEEP_STYLE_PRESETS = {
    subtle: {
      sweepWidth: "36%",
      sweepColor: "rgba(255, 255, 255, 0.24)",
    },
    standard: {
      sweepWidth: "45%",
      sweepColor: "rgba(255, 255, 255, 0.35)",
    },
    strong: {
      sweepWidth: "58%",
      sweepColor: "rgba(255, 255, 255, 0.48)",
    },
  };

  const RESOLVED_SWEEP_DURATION_MS = resolveNumberChoice(xConfig_SWEEP_GESCHWINDIGKEIT_MS, 420, [300, 420, 620]);
  const RESOLVED_SWEEP_STYLE = resolveStringChoice(xConfig_SWEEP_STIL, "standard", ["subtle", "standard", "strong"]);
  const SWEEP_STYLE = SWEEP_STYLE_PRESETS[RESOLVED_SWEEP_STYLE] || SWEEP_STYLE_PRESETS.standard;

  const shared = window.autodartsAnimationShared || {};
  const ensureStyle = typeof shared.ensureStyle === "function" ? shared.ensureStyle : () => false;
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
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      return observer;
    };

  const gameStateShared = window.autodartsGameStateShared || null;
  const gsapLib = window.gsap || null;

  const CONFIG = {
    activeSelector: ".ad-ext-player-active",
    sweepClass: "ad-ext-turn-sweep",
    sweepStreakClass: "ad-ext-turn-sweep-streak",
    sweepDurationMs: RESOLVED_SWEEP_DURATION_MS,
    sweepDelayMs: 0,
    sweepWidth: SWEEP_STYLE.sweepWidth,
    sweepColor: SWEEP_STYLE.sweepColor,
  };

  const STYLE_ID = "autodarts-turn-sweep-style";
  const STYLE_TEXT = `
.${CONFIG.sweepClass} {
  position: relative;
  overflow: hidden;
}

.${CONFIG.sweepClass}::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${CONFIG.sweepWidth};
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${CONFIG.sweepColor} 50%, rgba(255, 255, 255, 0) 100%);
  transform: translateX(-140%);
  animation: ad-ext-turn-sweep ${CONFIG.sweepDurationMs}ms ease-out ${CONFIG.sweepDelayMs}ms 1;
  pointer-events: none;
}

.${CONFIG.sweepStreakClass} {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${CONFIG.sweepWidth};
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${CONFIG.sweepColor} 50%, rgba(255, 255, 255, 0) 100%);
  transform: translateX(-160%);
}

@keyframes ad-ext-turn-sweep {
  0% { transform: translateX(-140%); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateX(240%); opacity: 0; }
}
`;

  const timeouts = new WeakMap();
  const activeTimeouts = new Set();
  const activeTweens = new WeakMap();
  let lastActive = null;
  let lastStateToken = "";
  let observer = null;
  let unsubscribe = null;
  let cleanedUp = false;

  function clearNodeTimeout(node) {
    const timeoutId = timeouts.get(node);
    if (!timeoutId) {
      return;
    }
    clearTimeout(timeoutId);
    activeTimeouts.delete(timeoutId);
    timeouts.delete(node);
  }

  function stopGsapForNode(node) {
    if (!node || !gsapLib) {
      return;
    }
    const active = activeTweens.get(node);
    if (active && active.tween) {
      try {
        active.tween.kill();
      } catch (_) {
        // ignore
      }
    }
    if (active && active.streak && active.streak.parentElement) {
      active.streak.remove();
    }
    activeTweens.delete(node);
  }

  function runSweepFallback(node) {
    node.classList.remove(CONFIG.sweepClass);
    void node.offsetWidth;
    node.classList.add(CONFIG.sweepClass);
    clearNodeTimeout(node);
    const timeoutId = setTimeout(() => {
      node.classList.remove(CONFIG.sweepClass);
      timeouts.delete(node);
      activeTimeouts.delete(timeoutId);
    }, CONFIG.sweepDurationMs + CONFIG.sweepDelayMs + 80);
    timeouts.set(node, timeoutId);
    activeTimeouts.add(timeoutId);
  }

  function runSweepGsap(node) {
    if (!gsapLib) {
      runSweepFallback(node);
      return;
    }

    stopGsapForNode(node);
    clearNodeTimeout(node);
    node.classList.add(CONFIG.sweepClass);

    const streak = document.createElement("span");
    streak.className = CONFIG.sweepStreakClass;
    node.appendChild(streak);

    const tween = gsapLib.fromTo(
      streak,
      { xPercent: -160, opacity: 0 },
      {
        xPercent: 260,
        opacity: 1,
        duration: Math.max(0.1, CONFIG.sweepDurationMs / 1000),
        ease: "power2.out",
        onComplete: () => {
          if (streak.parentElement) {
            streak.remove();
          }
        },
      }
    );

    activeTweens.set(node, { tween, streak });

    const timeoutId = setTimeout(() => {
      node.classList.remove(CONFIG.sweepClass);
      activeTimeouts.delete(timeoutId);
      timeouts.delete(node);
    }, CONFIG.sweepDurationMs + CONFIG.sweepDelayMs + 120);
    timeouts.set(node, timeoutId);
    activeTimeouts.add(timeoutId);
  }

  function runSweep(node) {
    if (!node) {
      return;
    }
    runSweepGsap(node);
  }

  function updateActive() {
    const current = document.querySelector(CONFIG.activeSelector);
    if (current === lastActive) {
      return;
    }

    if (lastActive) {
      clearNodeTimeout(lastActive);
      stopGsapForNode(lastActive);
      lastActive.classList.remove(CONFIG.sweepClass);
    }

    lastActive = current;
    if (current) {
      runSweep(current);
    }
  }

  function getTurnTokenFromState() {
    if (!gameStateShared) {
      return "";
    }

    const turn = typeof gameStateShared.getActiveTurn === "function" ? gameStateShared.getActiveTurn() : null;
    const throws = typeof gameStateShared.getActiveThrows === "function" ? gameStateShared.getActiveThrows() : [];
    const activePlayer = typeof gameStateShared.getActivePlayerIndex === "function"
      ? gameStateShared.getActivePlayerIndex()
      : null;

    if (!turn) {
      return `no-turn:${Number.isFinite(activePlayer) ? activePlayer : "na"}`;
    }

    const turnId = String(turn.id || `${turn.playerId || ""}:${turn.round || ""}:${turn.turn || ""}`);
    const throwCount = Array.isArray(throws) ? throws.length : 0;
    return `${activePlayer}|${turnId}|${throwCount}`;
  }

  const scheduleUpdate = createRafScheduler(updateActive);

  function onGameStateChange() {
    const token = getTurnTokenFromState();
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

    activeTimeouts.forEach((id) => clearTimeout(id));
    activeTimeouts.clear();

    if (lastActive) {
      stopGsapForNode(lastActive);
      lastActive.classList.remove(CONFIG.sweepClass);
    }

    document.querySelectorAll(`.${CONFIG.sweepStreakClass}`).forEach((el) => el.remove());
    document.querySelectorAll(`.${CONFIG.sweepClass}`).forEach((el) => el.classList.remove(CONFIG.sweepClass));

    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("beforeunload", cleanup);
    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].cleanup === cleanup) {
      delete window[INSTANCE_KEY];
    }
  }

  ensureStyle(STYLE_ID, STYLE_TEXT);
  updateActive();
  observer = observeMutations({
    onChange: scheduleUpdate,
    options: {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: false,
    },
    attributeFilter: ["class"],
  });

  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    unsubscribe = gameStateShared.subscribe(onGameStateChange);
  }

  window.addEventListener("pagehide", cleanup, { once: true });
  window.addEventListener("beforeunload", cleanup, { once: true });

  window[INSTANCE_KEY] = { cleanup };

  debugLog("init", {
    gsap: Boolean(gsapLib),
    gameState: Boolean(gameStateShared),
    debug: DEBUG_ENABLED,
  });
})();

