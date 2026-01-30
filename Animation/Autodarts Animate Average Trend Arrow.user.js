// ==UserScript==
// @name         Autodarts Animate Average Trend Arrow
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.0
// @description  Zeigt neben dem AVG-Wert kurz einen Pfeil nach oben oder unten, sobald sich der Durchschnitt ändert, damit du sofort siehst, ob der Schnitt steigt oder fällt.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Average%20Trend%20Arrow.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Average%20Trend%20Arrow.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {ensureStyle, createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	// Script-Ziel: AVG-Änderungen optisch mit einem kurzen Pfeil anzeigen.
	/**
   * Selektoren und CSS-Klassen für die Pfeil-Animation.
   * @property {string} AVG_SELECTOR - Bereich mit AVG-Wert, z.B. "p.css-1j0bqop".
   * @property {string} STYLE_ID - ID für das Style-Element, z.B. "autodarts-average-trend-style".
   * @property {string} ARROW_CLASS - Basis-Klasse für den Pfeil, z.B. "ad-ext-avg-trend-arrow".
   * @property {string} VISIBLE_CLASS - Sichtbarkeit, z.B. "ad-ext-avg-trend-visible".
   * @property {string} UP_CLASS - Stil für steigenden AVG, z.B. "ad-ext-avg-trend-up".
   * @property {string} DOWN_CLASS - Stil für fallenden AVG, z.B. "ad-ext-avg-trend-down".
   * @property {string} ANIMATE_CLASS - Trigger für Animation, z.B. "ad-ext-avg-trend-animate".
   * @property {number} ANIMATION_MS - Dauer in ms, z.B. 320.
   */
	const AVG_SELECTOR = "p.css-1j0bqop";
	const STYLE_ID = "autodarts-average-trend-style";
	const ARROW_CLASS = "ad-ext-avg-trend-arrow";
	const VISIBLE_CLASS = "ad-ext-avg-trend-visible";
	const UP_CLASS = "ad-ext-avg-trend-up";
	const DOWN_CLASS = "ad-ext-avg-trend-down";
	const ANIMATE_CLASS = "ad-ext-avg-trend-animate";
	const ANIMATION_MS = 320;

	// Speichert den letzten AVG-Wert pro Node, um Änderungen zu erkennen.
	const lastValues = new WeakMap();
	// Merkt sich den erzeugten Pfeil pro AVG-Node.
	const arrowElements = new WeakMap();
	// Zeitgeber je Pfeil, damit Animationen sauber zurückgesetzt werden.
	const animationTimeouts = new WeakMap();

	/**
   * Fügt die benötigten CSS-Regeln für Pfeile und Animation ein.
   * @returns {void}
   */
	const STYLE_TEXT = `
.${ARROW_CLASS} {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 6px;
  vertical-align: middle;
  opacity: 0;
  transition: opacity 120ms ease-out;
}

.${VISIBLE_CLASS} {
  opacity: 1;
}

.${UP_CLASS} {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid #9fdb58;
}

.${DOWN_CLASS} {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #f87171;
}

.${ANIMATE_CLASS} {
  animation: ad-ext-avg-bounce ${ANIMATION_MS}ms ease-out 1;
}

@keyframes ad-ext-avg-bounce {
  0% { transform: scale(0.9); opacity: 0.5; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.95; }
}
`;

	/**
   * Liest den AVG-Wert aus einem Text wie "72.3 / 3".
   * @param {string|null} text - Textinhalt des AVG-Elements.
   * @example
   * parseAvg("72.3 / 3"); // => 72.3
   * @returns {number|null} - Gefundener AVG oder null bei ungültigem Text.
   */
	function parseAvg(text) {
		if (! text) {
			return null;
		}
		const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*\/\s*[0-9]+(?:\.[0-9]+)?/);
		if (match) {
			return Number(match[1]);
		}
		const fallback = text.match(/([0-9]+(?:\.[0-9]+)?)/);
		return fallback ? Number(fallback[1]) : null;
	}

	/**
   * Liefert den Pfeil-Span für ein AVG-Element oder legt ihn an.
   * @param {Element} node - AVG-Element.
   * @example
   * getArrow(document.querySelector("p.css-1j0bqop"));
   * @returns {HTMLSpanElement}
   */
	function getArrow(node) {
		const existing = arrowElements.get(node);
		if (existing && node.contains(existing)) {
			return existing;
		}
		const arrow = document.createElement("span");
		arrow.className = ARROW_CLASS;
		node.appendChild(arrow);
		arrowElements.set(node, arrow);
		return arrow;
	}

	/**
   * Startet die CSS-Animation am Pfeil und setzt sie später zurück.
   * @param {HTMLElement} arrow - Der Pfeil-Span.
   * @returns {void}
   */
	function animateArrow(arrow) {
		arrow.classList.remove(ANIMATE_CLASS);
		void arrow.offsetWidth;
		arrow.classList.add(ANIMATE_CLASS);
		const previousTimeout = animationTimeouts.get(arrow);
		if (previousTimeout) {
			clearTimeout(previousTimeout);
		}
		const timeout = setTimeout(() => {
			arrow.classList.remove(ANIMATE_CLASS);
			animationTimeouts.delete(arrow);
		}, ANIMATION_MS + 80);
		animationTimeouts.set(arrow, timeout);
	}

	/**
   * Aktualisiert alle AVG-Elemente und zeigt die passende Pfeilrichtung.
   * @returns {void}
   */
	function updateAverages() {
		const nodes = document.querySelectorAll(AVG_SELECTOR);
		nodes.forEach((node) => {
			const avg = parseAvg(node.textContent);
			if (avg === null) {
				return;
			}
			const previous = lastValues.get(node);
			lastValues.set(node, avg);
			if (previous === undefined || avg === previous) {
				return;
			}

			const arrow = getArrow(node);
			arrow.classList.remove(UP_CLASS, DOWN_CLASS);
			arrow.classList.add(VISIBLE_CLASS);

			if (avg > previous) {
				arrow.classList.add(UP_CLASS);
			} else {
				arrow.classList.add(DOWN_CLASS);
			} animateArrow(arrow);
		});
	}

	/**
   * Fasst viele DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
	const scheduleUpdate = createRafScheduler(updateAverages);

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateAverages();

	// Beobachtet Text- und DOM-Änderungen, um AVG-Aktualisierungen zu erkennen.
	observeMutations({onChange: scheduleUpdate});
})();
