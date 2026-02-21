// ==UserScript==
// @name         Autodarts Animate Winner Fireworks
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      3.8
// @description  Zeigt nach einem Sieg einen frei wählbaren Feuerwerks- und Konfetti-Effekt.
// @xconfig-description  Startet beim Gewinner einen konfigurierbaren Effekt. Mit dem Test-Button kannst du die aktuelle Einstellung sofort als Vorschau sehen.
// @xconfig-title  Sieger-Feuerwerk
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-winner-fireworks
// @xconfig-tech-anchor  animation-autodarts-animate-winner-fireworks
// @xconfig-background     assets/animation-animate-winner-fireworks.gif
// @xconfig-settings-version 12
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/vendor/canvas-confetti.browser.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// ==/UserScript==

(function () {
  "use strict";

  // xConfig: {"type":"select","label":"Style","description":"Wählt den Ablauf des Sieger-Effekts.","options":[{"value":"realistic","label":"Grand Finale (ausgewogen)"},{"value":"fireworks","label":"Skyburst (schnelle Luft-Bursts)"},{"value":"cannon","label":"Arena Cannon (druckvoll von unten)"},{"value":"victorystorm","label":"Victory Storm (Mitte + Flanken)"},{"value":"stars","label":"Starlight (Sterne, ruhiger Ausklang)"},{"value":"sides","label":"Side Cannons (Konfetti von den Seiten)"}]}
  const xConfig_STYLE = "realistic";
  // xConfig: {"type":"select","label":"Farbe","description":"Wählt die Farbpalette für das Feuerwerk.","options":[{"value":"autodarts","label":"Autodarts (Blau dominant)"},{"value":"redwhite","label":"Rot-Weiß"},{"value":"ice","label":"Ice (Cyan/Blau/Weiß)"},{"value":"sunset","label":"Sunset (Amber/Rose/Violett)"},{"value":"neon","label":"Neon (Lime/Cyan/Pink)"},{"value":"gold","label":"Gold (Gold/Amber/Weiß)"}]}
  const xConfig_FARBE = "autodarts";
  // xConfig: {"type":"select","label":"Intensität","description":"Bestimmt Dichte und Dynamik des Effekts.","options":[{"value":"dezent","label":"Dezent"},{"value":"standard","label":"Standard (empfohlen)"},{"value":"stark","label":"Stark"}]}
  const xConfig_INTENSITAET = "standard";
  // xConfig: {"type":"action","label":"Test-Button","description":"Startet den Effekt sofort als Vorschau mit den aktuellen Einstellungen, auch im geöffneten xConfig-Fenster im Vordergrund.","buttonLabel":"Effekt jetzt testen","action":"preview","prominent":true}
  const xConfig_TEST_BUTTON = "preview";
  // xConfig: {"type":"toggle","label":"Bei Bull-Out aktiv","description":"Aktiviert den Sieger-Effekt auch in Bull-off/Bull-Out.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_BULLOUT_AKTIV = true;
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;
  // xConfig: {"type":"toggle","label":"Klick beendet Effekt","description":"Beendet den laufenden Effekt per Klick oder Tap.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
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
    confetti: "cannon",
    aurora: "stars",
    pulse: "victorystorm",
  });

  const PRESET_MIGRATION = Object.freeze({
    schoolpride: "victorystorm",
    continuous: "victorystorm",
    party: "cannon",
    snow: "stars",
    random: "fireworks",
  });

  const LEGACY_PRESET_VALUE =
    typeof xConfig_PRESET === "undefined"
      ? ""
      : String(xConfig_PRESET || "").trim().toLowerCase();
  const LEGACY_EFFECT =
    typeof xConfig_EFFEKT === "undefined"
      ? ""
      : String(xConfig_EFFEKT || "").trim().toLowerCase();
  const STYLE_FALLBACK = LEGACY_PRESET_BY_EFFECT[LEGACY_EFFECT] || "realistic";
  const REQUESTED_STYLE_RAW = String(xConfig_STYLE || LEGACY_PRESET_VALUE || "").trim().toLowerCase();
  const REQUESTED_STYLE = PRESET_MIGRATION[REQUESTED_STYLE_RAW] || REQUESTED_STYLE_RAW;

  const RESOLVED_STYLE = resolveStringChoice(REQUESTED_STYLE, STYLE_FALLBACK, [
    "cannon",
    "realistic",
    "fireworks",
    "stars",
    "victorystorm",
    "sides",
  ]);

  const LEGACY_COLOR_THEME =
    typeof xConfig_FARBTHEMA === "undefined"
      ? ""
      : String(xConfig_FARBTHEMA || "").trim().toLowerCase();
  const REQUESTED_COLOR_THEME = String(xConfig_FARBE || LEGACY_COLOR_THEME || "").trim().toLowerCase();
  const RESOLVED_COLOR_THEME = resolveStringChoice(REQUESTED_COLOR_THEME, "autodarts", [
    "autodarts",
    "redwhite",
    "ice",
    "sunset",
    "neon",
    "gold",
  ]);

  const LEGACY_PERFORMANCE =
    typeof xConfig_PERFORMANCE === "undefined"
      ? ""
      : String(xConfig_PERFORMANCE || "").trim().toLowerCase();
  const INTENSITY_BY_LEGACY_PERFORMANCE = Object.freeze({
    eco: "dezent",
    balanced: "standard",
    high: "stark",
  });
  const REQUESTED_INTENSITY = String(
    xConfig_INTENSITAET || INTENSITY_BY_LEGACY_PERFORMANCE[LEGACY_PERFORMANCE] || ""
  ).trim().toLowerCase();
  const RESOLVED_INTENSITY = resolveStringChoice(REQUESTED_INTENSITY, "standard", [
    "dezent",
    "standard",
    "stark",
  ]);
  const RESOLVED_INCLUDE_BULLOUT = resolveToggle(xConfig_BULLOUT_AKTIV, true);
  const LEGACY_DEBUG_VALUE =
    typeof xConfig_DEBUG_LOGS === "undefined"
      ? false
      : xConfig_DEBUG_LOGS;
  const RESOLVED_DEBUG = resolveToggle(xConfig_DEBUG, resolveToggle(LEGACY_DEBUG_VALUE, false));
  const RESOLVED_POINTER_DISMISS = resolveToggle(xConfig_KLICK_ZUM_STOPPEN, true);
  const XCONFIG_ACTION_EVENT_NAME = "ad-xconfig:setting-action";
  const XCONFIG_FEATURE_ID = "a-winner-fireworks";
  const XCONFIG_TEST_SETTING_KEY = "xConfig_TEST_BUTTON";
  const XCONFIG_TEST_ACTION = "preview";
  const OVERLAY_Z_INDEX = 2147483646;

  const INTENSITY_PRESETS = Object.freeze({
    dezent: {
      particleScale: 0.78,
      intervalScale: 1.18,
      velocityScale: 0.92,
      scalarScale: 0.96,
    },
    standard: {
      particleScale: 1,
      intervalScale: 1,
      velocityScale: 1,
      scalarScale: 1,
    },
    stark: {
      particleScale: 1.24,
      intervalScale: 0.84,
      velocityScale: 1.08,
      scalarScale: 1.05,
    },
  });

  const INTENSITY = INTENSITY_PRESETS[RESOLVED_INTENSITY] || INTENSITY_PRESETS.standard;
  const COLOR_THEMES = Object.freeze({
    autodarts: {
      primary: ["#0c5b9c", "#0f4f8a", "#1267ad", "#1c6fb8", "#2a75c2", "#374091", "#2f4ea2", "#ffffff"],
      accent: ["#0c5b9c", "#1267ad", "#1d73c3", "#2d83d7", "#374091", "#4d58b0", "#ffffff"],
      special: ["#374091", "#2f4ea2", "#0c5b9c", "#1b69b5", "#5d8fd1", "#9ec2e6", "#ffffff"],
    },
    redwhite: {
      primary: ["#ffffff", "#fee2e2", "#fca5a5", "#ef4444", "#dc2626", "#991b1b"],
      accent: ["#ffffff", "#fecaca", "#f87171", "#e11d48", "#be123c", "#881337"],
      special: ["#ffffff", "#ffe4e6", "#fda4af", "#fb7185", "#f43f5e", "#be123c"],
    },
    ice: {
      primary: ["#ffffff", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#1d4ed8"],
      accent: ["#ffffff", "#ecfeff", "#a5f3fc", "#67e8f9", "#22d3ee", "#0891b2", "#155e75"],
      special: ["#ffffff", "#f0f9ff", "#dbeafe", "#93c5fd", "#60a5fa", "#2563eb", "#1e3a8a"],
    },
    sunset: {
      primary: ["#ffffff", "#ffedd5", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c"],
      accent: ["#ffffff", "#ffe4e6", "#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c"],
      special: ["#ffffff", "#f5d0fe", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#7e22ce"],
    },
    neon: {
      primary: ["#ffffff", "#ecfccb", "#d9f99d", "#bef264", "#84cc16", "#65a30d", "#3f6212"],
      accent: ["#ffffff", "#cffafe", "#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4", "#0e7490"],
      special: ["#ffffff", "#fce7f3", "#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899", "#be185d"],
    },
    gold: {
      primary: ["#ffffff", "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#b45309"],
      accent: ["#ffffff", "#fffbeb", "#fef9c3", "#fde68a", "#facc15", "#eab308", "#a16207"],
      special: ["#ffffff", "#fff7ed", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#c2410c"],
    },
  });

  const ACTIVE_COLOR_THEME = COLOR_THEMES[RESOLVED_COLOR_THEME] || COLOR_THEMES.autodarts;
  const STYLE_TUNING = Object.freeze({
    cannon: {
      intervalMs: 920,
    },
    victorystorm: {
      intervalMs: 620,
    },
    realistic: {
      intervalMs: 920,
      mainBurst: 230,
      followupBurst: 96,
    },
    fireworks: {
      intervalMs: 250,
      sideParticleMin: 18,
      sideParticleMax: 48,
      centerChance: 0.28,
      centerParticleMin: 12,
      centerParticleMax: 28,
    },
    stars: {
      intervalMs: 980,
      echoDelayA: 130,
      echoDelayB: 260,
    },
    sides: {
      intervalMs: 16,
      durationMs: 15000,
      particleCount: 2,
      leftAngle: 60,
      rightAngle: 120,
      spread: 55,
      originY: 0.5,
    },
  });

  const CONFIG = Object.freeze({
    winnerSelector:
      ".ad-ext_winner-animation, .ad-ext-player-winner, .ad-ext-player.ad-ext-player-winner",
    variantElementId: "ad-ext-game-variant",
    overlayId: "ad-ext-winner-fireworks",
    styleId: "ad-ext-winner-fireworks-style",
    style: RESOLVED_STYLE,
    colorTheme: RESOLVED_COLOR_THEME,
    intensity: RESOLVED_INTENSITY,
    includeBullOut: RESOLVED_INCLUDE_BULLOUT,
    debug: RESOLVED_DEBUG,
    pointerDismiss: RESOLVED_POINTER_DISMISS,
    colors: getThemeColors("primary"),
  });

  const STYLE_TEXT = `
#${CONFIG.overlayId} {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: ${OVERLAY_Z_INDEX};
}

#${CONFIG.overlayId} canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
`;

  const shared = window.autodartsAnimationShared || {};
  const gameStateShared = window.autodartsGameStateShared || null;
  const ensureStyle = typeof shared.ensureStyle === "function"
    ? shared.ensureStyle
    : fallbackEnsureStyle;
  const DEBUG_PREFIX = "[xConfig][Winner Fireworks]";

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
  let lastDebugSignalKey = "";
  let previewStopHandle = 0;

  function debugLog(event, payload) {
    if (!CONFIG.debug) {
      return;
    }
    if (typeof payload === "undefined") {
      console.log(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.log(`${DEBUG_PREFIX} ${event}`, payload);
  }

  function debugWarn(event, payload) {
    if (!CONFIG.debug) {
      return;
    }
    if (typeof payload === "undefined") {
      console.warn(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.warn(`${DEBUG_PREFIX} ${event}`, payload);
  }

  function debugError(event, payload) {
    if (!CONFIG.debug) {
      return;
    }
    if (typeof payload === "undefined") {
      console.error(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.error(`${DEBUG_PREFIX} ${event}`, payload);
  }

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

  function getThemeColors(slot) {
    const selection = ACTIVE_COLOR_THEME[slot];
    if (Array.isArray(selection) && selection.length > 0) {
      return selection;
    }
    return ACTIVE_COLOR_THEME.primary;
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

  function clearPreviewStopTimer() {
    if (!previewStopHandle) {
      return;
    }
    clearTimeout(previewStopHandle);
    previewStopHandle = 0;
  }

  function schedulePreviewStop(reason, delayMs) {
    clearPreviewStopTimer();
    const safeDelay = Math.max(900, Number(delayMs) || 0);
    previewStopHandle = setTimeout(() => {
      previewStopHandle = 0;
      const winnerStillVisible = shouldRunForVariant(getVariantText())
        && (getWinnerDomInfo().visible || hasWinnerFromGameState());
      if (winnerStillVisible) {
        debugLog("preview-auto-stop-skipped", { reason });
        return;
      }
      hideEffect(`${reason}:auto-stop`);
    }, safeDelay);
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
      debugLog("overlay-missing-confetti", {
        confettiType: typeof window.confetti,
      });
      return false;
    }

    const container = document.body || document.documentElement;
    if (!container) {
      debugLog("overlay-missing-container");
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
    debugLog("overlay-created", {
      style: CONFIG.style,
      farbe: CONFIG.colorTheme,
      intensitaet: CONFIG.intensity,
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
    return Math.max(1, Math.round(Number(particleCount || 0) * INTENSITY.particleScale));
  }

  function scaledVelocity(startVelocity) {
    return Math.max(0, Number(startVelocity || 0) * INTENSITY.velocityScale);
  }

  function scaledScalar(scalar) {
    return Math.max(0.2, Number(scalar || 0) * INTENSITY.scalarScale);
  }

  function emitConfetti(options) {
    if (!confettiRunner) {
      return;
    }

    const payload = {
      ...options,
      disableForReducedMotion: true,
      zIndex: OVERLAY_Z_INDEX,
    };

    if (typeof payload.particleCount === "number") {
      payload.particleCount = scaledParticleCount(payload.particleCount);
    }
    if (typeof payload.startVelocity === "number") {
      payload.startVelocity = scaledVelocity(payload.startVelocity);
    }
    if (typeof payload.scalar === "number") {
      payload.scalar = scaledScalar(payload.scalar);
    }
    if (!Array.isArray(payload.colors)) {
      payload.colors = CONFIG.colors;
    }

    confettiRunner(payload);
  }

  function emitEntryBurst() {
    const primaryColors = getThemeColors("primary");
    const accentColors = getThemeColors("accent");
    emitConfetti({
      particleCount: 54,
      spread: 74,
      startVelocity: 48,
      decay: 0.91,
      origin: { x: 0.5, y: 0.72 },
      colors: primaryColors,
    });
    emitConfetti({
      particleCount: 26,
      angle: 60,
      spread: 54,
      startVelocity: 38,
      origin: { x: 0.02, y: 0.72 },
      colors: accentColors,
    });
    emitConfetti({
      particleCount: 26,
      angle: 120,
      spread: 54,
      startVelocity: 38,
      origin: { x: 0.98, y: 0.72 },
      colors: accentColors,
    });
  }

  function cannonBurst() {
    const origin = { y: 0.64 };
    const colors = getThemeColors("primary");
    emitConfetti({
      particleCount: 120,
      spread: 68,
      startVelocity: 56,
      decay: 0.9,
      scalar: 1.02,
      origin,
      colors,
    });
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 78,
        spread: 92,
        startVelocity: 40,
        decay: 0.91,
        scalar: 0.95,
        origin,
        colors,
      });
    }, 120);
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 56,
        spread: 118,
        startVelocity: 30,
        decay: 0.93,
        scalar: 1.12,
        origin,
        colors,
      });
    }, 250);
    scheduleTimeout(() => {
      emitConfetti({
        particleCount: 34,
        spread: 140,
        startVelocity: 22,
        decay: 0.95,
        scalar: 1.24,
        origin,
        colors,
      });
    }, 390);
  }

  function startCannonPreset() {
    const tuning = STYLE_TUNING.cannon;
    runActiveInterval(
      Math.round(tuning.intervalMs * INTENSITY.intervalScale),
      () => cannonBurst(),
      true
    );
  }

  function startVictoryStormPreset() {
    const tuning = STYLE_TUNING.victorystorm;
    const centerColors = getThemeColors("accent");
    const sideColors = getThemeColors("primary");
    runActiveInterval(
      Math.round(tuning.intervalMs * INTENSITY.intervalScale),
      () => {
        emitConfetti({
          particleCount: 70,
          angle: 90,
          spread: 82,
          startVelocity: 54,
          decay: 0.9,
          origin: { x: randomInRange(0.42, 0.58), y: 0.74 },
          colors: centerColors,
        });
        scheduleTimeout(() => {
          emitConfetti({
            particleCount: 38,
            angle: randomInRange(52, 72),
            spread: 62,
            startVelocity: 44,
            origin: { x: 0.1, y: 0.74 },
            colors: sideColors,
          });
          emitConfetti({
            particleCount: 38,
            angle: randomInRange(108, 128),
            spread: 62,
            startVelocity: 44,
            origin: { x: 0.9, y: 0.74 },
            colors: sideColors,
          });
        }, 140);
      },
      true
    );
  }

  function realisticBurst(baseCount) {
    const primaryColors = getThemeColors("primary");
    const defaults = {
      origin: { y: 0.7 },
      colors: primaryColors,
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
    const tuning = STYLE_TUNING.realistic;
    runActiveInterval(
      Math.round(tuning.intervalMs * INTENSITY.intervalScale),
      () => {
        realisticBurst(tuning.mainBurst);
        scheduleTimeout(() => realisticBurst(tuning.followupBurst), 220);
      },
      true
    );
  }

  function startFireworksPreset() {
    const tuning = STYLE_TUNING.fireworks;
    const accentColors = getThemeColors("accent");
    const primaryColors = getThemeColors("primary");
    const defaults = {
      startVelocity: 32,
      spread: 360,
      ticks: 70,
      decay: 0.91,
    };
    const intervalMs = Math.round(tuning.intervalMs * INTENSITY.intervalScale);

    runActiveInterval(
      intervalMs,
      () => {
        const particleCount = Math.round(
          randomInRange(tuning.sideParticleMin, tuning.sideParticleMax)
        );
        emitConfetti({
          ...defaults,
          particleCount,
          colors: accentColors,
          origin: {
            x: randomInRange(0.08, 0.32),
            y: randomInRange(0.03, 0.35),
          },
        });
        emitConfetti({
          ...defaults,
          particleCount,
          colors: accentColors,
          origin: {
            x: randomInRange(0.68, 0.92),
            y: randomInRange(0.03, 0.35),
          },
        });
        if (Math.random() < tuning.centerChance) {
          emitConfetti({
            ...defaults,
            particleCount: Math.round(
              randomInRange(tuning.centerParticleMin, tuning.centerParticleMax)
            ),
            spread: 300,
            startVelocity: 46,
            colors: primaryColors,
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
    const specialColors = getThemeColors("special");
    const defaults = {
      spread: 360,
      ticks: 78,
      gravity: 0.12,
      decay: 0.93,
      startVelocity: 34,
      colors: specialColors,
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
    const tuning = STYLE_TUNING.stars;
    runActiveInterval(
      Math.round(tuning.intervalMs * INTENSITY.intervalScale),
      () => {
        starsBurst();
        scheduleTimeout(starsBurst, tuning.echoDelayA);
        scheduleTimeout(starsBurst, tuning.echoDelayB);
      },
      true
    );
  }

  function startSidesPreset() {
    const tuning = STYLE_TUNING.sides;
    const colors = getThemeColors("primary");
    const intervalMs = Math.max(16, Math.round(tuning.intervalMs * INTENSITY.intervalScale));
    const durationMs = Math.max(1200, Number(tuning.durationMs) || 15000);
    let lastTimestamp = 0;

    const emit = () => {
      emitConfetti({
        particleCount: tuning.particleCount,
        angle: tuning.leftAngle,
        spread: tuning.spread,
        origin: { x: 0, y: tuning.originY },
        colors,
      });
      emitConfetti({
        particleCount: tuning.particleCount,
        angle: tuning.rightAngle,
        spread: tuning.spread,
        origin: { x: 1, y: tuning.originY },
        colors,
      });
    };

    emit();
    scheduleFrameLoop((timestamp) => {
      if (!lastTimestamp || timestamp - lastTimestamp >= intervalMs) {
        lastTimestamp = timestamp;
        emit();
      }
    });
    scheduleTimeout(() => {
      clearFrameLoop();
    }, durationMs);
  }

  const STYLE_RUNNERS = Object.freeze({
    cannon: startCannonPreset,
    realistic: startRealisticPreset,
    fireworks: startFireworksPreset,
    stars: startStarsPreset,
    victorystorm: startVictoryStormPreset,
    sides: startSidesPreset,
  });

  function startStyle() {
    const runner = STYLE_RUNNERS[CONFIG.style] || STYLE_RUNNERS.realistic;
    runner();
  }

  function showEffect(reason = "unknown") {
    if (running || dismissedForCurrentWin) {
      debugLog("show-skipped", {
        reason,
        running,
        dismissedForCurrentWin,
      });
      return;
    }

    ensureStyle(CONFIG.styleId, STYLE_TEXT);
    if (!ensureOverlay()) {
      return;
    }

    running = true;
    clearSchedulers();
    debugLog("show-start", {
      reason,
      style: CONFIG.style,
      farbe: CONFIG.colorTheme,
      intensitaet: CONFIG.intensity,
      includeBullOut: CONFIG.includeBullOut,
    });

    if (CONFIG.pointerDismiss) {
      if (!dismissHandler) {
        dismissHandler = () => {
          dismissedForCurrentWin = true;
          hideEffect("pointer-dismiss");
        };
      }
      document.addEventListener("pointerdown", dismissHandler, {
        capture: true,
        once: true,
      });
    }

    emitEntryBurst();
    startStyle();
  }

  function hideEffect(reason = "unknown") {
    if (dismissHandler) {
      document.removeEventListener("pointerdown", dismissHandler, true);
    }
    clearPreviewStopTimer();
    clearSchedulers();
    if (running) {
      debugLog("hide", { reason });
    }
    running = false;
    destroyOverlay();
  }

  function getWinnerDomInfo() {
    const node = document.querySelector(CONFIG.winnerSelector);
    if (!node) {
      return {
        found: false,
        visible: false,
        selector: CONFIG.winnerSelector,
      };
    }
    const rectCount = node.getClientRects().length;
    const style = window.getComputedStyle(node);
    return {
      found: true,
      visible: rectCount > 0,
      rectCount,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      tag: node.tagName,
      className: String(node.className || ""),
    };
  }

  function getVariantText() {
    let variantText = "";
    if (typeof shared.getVariantText === "function") {
      variantText = String(shared.getVariantText(CONFIG.variantElementId) || "").trim().toLowerCase();
      if (variantText) {
        return variantText;
      }
    }
    if (gameStateShared && typeof gameStateShared.getVariant === "function") {
      variantText = String(gameStateShared.getVariant() || "").trim().toLowerCase();
      if (variantText) {
        return variantText;
      }
    }
    const node = document.getElementById(CONFIG.variantElementId);
    return String(node?.textContent || "").trim().toLowerCase();
  }

  function hasWinnerFromGameState() {
    if (!gameStateShared || typeof gameStateShared.getState !== "function") {
      return false;
    }
    const snapshot = gameStateShared.getState();
    const match = snapshot?.match;
    if (!match || typeof match !== "object") {
      return false;
    }
    const gameWinner = Number(match.gameWinner);
    const matchWinner = Number(match.winner);
    return (
      (Number.isFinite(gameWinner) && gameWinner >= 0) ||
      (Number.isFinite(matchWinner) && matchWinner >= 0)
    );
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

  function shouldRunForVariant(variantText) {
    if (CONFIG.includeBullOut) {
      return true;
    }
    return !isBullOutVariant(variantText);
  }

  function startPreview(reason = "xconfig-action") {
    clearPreviewStopTimer();
    dismissedForCurrentWin = false;
    hideEffect(`${reason}:reset`);
    showEffect(reason);
    schedulePreviewStop(reason, Math.round(2900 * INTENSITY.intervalScale));
  }

  function isMatchingXConfigAction(detail) {
    if (!detail || typeof detail !== "object") {
      return false;
    }

    const featureId = String(detail.featureId || "").trim().toLowerCase();
    const settingKey = String(detail.settingKey || "").trim();
    if (featureId !== XCONFIG_FEATURE_ID && settingKey !== XCONFIG_TEST_SETTING_KEY) {
      return false;
    }

    const actionName = String(detail.action || "").trim().toLowerCase();
    return settingKey === XCONFIG_TEST_SETTING_KEY || actionName === XCONFIG_TEST_ACTION;
  }

  function onXConfigSettingAction(event) {
    const detail = event && typeof event === "object" ? event.detail : null;
    if (!isMatchingXConfigAction(detail)) {
      return;
    }

    debugLog("preview-action", {
      detail,
      style: CONFIG.style,
      farbe: CONFIG.colorTheme,
      intensitaet: CONFIG.intensity,
    });
    startPreview("xconfig-action");
  }

  function checkWinner(source = "check") {
    const winnerDomInfo = getWinnerDomInfo();
    const domWinnerVisible = winnerDomInfo.visible;
    const stateWinnerVisible = hasWinnerFromGameState();
    const variantText = getVariantText();
    const variantAllowed = shouldRunForVariant(variantText);
    const activeWinnerVisible = (domWinnerVisible || stateWinnerVisible) && variantAllowed;

    const signalKey = `${domWinnerVisible}|${stateWinnerVisible}|${variantAllowed}|${variantText}`;
    if (signalKey !== lastDebugSignalKey) {
      debugLog("winner-signal", {
        source,
        domWinnerVisible,
        winnerDomInfo,
        stateWinnerVisible,
        variantAllowed,
        variantText,
        running,
        style: CONFIG.style,
        farbe: CONFIG.colorTheme,
        intensitaet: CONFIG.intensity,
      });
      lastDebugSignalKey = signalKey;
    }

    if (activeWinnerVisible && !lastWinnerVisible) {
      dismissedForCurrentWin = false;
      showEffect(source);
    } else if (!activeWinnerVisible && lastWinnerVisible) {
      dismissedForCurrentWin = false;
      hideEffect(source);
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
      checkWinner("raf");
    });
  }

  window.addEventListener(XCONFIG_ACTION_EVENT_NAME, onXConfigSettingAction);
  checkWinner("boot");

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" || mutation.type === "attributes") {
        checkWinner(`mutation:${mutation.type}`);
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

  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    gameStateShared.subscribe(() => {
      checkWinner("state:subscribe");
      scheduleCheck();
    });
  }

  debugLog("init", {
    style: CONFIG.style,
    farbe: CONFIG.colorTheme,
    intensitaet: CONFIG.intensity,
    includeBullOut: CONFIG.includeBullOut,
    pointerDismiss: CONFIG.pointerDismiss,
    debug: CONFIG.debug,
    hasGameStateShared: Boolean(gameStateShared),
    actionEvent: XCONFIG_ACTION_EVENT_NAME,
  });
})();

