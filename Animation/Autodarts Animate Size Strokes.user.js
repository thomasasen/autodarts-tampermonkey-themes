// ==UserScript==
// @name         Autodarts Animate Size Strokes
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Passt Größe und Farbe der Dart-Markierungen auf dem Board an und kann einen leichten Glow/Puls hinzufügen, damit Treffer besser sichtbar sind.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Size%20Strokes.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Size%20Strokes.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Script-Ziel: Dart-Markierungen größer/farbiger machen und optional animieren.
  /**
   * Marker-Optionen für Größe, Farbe und Effekt.
   * @property {number} MARKER_RADIUS - Radius in px, z.B. 6.
   * @property {string} MARKER_FILL - Füllfarbe, z.B. "rgb(49, 130, 206)".
   * @property {string} EFFECT - "pulse" | "glow" | "none", z.B. "glow".
   */
  const MARKER_RADIUS = 6;
  const MARKER_FILL = "rgb(49, 130, 206)";
  const EFFECT = "glow"; // "pulse" | "glow" | "none"

  const STYLE_ID = "autodarts-size-strokes-style";
  const MARKER_SELECTOR =
    'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]';
  const BASE_CLASS = "ad-ext-dart-marker";
  const EFFECT_CLASSES = {
    pulse: "ad-ext-dart-marker--pulse",
    glow: "ad-ext-dart-marker--glow",
  };

  /**
   * Fügt CSS-Regeln für die Marker-Effekte ein.
   * @returns {void}
   */
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

  /**
   * Wendet Größe, Farbe und Effekt auf einen Marker an.
   * @param {SVGCircleElement} marker - Dart-Markierung als SVG-Kreis.
   * @example
   * applyMarkerStyles(document.querySelector("circle"));
   * @returns {void}
   */
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

  /**
   * Sucht alle Marker im DOM und aktualisiert deren Darstellung.
   * @returns {void}
   */
  function updateMarkers() {
    const markers = document.querySelectorAll(MARKER_SELECTOR);
    markers.forEach(applyMarkerStyles);
  }

  let scheduled = false;
  /**
   * Fasst DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
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

  // Beobachtet Änderungen am Board, um neue Marker zu stylen.
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
