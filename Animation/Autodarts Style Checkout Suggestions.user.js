// ==UserScript==
// @name         Autodarts Style Checkout Suggestions
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.5
// @description  Style checkout suggestions so they read as recommendations in X01.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Style%20Checkout%20Suggestions.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Style%20Checkout%20Suggestions.user.js
// ==/UserScript==

(function () {
  "use strict";

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
    formatStyle: "ribbon",
    labelText: "CHECKOUT",
    accentColor: "#f59e0b",
    accentSoftColor: "rgba(245, 158, 11, 0.16)",
    accentStrongColor: "rgba(245, 158, 11, 0.6)",
    labelBackground: "#fcd34d",
    labelTextColor: "#1f1300",
    borderRadiusPx: 14,
    stripeOpacity: 0.35,
  };

  const STYLE_ID = "ad-ext-checkout-suggestion-style";
  const BASE_CLASS = "ad-ext-checkout-suggestion";
  const NO_LABEL_CLASS = "ad-ext-checkout-suggestion--no-label";
  const STYLE_CLASSES = {
    badge: "ad-ext-checkout-suggestion--badge",
    ribbon: "ad-ext-checkout-suggestion--ribbon",
    stripe: "ad-ext-checkout-suggestion--stripe",
    ticket: "ad-ext-checkout-suggestion--ticket",
    outline: "ad-ext-checkout-suggestion--outline",
  };
  const STYLE_CLASS_LIST = Object.values(STYLE_CLASSES);

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
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

.${STYLE_CLASSES.badge} {
  outline: 2px dashed var(--ad-ext-accent);
  outline-offset: -6px;
  background: var(--ad-ext-accent-soft);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.${STYLE_CLASSES.ribbon} {
  background: linear-gradient(135deg, var(--ad-ext-accent-soft), rgba(255, 255, 255, 0));
  box-shadow:
    0 0 0 2px var(--ad-ext-accent) inset,
    0 0 18px var(--ad-ext-accent-strong);
}

.${STYLE_CLASSES.ribbon}::before {
  top: 6px;
  left: 8px;
  transform: rotate(-6deg);
  transform-origin: left center;
}

.${STYLE_CLASSES.ribbon}::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  box-shadow: 0 0 24px var(--ad-ext-accent-strong);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}

.${STYLE_CLASSES.stripe} {
  background: var(--ad-ext-accent-soft);
  box-shadow:
    0 0 0 2px var(--ad-ext-accent) inset,
    0 12px 22px rgba(0, 0, 0, 0.22);
}

.${STYLE_CLASSES.stripe}::after {
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

.${STYLE_CLASSES.ticket} {
  background: linear-gradient(135deg, var(--ad-ext-accent-soft), rgba(255, 255, 255, 0.08));
  box-shadow:
    0 0 0 2px var(--ad-ext-accent) inset,
    0 14px 26px rgba(0, 0, 0, 0.24);
}

.${STYLE_CLASSES.ticket}::before {
  top: 4px;
  left: 12px;
  transform: none;
}

.${STYLE_CLASSES.ticket}::after {
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

.${STYLE_CLASSES.outline} {
  outline: 3px solid var(--ad-ext-accent);
  outline-offset: -6px;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.25) inset,
    0 12px 24px rgba(0, 0, 0, 0.2);
}

.${STYLE_CLASSES.outline}::after {
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

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          const fallbackTarget = document.head || document.documentElement;
          if (fallbackTarget && !document.getElementById(STYLE_ID)) {
            fallbackTarget.appendChild(style);
          }
        },
        { once: true }
      );
    }
  }

  function isX01Variant() {
    if (!CONFIG.requireX01) {
      return true;
    }
    const variantEl = document.getElementById(CONFIG.variantElementId);
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    if (!variant) {
      return false;
    }
    if (variant.includes("x01")) {
      return true;
    }
    return /\b\d+01\b/.test(variant);
  }

  function applyElementConfig(element) {
    element.style.setProperty("--ad-ext-accent", CONFIG.accentColor);
    element.style.setProperty("--ad-ext-accent-soft", CONFIG.accentSoftColor);
    element.style.setProperty(
      "--ad-ext-accent-strong",
      CONFIG.accentStrongColor
    );
    element.style.setProperty("--ad-ext-label-bg", CONFIG.labelBackground);
    element.style.setProperty("--ad-ext-label-color", CONFIG.labelTextColor);
    element.style.setProperty("--ad-ext-radius", `${CONFIG.borderRadiusPx}px`);
    element.style.setProperty(
      "--ad-ext-stripe-opacity",
      String(CONFIG.stripeOpacity)
    );
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

    const isX01 = isX01Variant();
    const desiredClass =
      STYLE_CLASSES[CONFIG.formatStyle] || STYLE_CLASSES.badge;
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

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateSuggestions();
    });
  }

  ensureStyle();
  updateSuggestions();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" ||
        mutation.type === "characterData" ||
        mutation.type === "attributes"
      ) {
        scheduleUpdate();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
})();
