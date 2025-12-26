// ==UserScript==
// @name         Autodarts Animate Scoreboard Parallax
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.1
// @description  Subtle parallax shift on the active player panel.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Scoreboard%20Parallax.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Scoreboard%20Parallax.user.js
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    activeSelector: ".ad-ext-player-active",
    activeClass: "ad-ext-parallax-active",
    shiftY: "-6px",
    transitionMs: 260,
  };

  const STYLE_ID = "autodarts-scoreboard-parallax-style";
  let lastActive = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.ad-ext-player {
  transform: translate3d(0, 0, 0);
  transition: transform ${CONFIG.transitionMs}ms ease-out;
  will-change: transform;
}

.${CONFIG.activeClass} {
  transform: translate3d(0, ${CONFIG.shiftY}, 0);
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

  function updateActive() {
    const current = document.querySelector(CONFIG.activeSelector);
    if (current === lastActive) {
      return;
    }
    if (lastActive) {
      lastActive.classList.remove(CONFIG.activeClass);
    }
    if (current) {
      current.classList.add(CONFIG.activeClass);
    }
    lastActive = current;
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateActive();
    });
  }

  ensureStyle();
  updateActive();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" || mutation.type === "attributes") {
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
      attributes: true,
      attributeFilter: ["class"],
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
            attributes: true,
            attributeFilter: ["class"],
          });
        }
      },
      { once: true }
    );
  }
})();
