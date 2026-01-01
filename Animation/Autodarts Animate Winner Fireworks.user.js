// ==UserScript==
// @name         Autodarts Animate Winner Fireworks
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.1
// @description  Zeigt ein vollflaechiges Feuerwerk, wenn ein Gewinner erscheint. Ein Klick blendet es aus.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Konfiguration fuer das Feuerwerk.
   * effect:
   * - "classic": Runder Standard-Burst mit klaren Trails und hellem Center-Flash.
   * - "ring": Zwei saubere Ringe mit dichtem Kreis und kurzem Nachgluehen.
   * - "cascade": Willow-Stil mit langen, fallenden Trails und Glitter-Funken.
   * - "spiral": Pinwheel-Spirale mit rotierenden Speichen und weichem Verlauf.
   * - "sparkle": Dichte Strobe-Explosion mit vielen kurzen Funkenspitzen.
   * @property {string} winnerSelector - CSS-Selektor fuer den Gewinner-Bereich.
   * @property {string} overlayId - ID fuer das Overlay.
   * @property {string} styleId - ID fuer das Style-Tag.
   * @property {string} effect - Ausgewaehlter Effekt (siehe Liste oben).
   * @property {number} rocketIntervalMs - Abstand zwischen Raketen.
   * @property {number} maxRockets - Maximale gleichzeitige Raketen.
   * @property {number} maxParticles - Maximale Partikelanzahl.
   * @property {number} burstParticlesMin - Minimale Partikel pro Explosion.
   * @property {number} burstParticlesMax - Maximale Partikel pro Explosion.
   * @property {number} rocketSpeedMin - Minimale Startgeschwindigkeit der Rakete.
   * @property {number} rocketSpeedMax - Maximale Startgeschwindigkeit der Rakete.
   * @property {number} burstSpeedMin - Minimale Partikelgeschwindigkeit.
   * @property {number} burstSpeedMax - Maximale Partikelgeschwindigkeit.
   * @property {number} particleLifeMinMs - Minimale Lebensdauer der Partikel.
   * @property {number} particleLifeMaxMs - Maximale Lebensdauer der Partikel.
   * @property {number} gravity - Schwerkraft pro Frame.
   * @property {number} friction - Reibung pro Frame.
   * @property {string[]} colors - Farbpalette fuer Explosionen.
   */
  const CONFIG = {
    winnerSelector: ".ad-ext_winner-animation, .ad-ext-player-winner",
    overlayId: "ad-ext-winner-fireworks",
    styleId: "ad-ext-winner-fireworks-style",
    effect: "classic",
    rocketIntervalMs: 420,
    maxRockets: 6,
    maxParticles: 420,
    burstParticlesMin: 28,
    burstParticlesMax: 52,
    rocketSpeedMin: 6.2,
    rocketSpeedMax: 8.8,
    burstSpeedMin: 1.4,
    burstSpeedMax: 4.6,
    particleLifeMinMs: 900,
    particleLifeMaxMs: 1500,
    gravity: 0.06,
    friction: 0.985,
    colors: [
      "#FCE38A",
      "#F38181",
      "#EAFFD0",
      "#95E1D3",
      "#F9ED69",
      "#F08A5D",
      "#B83B5E",
      "#6A2C70",
      "#60A5FA",
      "#34D399",
      "#FB7185",
      "#FBBF24",
    ],
  };

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let animationHandle = null;
  let lastLaunchTime = 0;
  let lastFrameTime = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let running = false;
  let lastWinnerVisible = false;
  let dismissedForCurrentWin = false;
  let rockets = [];
  let particles = [];
  let flashes = [];
  let dismissHandler = null;
  let resizeHandler = null;

  function ensureStyle() {
    if (document.getElementById(CONFIG.styleId)) {
      return;
    }
    const style = document.createElement("style");
    style.id = CONFIG.styleId;
    style.textContent = `
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
}
`;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  function ensureOverlay() {
    if (overlay && canvas && ctx) {
      return true;
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
    ctx = canvas.getContext("2d");
    if (!ctx) {
      destroyOverlay();
      return false;
    }
    resizeCanvas();
    return true;
  }

  function destroyOverlay() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
    canvas = null;
    ctx = null;
  }

  function resizeCanvas() {
    if (!canvas || !ctx) {
      return;
    }
    viewportWidth = Math.max(window.innerWidth || 0, 1);
    viewportHeight = Math.max(window.innerHeight || 0, 1);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewportWidth * dpr);
    canvas.height = Math.floor(viewportHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomSpread(spread) {
    return (Math.random() * 2 - 1) * spread;
  }

  function pickColor() {
    const index = Math.floor(Math.random() * CONFIG.colors.length);
    return CONFIG.colors[index];
  }

  function hexToRgb(hex) {
    if (typeof hex !== "string") {
      return null;
    }
    let value = hex.replace("#", "").trim();
    if (value.length === 3) {
      value = value
        .split("")
        .map((part) => part + part)
        .join("");
    }
    if (value.length !== 6) {
      return null;
    }
    const number = Number.parseInt(value, 16);
    if (Number.isNaN(number)) {
      return null;
    }
    return {
      r: (number >> 16) & 255,
      g: (number >> 8) & 255,
      b: number & 255,
    };
  }

  function addFlash(x, y, color, intensity, lifeMs) {
    if (flashes.length >= 10) {
      return;
    }
    const rgb = hexToRgb(color) || { r: 255, g: 255, b: 255 };
    flashes.push({
      x,
      y,
      radius: randomBetween(140, 260),
      ageMs: 0,
      lifeMs,
      intensity,
      color: rgb,
    });
  }

  function pushParticle(options) {
    if (particles.length >= CONFIG.maxParticles) {
      return false;
    }
    const lifeMs =
      options.lifeMs ??
      randomBetween(CONFIG.particleLifeMinMs, CONFIG.particleLifeMaxMs);
    particles.push({
      x: options.x,
      y: options.y,
      prevX: options.x,
      prevY: options.y,
      vx: options.vx,
      vy: options.vy,
      color: options.color,
      ageMs: 0,
      lifeMs,
      size: options.size ?? randomBetween(1.4, 3.2),
      gravity: options.gravity ?? CONFIG.gravity,
      friction: options.friction ?? CONFIG.friction,
      fadePower: options.fadePower ?? 1,
      twinkleSpeed: options.twinkleSpeed ?? 0,
      twinklePhase: options.twinklePhase ?? 0,
      glow: options.glow ?? 0,
    });
    return true;
  }

  function spawnRocket() {
    if (rockets.length >= CONFIG.maxRockets) {
      return;
    }
    const x = randomBetween(viewportWidth * 0.1, viewportWidth * 0.9);
    const y = viewportHeight + 16;
    rockets.push({
      x,
      y,
      prevX: x,
      prevY: y,
      vx: randomBetween(-0.35, 0.35),
      vy: -randomBetween(CONFIG.rocketSpeedMin, CONFIG.rocketSpeedMax),
      targetY: randomBetween(viewportHeight * 0.18, viewportHeight * 0.55),
      color: pickColor(),
    });
  }

  function spawnRocketTrail(rocket) {
    if (Math.random() > 0.65) {
      return;
    }
    pushParticle({
      x: rocket.x + randomSpread(2),
      y: rocket.y + randomSpread(2),
      vx: randomBetween(-0.4, 0.4),
      vy: randomBetween(0.4, 1.4),
      color: rocket.color,
      lifeMs: randomBetween(280, 520),
      size: randomBetween(0.9, 1.8),
      gravity: CONFIG.gravity * 0.6,
      friction: 0.9,
      fadePower: 2,
      twinkleSpeed: randomBetween(12, 18),
      twinklePhase: randomBetween(0, Math.PI * 2),
      glow: 1.8,
    });
  }

  function spawnEffectClassic(rocket) {
    const burstCount = Math.floor(
      randomBetween(CONFIG.burstParticlesMin, CONFIG.burstParticlesMax)
    );
    for (let i = 0; i < burstCount; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(CONFIG.burstSpeedMin, CONFIG.burstSpeedMax);
      pushParticle({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rocket.color,
        fadePower: 1.1,
        glow: 2.6,
      });
    }
    addFlash(rocket.x, rocket.y, rocket.color, 0.6, 260);
  }

  function spawnEffectRing(rocket) {
    const ringCount = Math.floor(randomBetween(26, 42));
    const innerCount = Math.floor(ringCount * 0.65);
    const ringSpeed = randomBetween(
      CONFIG.burstSpeedMax * 0.75,
      CONFIG.burstSpeedMax * 1.05
    );
    const innerSpeed = ringSpeed * 0.65;

    for (let i = 0; i < ringCount; i += 1) {
      const angle = (i / ringCount) * Math.PI * 2 + randomSpread(0.08);
      const speed = ringSpeed + randomSpread(0.3);
      pushParticle({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rocket.color,
        size: randomBetween(2.1, 3.4),
        fadePower: 1.2,
        glow: 3.2,
      });
    }

    for (let i = 0; i < innerCount; i += 1) {
      const angle = (i / innerCount) * Math.PI * 2 + randomSpread(0.1);
      const speed = innerSpeed + randomSpread(0.25);
      pushParticle({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: "#ffffff",
        size: randomBetween(1.3, 2.4),
        fadePower: 1.35,
        glow: 2.2,
      });
    }
    addFlash(rocket.x, rocket.y, rocket.color, 0.7, 300);
  }

  function spawnEffectCascade(rocket) {
    const burstCount = Math.floor(randomBetween(30, 54));
    for (let i = 0; i < burstCount; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1.1, 3.1);
      pushParticle({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rocket.color,
        lifeMs: randomBetween(1400, 2200),
        size: randomBetween(2.2, 3.8),
        gravity: CONFIG.gravity * 1.15,
        friction: 0.988,
        fadePower: 1.5,
        glow: 2.6,
      });

      if (Math.random() < 0.35) {
        pushParticle({
          x: rocket.x + randomSpread(6),
          y: rocket.y + randomSpread(6),
          vx: randomBetween(-0.6, 0.6),
          vy: randomBetween(-0.4, 0.8),
          color: "#ffffff",
          lifeMs: randomBetween(700, 1100),
          size: randomBetween(0.9, 1.6),
          gravity: CONFIG.gravity * 0.9,
          friction: 0.9,
          fadePower: 1.8,
          twinkleSpeed: randomBetween(16, 24),
          twinklePhase: randomBetween(0, Math.PI * 2),
          glow: 2.2,
        });
      }
    }
    addFlash(rocket.x, rocket.y, rocket.color, 0.55, 340);
  }

  function spawnEffectSpiral(rocket) {
    const burstCount = Math.floor(randomBetween(32, 58));
    const baseSpeed = randomBetween(2.4, 4.6);
    const spin = randomBetween(0.55, 0.95);
    for (let i = 0; i < burstCount; i += 1) {
      const angle = (i / burstCount) * Math.PI * 2 + randomSpread(0.12);
      const radial = baseSpeed + randomSpread(0.6);
      const tangential = radial * spin;
      const vx = Math.cos(angle) * radial - Math.sin(angle) * tangential;
      const vy = Math.sin(angle) * radial + Math.cos(angle) * tangential;
      pushParticle({
        x: rocket.x,
        y: rocket.y,
        vx,
        vy,
        color: rocket.color,
        lifeMs: randomBetween(950, 1500),
        size: randomBetween(1.6, 2.8),
        gravity: CONFIG.gravity * 0.9,
        friction: 0.985,
        fadePower: 1.15,
        glow: 2.8,
      });
    }
    addFlash(rocket.x, rocket.y, rocket.color, 0.6, 280);
  }

  function spawnEffectSparkle(rocket) {
    const burstCount = Math.floor(randomBetween(44, 74));
    for (let i = 0; i < burstCount; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1.8, 5.4);
      pushParticle({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rocket.color,
        lifeMs: randomBetween(720, 1200),
        size: randomBetween(0.9, 2.1),
        gravity: CONFIG.gravity * 0.8,
        friction: 0.96,
        fadePower: 1.7,
        twinkleSpeed: randomBetween(18, 28),
        twinklePhase: randomBetween(0, Math.PI * 2),
        glow: 3.4,
      });

      if (Math.random() < 0.18) {
        pushParticle({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * (speed * 0.45),
          vy: Math.sin(angle) * (speed * 0.45),
          color: "#ffffff",
          lifeMs: randomBetween(420, 720),
          size: randomBetween(2.2, 3.4),
          gravity: CONFIG.gravity * 0.5,
          friction: 0.92,
          fadePower: 2.1,
          glow: 4.2,
        });
      }
    }
    addFlash(rocket.x, rocket.y, rocket.color, 0.8, 240);
  }

  const EFFECTS = {
    classic: spawnEffectClassic,
    ring: spawnEffectRing,
    cascade: spawnEffectCascade,
    spiral: spawnEffectSpiral,
    sparkle: spawnEffectSparkle,
  };

  function explodeRocket(rocket) {
    const effect = EFFECTS[CONFIG.effect] ? CONFIG.effect : "classic";
    EFFECTS[effect](rocket);
  }

  function updateRockets(step) {
    for (let i = rockets.length - 1; i >= 0; i -= 1) {
      const rocket = rockets[i];
      rocket.prevX = rocket.x;
      rocket.prevY = rocket.y;
      rocket.vy += CONFIG.gravity * 0.35 * step;
      rocket.x += rocket.vx * step;
      rocket.y += rocket.vy * step;
      spawnRocketTrail(rocket);

      if (rocket.y <= rocket.targetY || rocket.vy >= 0) {
        explodeRocket(rocket);
        rockets.splice(i, 1);
      }
    }
  }

  function updateParticles(step, dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.prevX = particle.x;
      particle.prevY = particle.y;
      const friction = particle.friction ?? CONFIG.friction;
      const gravity = particle.gravity ?? CONFIG.gravity;
      particle.vx *= friction;
      particle.vy *= friction;
      particle.vy += gravity * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.ageMs += dt;
      if (particle.ageMs >= particle.lifeMs) {
        particles.splice(i, 1);
      }
    }
  }

  function updateFlashes(dt) {
    for (let i = flashes.length - 1; i >= 0; i -= 1) {
      const flash = flashes[i];
      flash.ageMs += dt;
      if (flash.ageMs >= flash.lifeMs) {
        flashes.splice(i, 1);
      }
    }
  }

  function drawRockets() {
    for (const rocket of rockets) {
      ctx.strokeStyle = rocket.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(rocket.prevX, rocket.prevY);
      ctx.lineTo(rocket.x, rocket.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      const progress = Math.min(particle.ageMs / particle.lifeMs, 1);
      let alpha = Math.max(1 - progress, 0);
      if (particle.fadePower && particle.fadePower !== 1) {
        alpha = Math.pow(alpha, particle.fadePower);
      }
      if (particle.twinkleSpeed) {
        alpha *=
          0.55 +
          0.45 *
            Math.sin(particle.twinklePhase + progress * particle.twinkleSpeed);
      }
      if (alpha <= 0.01) {
        continue;
      }

      if (particle.glow) {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.glow, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = particle.size;
      ctx.beginPath();
      ctx.moveTo(particle.prevX, particle.prevY);
      ctx.lineTo(particle.x, particle.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlashes() {
    for (const flash of flashes) {
      const progress = Math.min(flash.ageMs / flash.lifeMs, 1);
      const alpha = (1 - progress) * flash.intensity;
      if (alpha <= 0.01) {
        continue;
      }
      const radius = flash.radius * (0.6 + progress * 0.4);
      const gradient = ctx.createRadialGradient(
        flash.x,
        flash.y,
        0,
        flash.x,
        flash.y,
        radius
      );
      gradient.addColorStop(
        0,
        `rgba(${flash.color.r}, ${flash.color.g}, ${flash.color.b}, ${alpha})`
      );
      gradient.addColorStop(
        0.35,
        `rgba(${flash.color.r}, ${flash.color.g}, ${flash.color.b}, ${
          alpha * 0.6
        })`
      );
      gradient.addColorStop(
        1,
        `rgba(${flash.color.r}, ${flash.color.g}, ${flash.color.b}, 0)`
      );
      ctx.fillStyle = gradient;
      ctx.fillRect(flash.x - radius, flash.y - radius, radius * 2, radius * 2);
    }
  }

  function render() {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawFlashes();
    drawRockets();
    drawParticles();
    ctx.restore();
  }

  function animate(now) {
    if (!running) {
      return;
    }
    const dt = Math.min(now - lastFrameTime, 40);
    lastFrameTime = now;
    const step = dt / 16.67;

    if (now - lastLaunchTime >= CONFIG.rocketIntervalMs) {
      if (particles.length < CONFIG.maxParticles) {
        spawnRocket();
      }
      lastLaunchTime = now;
    }

    updateRockets(step);
    updateParticles(step, dt);
    updateFlashes(dt);
    render();
    animationHandle = requestAnimationFrame(animate);
  }

  function showFireworks() {
    if (running || dismissedForCurrentWin) {
      return;
    }
    ensureStyle();
    if (!ensureOverlay()) {
      return;
    }
    running = true;
    rockets = [];
    particles = [];
    lastLaunchTime = performance.now() - CONFIG.rocketIntervalMs;
    lastFrameTime = performance.now();

    if (!dismissHandler) {
      dismissHandler = () => {
        dismissedForCurrentWin = true;
        hideFireworks();
      };
    }
    if (!resizeHandler) {
      resizeHandler = () => {
        resizeCanvas();
      };
    }
    document.addEventListener("pointerdown", dismissHandler, {
      capture: true,
      once: true,
    });
    window.addEventListener("resize", resizeHandler);
    animationHandle = requestAnimationFrame(animate);
  }

  function hideFireworks() {
    if (!running) {
      return;
    }
    running = false;
    if (animationHandle) {
      cancelAnimationFrame(animationHandle);
      animationHandle = null;
    }
    if (dismissHandler) {
      document.removeEventListener("pointerdown", dismissHandler, true);
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }
    destroyOverlay();
    rockets = [];
    particles = [];
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
      showFireworks();
    } else if (!visible && lastWinnerVisible) {
      dismissedForCurrentWin = false;
      hideFireworks();
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
