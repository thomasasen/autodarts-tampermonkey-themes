// ==UserScript==
// @name         Autodarts Animate Checkout Score Pulse
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Lässt das von Autodarts vorgeschlagene Feld zum Erreichen des Checkouts und das Checkoutfeld selbst in einer konfigurierbaren Farbe am Board aufblinken.
// @xconfig-description  Lässt das von Autodarts vorgeschlagene Feld zum Erreichen des Checkouts und das Checkoutfeld selbst in einer konfigurierbaren Farbe am Board aufblinken.
// @xconfig-variant      x01
// @xconfig-readme-anchor  animation-autodarts-animate-checkout-score-pulse
// @xconfig-background     assets/animation-checkout-score-pulse-xConfig.gif
// @xconfig-settings-version 2
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Score%20Pulse.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Score%20Pulse.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Effekt","description":"Legt den visuellen Effekt für checkout-fähige Scores fest.","options":[{"value":"pulse","label":"Pulse"},{"value":"glow","label":"Glow"},{"value":"scale","label":"Scale"},{"value":"blink","label":"Blink"}]}
	const xConfig_EFFEKT = "scale";
	// xConfig: {"type":"select","label":"Farbthema","description":"Farbton für Highlight und Glow des Scores.","options":[{"value":"159, 219, 88","label":"Grün (Standard)"},{"value":"56, 189, 248","label":"Cyan"},{"value":"245, 158, 11","label":"Amber"},{"value":"248, 113, 113","label":"Rot"}]}
	const xConfig_FARBTHEMA = "159, 219, 88";

	function resolveStringChoice(value, fallbackValue, allowedValues) {
		const normalizedValue = String(value || "").trim();
		return allowedValues.includes(normalizedValue)
			? normalizedValue
			: fallbackValue;
	}

	const EFFECT = resolveStringChoice(xConfig_EFFEKT, "scale", ["pulse", "glow", "scale", "blink"]);
	const PULSE_COLOR = resolveStringChoice(xConfig_FARBTHEMA, "159, 219, 88", [
		"159, 219, 88",
		"56, 189, 248",
		"245, 158, 11",
		"248, 113, 113",
	]);

	const {ensureStyle, createRafScheduler, observeMutations, isX01Variant} = window.autodartsAnimationShared;
	const gameStateShared = window.autodartsGameStateShared || null;

	const STYLE_ID = "autodarts-animate-checkout-style";
	const HIGHLIGHT_CLASS = "ad-ext-checkout-possible";
	const SCORE_SELECTOR = "p.ad-ext-player-score";
	const ACTIVE_SCORE_SELECTOR = ".ad-ext-player.ad-ext-player-active p.ad-ext-player-score, " + ".ad-ext-player-active p.ad-ext-player-score";
	const SUGGESTION_SELECTOR = ".suggestion";
	const VARIANT_ELEMENT_ID = "ad-ext-game-variant";
	const IMPOSSIBLE_CHECKOUTS = new Set([
		169,
		168,
		166,
		165,
		163,
		162,
		159
	]);

	// Effect for the highlighted checkout score: "pulse" | "glow" | "scale" | "blink"
	// pulse = scale + glow, glow = glow only, scale = scale only, blink = on/off
	const EFFECT_CLASSES = {
		pulse: "ad-ext-checkout-possible--pulse",
		glow: "ad-ext-checkout-possible--glow",
		scale: "ad-ext-checkout-possible--scale",
		blink: "ad-ext-checkout-possible--blink"
	};

	const STYLE_TEXT = `
@keyframes ad-ext-checkout-pulse {
  0% {
    transform: scale(1);
    opacity: 1;
    text-shadow: 0 0 2px rgba(${PULSE_COLOR}, 0.2);
  }
  50% {
    transform: scale(1.1);
    opacity: 0.92;
    text-shadow: 0 0 16px rgba(${PULSE_COLOR}, 0.8);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    text-shadow: 0 0 2px rgba(${PULSE_COLOR}, 0.2);
  }
}

.${HIGHLIGHT_CLASS} {
  display: inline-block;
  transform-origin: center;
}

.${
		EFFECT_CLASSES.pulse
	} {
  animation: ad-ext-checkout-pulse 1.4s ease-in-out infinite;
}

.${
		EFFECT_CLASSES.glow
	} {
  animation: ad-ext-checkout-glow 1.8s ease-in-out infinite;
}

.${
		EFFECT_CLASSES.scale
	} {
  animation: ad-ext-checkout-scale 1.2s ease-in-out infinite;
}

.${
		EFFECT_CLASSES.blink
	} {
  animation: ad-ext-checkout-blink 0.9s ease-in-out infinite;
}

@keyframes ad-ext-checkout-glow {
  0% {
    text-shadow: 0 0 4px rgba(${PULSE_COLOR}, 0.35);
  }
  50% {
    text-shadow: 0 0 16px rgba(${PULSE_COLOR}, 0.9);
  }
  100% {
    text-shadow: 0 0 4px rgba(${PULSE_COLOR}, 0.35);
  }
}

@keyframes ad-ext-checkout-scale {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes ad-ext-checkout-blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
}
`;

	function parseScore(text) {
		if (! text) {
			return null;
		}
		const match = text.match(/\d+/);
		if (! match) {
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
		return parseScore(node ?. textContent || "");
	}

	function isCheckoutPossibleFromScore(score) {
		if (!Number.isFinite(score)) {
			return false;
		}
		if (score <= 1 || score > 170) {
			return false;
		}
		return ! IMPOSSIBLE_CHECKOUTS.has(score);
	}

	function getCheckoutSuggestionState() {
		const suggestion = document.querySelector(SUGGESTION_SELECTOR);
		if (! suggestion) {
			return null;
		}
		const text = suggestion.textContent || "";
		const normalized = text.replace(/\s+/g, " ").trim().toUpperCase();
		if (! normalized) {
			return null;
		}
		if (/NO\s*(OUT|CHECKOUT|SHOT)/.test(normalized)) {
			return false;
		}
		if (/BUST/.test(normalized)) {
			return false;
		}
		if (/D\s*[-:]?\s*\d+/.test(normalized)) {
			return true;
		}
		if (/DOUBLE\s*\d+/.test(normalized)) {
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
			return activeScores;
		}
		return document.querySelectorAll(SCORE_SELECTOR);
	}

	// Prefer the checkout suggestion text; fall back to score math in X01.
	function updateScoreHighlights() {
		const isX01 = gameStateShared && typeof gameStateShared.isX01Variant === "function" ? gameStateShared.isX01Variant({
			allowMissing: true,
			allowEmpty: true,
			allowNumeric: true
		}) : isX01Variant(VARIANT_ELEMENT_ID, {
			allowMissing: true,
			allowEmpty: true,
			allowNumeric: true
		});
		const suggestionState = getCheckoutSuggestionState();
		const shouldHighlight = isX01 ? suggestionState !== null ? suggestionState : isCheckoutPossibleFromScore(getActiveScoreValue()) : false;
		const effectClass = EFFECT_CLASSES[EFFECT] || EFFECT_CLASSES.pulse;
		const effectClassList = Object.values(EFFECT_CLASSES);
		const scoreNodes = getScoreNodes();
		scoreNodes.forEach((node) => {
			if (shouldHighlight) {
				node.classList.add(HIGHLIGHT_CLASS);
				effectClassList.forEach((cls) => {
					node.classList.toggle(cls, cls === effectClass);
				});
			} else {
				node.classList.remove(HIGHLIGHT_CLASS);
				effectClassList.forEach((cls) => {
					node.classList.remove(cls);
				});
			}
		});
	}

	const scheduleUpdate = createRafScheduler(updateScoreHighlights);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateScoreHighlights();

	observeMutations({onChange: scheduleUpdate});
})();
