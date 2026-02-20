// ==UserScript==
// @name         Autodarts Style Checkout Suggestions
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Stylt Checkout-Empfehlungen in X01 klarer und besser lesbar.
// @xconfig-description  Formatiert und betont Checkout-Suggestions in X01, damit Empfehlungen schneller erfassbar sind.
// @xconfig-variant      x01
// @xconfig-readme-anchor  animation-autodarts-style-checkout-suggestions
// @xconfig-background     assets/animation-style-checkout-suggestions-format-stripe-readme.png
// @xconfig-settings-version 3
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/refs/heads/main/Animation/autodarts-animation-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Style%20Checkout%20Suggestions.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Style%20Checkout%20Suggestions.user.js
// ==/UserScript==

(function () {
	"use strict";

	const shared = window.autodartsAnimationShared || {};

	function ensureStyleFallback(styleId, cssText) {
		if (!styleId) {
			return false;
		}

		const target = document.head || document.documentElement;
		const existingStyle = document.getElementById(styleId);
		if (existingStyle) {
			if (existingStyle.textContent !== cssText) {
				existingStyle.textContent = cssText;
			}
			if (target && existingStyle.parentElement !== target) {
				target.appendChild(existingStyle);
			}
			return true;
		}

		const style = document.createElement("style");
		style.id = styleId;
		style.textContent = cssText;

		if (target) {
			target.appendChild(style);
			return true;
		}

		document.addEventListener(
			"DOMContentLoaded",
			() => {
				const fallbackTarget = document.head || document.documentElement;
				if (fallbackTarget && !document.getElementById(styleId)) {
					fallbackTarget.appendChild(style);
				}
			},
			{once: true}
		);

		return true;
	}

	function createRafSchedulerFallback(callback) {
		let scheduled = false;
		return function schedule() {
			if (scheduled) {
				return;
			}
			scheduled = true;
			requestAnimationFrame(() => {
				scheduled = false;
				callback();
			});
		};
	}

	function observeMutationsFallback(options) {
		if (!options || typeof options.onChange !== "function") {
			return null;
		}

		const onChange = options.onChange;
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (
					mutation.type === "childList" ||
					mutation.type === "characterData" ||
					mutation.type === "attributes"
				) {
					onChange(mutation, mutations);
					break;
				}
			}
		});

		const root = options.target || document.documentElement;
		const observeRoot = (targetRoot) => {
			if (!targetRoot) {
				return;
			}
			observer.observe(targetRoot, {
				childList: true,
				subtree: true,
				characterData: true,
				attributes: true
			});
		};

		if (root) {
			observeRoot(root);
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				observeRoot(options.target || document.documentElement);
			}, {once: true});
		}

		return observer;
	}

	function isX01VariantFallback(variantElementId, options) {
		const config = options || {};
		const elementId = variantElementId || "ad-ext-game-variant";
		const variantEl = document.getElementById(elementId);
		const variant = variantEl?.textContent?.trim().toLowerCase() || "";

		if (!variant) {
			return Boolean(config.allowEmpty || config.allowMissing);
		}
		if (variant.includes("x01")) {
			return true;
		}
		if (config.allowNumeric) {
			return /\b\d+01\b/.test(variant);
		}
		return false;
	}

	const ensureStyle = typeof shared.ensureStyle === "function" ? shared.ensureStyle : ensureStyleFallback;
	const createRafScheduler = typeof shared.createRafScheduler === "function" ? shared.createRafScheduler : createRafSchedulerFallback;
	const observeMutations = typeof shared.observeMutations === "function" ? shared.observeMutations : observeMutationsFallback;
	const isX01Variant = typeof shared.isX01Variant === "function" ? shared.isX01Variant : isX01VariantFallback;

	if (!window.autodartsAnimationShared) {
		console.warn("[xConfig][Checkout Suggestions] Shared helper not available. Using local fallback helpers.");
	}

	// xConfig: {"type":"select","label":"Stil","description":"Wählt die Darstellungsart für Checkout-Empfehlungen.","options":[{"value":"badge","label":"Badge"},{"value":"ribbon","label":"Ribbon"},{"value":"stripe","label":"Stripe"},{"value":"ticket","label":"Ticket"},{"value":"outline","label":"Outline"}]}
	const xConfig_STIL = "ribbon";
	// xConfig: {"type":"select","label":"Labeltext","description":"Text im Label über der Empfehlung.","options":[{"value":"CHECKOUT","label":"CHECKOUT"},{"value":"FINISH","label":"FINISH"},{"value":"","label":"Kein Label"}]}
	const xConfig_LABELTEXT = "CHECKOUT";
	// xConfig: {"type":"select","label":"Farbthema","description":"Farbthema für Akzente, Label und Highlights.","options":[{"value":"amber","label":"Amber (Standard)"},{"value":"cyan","label":"Cyan"},{"value":"rose","label":"Rose"}]}
	const xConfig_FARBTHEMA = "amber";

	// xConfig: {"type":"toggle","label":"Debug","description":"Nur auf Anweisung aktivieren. Schreibt technische Diagnose-Logs in die Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
	const xConfig_DEBUG = false;


	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Checkout Suggestions]";

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
	function resolveStringChoice(value, fallbackValue, allowedValues) {
		const normalizedValue = String(value || "").trim();
		return allowedValues.includes(normalizedValue)
			? normalizedValue
			: fallbackValue;
	}

	const COLOR_THEME_PRESETS = {
		amber: {
			accentColor: "#f59e0b",
			accentSoftColor: "rgba(245, 158, 11, 0.16)",
			accentStrongColor: "rgba(245, 158, 11, 0.6)",
			labelBackground: "#fcd34d",
			labelTextColor: "#1f1300",
		},
		cyan: {
			accentColor: "#06b6d4",
			accentSoftColor: "rgba(6, 182, 212, 0.16)",
			accentStrongColor: "rgba(6, 182, 212, 0.58)",
			labelBackground: "#67e8f9",
			labelTextColor: "#082f35",
		},
		rose: {
			accentColor: "#f43f5e",
			accentSoftColor: "rgba(244, 63, 94, 0.15)",
			accentStrongColor: "rgba(244, 63, 94, 0.58)",
			labelBackground: "#fda4af",
			labelTextColor: "#4a1020",
		},
	};

	const RESOLVED_STIL = resolveStringChoice(xConfig_STIL, "ribbon", ["badge", "ribbon", "stripe", "ticket", "outline"]);
	const RESOLVED_LABELTEXT = resolveStringChoice(xConfig_LABELTEXT, "CHECKOUT", ["CHECKOUT", "FINISH", ""]);
	const RESOLVED_FARBTHEMA = resolveStringChoice(xConfig_FARBTHEMA, "amber", ["amber", "cyan", "rose"]);
	const RESOLVED_COLOR_THEME = COLOR_THEME_PRESETS[RESOLVED_FARBTHEMA] || COLOR_THEME_PRESETS.amber;

	/**
   * Style options:
   * - "badge"  : label + dashed outline (default)
   * - "ribbon" : angled ribbon + glow
   * - "stripe" : diagonal stripe overlay
   * - "ticket" : ticket card with perforation line
   * - "outline": bold outline + marker dot
   */
	const CONFIG = {
		suggestionSelector: ".suggestion",
		variantElementId: "ad-ext-game-variant",
		requireX01: true,
		formatStyle: RESOLVED_STIL,
		labelText: RESOLVED_LABELTEXT,
		accentColor: RESOLVED_COLOR_THEME.accentColor,
		accentSoftColor: RESOLVED_COLOR_THEME.accentSoftColor,
		accentStrongColor: RESOLVED_COLOR_THEME.accentStrongColor,
		labelBackground: RESOLVED_COLOR_THEME.labelBackground,
		labelTextColor: RESOLVED_COLOR_THEME.labelTextColor,
		borderRadiusPx: 14,
		stripeOpacity: 0.35
	};

	const STYLE_ID = "ad-ext-checkout-suggestion-style";
	const BASE_CLASS = "ad-ext-checkout-suggestion";
	const NO_LABEL_CLASS = "ad-ext-checkout-suggestion--no-label";
	const STYLE_CLASSES = {
		badge: "ad-ext-checkout-suggestion--badge",
		ribbon: "ad-ext-checkout-suggestion--ribbon",
		stripe: "ad-ext-checkout-suggestion--stripe",
		ticket: "ad-ext-checkout-suggestion--ticket",
		outline: "ad-ext-checkout-suggestion--outline"
	};
	const STYLE_CLASS_LIST = Object.values(STYLE_CLASSES);

	const STYLE_TEXT = `
.${BASE_CLASS} {
  position: relative;
  isolation: isolate;
  overflow: visible;
  border-radius: var(--ad-ext-radius, 14px);
  transition: transform 120ms ease, box-shadow 160ms ease;
}

.${BASE_CLASS} > * {
  position: relative;
  z-index: 1;
}

.${BASE_CLASS}::before {
  content: attr(data-ad-ext-label);
  position: absolute;
  top: 6px;
  left: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--ad-ext-label-bg);
  color: var(--ad-ext-label-color);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid rgba(15, 12, 5, 0.55);
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.45),
    0 0 0 2px rgba(15, 12, 5, 0.6);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 2;
}

.${NO_LABEL_CLASS}::before {
  display: none;
}

.${
		STYLE_CLASSES.badge
	} {
  outline: 2px dashed var(--ad-ext-accent);
  outline-offset: -6px;
  background: var(--ad-ext-accent-soft);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.${
		STYLE_CLASSES.ribbon
	} {
  background: linear-gradient(135deg, var(--ad-ext-accent-soft), rgba(255, 255, 255, 0));
  box-shadow:
    0 0 0 2px var(--ad-ext-accent) inset,
    0 0 18px var(--ad-ext-accent-strong);
}

.${
		STYLE_CLASSES.ribbon
	}::before {
  top: 6px;
  left: 8px;
  transform: rotate(-6deg);
  transform-origin: left center;
}

.${
		STYLE_CLASSES.ribbon
	}::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  box-shadow: 0 0 24px var(--ad-ext-accent-strong);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}

.${
		STYLE_CLASSES.stripe
	} {
  background: var(--ad-ext-accent-soft);
  box-shadow:
    0 0 0 2px var(--ad-ext-accent) inset,
    0 12px 22px rgba(0, 0, 0, 0.22);
}

.${
		STYLE_CLASSES.stripe
	}::after {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: inherit;
  background: repeating-linear-gradient(
    45deg,
    var(--ad-ext-accent-strong),
    var(--ad-ext-accent-strong) 6px,
    transparent 6px,
    transparent 12px
  );
  opacity: var(--ad-ext-stripe-opacity, 0.35);
  pointer-events: none;
  z-index: 0;
}

.${
		STYLE_CLASSES.ticket
	} {
  background: linear-gradient(135deg, var(--ad-ext-accent-soft), rgba(255, 255, 255, 0.08));
  box-shadow:
    0 0 0 2px var(--ad-ext-accent) inset,
    0 14px 26px rgba(0, 0, 0, 0.24);
}

.${
		STYLE_CLASSES.ticket
	}::before {
  top: 4px;
  left: 12px;
  transform: none;
}

.${
		STYLE_CLASSES.ticket
	}::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  top: 50%;
  border-top: 2px dashed rgba(255, 255, 255, 0.55);
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
}

.${
		STYLE_CLASSES.outline
	} {
  outline: 3px solid var(--ad-ext-accent);
  outline-offset: -6px;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.25) inset,
    0 12px 24px rgba(0, 0, 0, 0.2);
}

.${
		STYLE_CLASSES.outline
	}::after {
  content: "";
  position: absolute;
  top: -6px;
  right: -6px;
  width: 12px;
  height: 12px;
  background: var(--ad-ext-accent);
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.7);
  pointer-events: none;
  z-index: 2;
}
`;

	function applyElementConfig(element) {
		element.style.setProperty("--ad-ext-accent", CONFIG.accentColor);
		element.style.setProperty("--ad-ext-accent-soft", CONFIG.accentSoftColor);
		element.style.setProperty("--ad-ext-accent-strong", CONFIG.accentStrongColor);
		element.style.setProperty("--ad-ext-label-bg", CONFIG.labelBackground);
		element.style.setProperty("--ad-ext-label-color", CONFIG.labelTextColor);
		element.style.setProperty("--ad-ext-radius", `${
			CONFIG.borderRadiusPx
		}px`);
		element.style.setProperty("--ad-ext-stripe-opacity", String(CONFIG.stripeOpacity));
	}

	function resetSuggestion(element) {
		element.classList.remove(BASE_CLASS, NO_LABEL_CLASS, ...STYLE_CLASS_LIST);
		element.removeAttribute("data-ad-ext-label");
		element.style.removeProperty("--ad-ext-accent");
		element.style.removeProperty("--ad-ext-accent-soft");
		element.style.removeProperty("--ad-ext-accent-strong");
		element.style.removeProperty("--ad-ext-label-bg");
		element.style.removeProperty("--ad-ext-label-color");
		element.style.removeProperty("--ad-ext-radius");
		element.style.removeProperty("--ad-ext-stripe-opacity");
	}

	function updateSuggestions() {
		const suggestions = document.querySelectorAll(CONFIG.suggestionSelector);
		if (!suggestions.length) {
			return;
		}

		const isX01 = CONFIG.requireX01 ? isX01Variant(CONFIG.variantElementId, {
			allowMissing: false,
			allowEmpty: false,
			allowNumeric: true
		}) : true;
		const desiredClass = STYLE_CLASSES[CONFIG.formatStyle] || STYLE_CLASSES.badge;
		const label = String(CONFIG.labelText || "").trim();

		suggestions.forEach((element) => {
			if (!isX01) {
				resetSuggestion(element);
				return;
			}

			element.classList.add(BASE_CLASS);
			element.classList.remove(...STYLE_CLASS_LIST);
			element.classList.add(desiredClass);
			element.classList.toggle(NO_LABEL_CLASS, !label);
			if (label) {
				element.setAttribute("data-ad-ext-label", label);
			} else {
				element.removeAttribute("data-ad-ext-label");
			}
			applyElementConfig(element);
		});
	}

	const scheduleUpdate = createRafScheduler(updateSuggestions);

	function mutationTouchesSuggestions(mutation) {
		if (!mutation) {
			return false;
		}

		const isRelevantElement = (element) => {
			if (!element || element.nodeType !== Node.ELEMENT_NODE) {
				return false;
			}
			if (element.matches(CONFIG.suggestionSelector)) {
				return true;
			}
			if (element.id === CONFIG.variantElementId) {
				return true;
			}
			return Boolean(
				element.querySelector(CONFIG.suggestionSelector) ||
				element.querySelector(`#${CONFIG.variantElementId}`)
			);
		};

		if (mutation.type === "characterData") {
			const parent = mutation.target && mutation.target.parentElement;
			return isRelevantElement(parent);
		}

		if (mutation.type === "attributes") {
			return isRelevantElement(mutation.target);
		}

		if (mutation.type === "childList") {
			if (isRelevantElement(mutation.target)) {
				return true;
			}
			for (const node of mutation.addedNodes || []) {
				if (isRelevantElement(node)) {
					return true;
				}
			}
			for (const node of mutation.removedNodes || []) {
				if (isRelevantElement(node)) {
					return true;
				}
			}
		}

		return false;
	}

	ensureStyle(STYLE_ID, STYLE_TEXT);
	updateSuggestions();

	debugLog("applied");
	observeMutations({
		target: document.body || document.documentElement,
		types: ["childList", "characterData", "attributes"],
		attributeFilter: ["class", "id", "style", "data-state", "aria-hidden"],
		onChange: (mutation, mutations) => {
			const mutationList = Array.isArray(mutations) && mutations.length
				? mutations
				: [mutation];
			if (mutationList.some(mutationTouchesSuggestions)) {
				scheduleUpdate();
			}
		}
	});
	debugLog("init", { debug: DEBUG_ENABLED });
})();
