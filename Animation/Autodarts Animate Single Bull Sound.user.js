// ==UserScript==
// @name         Autodarts Animate Single Bull Sound
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.12
// @description  Spielt einen konfigurierbaren Sound bei Single Bull (25/BULL) in der Wurfliste.
// @xconfig-description  Erkennt Single-Bull-Treffer in der Turn-Throw-Liste und spielt dazu einen konfigurierbaren Sound ab.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-single-bull-sound
// @xconfig-settings-version 4
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @sandbox      raw
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js
// ==/UserScript==

(function () {
	"use strict";

	// xConfig: {"type":"select","label":"Lautstärke","description":"Legt die Lautstärke des Single-Bull-Sounds fest.","options":[{"value":0.5,"label":"Leise"},{"value":0.75,"label":"Mittel"},{"value":0.9,"label":"Laut"},{"value":1,"label":"Sehr laut"}]}
	const xConfig_LAUTSTAERKE = 0.9;
	// xConfig: {"type":"toggle","label":"Debug","description":"Nur auf Anweisung aktivieren. Schreibt technische Diagnose-Logs in die Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
	const xConfig_DEBUG = false;
	const DEFAULT_COOLDOWN_MS = 700;
	const DEFAULT_POLL_INTERVAL_MS = 0;

	function resolveNumberChoice(value, fallbackValue, allowedValues) {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) && allowedValues.includes(numericValue)
			? numericValue
			: fallbackValue;
	}

	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const RESOLVED_VOLUME = resolveNumberChoice(xConfig_LAUTSTAERKE, 0.9, [
		0.5,
		0.75,
		0.9,
		1,
	]);
	// Keep backward compatibility if stale xConfig cache still injects legacy settings.
	const RESOLVED_COOLDOWN_MS = resolveNumberChoice(
		typeof xConfig_WIEDERHOLSPERRE_MS === "undefined"
			? DEFAULT_COOLDOWN_MS
			: xConfig_WIEDERHOLSPERRE_MS,
		DEFAULT_COOLDOWN_MS,
		[400, 700, 1000]
	);
	const RESOLVED_POLL_INTERVAL_MS = resolveNumberChoice(
		typeof xConfig_FALLBACK_SCAN_MS === "undefined"
			? DEFAULT_POLL_INTERVAL_MS
			: xConfig_FALLBACK_SCAN_MS,
		DEFAULT_POLL_INTERVAL_MS,
		[0, 1200]
	);
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
		soundUrl: "https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/refs/heads/main/assets/singlebull.mp3",
		volume: RESOLVED_VOLUME,
		targetPoints: 25,
		targetLabel: "BULL",
		selectors: {
			throwRow: ".ad-ext-turn-throw",
			throwText: ".chakra-text"
		},
		cooldownMs: RESOLVED_COOLDOWN_MS,
		pollIntervalMs: RESOLVED_POLL_INTERVAL_MS
	};
	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Single Bull Sound]";
	const debugState = {
		unlockAttempts: 0,
		unlockSuccess: 0,
		unlockFail: 0,
		playAttempts: 0,
		playSuccess: 0,
		playFail: 0,
		detectedSingleBull: 0,
		cooldownSkips: 0,
		scans: 0,
		wsPayloads: 0,
		wsBullHits: 0,
		signalCooldownSkips: 0
	};
	const MATCHES_CHANNEL = "autodarts.matches";
	const PROCESSED_THROW_KEY_LIMIT = 400;
	const SIGNAL_COOLDOWN_MS = Math.min(250, CONFIG.cooldownMs);

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
	let lastSignalPlayTs = 0;
	let websocketHookInstalled = false;
	let sharedStateSubscribed = false;
	const processedThrowKeys = new Set();
let audioContext = null;
let decodedSoundBuffer = null;
let decodedBufferIsSilent = false;
let loadingDecodedSound = false;

	const audio = new Audio(CONFIG.soundUrl);
	audio.preload = "auto";
	audio.volume = CONFIG.volume;
	audio.addEventListener("loadedmetadata", () => {
		debugLog("Audio loadedmetadata", {
			readyState: audio.readyState,
			networkState: audio.networkState,
			src: audio.currentSrc || audio.src
		});
	});
	audio.addEventListener("canplaythrough", () => {
		debugLog("Audio canplaythrough", {
			readyState: audio.readyState,
			networkState: audio.networkState
		});
	});
	audio.addEventListener("error", () => {
		debugError("Audio element error", {
			audioErrorCode: audio.error?.code,
			audioErrorMessage: audio.error?.message || "",
			readyState: audio.readyState,
			networkState: audio.networkState,
			src: audio.currentSrc || audio.src
		});
	});
	let audioPrimed = false;
	let audioPriming = false;
	let unlockListenersAttached = false;
	const SILENT_AUDIO_DATA_URL = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
	const UNLOCK_EVENTS = ["click", "touchstart", "keydown"];
	const AUTOPLAY_ERROR_HINTS = [
		"failed because the user didn't interact with the document first",
		"the play method is not allowed by the user agent",
		"the request is not allowed by the user agent",
		"notallowederror"
	];

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

	function getErrorDetails(error) {
		return {
			name: String(error?.name || ""),
			message: String(error?.message || error || ""),
			stack: String(error?.stack || "")
		};
	}

	function getAudioContextConstructor() {
		return window.AudioContext || window.webkitAudioContext || null;
	}

	function ensureAudioContext() {
		if (audioContext) {
			return audioContext;
		}
		const AudioContextCtor = getAudioContextConstructor();
		if (! AudioContextCtor) {
			debugWarn("WebAudio unavailable in this browser context");
			return null;
		}
		try {
			audioContext = new AudioContextCtor();
			debugLog("WebAudio context created", {
				state: audioContext.state
			});
		} catch (error) {
			debugWarn("WebAudio context creation failed", getErrorDetails(error));
			audioContext = null;
		}
		return audioContext;
	}

	function decodeAudioBuffer(context, arrayBuffer) {
		return new Promise((resolve, reject) => {
			let settled = false;
			const onResolve = (buffer) => {
				if (settled) {
					return;
				}
				settled = true;
				resolve(buffer);
			};
			const onReject = (error) => {
				if (settled) {
					return;
				}
				settled = true;
				reject(error);
			};
			try {
				const maybePromise = context.decodeAudioData(arrayBuffer, onResolve, onReject);
				if (maybePromise && typeof maybePromise.then === "function") {
					maybePromise.then(onResolve).catch(onReject);
				}
			} catch (error) {
				onReject(error);
			}
		});
	}

	function isBufferNearlySilent(buffer) {
		if (! buffer || typeof buffer.numberOfChannels !== "number" || buffer.numberOfChannels < 1) {
			return false;
		}
		let peak = 0;
		for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
			const data = buffer.getChannelData(channel);
			const step = Math.max(1, Math.floor(data.length / 5000));
			for (let i = 0; i < data.length; i += step) {
				const sample = Math.abs(data[i]);
				if (sample > peak) {
					peak = sample;
					if (peak > 0.01) {
						return false;
					}
				}
			}
		}
		return peak <= 0.01;
	}

	function preloadWebAudioBuffer() {
		if (decodedSoundBuffer || loadingDecodedSound) {
			return;
		}
		const context = ensureAudioContext();
		if (! context || typeof fetch !== "function") {
			return;
		}
		loadingDecodedSound = true;
		fetch(CONFIG.soundUrl, {
			mode: "cors",
			cache: "force-cache"
		})
			.then((response) => {
				if (! response.ok) {
					throw new Error(`Audio fetch failed with ${response.status}`);
				}
				return response.arrayBuffer();
			})
			.then((buffer) => decodeAudioBuffer(context, buffer))
			.then((decoded) => {
				decodedSoundBuffer = decoded;
				decodedBufferIsSilent = isBufferNearlySilent(decodedSoundBuffer);
				debugLog("WebAudio buffer ready", {
					duration: Number(decodedSoundBuffer?.duration || 0).toFixed(3),
					bufferSilent: decodedBufferIsSilent
				});
			})
			.catch((error) => {
				debugWarn("WebAudio buffer load failed", getErrorDetails(error));
			})
			.finally(() => {
				loadingDecodedSound = false;
			});
	}

	function resumeAudioContext() {
		const context = ensureAudioContext();
		if (! context) {
			return Promise.resolve(false);
		}
		if (context.state === "running") {
			return Promise.resolve(true);
		}
		return context.resume()
			.then(() => {
				debugLog("WebAudio resumed", {
					state: context.state
				});
				return context.state === "running";
			})
			.catch((error) => {
				debugWarn("WebAudio resume failed", getErrorDetails(error));
				return false;
			});
	}

	function primeWebAudio() {
		const context = ensureAudioContext();
		if (! context) {
			return;
		}
		preloadWebAudioBuffer();
		resumeAudioContext().then((isRunning) => {
			if (! isRunning) {
				return;
			}
			try {
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				gain.gain.value = 0.00001;
				oscillator.type = "sine";
				oscillator.frequency.value = 440;
				oscillator.connect(gain);
				gain.connect(context.destination);
				const now = context.currentTime;
				oscillator.start(now);
				oscillator.stop(now + 0.02);
			} catch (error) {
				debugWarn("WebAudio prime tone failed", getErrorDetails(error));
			}
		});
	}

	function playWebAudioBuffer() {
		const context = ensureAudioContext();
		if (! context || context.state !== "running" || ! decodedSoundBuffer || decodedBufferIsSilent) {
			return false;
		}
		try {
			const source = context.createBufferSource();
			source.buffer = decodedSoundBuffer;
			const gain = context.createGain();
			gain.gain.value = Math.max(0, Math.min(1.5, CONFIG.volume * 1.2));
			source.connect(gain);
			gain.connect(context.destination);
			source.start(0);
			debugState.playSuccess += 1;
			debugLog("playSound success (web audio)", {
				playSuccess: debugState.playSuccess,
				playFail: debugState.playFail
			});
			return true;
		} catch (error) {
			debugWarn("playSound web audio failure", getErrorDetails(error));
			return false;
		}
	}

	function playSyntheticBeep() {
		const context = ensureAudioContext();
		if (! context || context.state !== "running") {
			return false;
		}
		try {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			const now = context.currentTime;
			const level = Math.max(0.03, Math.min(0.8, CONFIG.volume * 0.4));
			oscillator.type = "triangle";
			oscillator.frequency.setValueAtTime(880, now);
			oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12);
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.exponentialRampToValueAtTime(level, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(now);
			oscillator.stop(now + 0.19);
			debugState.playSuccess += 1;
			debugLog("playSound success (synthetic beep)", {
				playSuccess: debugState.playSuccess,
				playFail: debugState.playFail
			});
			return true;
		} catch (error) {
			debugWarn("synthetic beep failed", getErrorDetails(error));
			return false;
		}
	}

	// Hard boot marker for cases where regular log-level filters hide console.log output.
	try {
		window.__autodartsSingleBullSoundDebug = {
			name: "Autodarts Animate Single Bull Sound",
			version: "1.12",
			loadedAt: new Date().toISOString(),
			config: {
				soundUrl: CONFIG.soundUrl,
				volume: CONFIG.volume,
				cooldownMs: CONFIG.cooldownMs,
				pollIntervalMs: CONFIG.pollIntervalMs
			},
			state: debugState
		};
		debugError("BOOT", {
			version: "1.12",
			url: location.href,
			readyState: document.readyState,
			userAgent: navigator.userAgent
		});
	} catch (error) {
		console.error("[xConfig][Single Bull Sound] BOOT failed", error);
	}

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
		const upperText = text.toUpperCase();
		const hasDoubleBullHint = /(?:\bDB\b|\bBULLSEYE\b|\b50\b|\bD\s*25\b|\bD25\b)/.test(upperText);
		if (! hasDoubleBullHint && /\b25\b/.test(upperText)) {
			return true;
		}
		const tokens = tokenize(text);
		const labelMatch = tokens.some((token) => {
			const tokenUpper = token.toUpperCase();
			return tokenUpper === targetLabelUpper || tokenUpper === "SB" || tokenUpper === "OB";
		});
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

	function normalizeThrowSegmentName(value) {
		return String(value || "").trim().toUpperCase();
	}

	function classifyBullSegment(segmentName) {
		const normalized = normalizeThrowSegmentName(segmentName);
		if (! normalized) {
			return "none";
		}
		if (
			normalized === "25" ||
			normalized === "SB" ||
			normalized === "OB" ||
			normalized === "S25" ||
			normalized === "S 25"
		) {
			return "single";
		}
		if (
			normalized === "50" ||
			normalized === "DB" ||
			normalized === "DBULL" ||
			normalized === "BULLSEYE" ||
			normalized === "D25" ||
			normalized === "D 25"
		) {
			return "double";
		}
		if (normalized === "BULL") {
			return "unknown";
		}
		return "none";
	}

	function getThrowSegmentName(throwEntry) {
		if (! throwEntry || typeof throwEntry !== "object") {
			return "";
		}
		return String(throwEntry?.segment?.name || throwEntry?.entry || throwEntry?.segment || "").trim();
	}

	function getThrowPoints(throwEntry) {
		if (! throwEntry || typeof throwEntry !== "object") {
			return Number.NaN;
		}
		const candidates = [
			throwEntry?.points,
			throwEntry?.score,
			throwEntry?.value,
			throwEntry?.segment?.points,
			throwEntry?.segment?.score,
			throwEntry?.segment?.value
		];
		for (const candidate of candidates) {
			const numeric = Number(candidate);
			if (Number.isFinite(numeric)) {
				return numeric;
			}
		}
		return Number.NaN;
	}

	function isSingleBullThrowEntry(throwEntry) {
		const points = getThrowPoints(throwEntry);
		if (points === 25) {
			return true;
		}
		if (points === 50) {
			return false;
		}

		const segmentName = getThrowSegmentName(throwEntry);
		const bullType = classifyBullSegment(segmentName);
		if (bullType === "single") {
			return true;
		}
		if (bullType === "double") {
			return false;
		}
		if (bullType === "unknown") {
			const multiplier = Number(throwEntry?.segment?.multiplier || throwEntry?.multiplier);
			if (multiplier === 1) {
				return true;
			}
			if (multiplier === 2) {
				return false;
			}
		}
		return false;
	}

	function parseTimestamp(value) {
		if (! value) {
			return 0;
		}
		const timestamp = Date.parse(value);
		return Number.isFinite(timestamp) ? timestamp : 0;
	}

	function selectNewestTurn(candidates) {
		if (! Array.isArray(candidates) || ! candidates.length) {
			return null;
		}
		return candidates.reduce((best, candidate) => {
			if (! best) {
				return candidate;
			}
			const candidateRound = Number.isFinite(candidate?.round) ? candidate.round : -1;
			const bestRound = Number.isFinite(best?.round) ? best.round : -1;
			if (candidateRound !== bestRound) {
				return candidateRound > bestRound ? candidate : best;
			}
			const candidateTurn = Number.isFinite(candidate?.turn) ? candidate.turn : -1;
			const bestTurn = Number.isFinite(best?.turn) ? best.turn : -1;
			if (candidateTurn !== bestTurn) {
				return candidateTurn > bestTurn ? candidate : best;
			}
			const candidateTs = parseTimestamp(candidate?.createdAt);
			const bestTs = parseTimestamp(best?.createdAt);
			return candidateTs >= bestTs ? candidate : best;
		}, null);
	}

	function getActivePlayerIdFromMatch(match) {
		const playerIndex = Number(match?.player);
		if (! Number.isFinite(playerIndex) || ! Array.isArray(match?.players)) {
			return "";
		}
		const player = match.players[playerIndex];
		return String(player?.id || "");
	}

	function getActiveTurnFromMatch(match) {
		const turns = match?.turns;
		if (! Array.isArray(turns) || ! turns.length) {
			return null;
		}
		const activePlayerId = getActivePlayerIdFromMatch(match);
		const unfinishedTurns = turns.filter((turn) => ! String(turn?.finishedAt || "").trim());
		const unfinishedForActive = activePlayerId
			? unfinishedTurns.filter((turn) => String(turn?.playerId || "") === activePlayerId)
			: [];
		const unfinished = selectNewestTurn(unfinishedForActive) || selectNewestTurn(unfinishedTurns);
		if (unfinished) {
			return unfinished;
		}
		const turnsForActive = activePlayerId
			? turns.filter((turn) => String(turn?.playerId || "") === activePlayerId)
			: [];
		return selectNewestTurn(turnsForActive) || selectNewestTurn(turns);
	}

	function buildThrowKey(turn, throwEntry, index) {
		const fallbackTurnId = [
			Number.isFinite(turn?.round) ? turn.round : -1,
			Number.isFinite(turn?.turn) ? turn.turn : -1,
			String(turn?.playerId || "")
		].join(":");
		const turnId = String(turn?.id || fallbackTurnId);
		const throwId = String(throwEntry?.id || throwEntry?.createdAt || throwEntry?.timestamp || index);
		return `${turnId}:${throwId}:${index}`;
	}

	function rememberThrowKey(key) {
		if (! key || processedThrowKeys.has(key)) {
			return false;
		}
		processedThrowKeys.add(key);
		if (processedThrowKeys.size > PROCESSED_THROW_KEY_LIMIT) {
			const oldestKey = processedThrowKeys.values().next().value;
			if (oldestKey) {
				processedThrowKeys.delete(oldestKey);
			}
		}
		return true;
	}

	function triggerSingleBullSound(source, contextText) {
		const now = performance.now();
		if (now - lastSignalPlayTs < SIGNAL_COOLDOWN_MS) {
			debugState.signalCooldownSkips += 1;
			debugLog("signal cooldown skip", {
				source: String(source || ""),
				signalCooldownSkips: debugState.signalCooldownSkips
			});
			return false;
		}
		lastSignalPlayTs = now;
		playSound(`${source || "unknown"} ${String(contextText || "")}`.trim());
		return true;
	}

	function processMatchStateForSingleBull(match, source) {
		if (! match || typeof match !== "object") {
			return;
		}
		const activeTurn = getActiveTurnFromMatch(match);
		const throws = Array.isArray(activeTurn?.throws) ? activeTurn.throws : [];
		throws.forEach((throwEntry, index) => {
			if (! isSingleBullThrowEntry(throwEntry)) {
				return;
			}
			const throwKey = buildThrowKey(activeTurn, throwEntry, index);
			if (! rememberThrowKey(throwKey)) {
				return;
			}
			debugState.wsBullHits += 1;
			const segmentName = getThrowSegmentName(throwEntry);
			const points = getThrowPoints(throwEntry);
			debugLog("single bull detected (state)", {
				source: String(source || ""),
				throwKey,
				segmentName,
				points,
				wsBullHits: debugState.wsBullHits
			});
			triggerSingleBullSound(`state:${source}`, `${segmentName} ${Number.isFinite(points) ? points : ""}`.trim());
		});
	}

	function processWebSocketPayload(rawData) {
		let parsed = rawData;
		if (typeof rawData === "string") {
			try {
				parsed = JSON.parse(rawData);
			} catch (error) {
				return;
			}
		}
		if (! parsed || typeof parsed !== "object") {
			return;
		}
		if (parsed.channel !== MATCHES_CHANNEL) {
			return;
		}
		debugState.wsPayloads += 1;
		if (DEBUG_ENABLED && (debugState.wsPayloads <= 5 || debugState.wsPayloads % 100 === 0)) {
			debugLog("ws payload", {
				wsPayloads: debugState.wsPayloads,
				topic: String(parsed.topic || "")
			});
		}

		const candidates = [
			parsed.data,
			parsed.data?.state,
			parsed.data?.match
		];
		candidates.forEach((candidate, index) => {
			if (! candidate || typeof candidate !== "object" || candidate.body) {
				return;
			}
			if (! Array.isArray(candidate.turns)) {
				return;
			}
			processMatchStateForSingleBull(candidate, `ws#${index}`);
		});
	}

	function installWebSocketInterception() {
		if (websocketHookInstalled) {
			return;
		}
		websocketHookInstalled = true;
		try {
			const descriptor = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data");
			if (! descriptor || typeof descriptor.get !== "function") {
				debugWarn("MessageEvent.data getter unavailable; websocket detection disabled");
				return;
			}
			const originalGetter = descriptor.get;
			Object.defineProperty(MessageEvent.prototype, "data", {
				configurable: true,
				enumerable: descriptor.enumerable,
				get() {
					const value = originalGetter.call(this);
					try {
						if (this.currentTarget instanceof WebSocket) {
							processWebSocketPayload(value);
						}
					} catch (error) {
						debugWarn("websocket payload handling failed", getErrorDetails(error));
					}
					return value;
				}
			});
			debugLog("websocket interception installed");
		} catch (error) {
			debugWarn("websocket interception failed", getErrorDetails(error));
		}
	}

	function attachSharedStateSubscription() {
		if (sharedStateSubscribed) {
			return;
		}
		const shared = window.autodartsGameStateShared;
		if (! shared || typeof shared.subscribe !== "function") {
			return;
		}
		sharedStateSubscribed = true;
		debugLog("connected to autodartsGameStateShared");
		try {
			const initialState = typeof shared.getState === "function" ? shared.getState() : null;
			processMatchStateForSingleBull(initialState?.match || null, "shared:init");
		} catch (error) {
			debugWarn("shared initial state failed", getErrorDetails(error));
		}
		shared.subscribe((snapshot) => {
			processMatchStateForSingleBull(snapshot?.match || null, "shared:sub");
		});
	}

	/**
   * Tries to unlock audio playback after user interaction.
   * @returns {void}
   */
	function primeAudio() {
		if (audioPrimed || audioPriming) {
			primeWebAudio();
			debugLog("primeAudio skipped", {
				audioPrimed,
				audioPriming
			});
			return;
		}
		debugState.unlockAttempts += 1;
		debugLog("primeAudio start", {
			attempt: debugState.unlockAttempts
		});
		primeWebAudio();
		audioPriming = true;
		try {
			audio.src = SILENT_AUDIO_DATA_URL;
			audio.volume = 0.01;
			audio.muted = false;
			try {
				audio.currentTime = 0;
			} catch (error) {
			}
			const result = audio.play();
			const restoreSoundSource = () => {
				audio.pause();
				try {
					audio.currentTime = 0;
				} catch (error) {
				}
				audio.src = CONFIG.soundUrl;
				audio.preload = "auto";
				audio.volume = CONFIG.volume;
				audio.muted = false;
				audio.load();
			};
			const onPrimeSuccess = () => {
				restoreSoundSource();
				audioPrimed = true;
				audioPriming = false;
				debugState.unlockSuccess += 1;
				debugLog("primeAudio success", {
					unlockSuccess: debugState.unlockSuccess,
					unlockFail: debugState.unlockFail
				});
			};
			const onPrimeFailure = (error) => {
				restoreSoundSource();
				audioPriming = false;
				debugState.unlockFail += 1;
				debugWarn("primeAudio failure", {
					error: getErrorDetails(error),
					isAutoplayError: isAutoplayRestrictionError(error),
					unlockSuccess: debugState.unlockSuccess,
					unlockFail: debugState.unlockFail
				});
				attachUnlockListeners();
			};
			if (result && typeof result.then === "function") {
				result.then(onPrimeSuccess).catch((error) => onPrimeFailure(error));
				return;
			}
			onPrimeSuccess();
		} catch (error) { // Ignore autoplay restriction errors.
			audioPriming = false;
			debugState.unlockFail += 1;
			debugError("primeAudio exception", {
				error: getErrorDetails(error),
				unlockSuccess: debugState.unlockSuccess,
				unlockFail: debugState.unlockFail
			});
			attachUnlockListeners();
		}
	}

	/**
   * Plays the configured audio (ignored if blocked by autoplay rules).
   * @returns {void}
   */
	function playSound(contextText) {
		debugState.playAttempts += 1;
		debugLog("playSound start", {
			attempt: debugState.playAttempts,
			audioPrimed,
			audioPriming,
			contextText: String(contextText || "")
		});
		preloadWebAudioBuffer();
		if (playWebAudioBuffer()) {
			return;
		}
		if (playSyntheticBeep()) {
			return;
		}
		try {
			if (! audio.src || audio.src.startsWith("data:audio/")) {
				audio.src = CONFIG.soundUrl;
				audio.preload = "auto";
			}
			audio.pause();
			audio.volume = CONFIG.volume;
			audio.muted = false;
			try {
				audio.currentTime = 0;
			} catch (error) {
			}
			const result = audio.play();
			if (result && typeof result.catch === "function") {
				result.then(() => {
					debugState.playSuccess += 1;
					debugLog("playSound success", {
						playSuccess: debugState.playSuccess,
						playFail: debugState.playFail
					});
				});
				result.catch((error) => {
					debugState.playFail += 1;
					debugWarn("playSound failure", {
						error: getErrorDetails(error),
						isAutoplayError: isAutoplayRestrictionError(error),
						playSuccess: debugState.playSuccess,
						playFail: debugState.playFail
					});
					if (isAutoplayRestrictionError(error)) {
						attachUnlockListeners();
						primeAudio();
					}
				});
			}
		} catch (error) { // Ignore playback errors (autoplay restrictions).
			debugState.playFail += 1;
			debugError("playSound exception", {
				error: getErrorDetails(error),
				isAutoplayError: isAutoplayRestrictionError(error),
				playSuccess: debugState.playSuccess,
				playFail: debugState.playFail
			});
			if (isAutoplayRestrictionError(error)) {
				attachUnlockListeners();
				primeAudio();
			}
		}
	}

	/**
   * Checks if playback failed because user interaction is required.
   * @param {unknown} error - Playback failure object.
   * @returns {boolean}
   */
	function isAutoplayRestrictionError(error) {
		const message = String(error?.message || error || "").toLowerCase();
		const name = String(error?.name || "").toLowerCase();
		if (name === "notallowederror") {
			return true;
		}
		return AUTOPLAY_ERROR_HINTS.some((hint) => message.includes(hint));
	}

	/**
   * Handles user gesture events used for audio unlock.
   * @returns {void}
   */
	function onUnlockGesture(event) {
		unlockListenersAttached = false;
		debugLog("unlock gesture", {
			eventType: String(event?.type || ""),
			isTrusted: Boolean(event?.isTrusted)
		});
		primeAudio();
	}

	/**
   * Installs listeners that try to unlock audio on user gesture.
   * @returns {void}
   */
	function attachUnlockListeners() {
		if (unlockListenersAttached || audioPrimed) {
			return;
		}
		unlockListenersAttached = true;
		debugLog("attach unlock listeners", {
			events: UNLOCK_EVENTS.join(",")
		});
		UNLOCK_EVENTS.forEach((eventName) => {
			document.addEventListener(eventName, onUnlockGesture, {
				once: true,
				capture: true
			});
		});
	}

	/**
   * Scans throw rows and triggers sounds for new single bull hits.
   * @param {boolean} silent - When true, update state without playing audio.
   * @returns {void}
   */
	function scanThrows(silent) {
		debugState.scans += 1;
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
		if (DEBUG_ENABLED && (debugState.scans <= 8 || debugState.scans % 50 === 0)) {
			debugLog("scanThrows", {
				scan: debugState.scans,
				silent: Boolean(silent),
				rowsFound: rows.length,
				pendingRows: pendingRows.size
			});
		}

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
			debugState.detectedSingleBull += 1;
			debugLog("single bull detected", {
				detectedSingleBull: debugState.detectedSingleBull,
				text: normalized
			});
			const lastPlayed = lastPlayedAt.get(row) || 0;
			if (now - lastPlayed < CONFIG.cooldownMs) {
				debugState.cooldownSkips += 1;
				debugLog("cooldown skip", {
					cooldownSkips: debugState.cooldownSkips,
					cooldownMs: CONFIG.cooldownMs,
					text: normalized
				});
				return;
			}
			triggerSingleBullSound("dom", normalized);
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
				const row = mutation.target.parentElement?.closest(CONFIG.selectors.throwRow);
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
		debugLog("start", {
			readyState: document.readyState,
			volume: CONFIG.volume,
			cooldownMs: CONFIG.cooldownMs,
			fallbackScanMs: CONFIG.pollIntervalMs,
			legacyXConfigDetected:
				typeof xConfig_WIEDERHOLSPERRE_MS !== "undefined" ||
				typeof xConfig_FALLBACK_SCAN_MS !== "undefined",
			userAgent: navigator.userAgent
		});
		ensureAudioContext();
		preloadWebAudioBuffer();
		installWebSocketInterception();
		attachSharedStateSubscription();
		attachUnlockListeners();
		scanThrows(true);
		collectRoots(true).forEach((root) => observeRoot(root));

		if (CONFIG.pollIntervalMs > 0) {
			setInterval(() => scanThrows(false), CONFIG.pollIntervalMs);
		}
		setTimeout(attachSharedStateSubscription, 1500);
	}

	debugLog("init", {
		debug: DEBUG_ENABLED,
		cooldownMs: CONFIG.cooldownMs,
		fallbackScanMs: CONFIG.pollIntervalMs,
	});

	if (document.readyState === "loading") {
		window.addEventListener("load", start);
	} else {
		start();
	}

	installWebSocketInterception();
	attachUnlockListeners();
})();
