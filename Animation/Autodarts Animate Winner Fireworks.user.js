// ==UserScript==
// @name         Autodarts Animate Winner Fireworks
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
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
   * @property {string} winnerSelector - CSS-Selektor fuer den Gewinner-Bereich.
   * @property {string} overlayId - ID fuer das Overlay.
   * @property {string} styleId - ID fuer das Style-Tag.
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
    rocketIntervalMs: 420,
    maxRockets: 6,
    maxParticles: 320,
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

  function pickColor() {
    const index = Math.floor(Math.random() * CONFIG.colors.length);
    return CONFIG.colors[index];
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

  function explodeRocket(rocket) {
    const burstCount = Math.floor(
      randomBetween(CONFIG.burstParticlesMin, CONFIG.burstParticlesMax)
    );
    for (let i = 0; i < burstCount; i += 1) {
      if (particles.length >= CONFIG.maxParticles) {
        break;
      }
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(CONFIG.burstSpeedMin, CONFIG.burstSpeedMax);
      const lifeMs = randomBetween(CONFIG.particleLifeMinMs, CONFIG.particleLifeMaxMs);
      particles.push({
        x: rocket.x,
        y: rocket.y,
        prevX: rocket.x,
        prevY: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rocket.color,
        ageMs: 0,
        lifeMs,
        size: randomBetween(1.4, 3.2),
      });
    }
  }

  function updateRockets(step) {
    for (let i = rockets.length - 1; i >= 0; i -= 1) {
      const rocket = rockets[i];
      rocket.prevX = rocket.x;
      rocket.prevY = rocket.y;
      rocket.vy += CONFIG.gravity * 0.35 * step;
      rocket.x += rocket.vx * step;
      rocket.y += rocket.vy * step;

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
      particle.vx *= CONFIG.friction;
      particle.vy *= CONFIG.friction;
      particle.vy += CONFIG.gravity * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.ageMs += dt;
      if (particle.ageMs >= particle.lifeMs) {
        particles.splice(i, 1);
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
      const alpha = 1 - progress;
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

  function render() {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
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
    document.addEventListener("pointerdown", dismissHandler, { capture: true, once: true });
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
      if (
        mutation.type === "childList" ||
        mutation.type === "attributes"
      ) {
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
