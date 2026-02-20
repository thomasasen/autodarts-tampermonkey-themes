// ==UserScript==
// @name         Autodarts Animate Winner Fireworks
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      3.0
// @description  Zeigt nach dem Sieg einen Gewinner-Effekt mit canvas-confetti-Presets (z. B. Realistic, Fireworks, Stars, Snow).
// @xconfig-description  Blendet beim Gewinner einen konfigurierbaren canvas-confetti-Effekt ein; Klick blendet den Effekt aus.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-winner-fireworks
// @xconfig-background     assets/animation-winner-fireworks-xConfig.gif
// @xconfig-settings-version 3
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/vendor/canvas-confetti.browser.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// ==/UserScript==

(function () {
  "use strict";

  // xConfig: {"type":"select","label":"Preset","description":"Wählt den Canvas-Confetti-Preset (orientiert an der canvas-confetti Demo).","options":[{"value":"realistic","label":"Realistic Burst (Standard)"},{"value":"fireworks","label":"Fireworks"},{"value":"stars","label":"Stars"},{"value":"cannon","label":"Cannon"},{"value":"random","label":"Random Direction"},{"value":"snow","label":"Snow"},{"value":"continuous","label":"Side Cannons"}]}
  const xConfig_PRESET = "realistic";
  // xConfig: {"type":"select","label":"Performance","description":"Regelt Partikelmenge und Taktung für schwächere/stärkere Geräte.","options":[{"value":"eco","label":"Schonend"},{"value":"balanced","label":"Ausgewogen"},{"value":"high","label":"Intensiv"}]}
  const xConfig_PERFORMANCE = "balanced";
  // xConfig: {"type":"select","label":"Effektdauer","description":"Bestimmt, wie lange zeitbasierte Presets laufen.","options":[{"value":5000,"label":"Kurz"},{"value":9000,"label":"Standard"},{"value":14000,"label":"Lang"}]}
  const xConfig_DAUER_MS = 9000;
  // xConfig: {"type":"toggle","label":"Klick beendet Effekt","description":"Blendet den Gewinner-Effekt per Klick/Tap aus.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_KLICK_ZUM_STOPPEN = true;

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalizedValue = String(value || "").trim();
    return allowedValues.includes(normalizedValue) ? normalizedValue : fallbackValue;
  }

  function resolveNumberChoice(value, fallbackValue, allowedValues) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
      ? numericValue
      : fallbackValue;
  }

  function resolveToggle(value, fallbackValue) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    return fallbackValue;
  }

  const LEGACY_PRESET_BY_EFFECT = Object.freeze({
    firework: "fireworks",
    confetti: "realistic",
    aurora: "stars",
    pulse: "continuous",
  });

  const LEGACY_EFFECT =
    typeof xConfig_EFFEKT === "undefined"
      ? ""
      : String(xConfig_EFFEKT || "").trim().toLowerCase();
  const PRESET_FALLBACK = LEGACY_PRESET_BY_EFFECT[LEGACY_EFFECT] || "realistic";

  const RESOLVED_PRESET = resolveStringChoice(xConfig_PRESET, PRESET_FALLBACK, [
    "cannon",
    "random",
    "realistic",
    "fireworks",
    "stars",
    "snow",
    "continuous",
  ]);
  const RESOLVED_PERFORMANCE = resolveStringChoice(xConfig_PERFORMANCE, "balanced", [
    "eco",
    "balanced",
    "high",
  ]);
  const RESOLVED_DURATION_MS = resolveNumberChoice(xConfig_DAUER_MS, 9000, [
    5000,
    9000,
    14000,
  ]);
  const RESOLVED_POINTER_DISMISS = resolveToggle(xConfig_KLICK_ZUM_STOPPEN, true);

  const PERFORMANCE_PRESETS = Object.freeze({
    eco: {
      particleScale: 0.7,
      intervalScale: 1.25,
    },
    balanced: {
      particleScale: 1,
      intervalScale: 1,
    },
    high: {
      particleScale: 1.35,
      intervalScale: 0.8,
    },
  });

  const PERFORMANCE = PERFORMANCE_PRESETS[RESOLVED_PERFORMANCE] || PERFORMANCE_PRESETS.balanced;

  const CONFIG = Object.freeze({
    winnerSelector: ".ad-ext_winner-animation, .ad-ext-player-winner",
    overlayId: "ad-ext-winner-fireworks",
    styleId: "ad-ext-winner-fireworks-style",
    preset: RESOLVED_PRESET,
    durationMs: RESOLVED_DURATION_MS,
    pointerDismiss: RESOLVED_POINTER_DISMISS,
    colors: [
      "#FCE38A",
      "#F38181",
      "#EAFFD0",
      "#95E1D3",
      "#F08A5D",
      "#60A5FA",
      "#34D399",
      "#FB7185",
      "#FBBF24",
    ],
  });

  const STYLE_TEXT = `
#${CONFIG.overlayId} {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 999999;
}

#${CONFIG.overlayId} canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
`;

  const shared = window.autodartsAnimationShared || {};
  const ensureStyle = typeof shared.ensureStyle === "function"
    ? shared.ensureStyle
    : fallbackEnsureStyle;

  let overlay = null;
  let canvas = null;
  let confettiRunner = null;
  let running = false;
  let lastWinnerVisible = false;
  let dismissedForCurrentWin = false;
  let dismissHandler = null;
  let timeoutHandles = new Set();
  let intervalHandles = new Set();
  let frameHandle = 0;

  function fallbackEnsureStyle(styleId, cssText) {
    if (!styleId) {
      return false;
    }
    const root = document.head || document.documentElement;
    if (!root) {
      return false;
    }
    const existing = document.getElementById(styleId);
    if (existing) {
      if (existing.textContent !== cssText) {
        existing.textContent = cssText;
      }
      return true;
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = cssText;
    root.appendChild(style);
    return true;
  }

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clearTimeouts() {
    for (const handle of timeoutHandles) {
      clearTimeout(handle);
    }
    timeoutHandles.clear();
  }

  function clearIntervals() {
    for (const handle of intervalHandles) {
      clearInterval(handle);
    }
    intervalHandles.clear();
  }

  function clearFrameLoop() {
    if (!frameHandle) {
      return;
    }
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }

  function clearSchedulers() {
    clearTimeouts();
    clearIntervals();
    clearFrameLoop();
  }

  function scheduleTimeout(callback, delayMs) {
    const handle = setTimeout(() => {
      timeoutHandles.delete(handle);
      if (running) {
        callback();
      }
    }, Math.max(0, Number(delayMs) || 0));
    timeoutHandles.add(handle);
    return handle;
  }

  function scheduleInterval(callback, intervalMs) {
    const handle = setInterval(() => {
      if (running) {
        callback();
      }
    }, Math.max(16, Number(intervalMs) || 16));
    intervalHandles.add(handle);
    return handle;
  }

  function scheduleFrameLoop(callback) {
    clearFrameLoop();
    const loop = (timestamp) => {
      if (!running) {
        frameHandle = 0;
        return;
      }
      callback(timestamp);
      if (running) {
        frameHandle = requestAnimationFrame(loop);
      } else {
        frameHandle = 0;
      }
    };
    frameHandle = requestAnimationFrame(loop);
  }

  function runTimedInterval(durationMs, intervalMs, callback, runImmediately = true) {
    const endAt = Date.now() + Math.max(250, durationMs);
    if (runImmediately) {
      callback(endAt - Date.now());
    }
    let handle = 0;
    handle = scheduleInterval(() => {
      const timeLeft = endAt - Date.now();
      if (timeLeft <= 0) {
        clearInterval(handle);
        intervalHandles.delete(handle);
        return;
      }
      callback(timeLeft);
    }, intervalMs);
  }

  function ensureOverlay() {
    if (overlay && canvas && confettiRunner) {
      return true;
    }

    if (typeof window.confetti !== "function") {
      return false;
    }

    const container = document.body || document.documentElement;
    if (!container) {
      return false;
    }

    overlay = document.createElement("div");
    overlay.id = CONFIG.overlayId;
    canvas = document.createElement("canvas");
    overlay.appendChild(canvas);
    container.appendChild(overlay);

    confettiRunner = window.confetti.create(canvas, {
      resize: true,
      useWorker: false,
    });

    return true;
  }

  function destroyOverlay() {
    if (confettiRunner && typeof confettiRunner.reset === "function") {
      confettiRunner.reset();
    }
    confettiRunner = null;
    canvas = null;
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
  }

  function scaledParticleCount(particleCount) {
    return Math.max(1, Math.round(Number(particleCount || 0) * PERFORMANCE.particleScale));
  }

  function emitConfetti(options) {
    if (!confettiRunner) {
      return;
    }

    const payload = {
      ...options,
      disableForReducedMotion: true,
      zIndex: 999999,
    };

    if (typeof payload.particleCount === "number") {
      payload.particleCount = scaledParticleCount(payload.particleCount);
    }
    if (!Array.isArray(payload.colors)) {
      payload.colors = CONFIG.colors;
    }

    confettiRunner(payload);
  }

  function cannonBurst() {
    const origin = { y: 0.64 };
    emitConfetti({
      particleCount: 100,
      spread: 70,
      startVelocity: 45,
      origin,
    });
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 60,
        spread: 95,
        startVelocity: 34,
        decay: 0.92,
        scalar: 0.95,
        origin,
      });
    }, 140);
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 38,
        spread: 120,
        startVelocity: 26,
        decay: 0.94,
        scalar: 1.1,
        origin,
      });
    }, 280);
  }

  function startCannonPreset() {
    runTimedInterval(
      CONFIG.durationMs,
      Math.round(1500 * PERFORMANCE.intervalScale),
      () => cannonBurst(),
      true
    );
  }

  function startRandomPreset() {
    runTimedInterval(
      CONFIG.durationMs,
      Math.round(1200 * PERFORMANCE.intervalScale),
      () => {
        emitConfetti({
          angle: randomInRange(55, 125),
          spread: randomInRange(50, 75),
          particleCount: randomInRange(55, 105),
          origin: { y: 0.62 },
        });
      },
      true
    );
  }

  function realisticBurst(baseCount) {
    const defaults = {
      origin: { y: 0.7 },
    };
    const fire = (particleRatio, options) => {
      emitConfetti({
        ...defaults,
        ...options,
        particleCount: Math.floor(baseCount * particleRatio),
      });
    };

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }

  function startRealisticPreset() {
    runTimedInterval(
      CONFIG.durationMs,
      Math.round(1600 * PERFORMANCE.intervalScale),
      () => realisticBurst(200),
      true
    );
  }

  function startFireworksPreset() {
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
    };
    const intervalMs = Math.round(250 * PERFORMANCE.intervalScale);

    runTimedInterval(
      CONFIG.durationMs,
      intervalMs,
      (timeLeft) => {
        const ratio = Math.max(0.2, timeLeft / CONFIG.durationMs);
        const particleCount = Math.max(12, Math.floor(50 * ratio));
        emitConfetti({
          ...defaults,
          particleCount,
          origin: {
            x: randomInRange(0.1, 0.3),
            y: Math.random() - 0.2,
          },
        });
        emitConfetti({
          ...defaults,
          particleCount,
          origin: {
            x: randomInRange(0.7, 0.9),
            y: Math.random() - 0.2,
          },
        });
      },
      true
    );
  }

  function starsBurst() {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
    };

    emitConfetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"],
    });
    emitConfetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"],
    });
  }

  function startStarsPreset() {
    runTimedInterval(
      CONFIG.durationMs,
      Math.round(1150 * PERFORMANCE.intervalScale),
      () => {
        starsBurst();
        scheduleTimeout(starsBurst, 110);
        scheduleTimeout(starsBurst, 220);
      },
      true
    );
  }

  function startSnowPreset() {
    const endAt = performance.now() + CONFIG.durationMs;
    const frameIntervalMs = Math.round(38 * PERFORMANCE.intervalScale);
    let skew = 1;
    let lastShotTs = 0;

    scheduleFrameLoop((timestamp) => {
      const timeLeft = endAt - performance.now();
      if (timeLeft <= 0) {
        clearFrameLoop();
        return;
      }
      if (timestamp - lastShotTs < frameIntervalMs) {
        return;
      }
      lastShotTs = timestamp;

      const ticks = Math.max(180, 500 * (timeLeft / CONFIG.durationMs));
      skew = Math.max(0.8, skew - 0.001);

      emitConfetti({
        particleCount: 1,
        startVelocity: 0,
        ticks,
        origin: {
          x: Math.random(),
          y: Math.random() * skew - 0.2,
        },
        colors: ["#ffffff", "#dbeafe"],
        shapes: ["circle"],
        gravity: randomInRange(0.4, 0.6),
        scalar: randomInRange(0.4, 1),
        drift: randomInRange(-0.4, 0.4),
      });
    });
  }

  function startContinuousPreset() {
    const endAt = performance.now() + CONFIG.durationMs;
    const frameIntervalMs = Math.round(90 * PERFORMANCE.intervalScale);
    const colors = ["#bb0000", "#ffffff"];
    let lastShotTs = 0;

    scheduleFrameLoop((timestamp) => {
      if (timestamp >= endAt) {
        clearFrameLoop();
        return;
      }
      if (timestamp - lastShotTs < frameIntervalMs) {
        return;
      }
      lastShotTs = timestamp;

      emitConfetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.72 },
        colors,
      });
      emitConfetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.72 },
        colors,
      });
    });
  }

  const PRESET_RUNNERS = Object.freeze({
    cannon: startCannonPreset,
    random: startRandomPreset,
    realistic: startRealisticPreset,
    fireworks: startFireworksPreset,
    stars: startStarsPreset,
    snow: startSnowPreset,
    continuous: startContinuousPreset,
  });

  function startPreset() {
    const runner = PRESET_RUNNERS[CONFIG.preset] || PRESET_RUNNERS.realistic;
    runner();
  }

  function showEffect() {
    if (running || dismissedForCurrentWin) {
      return;
    }

    ensureStyle(CONFIG.styleId, STYLE_TEXT);
    if (!ensureOverlay()) {
      return;
    }

    running = true;
    clearSchedulers();

    if (CONFIG.pointerDismiss) {
      if (!dismissHandler) {
        dismissHandler = () => {
          dismissedForCurrentWin = true;
          hideEffect();
        };
      }
      document.addEventListener("pointerdown", dismissHandler, {
        capture: true,
        once: true,
      });
    }

    startPreset();
  }

  function hideEffect() {
    if (dismissHandler) {
      document.removeEventListener("pointerdown", dismissHandler, true);
    }
    clearSchedulers();
    running = false;
    destroyOverlay();
  }

  function isWinnerVisible() {
    const node = document.querySelector(CONFIG.winnerSelector);
    if (!node) {
      return false;
    }
    return node.getClientRects().length > 0;
  }

  function checkWinner() {
    const visible = isWinnerVisible();
    if (visible && !lastWinnerVisible) {
      dismissedForCurrentWin = false;
      showEffect();
    } else if (!visible && lastWinnerVisible) {
      dismissedForCurrentWin = false;
      hideEffect();
    }
    lastWinnerVisible = visible;
  }

  let scheduled = false;
  function scheduleCheck() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      checkWinner();
    });
  }

  checkWinner();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" || mutation.type === "attributes") {
        scheduleCheck();
        break;
      }
    }
  });

  const observeTarget = document.documentElement;
  if (observeTarget) {
    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        const fallbackTarget = document.documentElement;
        if (fallbackTarget) {
          observer.observe(fallbackTarget, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style"],
          });
        }
      },
      { once: true }
    );
  }
})();
