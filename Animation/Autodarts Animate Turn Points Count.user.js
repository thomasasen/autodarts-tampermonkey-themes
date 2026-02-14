// ==UserScript==
// @name         Autodarts Animate Turn Points Count
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.0
// @description  Animiert Turn-Points kurz hoch oder runter statt hart zu springen.
// @xconfig-description  Zaehlt die Turn-Punkte bei Aenderungen kurz hoch oder runter, um Score-Spruenge besser lesbar zu machen.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-turn-points-count
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

	const {createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script goal: count turn points up/down smoothly instead of jumping.
	/**
   * Configuration for the point counter animation.
   * @property {string} scoreSelector - Selector for turn points, e.g. "p.ad-ext-turn-points".
   * @property {number} animationMs - Count animation duration in ms, e.g. 416.
   */
	const CONFIG = {
		scoreSelector: "p.ad-ext-turn-points",
		animationMs: 416
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
	observeMutations({onChange: scheduleUpdate});
})();
