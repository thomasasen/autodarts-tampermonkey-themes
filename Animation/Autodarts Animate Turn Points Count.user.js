// ==UserScript==
// @name         Autodarts Animate Turn Points Count
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1
// @description  Animiert die Turn-Punkte beim Wechsel nach oben oder unten.
// @xconfig-description  Lässt Punkteänderungen fließend zählen, damit Score-Sprünge leichter erfasst werden.
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
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js
// ==/UserScript==

(function () {
	"use strict";

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

	function debugWarn(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.warn(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.warn(`${DEBUG_PREFIX} ${event}`, payload);
	}

	function debugError(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.error(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.error(`${DEBUG_PREFIX} ${event}`, payload);
	}
	function resolveNumberChoice(value, fallbackValue, allowedValues) {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
			? numericValue
			: fallbackValue;
	}

	const RESOLVED_ANIMATION_MS = resolveNumberChoice(xConfig_ANIMATIONSDAUER_MS, 416, [
		260,
		416,
		650,
	]);

	const {createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script goal: count turn points up/down smoothly instead of jumping.
	/**
   * Configuration for the point counter animation.
   * @property {string} scoreSelector - Selector for turn points, e.g. "p.ad-ext-turn-points".
   * @property {number} animationMs - Count animation duration in ms, e.g. 416.
   */
	const CONFIG = {
		scoreSelector: "p.ad-ext-turn-points",
		animationMs: RESOLVED_ANIMATION_MS
	};

	// Stores the last known value per element.
	const lastValues = new WeakMap();
	// Tracks active animations so they can be canceled.
	const activeAnimations = new WeakMap();
	// Prevents overlapping updates while an element animates.
	const animatingNodes = new WeakSet();
	// Tracks target values for active animations.
	const animationTargets = new WeakMap();
	// Tracks the last rendered value to detect external updates.
	const renderedValues = new WeakMap();

	/**
   * Reads a number from text, e.g. "-60" or "100".
   * @param {string|null} text - Text content of the turn points element.
   * @example
   * parseScore("-60"); // => -60
   * @returns {number|null}
   */
	function parseScore(text) {
		if (! text) {
			return null;
		}
		const match = text.match(/-?\d+/);
		if (! match) {
			return null;
		}
		return Number(match[0]);
	}

	/**
   * Easing function for smooth decay.
   * @param {number} t - Fortschritt 0..1.
   * @example
   * easeOutCubic(0.5); // => 0.875
   * @returns {number}
   */
	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	/**
   * Cancels any running animation and clears state.
   * @param {Element} element - Target element for the display.
   * @returns {void}
   */
	function cancelAnimation(element) {
		const handle = activeAnimations.get(element);
		if (handle) {
			cancelAnimationFrame(handle);
		}
		activeAnimations.delete(element);
		animatingNodes.delete(element);
		animationTargets.delete(element);
		renderedValues.delete(element);
	}

	/**
   * Animates the display value from fromValue to toValue.
   * @param {Element} element - Target element for the display.
   * @param {number} fromValue - Starting value, e.g. 0.
   * @param {number} toValue - Target value, e.g. 60.
   * @returns {void}
   */
	function animateValue(element, fromValue, toValue) {
		cancelAnimation(element);
		const start = performance.now();
		animatingNodes.add(element);
		animationTargets.set(element, toValue);
		renderedValues.set(element, fromValue);

		function step(now) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / CONFIG.animationMs, 1);
			const eased = easeOutCubic(progress);
			const current = Math.round(fromValue + (toValue - fromValue) * eased);
			element.textContent = String(current);
			renderedValues.set(element, current);
			if (progress < 1) {
				const handle = requestAnimationFrame(step);
				activeAnimations.set(element, handle);
			} else {
				cancelAnimation(element);
				lastValues.set(element, toValue);
			}
		}

		const handle = requestAnimationFrame(step);
		activeAnimations.set(element, handle);
	}

	/**
   * Compares current values with the last state and animates on change.
   * @returns {void}
   */
	function updateScores() {
		const nodes = document.querySelectorAll(CONFIG.scoreSelector);
		nodes.forEach((node) => {
			const currentValue = parseScore(node.textContent);
			if (currentValue === null) {
				return;
			}
			if (! lastValues.has(node)) {
				lastValues.set(node, currentValue);
				return;
			}
			if (animatingNodes.has(node)) {
				const rendered = renderedValues.get(node);
				const target = animationTargets.get(node);
				if (currentValue === rendered || currentValue === target) {
					return;
				}
				const fallbackFrom = Number.isFinite(rendered) ? rendered : lastValues.get(node);
				const fromValue = Number.isFinite(fallbackFrom) ? fallbackFrom : currentValue;
				animateValue(node, fromValue, currentValue);
				return;
			}
			const previousValue = lastValues.get(node);
			if (previousValue !== currentValue) {
				animateValue(node, previousValue, currentValue);
			}
		});
	}

	/**
   * Coalesces DOM changes into a single update per frame.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateScores);

	updateScores();

	// Observes text/DOM changes to detect new turn points.
	debugLog("applied");
	observeMutations({onChange: scheduleUpdate});
	debugLog("init", { debug: DEBUG_ENABLED });
})();

