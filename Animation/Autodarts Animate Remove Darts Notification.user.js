// ==UserScript==
// @name         Autodarts Animate Remove Darts Notification
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Ersetzt die Meldung "Removing Darts" durch ein TakeOut-Bild mit sanfter Animation.
// @xconfig-description  Erkennt die Entfernen-Hinweismeldung und ersetzt sie visuell durch TakeOut.png inklusive Pulse-Effekt.
// @xconfig-variant      all
// @xconfig-readme-anchor  animation-autodarts-animate-remove-darts-notification
// @xconfig-background     assets/animation-remove-darts-notification-xConfig.png
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Remove%20Darts%20Notification.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Remove%20Darts%20Notification.user.js
// ==/UserScript==

(function () {
	"use strict";

	const {ensureStyle, createRafScheduler, observeMutations} = window.autodartsAnimationShared;

	/**
   * Configuration for the takeout notification replacement.
   * @property {string} noticeSelector - Selector for the "Removing Darts" notice element.
   * @property {string} imageUrl - URL to the TakeOut.png asset.
   * @property {string} imageAlt - Alt text for the replacement image.
   * @property {string[]} fallbackTexts - Text matches used if the selector changes.
   * @property {boolean} searchShadowRoots - Also search open shadow roots for the notice.
   * @property {number} fallbackScanMs - Minimum delay between text fallback scans.
   * @property {string[]} matchViewSelectors - Candidate selectors to identify match-view scopes.
   * @property {string[]} fallbackAreaSelectors - Candidate selectors for bounded text fallback scans.
   * @property {number} fallbackAreaLimit - Max candidate areas tracked per view.
   * @property {number} fallbackAreaWindowSize - Number of candidate areas scanned per fallback run.
   * @property {number} fallbackTextNodeBudget - Max text nodes inspected per fallback run.
   * @property {number} imageMaxWidthRem - Max width in rem (desktop sizing).
   * @property {number} imageMaxWidthVw - Max width in vw (mobile sizing).
   * @property {number} pulseDurationMs - Duration of the pulse animation.
   * @property {number} pulseScale - Max scale for the pulse animation.
   */
	const CONFIG = {
		noticeSelector: ".adt-remove",
		imageUrl: "https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/TakeOut.png",
		imageAlt: "Removing darts",
		fallbackTexts: [
			"Removing Darts", "Darts entfernen"
		],
		searchShadowRoots: true,
		fallbackScanMs: 900,
		matchViewSelectors: [
			"main", "[role=\"main\"]", "#app"
		],
		fallbackAreaSelectors: [
			".v-overlay-container",
			".v-overlay__content",
			".v-snackbar",
			".v-alert",
			"[role=\"alert\"]",
			".adt-remove"
		],
		fallbackAreaLimit: 10,
		fallbackAreaWindowSize: 3,
		fallbackTextNodeBudget: 700,
		imageMaxWidthRem: 30,
		imageMaxWidthVw: 90,
		pulseDurationMs: 1400,
		pulseScale: 1.04
	};

	const STYLE_ID = "ad-ext-takeout-style";
	const CARD_CLASS = "ad-ext-takeout-card";
	const IMAGE_CLASS = "ad-ext-takeout-image";
	const fallbackTextMatches = (CONFIG.fallbackTexts || []).map((text) => String(text || "").trim().toLowerCase()).filter(Boolean);
	let lastFallbackScan = 0;
	const seenShadowHosts = new WeakSet();
	const seenShadowRoots = new WeakSet();
	const shadowRoots = [];
	let currentViewKey = "";
	let fallbackAreasDirty = true;
	let fallbackAreas = [];
	let fallbackWindowOffset = 0;
	const ATTACH_SHADOW_HOOK_FLAG = "__adExtTakeoutAttachShadowHook";

	const STYLE_TEXT = `
.${CARD_CLASS} {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  background-image: none !important;
  padding: 0 !important;
  box-shadow: none !important;
  border: 0 !important;
  outline: 0 !important;
  width: auto !important;
  max-width: none !important;
  pointer-events: none;
}

.${CARD_CLASS} .${IMAGE_CLASS} {
  display: block;
  width: min(${
		CONFIG.imageMaxWidthRem
	}rem, ${
		CONFIG.imageMaxWidthVw
	}vw);
  height: auto;
  background: transparent;
  transform-origin: center;
  animation: ad-ext-takeout-pulse ${
		CONFIG.pulseDurationMs
	}ms ease-in-out infinite;
  will-change: transform, opacity;
  pointer-events: none;
}

@keyframes ad-ext-takeout-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(${
		CONFIG.pulseScale
	}); opacity: 0.95; }
}

@media (prefers-reduced-motion: reduce) {
  .${CARD_CLASS} .${IMAGE_CLASS} {
    animation: none;
  }
}
`;

	function buildImage() {
		const image = document.createElement("img");
		image.className = IMAGE_CLASS;
		image.src = CONFIG.imageUrl;
		image.alt = CONFIG.imageAlt;
		image.decoding = "async";
		image.loading = "eager";
		return image;
	}

	function getCurrentViewKey() {
		return `${
			location.pathname
		}|${
			location.search
		}|${
			location.hash
		}`;
	}

	function syncViewState() {
		const viewKey = getCurrentViewKey();
		if (viewKey === currentViewKey) {
			return;
		}
		currentViewKey = viewKey;
		fallbackAreasDirty = true;
		fallbackAreas = [];
		fallbackWindowOffset = 0;
	}

	function markFallbackAreasDirty() {
		fallbackAreasDirty = true;
	}

	function trackShadowHost(host) {
		if (! CONFIG.searchShadowRoots || ! host || host.nodeType !== Node.ELEMENT_NODE || seenShadowHosts.has(host)) {
			return;
		}
		seenShadowHosts.add(host);

		const root = host.shadowRoot;
		if (! root || root.mode !== "open" || seenShadowRoots.has(root)) {
			return;
		}
		seenShadowRoots.add(root);
		shadowRoots.push(root);
		markFallbackAreasDirty();
	}

	function trackShadowHostsInNode(node) {
		if (! CONFIG.searchShadowRoots || ! node) {
			return;
		}
		if (node.nodeType === Node.ELEMENT_NODE) {
			trackShadowHost(node);
		}
		if ((node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) || typeof document.createTreeWalker !== "function") {
			return;
		}
		const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
		let current = walker.nextNode();
		while (current) {
			trackShadowHost(current);
			current = walker.nextNode();
		}
	}

	function collectShadowRootsFromMutations(mutations) {
		if (! CONFIG.searchShadowRoots || !Array.isArray(mutations)) {
			return;
		}
		mutations.forEach((mutation) => {
			if (!mutation) {
				return;
			}
			if (mutation.type === "childList") {
				if (mutation.addedNodes && mutation.addedNodes.length) {
					markFallbackAreasDirty();
					mutation.addedNodes.forEach((node) => trackShadowHostsInNode(node));
				}
				if (mutation.removedNodes && mutation.removedNodes.length) {
					markFallbackAreasDirty();
				}
			}
		});
	}

	function installAttachShadowHook() {
		if (! CONFIG.searchShadowRoots || typeof Element === "undefined") {
			return;
		}
		const prototype = Element.prototype;
		if (! prototype || typeof prototype.attachShadow !== "function") {
			return;
		}
		const currentAttachShadow = prototype.attachShadow;
		if (currentAttachShadow && currentAttachShadow[ATTACH_SHADOW_HOOK_FLAG]) {
			return;
		}
		const wrappedAttachShadow = function (...args) {
			const root = currentAttachShadow.apply(this, args);
			trackShadowHost(this);
			return root;
		};
		Object.defineProperty(wrappedAttachShadow, ATTACH_SHADOW_HOOK_FLAG, {value: true});
		try {
			prototype.attachShadow = wrappedAttachShadow;
		} catch (error) { // Ignore: if patching is blocked, mutation-based tracking still works.
		}
	}

	function getSearchRoots() {
		const roots = [document];
		if (! CONFIG.searchShadowRoots) {
			return roots;
		}
		trackShadowHost(document.documentElement);
		trackShadowHost(document.body);
		shadowRoots.forEach((root) => {
			if (root && root.host && root.host.isConnected) {
				roots.push(root);
			}
		});
		return roots;
	}

	function collectBySelector(roots, selector) {
		const results = new Set();
		roots.forEach((root) => {
			if (!root || typeof root.querySelectorAll !== "function") {
				return;
			}
			root.querySelectorAll(selector).forEach((node) => results.add(node));
		});
		return Array.from(results);
	}

	function getFallbackAreas(roots) {
		syncViewState();
		if (! fallbackAreasDirty) {
			return fallbackAreas;
		}

		const limit = Math.max(1, Number(CONFIG.fallbackAreaLimit) || 1);
		const collected = [];
		const seen = new Set();
		const addCandidate = (element) => {
			if (!element || element.nodeType !== Node.ELEMENT_NODE || !element.isConnected || seen.has(element)) {
				return false;
			}
			seen.add(element);
			collected.push(element);
			return collected.length >= limit;
		};

		const collectWithSelectors = (root, selectors) => {
			if (!root || typeof root.querySelectorAll !== "function") {
				return false;
			}
			for (const selector of selectors) {
				const nodes = root.querySelectorAll(selector);
				for (const node of nodes) {
					if (addCandidate(node)) {
						return true;
					}
				}
			}
			return false;
		};

		for (const root of roots) {
			if (collectWithSelectors(root, CONFIG.fallbackAreaSelectors || [])) {
				break;
			}
			if (collectWithSelectors(root, CONFIG.matchViewSelectors || [])) {
				break;
			}
			if (collected.length < limit) {
				if (root === document) {
					addCandidate(document.body || document.documentElement);
				} else if (root && root.host) {
					addCandidate(root.host);
				}
			}
			if (collected.length >= limit) {
				break;
			}
		}

		if (! collected.length) {
			addCandidate(document.body || document.documentElement);
		}

		fallbackAreas = collected.slice(0, limit);
		fallbackAreasDirty = false;
		if (fallbackAreas.length === 0) {
			fallbackWindowOffset = 0;
		} else if (fallbackWindowOffset >= fallbackAreas.length) {
			fallbackWindowOffset = fallbackWindowOffset % fallbackAreas.length;
		}
		return fallbackAreas;
	}

	function getFallbackScanAreas(roots) {
		const areas = getFallbackAreas(roots);
		if (! areas.length) {
			return [];
		}
		const windowSize = Math.max(1, Math.min(Number(CONFIG.fallbackAreaWindowSize) || 1, areas.length));
		const selected = [];
		for (let index = 0; index < windowSize; index += 1) {
			selected.push(areas[(fallbackWindowOffset + index) % areas.length]);
		}
		fallbackWindowOffset = (fallbackWindowOffset + windowSize) % areas.length;
		return selected;
	}

	function collectByText(areas) {
		if (! fallbackTextMatches.length || ! areas.length) {
			return [];
		}
		const matches = new Set();
		let remainingTextBudget = Math.max(1, Number(CONFIG.fallbackTextNodeBudget) || 1);
		areas.forEach((area) => {
			if (!area || remainingTextBudget <= 0) {
				return;
			}
			const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT, null);
			let node = walker.nextNode();
			while (node && remainingTextBudget > 0) {
				remainingTextBudget -= 1;
				const value = node.nodeValue;
				const normalized = value ? value.trim().toLowerCase() : "";
				if (normalized) {
					for (const match of fallbackTextMatches) {
						if (normalized.includes(match)) {
							if (node.parentElement) {
								matches.add(node.parentElement);
							}
							break;
						}
					}
				}
				node = walker.nextNode();
			}
		});
		return Array.from(matches);
	}

	function shouldRunFallback() {
		if (! CONFIG.searchShadowRoots && ! fallbackTextMatches.length) {
			return false;
		}
		const now = Date.now();
		if (now - lastFallbackScan < CONFIG.fallbackScanMs) {
			return false;
		}
		lastFallbackScan = now;
		return true;
	}

	function findNotices() {
		const primary = collectBySelector([document], CONFIG.noticeSelector);
		if (primary.length) {
			return primary;
		}
		if (! shouldRunFallback()) {
			return [];
		}
		const roots = getSearchRoots();
		const deep = collectBySelector(roots, CONFIG.noticeSelector);
		if (deep.length) {
			return deep;
		}
		if (! fallbackTextMatches.length) {
			return [];
		}
		const scanAreas = getFallbackScanAreas(roots);
		return collectByText(scanAreas);
	}

	function applyReplacement(notice) {
		if (! notice || notice.nodeType !== Node.ELEMENT_NODE) {
			return;
		}
		const card = notice.parentElement || notice;
		card.classList.add(CARD_CLASS);

		let image = notice.querySelector(`.${IMAGE_CLASS}`);
		if (! image) {
			image = buildImage();
			notice.appendChild(image);
		} else {
			image.src = CONFIG.imageUrl;
			image.alt = CONFIG.imageAlt;
		}

		Array.from(notice.childNodes).forEach((child) => {
			if (child !== image) {
				child.remove();
			}
		});
	}

	function updateNotices() {
		findNotices().forEach((notice) => {
			applyReplacement(notice);
		});
	}

	const scheduleUpdate = createRafScheduler(updateNotices);

	installAttachShadowHook();
	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateNotices();

	observeMutations({
		onChange: (mutation, mutations) => {
			collectShadowRootsFromMutations(mutations || [mutation]);
			scheduleUpdate();
		}
	});
})();
