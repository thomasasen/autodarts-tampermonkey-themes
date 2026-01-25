// ==UserScript==
// @name         Autodarts Animate Remove Darts Notification
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.3
// @description  Replaces the "Removing Darts" notice with TakeOut.png and a subtle pulse animation.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Remove%20Darts%20Notification.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Remove%20Darts%20Notification.user.js
// ==/UserScript==

(function () {
	"use strict";

	/**
   * Configuration for the takeout notification replacement.
   * @property {string} noticeSelector - Selector for the "Removing Darts" notice element.
   * @property {string} imageUrl - URL to the TakeOut.png asset.
   * @property {string} imageAlt - Alt text for the replacement image.
   * @property {string[]} fallbackTexts - Text matches used if the selector changes.
   * @property {boolean} searchShadowRoots - Also search open shadow roots for the notice.
   * @property {number} fallbackScanMs - Minimum delay between text fallback scans.
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

	function ensureStyle() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `
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

		const target = document.head || document.documentElement;
		if (target) {
			target.appendChild(style);
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				const fallbackTarget = document.head || document.documentElement;
				if (fallbackTarget && !document.getElementById(STYLE_ID)) {
					fallbackTarget.appendChild(style);
				}
			}, {once: true});
		}
	}

	function buildImage() {
		const image = document.createElement("img");
		image.className = IMAGE_CLASS;
		image.src = CONFIG.imageUrl;
		image.alt = CONFIG.imageAlt;
		image.decoding = "async";
		image.loading = "eager";
		return image;
	}

	function getSearchRoots() {
		const roots = [document];
		if (! CONFIG.searchShadowRoots) {
			return roots;
		}
		document.querySelectorAll("*").forEach((element) => {
			if (element.shadowRoot) {
				roots.push(element.shadowRoot);
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

	function collectByText(roots) {
		if (! fallbackTextMatches.length) {
			return [];
		}
		const matches = new Set();
		roots.forEach((root) => {
			if (!root) {
				return;
			}
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
			let node = walker.nextNode();
			while (node) {
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
		return collectByText(roots);
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

	let scheduled = false;
	function scheduleUpdate() {
		if (scheduled) {
			return;
		}
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			updateNotices();
		});
	}

	ensureStyle();
	updateNotices();

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "childList" || mutation.type === "attributes" || mutation.type === "characterData") {
				scheduleUpdate();
				break;
			}
		}
	});

	const observeTarget = document.documentElement;
	if (observeTarget) {
		observer.observe(observeTarget, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true
		});
	} else {
		document.addEventListener("DOMContentLoaded", () => {
			const fallbackTarget = document.documentElement;
			if (fallbackTarget) {
				observer.observe(fallbackTarget, {
					childList: true,
					subtree: true,
					characterData: true,
					attributes: true
				});
			}
		}, {once: true});
	}
})();
