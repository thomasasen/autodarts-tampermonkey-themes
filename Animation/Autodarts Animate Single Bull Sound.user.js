// ==UserScript==
// @name         Autodarts Animate Single Bull Sound
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.3
// @description  Spielt einen konfigurierbaren Sound bei Single Bull (25/BULL) in der Wurfliste.
// @xconfig-description  Erkennt Single-Bull-Treffer in der Turn-Throw-Liste und spielt dazu einen konfigurierbaren Sound ab.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-single-bull-sound
// @xconfig-settings-version 2
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Lautstärke","description":"Legt die Lautstärke des Single-Bull-Sounds fest.","options":[{"value":0.5,"label":"Leise"},{"value":0.75,"label":"Mittel"},{"value":0.9,"label":"Laut"},{"value":1,"label":"Sehr laut"}]}
	const xConfig_LAUTSTAERKE = 0.9;
	// xConfig: {"type":"select","label":"Wiederholsperre","description":"Verhindert Mehrfachauslösung in kurzer Zeit pro Wurfzeile.","options":[{"value":400,"label":"Kurz"},{"value":700,"label":"Standard"},{"value":1000,"label":"Lang"}]}
	const xConfig_WIEDERHOLSPERRE_MS = 700;
	// xConfig: {"type":"select","label":"Fallback-Scan","description":"Optionaler Zusatz-Scan für stabile Erkennung in seltenen DOM-Fällen.","options":[{"value":0,"label":"Aus"},{"value":1200,"label":"Ein (robuster)"}]}
	const xConfig_FALLBACK_SCAN_MS = 0;

	function resolveNumberChoice(value, fallbackValue, allowedValues) {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
			? numericValue
			: fallbackValue;
	}

	const RESOLVED_VOLUME = resolveNumberChoice(xConfig_LAUTSTAERKE, 0.9, [
		0.5,
		0.75,
		0.9,
		1,
	]);
	const RESOLVED_COOLDOWN_MS = resolveNumberChoice(xConfig_WIEDERHOLSPERRE_MS, 700, [
		400,
		700,
		1000,
	]);
	const RESOLVED_FALLBACK_SCAN_MS = resolveNumberChoice(xConfig_FALLBACK_SCAN_MS, 0, [
		0,
		1200,
	]);

	// Script goal: play a sound when a single bull (25/BULL) appears in the throw list.
	/**
   * Configuration for the single bull sound trigger.
   * @property {string} soundUrl - URL to the audio file.
   * @property {number} volume - Audio volume 0..1.
   * @property {number} targetPoints - Points value for single bull.
   * @property {string} targetLabel - Label text to match (case-insensitive).
   * @property {Object} selectors - CSS selectors for throw rows/text.
   * @property {number} cooldownMs - Minimum gap between plays per row.
   * @property {number} pollIntervalMs - Optional polling interval (0 disables).
   */
	const CONFIG = {
		soundUrl: "https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/singlebull.mp3",
		volume: RESOLVED_VOLUME,
		targetPoints: 25,
		targetLabel: "BULL",
		selectors: {
			throwRow: ".ad-ext-turn-throw",
			throwText: ".chakra-text"
		},
		cooldownMs: RESOLVED_COOLDOWN_MS,
		pollIntervalMs: RESOLVED_FALLBACK_SCAN_MS
	};

	const targetLabelUpper = CONFIG.targetLabel.toUpperCase();
	const lastKeys = new WeakMap();
	const lastPlayedAt = new WeakMap();
	const observedRoots = new WeakSet();
	const pendingRows = new Set();
	const ROOT_CACHE_TTL_MS = 2000;
	const ROOT_REFRESH_WHEN_PENDING_MS = 5000;
	let cachedRoots = [document];
	let lastRootCollectionTs = 0;
	let lastPendingRootRefreshTs = 0;

	const audio = new Audio(CONFIG.soundUrl);
	audio.preload = "auto";
	audio.volume = CONFIG.volume;
	let audioPrimed = false;

	/**
   * Normalizes text content into a single line.
   * @param {string|null|undefined} text - Raw text content.
   * @returns {string}
   */
	function normalizeText(text) {
		return String(text || "").replace(/\s+/g, " ").trim();
	}

	/**
   * Collects DOM roots (document + open shadow roots).
   * @returns {Array<Document | ShadowRoot>}
   */
	function collectRoots(force) {
		const now = performance.now();
		if (! force && cachedRoots.length && now - lastRootCollectionTs < ROOT_CACHE_TTL_MS) {
			return cachedRoots;
		}

		const roots = [document];
		const seenRoots = new Set([document]);
		const rootNode = document.documentElement;
		if (rootNode) {
			const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
			while (walker.nextNode()) {
				const node = walker.currentNode;
				if (node.shadowRoot && ! seenRoots.has(node.shadowRoot)) {
					seenRoots.add(node.shadowRoot);
					roots.push(node.shadowRoot);
				}
			}
		}

		cachedRoots = roots;
		lastRootCollectionTs = now;
		return cachedRoots;
	}

	/**
   * Observes a root once to catch DOM updates.
   * @param {Document | ShadowRoot} root - Root node to observe.
   * @returns {void}
   */
	function observeRoot(root) {
		if (! root || observedRoots.has(root)) {
			return;
		}
		const target = root.nodeType === Node.DOCUMENT_NODE ? root.documentElement : root;
		if (! target) {
			return;
		}
		observer.observe(target, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true
		});
		observedRoots.add(root);
	}

	/**
   * Tokenizes a string into number and word chunks.
   * @param {string} text - Normalized throw text.
   * @returns {string[]}
   */
	function tokenize(text) {
		return text.match(/[A-Za-z]+|\d+/g) || [];
	}

	/**
   * Reads the text for a single throw row.
   * @param {Element} row - Throw row element.
   * @returns {string}
   */
	function getThrowText(row) {
		const textNode = row.querySelector(CONFIG.selectors.throwText);
		const sources = [];
		if (textNode) {
			sources.push(textNode.textContent);
		}
		sources.push(row.textContent);
		const ariaLabel = row.getAttribute("aria-label");
		if (ariaLabel) {
			sources.push(ariaLabel);
		}
		return normalizeText(sources.filter(Boolean).join(" "));
	}

	/**
   * Checks whether the text matches a single bull entry.
   * @param {string} text - Normalized throw text.
   * @returns {boolean}
   */
	function isSingleBull(text) {
		if (! text) {
			return false;
		}
		const tokens = tokenize(text);
		const labelMatch = tokens.some((token) => token.toUpperCase() === targetLabelUpper);
		if (! labelMatch) {
			return false;
		}
		const pointsToken = tokens.find((token) => /^\d+$/.test(token));
		if (! pointsToken) {
			return false;
		}
		return Number(pointsToken) === CONFIG.targetPoints;
	}

	/**
   * Checks whether a throw row represents a single bull.
   * @param {Element} row - Throw row element.
   * @returns {boolean}
   */
	function isSingleBullRow(row) {
		const text = getThrowText(row);
		if (isSingleBull(text)) {
			return true;
		}
		const blockTexts = Array.from(row.querySelectorAll("div")).map((node) => normalizeText(node.textContent));
		const hasValue = blockTexts.includes(String(CONFIG.targetPoints));
		const hasLabel = blockTexts.some((part) => part.toUpperCase() === targetLabelUpper);
		return hasValue && hasLabel;
	}

	/**
   * Tries to unlock audio playback after user interaction.
   * @returns {void}
   */
	function primeAudio() {
		if (audioPrimed) {
			return;
		}
		audioPrimed = true;
		try {
			const probe = audio.cloneNode(true);
			probe.muted = true;
			const result = probe.play();
			if (result && typeof result.catch === "function") {
				result.catch(() => {});
			}
		} catch (error) { // Ignore autoplay restriction errors.
		}
	}

	/**
   * Plays the configured audio (ignored if blocked by autoplay rules).
   * @returns {void}
   */
	function playSound() {
		try {
			const sound = audio.cloneNode(true);
			sound.volume = CONFIG.volume;
			sound.currentTime = 0;
			const result = sound.play();
			if (result && typeof result.catch === "function") {
				result.catch(() => {});
			}
		} catch (error) { // Ignore playback errors (autoplay restrictions).
		}
	}

	/**
   * Scans throw rows and triggers sounds for new single bull hits.
   * @param {boolean} silent - When true, update state without playing audio.
   * @returns {void}
   */
	function scanThrows(silent) {
		let rows = [];
		let rootsForObservation = null;
		if (pendingRows.size) {
			rows = Array.from(pendingRows).filter((row) => row && row.isConnected);
			const now = performance.now();
			if (now - lastPendingRootRefreshTs >= ROOT_REFRESH_WHEN_PENDING_MS) {
				rootsForObservation = collectRoots(true);
				lastPendingRootRefreshTs = now;
			}
		} else {
			const roots = collectRoots(false);
			rootsForObservation = roots;
			roots.forEach((root) => {
				rows = rows.concat(Array.from(root.querySelectorAll(CONFIG.selectors.throwRow)));
			});
		}
		pendingRows.clear();

		if (rootsForObservation) {
			rootsForObservation.forEach((root) => observeRoot(root));
		}

		const uniqueRows = new Set(rows);
		rows = Array.from(uniqueRows);

		const now = performance.now();
		rows.forEach((row) => {
			const normalized = getThrowText(row);
			const key = normalized || "__empty__";
			const previousKey = lastKeys.get(row);
			const isNewKey = previousKey !== key;
			if (isNewKey) {
				lastKeys.set(row, key);
			}
			if (! isNewKey || silent || ! isSingleBullRow(row)) {
				return;
			}
			const lastPlayed = lastPlayedAt.get(row) || 0;
			if (now - lastPlayed < CONFIG.cooldownMs) {
				return;
			}
			playSound();
			lastPlayedAt.set(row, now);
		});
	}

	let scheduled = false;
	/**
   * Coalesces DOM changes into a single scan per frame.
   * @returns {void}
   */
	function scheduleScan() {
		if (scheduled) {
			return;
		}
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			scanThrows(false);
		});
	}

	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.type === "characterData") {
				const row = mutation.target.parentElement ?. closest(CONFIG.selectors.throwRow);
				if (row) {
					pendingRows.add(row);
				}
				return;
			}
			if (mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length)) {
				lastRootCollectionTs = 0;
			}
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType !== Node.ELEMENT_NODE) {
					return;
				}
				if (node.matches(CONFIG.selectors.throwRow)) {
					pendingRows.add(node);
					return;
				}
				node.querySelectorAll(CONFIG.selectors.throwRow).forEach((row) => pendingRows.add(row));
			});
		});
		scheduleScan();
	});

	/**
   * Initializes observers and optional polling.
   * @returns {void}
   */
	function start() {
		window.addEventListener("pointerdown", primeAudio, {
			once: true,
			capture: true
		});
		window.addEventListener("keydown", primeAudio, {
			once: true,
			capture: true
		});
		scanThrows(true);
		collectRoots(true).forEach((root) => observeRoot(root));

		if (CONFIG.pollIntervalMs > 0) {
			setInterval(() => scanThrows(false), CONFIG.pollIntervalMs);
		}
	}

	if (document.readyState === "loading") {
		window.addEventListener("load", start);
	} else {
		start();
	}
})();
