// ==UserScript==
// @name         Autodarts Animate Winner Fireworks
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.0
// @description  Zeigt nach dem Sieg einen visuellen Gewinner-Effekt (Firework, Confetti, Aurora, Pulse).
// @xconfig-description  Blendet beim Gewinner ein Overlay mit konfigurierbarem Effekt ein; Klick blendet es wieder aus.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-winner-fireworks
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {ensureStyle} = window.autodartsAnimationShared;

	/**
   * Konfiguration fuer Gewinner-Effekte.
   * effect:
   * - "firework": Feuerwerk-Ring mit Doppelkranz, Glitter und hellem Flash.
   * - "confetti": Bunter Konfetti-Regen mit leichter Drift.
   * - "aurora": Weiche Leuchtbaender mit Sternfunkeln.
   * - "pulse": Neon-Pulsringe, die ueber den Screen wandern.
   * @property {string} winnerSelector - CSS-Selektor fuer den Gewinner-Bereich.
   * @property {string} overlayId - ID fuer das Overlay.
   * @property {string} styleId - ID fuer das Style-Tag.
   * @property {string} effect - Ausgewaehlter Effekt (siehe Liste oben).
   * @property {boolean} dynamicFps - Aktiviert dynamische FPS-Drosselung.
   * @property {number} fpsHigh - Oberes FPS-Ziel fuer dynamische Drosselung.
   * @property {number} fpsLow - Unteres FPS-Ziel fuer dynamische Drosselung.
   * @property {number} fpsDownshiftMs - Frame-Zeit in ms, ab der auf fpsLow gewechselt wird.
   * @property {number} fpsUpshiftMs - Frame-Zeit in ms, ab der wieder auf fpsHigh gewechselt wird.
   * @property {number} fpsAdjustCooldownMs - Mindestabstand zwischen FPS-Umschaltungen (ms).
   * @property {boolean} autoReduceParticles - Reduziert Partikel je nach Geraet (optional).
   * @property {number} minQualityScale - Minimale Skalierung bei autoReduceParticles.
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
   * @property {number} confettiCount - Anzahl der Konfetti-Elemente.
   * @property {number} auroraBandCount - Anzahl der Aurora-Baender.
   * @property {number} auroraStarCount - Anzahl der Sterne fuer Aurora.
   * @property {number} pulseIntervalMs - Abstand zwischen Pulsringen.
   * @property {string[]} colors - Farbpalette fuer Effekte.
   */
	const CONFIG = {
		winnerSelector: ".ad-ext_winner-animation, .ad-ext-player-winner",
		overlayId: "ad-ext-winner-fireworks",
		styleId: "ad-ext-winner-fireworks-style",
		effect: "confetti",
		dynamicFps: true,
		fpsHigh: 60,
		fpsLow: 30,
		fpsDownshiftMs: 22,
		fpsUpshiftMs: 18,
		fpsAdjustCooldownMs: 900,
		autoReduceParticles: true,
		minQualityScale: 0.45,
		rocketIntervalMs: 360,
		maxRockets: 7,
		maxParticles: 480,
		burstParticlesMin: 36,
		burstParticlesMax: 60,
		rocketSpeedMin: 6.6,
		rocketSpeedMax: 9.4,
		burstSpeedMin: 1.6,
		burstSpeedMax: 4.9,
		particleLifeMinMs: 1000,
		particleLifeMaxMs: 1700,
		gravity: 0.06,
		friction: 0.985,
		confettiCount: 150,
		auroraBandCount: 3,
		auroraStarCount: 80,
		pulseIntervalMs: 520,
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
		]
	};

	let overlay = null;
	let canvas = null;
	let ctx = null;
	let animationHandle = null;
	let lastLaunchTime = 0;
	let lastFrameTime = 0;
	let lastRafTime = 0;
	let viewportWidth = 0;
	let viewportHeight = 0;
	let running = false;
	let lastWinnerVisible = false;
	let dismissedForCurrentWin = false;
	let rockets = [];
	let particles = [];
	let flashes = [];
	let confettiPieces = [];
	let auroraBands = [];
	let auroraStars = [];
	let pulseRings = [];
	let activeEffect = null;
	let dismissHandler = null;
	let resizeHandler = null;
	let lastPulseTime = 0;
	let qualityScale = 1;
	let targetFps = CONFIG.fpsHigh;
	let frameIntervalMs = 1000 / targetFps;
	let rafDtAverage = frameIntervalMs;
	let lastFpsAdjustTime = 0;
	let qualityLimits = {
		maxRockets: CONFIG.maxRockets,
		maxParticles: CONFIG.maxParticles,
		burstParticlesMin: CONFIG.burstParticlesMin,
		burstParticlesMax: CONFIG.burstParticlesMax,
		confettiCount: CONFIG.confettiCount,
		auroraStarCount: CONFIG.auroraStarCount
	};

	const STYLE_TEXT = `
#${
		CONFIG.overlayId
	} {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 999999;
}

#${
		CONFIG.overlayId
	} canvas {
  width: 100%;
  height: 100%;
  display: block;
}
`;

	function ensureOverlay() {
		if (overlay && canvas && ctx) {
			return true;
		}
		const container = document.body || document.documentElement;
		if (! container) {
			return false;
		}
		overlay = document.createElement("div");
		overlay.id = CONFIG.overlayId;
		canvas = document.createElement("canvas");
		overlay.appendChild(canvas);
		container.appendChild(overlay);
		ctx = canvas.getContext("2d");
		if (! ctx) {
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
		if (! canvas || ! ctx) {
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
		return(Math.random() * 2 - 1) * spread;
	}

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function setTargetFps(nextFps, now) {
		const safeFps = clamp(nextFps, 15, 120);
		targetFps = safeFps;
		frameIntervalMs = 1000 / targetFps;
		lastFpsAdjustTime = now;
	}

	function resetDynamicFps() {
		const initialFps = CONFIG.fpsHigh || 60;
		targetFps = initialFps;
		frameIntervalMs = 1000 / targetFps;
		rafDtAverage = frameIntervalMs;
		lastFpsAdjustTime = 0;
		lastRafTime = 0;
	}

	function updateDynamicFps(now, rafDt) {
		if (! CONFIG.dynamicFps) {
			return;
		}
		const smoothing = 0.12;
		rafDtAverage += (rafDt - rafDtAverage) * smoothing;
		const cooldown = CONFIG.fpsAdjustCooldownMs ?? 900;
		if (lastFpsAdjustTime && now - lastFpsAdjustTime < cooldown) {
			return;
		}
		if (targetFps > CONFIG.fpsLow && rafDtAverage > CONFIG.fpsDownshiftMs) {
			setTargetFps(CONFIG.fpsLow, now);
			return;
		}
		if (targetFps < CONFIG.fpsHigh && rafDtAverage < CONFIG.fpsUpshiftMs) {
			setTargetFps(CONFIG.fpsHigh, now);
		}
	}

	function getQualityScale() {
		if (! CONFIG.autoReduceParticles) {
			return 1;
		}
		let scale = 1;
		const memory = navigator.deviceMemory || 0;
		const cores = navigator.hardwareConcurrency || 0;
		if (memory && memory <= 4) {
			scale *= 0.8;
		}
		if (memory && memory <= 2) {
			scale *= 0.65;
		}
		if (cores && cores <= 4) {
			scale *= 0.8;
		}
		if (cores && cores <= 2) {
			scale *= 0.65;
		}
		if (typeof window.matchMedia === "function") {
			const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
			if (reducedMotion && reducedMotion.matches) {
				scale *= 0.6;
			}
		}
		return clamp(scale, CONFIG.minQualityScale, 1);
	}

	function applyQualityScale() {
		qualityScale = getQualityScale();
		const scaleCount = (value, min) => Math.max(min, Math.round(value * qualityScale));
		qualityLimits = {
			maxRockets: scaleCount(CONFIG.maxRockets, 2),
			maxParticles: scaleCount(CONFIG.maxParticles, 120),
			burstParticlesMin: scaleCount(CONFIG.burstParticlesMin, 16),
			burstParticlesMax: scaleCount(CONFIG.burstParticlesMax, 28),
			confettiCount: scaleCount(CONFIG.confettiCount, 60),
			auroraStarCount: scaleCount(CONFIG.auroraStarCount, 40)
		};
		if (qualityLimits.burstParticlesMax<qualityLimits.burstParticlesMin) {
      qualityLimits.burstParticlesMax = qualityLimits.burstParticlesMin;
    }
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
        .map((part) => part + part) .join("");
		

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
		b: number & 255
	};
}

function addFlash(x, y, color, intensity, lifeMs) {
	if (flashes.length >= 10) {
		return;
	}
	const rgb = hexToRgb(color) || {
		r: 255,
		g: 255,
		b: 255
	};
	flashes.push({
		x,
		y,
		radius: randomBetween(150, 280),
		ageMs: 0,
		lifeMs,
		intensity,
		color: rgb
	});
}

function pushParticle(options) {
	if (particles.length >= qualityLimits.maxParticles) {
		return false;
	}
	const lifeMs = options.lifeMs ?? randomBetween(CONFIG.particleLifeMinMs, CONFIG.particleLifeMaxMs);
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
		glow: options.glow ?? 0
	});
	return true;
}

function spawnRocket() {
	if (rockets.length >= qualityLimits.maxRockets) {
		return;
	}
	const x = randomBetween(viewportWidth * 0.12, viewportWidth * 0.88);
	const y = viewportHeight + 16;
	rockets.push({
		x,
		y,
		prevX: x,
		prevY: y,
		vx: randomBetween(-0.4, 0.4),
		vy: -randomBetween(CONFIG.rocketSpeedMin, CONFIG.rocketSpeedMax),
		targetY: randomBetween(viewportHeight * 0.18, viewportHeight * 0.58),
		color: pickColor()
	});
}

function spawnRocketTrail(rocket) {
	if (Math.random() > 0.55) {
		return;
	}
	pushParticle({
		x: rocket.x + randomSpread(2),
		y: rocket.y + randomSpread(2),
		vx: randomBetween(-0.4, 0.4),
		vy: randomBetween(0.6, 1.6),
		color: rocket.color,
		lifeMs: randomBetween(260, 520),
		size: randomBetween(0.9, 1.8),
		gravity: CONFIG.gravity * 0.6,
		friction: 0.9,
		fadePower: 2,
		twinkleSpeed: randomBetween(12, 18),
		twinklePhase: randomBetween(0, Math.PI * 2),
		glow: 1.9
	});
}

function spawnEffectRing(rocket) {
	const ringCount = Math.floor(randomBetween(qualityLimits.burstParticlesMin, qualityLimits.burstParticlesMax));
	const innerCount = Math.floor(ringCount * 0.7);
	const ringSpeed = randomBetween(3.4, 5.2);
	const innerSpeed = ringSpeed * 0.62;

	for (let i = 0; i < ringCount; i += 1) {
		const angle = (i / ringCount) * Math.PI * 2 + randomSpread(0.08);
		const speed = ringSpeed + randomSpread(0.35);
		pushParticle({
			x: rocket.x,
			y: rocket.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			color: rocket.color,
			size: randomBetween(2.2, 3.6),
			fadePower: 1.12,
			glow: 3.2
		});
	}

	for (let i = 0; i < innerCount; i += 1) {
		const angle = (i / innerCount) * Math.PI * 2 + randomSpread(0.12);
		const speed = innerSpeed + randomSpread(0.25);
		pushParticle({
			x: rocket.x,
			y: rocket.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			color: "#ffffff",
			size: randomBetween(1.4, 2.4),
			fadePower: 1.35,
			glow: 2.3
		});
	}

	const sparkleCount = Math.floor(ringCount * 0.35);
	for (let i = 0; i < sparkleCount; i += 1) {
		const angle = randomBetween(0, Math.PI * 2);
		const speed = randomBetween(0.6, 1.6);
		pushParticle({
			x: rocket.x,
			y: rocket.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			color: "#ffffff",
			lifeMs: randomBetween(620, 900),
			size: randomBetween(0.9, 1.6),
			gravity: CONFIG.gravity * 0.7,
			friction: 0.92,
			fadePower: 1.8,
			twinkleSpeed: randomBetween(18, 26),
			twinklePhase: randomBetween(0, Math.PI * 2),
			glow: 2.4
		});
	}

	addFlash(rocket.x, rocket.y, rocket.color, 0.65, 300);
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
			spawnEffectRing(rocket);
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
			alpha *= 0.55 + 0.45 * Math.sin(particle.twinklePhase + progress * particle.twinkleSpeed);
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
		const gradient = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
		gradient.addColorStop(0, `rgba(${
			flash.color.r
		}, ${
			flash.color.g
		}, ${
			flash.color.b
		}, ${alpha})`);
		gradient.addColorStop(0.35, `rgba(${
			flash.color.r
		}, ${
			flash.color.g
		}, ${
			flash.color.b
		}, ${
			alpha * 0.6
		})`);
		gradient.addColorStop(1, `rgba(${
			flash.color.r
		}, ${
			flash.color.g
		}, ${
			flash.color.b
		}, 0)`);
		ctx.fillStyle = gradient;
		ctx.fillRect(flash.x - radius, flash.y - radius, radius * 2, radius * 2);
	}
}

function initFireworkEffect() {
	rockets = [];
	particles = [];
	flashes = [];
	lastLaunchTime = performance.now() - CONFIG.rocketIntervalMs;
}

function updateFireworkEffect(step, dt, now) {
	if (now - lastLaunchTime >= CONFIG.rocketIntervalMs) {
		if (particles.length<qualityLimits.maxParticles) {
        spawnRocket();
      }
      lastLaunchTime = now;
    }
    updateRockets(step);
    updateParticles(step, dt);
    updateFlashes(dt);
  }

  function renderFireworkEffect() {
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

  function resetConfettiPiece(piece, spawnTop) {
    const size = randomBetween(6, 12);
    piece.x = randomBetween(0, viewportWidth);
    piece.y = spawnTop
      ? randomBetween(-viewportHeight, 0)
      : randomBetween(0, viewportHeight);
    piece.vx = randomBetween(-0.35, 0.35);
    piece.vy = randomBetween(1.1, 2.3);
    piece.rotation = randomBetween(0, Math.PI * 2);
    piece.spin = randomBetween(-0.12, 0.12);
    piece.width = size * randomBetween(0.4, 0.9);
    piece.height = size * randomBetween(0.8, 1.6);
    piece.color = pickColor();
    piece.swaySpeed = randomBetween(0.8, 1.6);
    piece.swayOffset = randomBetween(0, Math.PI * 2);
  }

  function initConfettiEffect() {
    confettiPieces = [];
    for (let i = 0; i < qualityLimits.confettiCount; i += 1) {
      const piece = {};
      resetConfettiPiece(piece, true);
      confettiPieces.push(piece);
    }
  }

  function updateConfettiEffect(step) {
    for (const piece of confettiPieces) {
      piece.rotation += piece.spin * step;
      piece.y += piece.vy * step;
      piece.x +=
        piece.vx * step +
        Math.sin(piece.swayOffset + piece.y * 0.02) * piece.swaySpeed;
      if (
        piece.y > viewportHeight + 20 ||
        piece.x < -40 ||
        piece.x > viewportWidth + 40
      ) {
        resetConfettiPiece(piece, true);
      }
    }
  }

  function renderConfettiEffect() {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (const piece of confettiPieces) {
      const flip = Math.abs(Math.cos(piece.rotation));
      ctx.globalAlpha = 0.65 + flip * 0.35;
      ctx.fillStyle = piece.color;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillRect(
        -piece.width / 2, -piece.height / 2, piece.width, piece.height
      );
      ctx.restore();
    }
    ctx.restore();
  }

  function initAuroraEffect() {
    auroraBands = [];
    auroraStars = [];
    for (let i = 0; i < CONFIG.auroraBandCount; i += 1) {
      auroraBands.push({
        baseY: randomBetween(viewportHeight * 0.2, viewportHeight * 0.7), amplitude: randomBetween(40, 120), thickness: randomBetween(28, 60), speed: randomBetween(0.2, 0.45), phase: randomBetween(0, Math.PI * 2), color: pickColor(), alpha: randomBetween(0.15, 0.25), });
    }
    for (let i = 0; i < qualityLimits.auroraStarCount; i += 1) {
      auroraStars.push({
        x: randomBetween(0, viewportWidth), y: randomBetween(0, viewportHeight), size: randomBetween(0.8, 1.8), alpha: randomBetween(0.2, 0.6), twinkleSpeed: randomBetween(1.2, 2.4), phase: randomBetween(0, Math.PI * 2), });
    }
  }

  function updateAuroraEffect(step, dt) {
    const drift = dt * 0.001;
    for (const band of auroraBands) {
      band.phase += band.speed * drift;
    }
    for (const star of auroraStars) {
      star.phase += star.twinkleSpeed * drift;
    }
  }

  function renderAuroraEffect() {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    for (const star of auroraStars) {
      const twinkle = 0.5 + 0.5 * Math.sin(star.phase);
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const band of auroraBands) {
      ctx.globalAlpha = band.alpha;
      ctx.strokeStyle = band.color;
      ctx.lineWidth = band.thickness;
      ctx.shadowBlur = band.thickness * 0.7;
      ctx.shadowColor = band.color;
      ctx.beginPath();
      for (let x = -80; x <= viewportWidth + 80; x += 80) {
        const y =
          band.baseY + Math.sin(x * 0.004 + band.phase) * band.amplitude;
        if (x === -80) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function spawnPulse() {
    const minSide = Math.min(viewportWidth, viewportHeight);
    pulseRings.push({
      x: randomBetween(viewportWidth * 0.28, viewportWidth * 0.72), y: randomBetween(viewportHeight * 0.22, viewportHeight * 0.72), ageMs: 0, lifeMs: randomBetween(1200, 1700), maxRadius: minSide * randomBetween(0.35, 0.55), color: pickColor(), thickness: randomBetween(2.2, 5), });
  }

  function initPulseEffect() {
    pulseRings = [];
    lastPulseTime = performance.now() - CONFIG.pulseIntervalMs;
  }

  function updatePulseEffect(step, dt, now) {
    if (now - lastPulseTime >= CONFIG.pulseIntervalMs) {
      spawnPulse();
      lastPulseTime = now;
    }
    for (let i = pulseRings.length - 1; i >= 0; i -= 1) {
      const pulse = pulseRings[i];
      pulse.ageMs += dt;
      if (pulse.ageMs >= pulse.lifeMs) {
        pulseRings.splice(i, 1);
      }
    }
  }

  function renderPulseEffect() {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const pulse of pulseRings) {
      const progress = Math.min(pulse.ageMs / pulse.lifeMs, 1);
      const radius = pulse.maxRadius * progress;
      const alpha = Math.max(1 - progress, 0);
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = pulse.color;
      ctx.lineWidth = pulse.thickness + progress * 2;
      ctx.shadowBlur = 18;
      ctx.shadowColor = pulse.color;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.35;
      ctx.lineWidth = pulse.thickness + 7;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius * 0.86, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const EFFECTS = {
    firework: {
      start: initFireworkEffect, update: updateFireworkEffect, render: renderFireworkEffect, }, confetti: {
      start: initConfettiEffect, update: updateConfettiEffect, render: renderConfettiEffect, resize: initConfettiEffect, }, aurora: {
      start: initAuroraEffect, update: updateAuroraEffect, render: renderAuroraEffect, resize: initAuroraEffect, }, pulse: {
      start: initPulseEffect, update: updatePulseEffect, render: renderPulseEffect, }, };

  function resolveEffectKey() {
    return EFFECTS[CONFIG.effect] ? CONFIG.effect : "firework";
  }

  function animate(now) {
    if (!running) {
      return;
    }
    const rafDt = lastRafTime ? now - lastRafTime : frameIntervalMs;
    lastRafTime = now;
    updateDynamicFps(now, rafDt);
    const elapsed = now - lastFrameTime;
    if (elapsed < frameIntervalMs) {
      animationHandle = requestAnimationFrame(animate);
      return;
    }
    const dt = Math.min(elapsed, 40);
    lastFrameTime = now;
    const step = dt / 16.67;

    if (activeEffect && activeEffect.update) {
      activeEffect.update(step, dt, now);
    }
    if (activeEffect && activeEffect.render) {
      activeEffect.render();
    }
    animationHandle = requestAnimationFrame(animate);
  }

  function handleResize() {
    resizeCanvas();
    if (activeEffect && activeEffect.resize) {
      activeEffect.resize();
    }
  }

  function showEffect() {
    if (running || dismissedForCurrentWin) {
      return;
    }
    applyQualityScale();
    resetDynamicFps();
    ensureStyle(CONFIG.styleId, STYLE_TEXT);
    if (!ensureOverlay()) {
      return;
    }
    running = true;
    activeEffect = EFFECTS[resolveEffectKey()];
    if (activeEffect && activeEffect.start) {
      activeEffect.start();
    }
    lastFrameTime = performance.now();

    if (!dismissHandler) {
      dismissHandler = () => {
			dismissedForCurrentWin = true;
			hideEffect();
		};
	}
	if (!resizeHandler) {
		resizeHandler = () => {
			handleResize();
		};
	}
	document.addEventListener("pointerdown", dismissHandler, {
		capture: true,
		once: true
	});
	window.addEventListener("resize", resizeHandler);
	animationHandle = requestAnimationFrame(animate);
}

function hideEffect() {
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
	flashes = [];
	confettiPieces = [];
	auroraBands = [];
	auroraStars = [];
	pulseRings = [];
	activeEffect = null;
}

function isWinnerVisible() {
	const node = document.querySelector(CONFIG.winnerSelector);
	if (! node) {
		return false;
	}
	return node.getClientRects().length > 0;
}

function checkWinner() {
	const visible = isWinnerVisible();
	if (visible && !lastWinnerVisible) {
		dismissedForCurrentWin = false;
		showEffect();
	} else if (! visible && lastWinnerVisible) {
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
		attributeFilter: ["class", "style"]
	});
} else {
	document.addEventListener("DOMContentLoaded", () => {
		const fallbackTarget = document.documentElement;
		if (fallbackTarget) {
			observer.observe(fallbackTarget, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class", "style"]
			});
		}
	}, {once: true});
}
})();
