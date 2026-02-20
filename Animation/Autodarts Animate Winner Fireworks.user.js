// ==UserScript==
// @name         Autodarts Animate Winner Fireworks
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      3.3
// @description  Zeigt nach dem Sieg einen Gewinner-Effekt mit canvas-confetti-Presets (z. B. Realistic, Fireworks, Stars, Snow).
// @xconfig-description  Blendet beim Gewinner einen konfigurierbaren canvas-confetti-Effekt ein; Klick blendet den Effekt aus.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-winner-fireworks
// @xconfig-background     assets/animation-winner-fireworks-xConfig.gif
// @xconfig-settings-version 6
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

  // xConfig: {"type":"select","label":"Preset","description":"Waehlt ein Gewinner-Preset mit staerkerem Output und passender Farbpalette.","options":[{"value":"schoolpride","label":"School Pride Stream (rot/weiss, links/rechts)"},{"value":"fireworks","label":"Autodarts Skyburst (Blau/Violett/Weiss)"},{"value":"continuous","label":"Side Cannons XL (Autodarts)"},{"value":"realistic","label":"Grand Finale (mehrstufige Bursts)"},{"value":"cannon","label":"Arena Cannon (breite Salven)"},{"value":"stars","label":"Logo Starlight (Sterne in Cyan/Blau)"},{"value":"victorystorm","label":"Victory Storm (Mitte + Seiten)"},{"value":"party","label":"Festival Mix (bunt und dicht)"},{"value":"snow","label":"Ice Rain (kuehles Blau-Weiss)"},{"value":"random","label":"Random (bei jedem Sieg neues Preset)"}]}
  const xConfig_PRESET = "schoolpride";
  // xConfig: {"type":"select","label":"Performance","description":"Regelt Partikelmenge und Taktung fuer schwaechere oder starke Geraete.","options":[{"value":"eco","label":"Schonend (weniger Last)"},{"value":"balanced","label":"Ausgewogen (empfohlen)"},{"value":"high","label":"Intensiv (sehr dicht)"}]}
  const xConfig_PERFORMANCE = "balanced";
  // xConfig: {"type":"toggle","label":"Bei Bull-Out aktiv","description":"Aktiviert den Gewinner-Effekt auch in der Variante Bull-off/Bull-Out.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_BULLOUT_AKTIV = true;
  // xConfig: {"type":"toggle","label":"Klick beendet Effekt","description":"Blendet den Gewinner-Effekt per Klick/Tap aus.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_KLICK_ZUM_STOPPEN = true;

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalizedValue = String(value || "").trim();
    return allowedValues.includes(normalizedValue) ? normalizedValue : fallbackValue;
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
    confetti: "party",
    aurora: "stars",
    pulse: "schoolpride",
  });

  const LEGACY_EFFECT =
    typeof xConfig_EFFEKT === "undefined"
      ? ""
      : String(xConfig_EFFEKT || "").trim().toLowerCase();
  const PRESET_FALLBACK = LEGACY_PRESET_BY_EFFECT[LEGACY_EFFECT] || "realistic";

  const RESOLVED_PRESET = resolveStringChoice(xConfig_PRESET, PRESET_FALLBACK, [
    "cannon",
    "party",
    "random",
    "realistic",
    "schoolpride",
    "fireworks",
    "stars",
    "snow",
    "continuous",
    "victorystorm",
  ]);
  const RESOLVED_PERFORMANCE = resolveStringChoice(xConfig_PERFORMANCE, "balanced", [
    "eco",
    "balanced",
    "high",
  ]);
  const RESOLVED_INCLUDE_BULLOUT = resolveToggle(xConfig_BULLOUT_AKTIV, true);
  const RESOLVED_POINTER_DISMISS = resolveToggle(xConfig_KLICK_ZUM_STOPPEN, true);

  const PERFORMANCE_PRESETS = Object.freeze({
    eco: {
      particleScale: 0.85,
      intervalScale: 1.25,
    },
    balanced: {
      particleScale: 1.1,
      intervalScale: 0.95,
    },
    high: {
      particleScale: 1.4,
      intervalScale: 0.75,
    },
  });

  const PERFORMANCE = PERFORMANCE_PRESETS[RESOLVED_PERFORMANCE] || PERFORMANCE_PRESETS.balanced;
  const COLOR_THEMES = Object.freeze({
    autodarts: ["#ffffff", "#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#4338ca"],
    skyburst: ["#ffffff", "#bae6fd", "#7dd3fc", "#38bdf8", "#3b82f6", "#4f46e5"],
    starlight: ["#ffffff", "#c4b5fd", "#93c5fd", "#60a5fa", "#22d3ee", "#0ea5e9"],
    ice: ["#ffffff", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#1d4ed8"],
    party: ["#ffffff", "#f59e0b", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6"],
  });

  const CONFIG = Object.freeze({
    winnerSelector:
      ".ad-ext_winner-animation, .ad-ext-player-winner, .ad-ext-player.ad-ext-player-winner",
    variantElementId: "ad-ext-game-variant",
    overlayId: "ad-ext-winner-fireworks",
    styleId: "ad-ext-winner-fireworks-style",
    preset: RESOLVED_PRESET,
    includeBullOut: RESOLVED_INCLUDE_BULLOUT,
    pointerDismiss: RESOLVED_POINTER_DISMISS,
    colors: COLOR_THEMES.autodarts,
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

  function runActiveInterval(intervalMs, callback, runImmediately = true) {
    if (runImmediately) {
      callback();
    }
    scheduleInterval(callback, intervalMs);
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

  function emitEntryBurst() {
    emitConfetti({
      particleCount: 54,
      spread: 74,
      startVelocity: 48,
      decay: 0.91,
      origin: { x: 0.5, y: 0.72 },
      colors: COLOR_THEMES.autodarts,
    });
    emitConfetti({
      particleCount: 26,
      angle: 60,
      spread: 54,
      startVelocity: 38,
      origin: { x: 0.02, y: 0.72 },
      colors: COLOR_THEMES.skyburst,
    });
    emitConfetti({
      particleCount: 26,
      angle: 120,
      spread: 54,
      startVelocity: 38,
      origin: { x: 0.98, y: 0.72 },
      colors: COLOR_THEMES.skyburst,
    });
  }

  function cannonBurst() {
    const origin = { y: 0.64 };
    const colors = COLOR_THEMES.autodarts;
    emitConfetti({
      particleCount: 140,
      spread: 72,
      startVelocity: 56,
      decay: 0.9,
      scalar: 1.02,
      origin,
      colors,
    });
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 90,
        spread: 98,
        startVelocity: 40,
        decay: 0.91,
        scalar: 0.95,
        origin,
        colors,
      });
    }, 120);
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 62,
        spread: 124,
        startVelocity: 30,
        decay: 0.93,
        scalar: 1.12,
        origin,
        colors,
      });
    }, 250);
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 40,
        spread: 145,
        startVelocity: 22,
        decay: 0.95,
        scalar: 1.24,
        origin,
        colors,
      });
    }, 390);
  }

  function startCannonPreset() {
    runActiveInterval(
      Math.round(1050 * PERFORMANCE.intervalScale),
      () => cannonBurst(),
      true
    );
  }

  function startPartyPreset() {
    runActiveInterval(
      Math.round(620 * PERFORMANCE.intervalScale),
      () => {
        emitConfetti({
          angle: randomInRange(32, 148),
          spread: randomInRange(58, 108),
          particleCount: randomInRange(84, 160),
          startVelocity: randomInRange(36, 56),
          origin: {
            x: randomInRange(0.08, 0.92),
            y: randomInRange(0.48, 0.72),
          },
          colors: COLOR_THEMES.party,
        });
        emitConfetti({
          angle: randomInRange(24, 156),
          spread: randomInRange(64, 126),
          particleCount: randomInRange(34, 76),
          startVelocity: randomInRange(24, 40),
          scalar: randomInRange(0.86, 1.2),
          origin: {
            x: randomInRange(0.06, 0.94),
            y: randomInRange(0.45, 0.75),
          },
          colors: COLOR_THEMES.party,
        });
        if (Math.random() > 0.72) {
          emitConfetti({
            particleCount: randomInRange(18, 34),
            angle: 90,
            spread: randomInRange(82, 110),
            startVelocity: randomInRange(36, 52),
            origin: {
              x: randomInRange(0.2, 0.8),
              y: 0.76,
            },
            colors: COLOR_THEMES.party,
          });
        }
      },
      true
    );
  }

  function startSchoolPridePreset() {
    const frameIntervalMs = Math.round(62 * PERFORMANCE.intervalScale);
    const colors = ["#bb0000", "#ffffff"];
    let lastShotTs = 0;
    let lastCenterTs = 0;

    const shoot = (timestamp) => {
      if (timestamp - lastShotTs < frameIntervalMs) {
        return;
      }
      lastShotTs = timestamp;

      emitConfetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        startVelocity: 30,
        decay: 0.91,
        origin: { x: 0, y: 0.74 },
        colors,
      });
      emitConfetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        startVelocity: 30,
        decay: 0.91,
        origin: { x: 1, y: 0.74 },
        colors,
      });

      if (timestamp - lastCenterTs >= Math.round(760 * PERFORMANCE.intervalScale)) {
        lastCenterTs = timestamp;
        emitConfetti({
          particleCount: 46,
          angle: 90,
          spread: 78,
          startVelocity: 50,
          decay: 0.9,
          origin: { x: 0.5, y: 0.74 },
          colors,
        });
      }
    };

    shoot(performance.now());
    scheduleFrameLoop((timestamp) => {
      shoot(timestamp);
    });
  }

  function startVictoryStormPreset() {
    runActiveInterval(
      Math.round(560 * PERFORMANCE.intervalScale),
      () => {
        emitConfetti({
          particleCount: 70,
          angle: 90,
          spread: 82,
          startVelocity: 54,
          decay: 0.9,
          origin: { x: randomInRange(0.42, 0.58), y: 0.74 },
          colors: COLOR_THEMES.skyburst,
        });
        scheduleTimeout(() => {
          emitConfetti({
            particleCount: 38,
            angle: randomInRange(52, 72),
            spread: 62,
            startVelocity: 44,
            origin: { x: 0.1, y: 0.74 },
            colors: COLOR_THEMES.autodarts,
          });
          emitConfetti({
            particleCount: 38,
            angle: randomInRange(108, 128),
            spread: 62,
            startVelocity: 44,
            origin: { x: 0.9, y: 0.74 },
            colors: COLOR_THEMES.autodarts,
          });
        }, 140);
      },
      true
    );
  }

  function realisticBurst(baseCount) {
    const defaults = {
      origin: { y: 0.7 },
      colors: COLOR_THEMES.autodarts,
    };
    const fire = (particleRatio, options) => {
      emitConfetti({
        ...defaults,
        ...options,
        particleCount: Math.floor(baseCount * particleRatio),
      });
    };

    fire(0.28, {
      spread: 30,
      startVelocity: 58,
    });
    fire(0.24, {
      spread: 60,
      startVelocity: 46,
    });
    fire(0.24, {
      spread: 96,
      decay: 0.9,
      scalar: 0.88,
    });
    fire(0.14, {
      spread: 124,
      startVelocity: 32,
      decay: 0.92,
      scalar: 1.16,
    });
    fire(0.1, {
      spread: 145,
      startVelocity: 22,
      decay: 0.95,
      scalar: 1.28,
    });
  }

  function startRealisticPreset() {
    runActiveInterval(
      Math.round(980 * PERFORMANCE.intervalScale),
      () => {
        realisticBurst(260);
        scheduleTimeout(() => realisticBurst(110), 220);
      },
      true
    );
  }

  function startFireworksPreset() {
    const defaults = {
      startVelocity: 34,
      spread: 360,
      ticks: 70,
      decay: 0.91,
    };
    const intervalMs = Math.round(170 * PERFORMANCE.intervalScale);

    runActiveInterval(
      intervalMs,
      () => {
        const particleCount = Math.round(randomInRange(28, 74));
        emitConfetti({
          ...defaults,
          particleCount,
          colors: COLOR_THEMES.skyburst,
          origin: {
            x: randomInRange(0.08, 0.32),
            y: randomInRange(0.03, 0.35),
          },
        });
        emitConfetti({
          ...defaults,
          particleCount,
          colors: COLOR_THEMES.skyburst,
          origin: {
            x: randomInRange(0.68, 0.92),
            y: randomInRange(0.03, 0.35),
          },
        });
        if (Math.random() > 0.66) {
          emitConfetti({
            ...defaults,
            particleCount: Math.round(randomInRange(18, 44)),
            spread: 300,
            startVelocity: 46,
            colors: COLOR_THEMES.autodarts,
            origin: {
              x: randomInRange(0.4, 0.6),
              y: randomInRange(0.04, 0.26),
            },
          });
        }
      },
      true
    );
  }

  function starsBurst() {
    const defaults = {
      spread: 360,
      ticks: 78,
      gravity: 0.12,
      decay: 0.93,
      startVelocity: 34,
      colors: COLOR_THEMES.starlight,
    };

    emitConfetti({
      ...defaults,
      particleCount: 68,
      scalar: 1.3,
      shapes: ["star"],
    });
    emitConfetti({
      ...defaults,
      particleCount: 24,
      scalar: 0.88,
      shapes: ["circle"],
    });
  }

  function startStarsPreset() {
    runActiveInterval(
      Math.round(900 * PERFORMANCE.intervalScale),
      () => {
        starsBurst();
        scheduleTimeout(starsBurst, 90);
        scheduleTimeout(starsBurst, 180);
      },
      true
    );
  }

  function startSnowPreset() {
    const frameIntervalMs = Math.round(24 * PERFORMANCE.intervalScale);
    let skew = 1;
    let lastShotTs = 0;

    const shoot = (timestamp) => {
      if (timestamp - lastShotTs < frameIntervalMs) {
        return;
      }
      lastShotTs = timestamp;

      const ticks = Math.round(randomInRange(260, 540));
      const particleCount = Math.random() > 0.58 ? 2 : 1;
      skew = Math.max(0.8, skew - 0.0008);

      emitConfetti({
        particleCount,
        startVelocity: 0,
        ticks,
        origin: {
          x: Math.random(),
          y: Math.random() * skew - 0.2,
        },
        colors: COLOR_THEMES.ice,
        shapes: ["circle"],
        gravity: randomInRange(0.28, 0.52),
        scalar: randomInRange(0.44, 1.08),
        drift: randomInRange(-0.55, 0.55),
      });
      if (Math.random() > 0.76) {
        emitConfetti({
          particleCount: 1,
          startVelocity: 0,
          ticks: Math.max(260, ticks),
          origin: {
            x: Math.random(),
            y: -0.04,
          },
          colors: COLOR_THEMES.ice,
          shapes: ["circle"],
          gravity: randomInRange(0.3, 0.45),
          scalar: randomInRange(0.58, 1.15),
          drift: randomInRange(-0.46, 0.46),
        });
      }
      if (skew <= 0.8 && Math.random() > 0.9) {
        skew = 1;
      }
    };

    shoot(performance.now());
    scheduleFrameLoop((timestamp) => {
      shoot(timestamp);
    });
  }

  function startContinuousPreset() {
    const frameIntervalMs = Math.round(58 * PERFORMANCE.intervalScale);
    const sideColors = COLOR_THEMES.autodarts;
    const centerColors = COLOR_THEMES.skyburst;
    let lastShotTs = 0;
    let lastCenterTs = 0;

    const shoot = (timestamp) => {
      if (timestamp - lastShotTs < frameIntervalMs) {
        return;
      }
      lastShotTs = timestamp;

      emitConfetti({
        particleCount: 6,
        angle: 60,
        spread: 58,
        startVelocity: 34,
        decay: 0.91,
        origin: { x: 0, y: 0.72 },
        colors: sideColors,
      });
      emitConfetti({
        particleCount: 6,
        angle: 120,
        spread: 58,
        startVelocity: 34,
        decay: 0.91,
        origin: { x: 1, y: 0.72 },
        colors: sideColors,
      });

      if (timestamp - lastCenterTs >= Math.round(780 * PERFORMANCE.intervalScale)) {
        lastCenterTs = timestamp;
        emitConfetti({
          particleCount: 54,
          angle: 90,
          spread: 76,
          startVelocity: 48,
          decay: 0.9,
          origin: { x: 0.5, y: 0.72 },
          colors: centerColors,
        });
      }
    };

    shoot(performance.now());
    scheduleFrameLoop((timestamp) => {
      shoot(timestamp);
    });
  }

  function startRandomPreset() {
    const randomPool = [
      "schoolpride",
      "fireworks",
      "continuous",
      "realistic",
      "cannon",
      "stars",
      "victorystorm",
      "party",
      "snow",
    ];
    const selectedPreset = randomPool[Math.floor(Math.random() * randomPool.length)];
    const runner = PRESET_RUNNERS[selectedPreset] || PRESET_RUNNERS.fireworks;
    runner();
  }

  const PRESET_RUNNERS = Object.freeze({
    cannon: startCannonPreset,
    party: startPartyPreset,
    random: startRandomPreset,
    realistic: startRealisticPreset,
    schoolpride: startSchoolPridePreset,
    fireworks: startFireworksPreset,
    stars: startStarsPreset,
    snow: startSnowPreset,
    continuous: startContinuousPreset,
    victorystorm: startVictoryStormPreset,
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

    emitEntryBurst();
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

  function getVariantText() {
    if (typeof shared.getVariantText === "function") {
      return String(shared.getVariantText(CONFIG.variantElementId) || "").trim().toLowerCase();
    }
    const node = document.getElementById(CONFIG.variantElementId);
    return String(node?.textContent || "").trim().toLowerCase();
  }

  function isBullOutVariant(variantText) {
    const variant = String(variantText || "").toLowerCase();
    return (
      variant.includes("bull-off") ||
      variant.includes("bull off") ||
      variant.includes("bullout") ||
      variant.includes("bull-out")
    );
  }

  function shouldRunForCurrentVariant() {
    if (CONFIG.includeBullOut) {
      return true;
    }
    return !isBullOutVariant(getVariantText());
  }

  function checkWinner() {
    const activeWinnerVisible = isWinnerVisible() && shouldRunForCurrentVariant();
    if (activeWinnerVisible && !lastWinnerVisible) {
      dismissedForCurrentWin = false;
      showEffect();
    } else if (!activeWinnerVisible && lastWinnerVisible) {
      dismissedForCurrentWin = false;
      hideEffect();
    }
    lastWinnerVisible = activeWinnerVisible;
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
        checkWinner();
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

  setInterval(scheduleCheck, 350);
  window.addEventListener("resize", scheduleCheck, { passive: true });
  document.addEventListener("visibilitychange", scheduleCheck, { passive: true });
})();
