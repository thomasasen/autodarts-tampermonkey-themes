// ==UserScript==
// @name         Autodarts Animate Turn Start Sweep
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.1
// @description  Zeigt beim Start eines neuen Zuges einen kurzen Sweep beim aktiven Spieler.
// @xconfig-description  Erzeugt beim Wechsel des aktiven Spielers einen kurzen Lichtstreifen ueber Zeile oder Karte.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-turn-start-sweep
// @xconfig-background     assets/animation-turn-start-sweep-xConfig.gif
// @xconfig-settings-version 2
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Sweep-Geschwindigkeit","description":"Legt fest, wie schnell der Lichtstreifen abläuft.","options":[{"value":300,"label":"Schnell"},{"value":420,"label":"Standard"},{"value":620,"label":"Langsam"}]}
	const xConfig_SWEEP_GESCHWINDIGKEIT_MS = 420;
	// xConfig: {"type":"select","label":"Sweep-Stil","description":"Bestimmt Stärke und Sichtbarkeit des Lichtstreifens.","options":[{"value":"subtle","label":"Dezent"},{"value":"standard","label":"Standard"},{"value":"strong","label":"Stark"}]}
	const xConfig_SWEEP_STIL = "standard";

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
			sweepColor: "rgba(255, 255, 255, 0.24)"
		},
		standard: {
			sweepWidth: "45%",
			sweepColor: "rgba(255, 255, 255, 0.35)"
		},
		strong: {
			sweepWidth: "58%",
			sweepColor: "rgba(255, 255, 255, 0.48)"
		},
	};

	const RESOLVED_SWEEP_DURATION_MS = resolveNumberChoice(xConfig_SWEEP_GESCHWINDIGKEIT_MS, 420, [
		300,
		420,
		620,
	]);
	const RESOLVED_SWEEP_STYLE = resolveStringChoice(xConfig_SWEEP_STIL, "standard", [
		"subtle",
		"standard",
		"strong",
	]);
	const SWEEP_STYLE = SWEEP_STYLE_PRESETS[RESOLVED_SWEEP_STYLE] || SWEEP_STYLE_PRESETS.standard;

	const {ensureStyle, createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script-Ziel: Beim Spielerwechsel eine kurze Licht-Sweep-Animation anzeigen.
	/**
   * Konfiguration der Sweep-Animation.
   * @property {string} activeSelector - CSS-Selektor für den aktiven Spieler, z.B. ".ad-ext-player-active".
   * @property {string} sweepClass - Klasse, die die Animation triggert, z.B. "ad-ext-turn-sweep".
   * @property {number} sweepDurationMs - Dauer der Animation in ms, z.B. 420.
   * @property {number} sweepDelayMs - Verzögerung vor Start in ms, z.B. 0.
   * @property {string} sweepWidth - Breite des Lichtstreifens, z.B. "45%".
   * @property {string} sweepColor - Farbe des Lichtstreifens, z.B. "rgba(255, 255, 255, 0.35)".
   */
	const CONFIG = {
		activeSelector: ".ad-ext-player-active",
		sweepClass: "ad-ext-turn-sweep",
		sweepDurationMs: RESOLVED_SWEEP_DURATION_MS,
		sweepDelayMs: 0,
		sweepWidth: SWEEP_STYLE.sweepWidth,
		sweepColor: SWEEP_STYLE.sweepColor
	};

	const STYLE_ID = "autodarts-turn-sweep-style";
	const timeouts = new WeakMap();
	let lastActive = null;

	/**
   * Fügt die benötigten CSS-Regeln einmalig in die Seite ein.
   * @returns {void}
   */
	const STYLE_TEXT = `
.${
		CONFIG.sweepClass
	} {
  position: relative;
  overflow: hidden;
}

.${
		CONFIG.sweepClass
	}::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${
		CONFIG.sweepWidth
	};
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${
		CONFIG.sweepColor
	} 50%, rgba(255, 255, 255, 0) 100%);
  transform: translateX(-140%);
  animation: ad-ext-turn-sweep ${
		CONFIG.sweepDurationMs
	}ms ease-out ${
		CONFIG.sweepDelayMs
	}ms 1;
  pointer-events: none;
}

@keyframes ad-ext-turn-sweep {
  0% { transform: translateX(-140%); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateX(240%); opacity: 0; }
}
`;

	/**
   * Startet die Sweep-Animation für ein Element.
   * @param {Element|null} node - Ziel-Element, z.B. die aktive Spielerzeile.
   * @example
   * runSweep(document.querySelector(".ad-ext-player-active"));
   * @returns {void}
   */
	function runSweep(node) {
		if (! node) {
			return;
		}
		node.classList.remove(CONFIG.sweepClass);
		void node.offsetWidth;
		node.classList.add(CONFIG.sweepClass);
		const previous = timeouts.get(node);
		if (previous) {
			clearTimeout(previous);
		}
		const timeout = setTimeout(() => {
			node.classList.remove(CONFIG.sweepClass);
			timeouts.delete(node);
		}, CONFIG.sweepDurationMs + CONFIG.sweepDelayMs + 80);
		timeouts.set(node, timeout);
	}

	/**
   * Ermittelt den aktiven Spieler und startet bei Wechsel die Animation.
   * @returns {void}
   */
	function updateActive() {
		const current = document.querySelector(CONFIG.activeSelector);
		if (current === lastActive) {
			return;
		}
		lastActive = current;
		if (current) {
			runSweep(current);
		}
	}

	/**
   * Fasst viele DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateActive);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateActive();

	// Beobachtet Klassenwechsel, damit der aktive Spieler erkannt wird.
	observeMutations({
		onChange: scheduleUpdate,
		options: {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: false
		},
		attributeFilter: ["class"]
	});
})();
