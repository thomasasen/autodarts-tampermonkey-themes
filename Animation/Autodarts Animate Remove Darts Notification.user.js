// ==UserScript==
// @name         Autodarts Animate Remove Darts Notification
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
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
   * @property {number} pulseDurationMs - Duration of the pulse animation.
   * @property {number} pulseScale - Max scale for the pulse animation.
   */
  const CONFIG = {
    noticeSelector: ".adt-remove",
    imageUrl:
      "https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/TakeOut.png",
    imageAlt: "Removing darts",
    pulseDurationMs: 1400,
    pulseScale: 1.04,
  };

  const STYLE_ID = "ad-ext-takeout-style";
  const CARD_CLASS = "ad-ext-takeout-card";
  const IMAGE_CLASS = "ad-ext-takeout-image";
  const DATA_KEY = "adExtTakeoutApplied";

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
  padding: 0 !important;
  box-shadow: none !important;
  pointer-events: none;
}

.${CARD_CLASS} .${IMAGE_CLASS} {
  display: block;
  width: min(24rem, 80vw);
  height: auto;
  transform-origin: center;
  animation: ad-ext-takeout-pulse ${CONFIG.pulseDurationMs}ms ease-in-out infinite;
  will-change: transform, opacity;
  pointer-events: none;
}

@keyframes ad-ext-takeout-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(${CONFIG.pulseScale}); opacity: 0.95; }
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

  function buildImage() {
    const image = document.createElement("img");
    image.className = IMAGE_CLASS;
    image.src = CONFIG.imageUrl;
    image.alt = CONFIG.imageAlt;
    image.decoding = "async";
    image.loading = "eager";
    return image;
  }

  function applyReplacement(notice) {
    if (!notice || notice.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    if (notice.dataset[DATA_KEY] === "1") {
      return;
    }

    notice.dataset[DATA_KEY] = "1";
    const card = notice.parentElement || notice;
    card.classList.add(CARD_CLASS);

    notice.textContent = "";
    if (!notice.querySelector(`.${IMAGE_CLASS}`)) {
      notice.appendChild(buildImage());
    }
  }

  function updateNotices() {
    document.querySelectorAll(CONFIG.noticeSelector).forEach((notice) => {
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
      if (
        mutation.type === "childList" ||
        mutation.type === "attributes" ||
        mutation.type === "characterData"
      ) {
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
      attributes: true,
    });
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        const fallbackTarget = document.documentElement;
        if (fallbackTarget) {
          observer.observe(fallbackTarget, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
          });
        }
      },
      { once: true }
    );
  }
})();
