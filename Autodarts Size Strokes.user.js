// ==UserScript==
// @name         Autodarts Size Strokes
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.1
// @description  Adjust dart marker size, fill, and effects.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Size%20Strokes.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Autodarts%20Size%20Strokes.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Marker options.
  const MARKER_RADIUS = 10;
  const MARKER_FILL = "rgb(49, 130, 206)";
  const EFFECT = "pulse"; // "pulse" | "glow" | "pop" | "none"

  const STYLE_ID = "autodarts-size-strokes-style";
  const MARKER_SELECTOR =
    'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]';
  const BASE_CLASS = "ad-ext-dart-marker";
  const EFFECT_CLASSES = {
    pulse: "ad-ext-dart-marker--pulse",
    glow: "ad-ext-dart-marker--glow",
    pop: "ad-ext-dart-marker--pop",
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.${BASE_CLASS} {
  transform-box: fill-box;
  transform-origin: center;
}

.${EFFECT_CLASSES.pulse} {
  animation: ad-ext-dart-pulse 1.6s ease-in-out infinite;
}

.${EFFECT_CLASSES.glow} {
  animation: ad-ext-dart-glow 1.8s ease-in-out infinite;
}

.${EFFECT_CLASSES.pop} {
  animation: ad-ext-dart-pop 220ms ease-out 1;
}

@keyframes ad-ext-dart-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.85; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes ad-ext-dart-glow {
  0% { stroke-width: 2; opacity: 0.9; }
  50% { stroke-width: 5; opacity: 1; }
  100% { stroke-width: 2; opacity: 0.9; }
}

@keyframes ad-ext-dart-pop {
  0% { transform: scale(0.6); opacity: 0.3; }
  100% { transform: scale(1); opacity: 1; }
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

  function applyMarkerStyles(marker) {
    marker.setAttribute("r", String(MARKER_RADIUS));
    marker.style.fill = MARKER_FILL;
    marker.classList.add(BASE_CLASS);
    Object.values(EFFECT_CLASSES).forEach((effectClass) => {
      marker.classList.remove(effectClass);
    });
    if (EFFECT !== "none" && EFFECT_CLASSES[EFFECT]) {
      marker.classList.add(EFFECT_CLASSES[EFFECT]);
    }
  }

  function updateMarkers() {
    const markers = document.querySelectorAll(MARKER_SELECTOR);
    markers.forEach(applyMarkerStyles);
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateMarkers();
    });
  }

  ensureStyle();
  updateMarkers();

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
