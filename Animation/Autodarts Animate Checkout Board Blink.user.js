// ==UserScript==
// @name         Autodarts Animate Checkout Board Blink
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Markiert die Checkout-Ziele direkt auf dem Dartboard (z.B. Double/Bull) und lässt sie blinken oder pulsieren, wenn ein Checkout in X01 möglich ist.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Board%20Blink.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Board%20Blink.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Script-Ziel: Checkout-Ziele auf dem Board visuell markieren (Blinken/Puls/Glow).
  /**
   * Konfiguration für das Markieren von Checkout-Zielen.
   * @property {string} suggestionSelector - CSS-Selektor für die Checkout-Empfehlung, z.B. ".suggestion".
   * @property {string} variantElementId - Element mit Spielvariante, z.B. "ad-ext-game-variant".
   * @property {boolean} requireX01 - Nur in X01 aktivieren, z.B. true.
   * @property {string} highlightTargets - "first" oder "all", z.B. "first".
   * @property {string} effect - "pulse" | "blink" | "glow", z.B. "pulse".
   * @property {string} color - Füllfarbe der Ziele, z.B. "rgba(168, 85, 247, 0.85)".
   * @property {string} strokeColor - Rahmenfarbe der Ziele, z.B. "rgba(168, 85, 247, 0.95)".
   * @property {number} strokeWidthRatio - Rahmenbreite relativ zum Boardradius, z.B. 0.008.
   * @property {number} animationMs - Dauer der Animation in ms, z.B. 1000.
   * @property {string} singleRing - "inner" | "outer" | "both", z.B. "both".
   * @property {number} edgePaddingPx - Zusätzlicher Rand in px, z.B. 1.
   * @property {Object} ringRatios - Ringgrenzen als Anteil des Boardradius, z.B. doubleInner: 0.711112.
   */
  const CONFIG = {
    suggestionSelector: ".suggestion",
    variantElementId: "ad-ext-game-variant",
    requireX01: true,
    highlightTargets: "first", // "first" | "all"
    effect: "pulse", // "pulse" | "blink" | "glow"
    color: "rgba(168, 85, 247, 0.85)",
    strokeColor: "rgba(168, 85, 247, 0.95)",
    strokeWidthRatio: 0.008,
    animationMs: 1000,
    singleRing: "both", // "inner" | "outer" | "both"
    edgePaddingPx: 1,
    ringRatios: {
      outerBullInner: 0.031112,
      outerBullOuter: 0.075556,
      tripleInner: 0.431112,
      tripleOuter: 0.475556,
      doubleInner: 0.711112,
      doubleOuter: 0.755556,
    },
  };

  // Reihenfolge der Sektoren im Uhrzeigersinn (Standard-Dartboard).
  const SEGMENT_ORDER = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STYLE_ID = "ad-ext-checkout-board-style";
  const OVERLAY_ID = "ad-ext-checkout-targets";
  const TARGET_CLASS = "ad-ext-checkout-target";
  const EFFECT_CLASSES = {
    pulse: "ad-ext-checkout-target--pulse",
    blink: "ad-ext-checkout-target--blink",
    glow: "ad-ext-checkout-target--glow",
  };

  // Merkt sich den zuletzt gelesenen Checkout-Text, um unnötige Updates zu vermeiden.
  let lastSuggestion = null;

  /**
   * Fügt die benötigten CSS-Regeln für Ziel-Markierungen ein.
   * @returns {void}
   */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.${TARGET_CLASS} {
  fill: var(--ad-ext-target-color);
  stroke: var(--ad-ext-target-stroke);
  stroke-width: var(--ad-ext-target-stroke-width);
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0.9;
  pointer-events: none;
}

.${EFFECT_CLASSES.pulse} {
  animation: ad-ext-checkout-pulse var(--ad-ext-target-duration) ease-in-out infinite;
}

.${EFFECT_CLASSES.blink} {
  animation: ad-ext-checkout-blink var(--ad-ext-target-duration) steps(2, end) infinite;
}

.${EFFECT_CLASSES.glow} {
  animation: ad-ext-checkout-glow var(--ad-ext-target-duration) ease-in-out infinite;
  filter: drop-shadow(0 0 12px var(--ad-ext-target-color));
}

@keyframes ad-ext-checkout-pulse {
  0% { opacity: 0.25; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0.25; transform: scale(0.98); }
}

@keyframes ad-ext-checkout-blink {
  0% { opacity: 0.1; }
  50% { opacity: 1; }
  100% { opacity: 0.1; }
}

@keyframes ad-ext-checkout-glow {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
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
   * Prüft, ob eine X01-Variante aktiv ist (z.B. 301/501).
   * @returns {boolean}
   */
  function isX01Variant() {
    if (!CONFIG.requireX01) {
      return true;
    }
    const variantEl = document.getElementById(CONFIG.variantElementId);
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    return variant.includes("x01");
  }

  /**
   * Extrahiert Checkout-Ziele aus dem Vorschlagstext.
   * @param {string} text - Text wie "T20 D10" oder "BULL".
   * @example
   * parseTargets("T20 D10"); // => [{ ring: "T", value: 20 }, { ring: "D", value: 10 }]
   * @returns {Array<{ring: string, value?: number}>}
   */
  function parseTargets(text) {
    if (!text) {
      return [];
    }

    const tokens =
      text.toUpperCase().match(/DB|BULLSEYE|BULL|SB|OB|[TDS]?\d{1,2}/g) || [];

    const targets = [];
    let hasExplicit = false;

    for (const token of tokens) {
      if (token === "DB" || token === "BULLSEYE") {
        targets.push({ target: { ring: "DB" }, isSummary: false });
        hasExplicit = true;
        continue;
      }
      if (token === "BULL" || token === "SB" || token === "OB") {
        targets.push({ target: { ring: "SB" }, isSummary: false });
        hasExplicit = true;
        continue;
      }

      const prefix = token[0];
      const value = Number.parseInt(
        prefix === "T" || prefix === "D" || prefix === "S"
          ? token.slice(1)
          : token,
        10
      );

      if (!Number.isFinite(value)) {
        continue;
      }

      if (value === 25) {
        if (prefix === "D") {
          targets.push({ target: { ring: "DB" }, isSummary: false });
          hasExplicit = true;
        } else {
          const isSummary = prefix !== "S";
          targets.push({ target: { ring: "SB" }, isSummary });
          if (!isSummary) {
            hasExplicit = true;
          }
        }
        continue;
      }

      if (value < 1 || value > 20) {
        continue;
      }

      const ring =
        prefix === "T" || prefix === "D" || prefix === "S" ? prefix : "S";
      const isSummary = prefix !== "T" && prefix !== "D" && prefix !== "S";
      targets.push({ target: { ring, value }, isSummary });
      if (!isSummary) {
        hasExplicit = true;
      }
    }

    const filtered = hasExplicit
      ? targets.filter((entry) => !entry.isSummary)
      : targets;

    return filtered.map((entry) => entry.target);
  }

  /**
   * Sucht den größten Kreisradius innerhalb eines SVG-Elements.
   * @param {Element} root - SVG oder Gruppe.
   * @example
   * getBoardRadius(document.querySelector("svg"));
   * @returns {number}
   */
  function getBoardRadius(root) {
    return [...root.querySelectorAll("circle")].reduce((max, circle) => {
      const r = Number.parseFloat(circle.getAttribute("r"));
      return Number.isFinite(r) && r > max ? r : max;
    }, 0);
  }

  /**
   * Findet das wahrscheinlichste Dartboard-SVG anhand von Zahlen und Radius.
   * @returns {{group: Element, radius: number} | null}
   */
  function findBoard() {
    const svgs = [...document.querySelectorAll("svg")];
    if (!svgs.length) {
      return null;
    }

    let best = null;
    let bestScore = -1;

    for (const svg of svgs) {
      const numbers = new Set(
        [...svg.querySelectorAll("text")]
          .map((text) => Number.parseInt(text.textContent, 10))
          .filter((value) => value >= 1 && value <= 20)
      );
      const numberScore = numbers.size;
      const radius = getBoardRadius(svg);
      const score = numberScore * 1000 + radius;
      if (score > bestScore) {
        best = svg;
        bestScore = score;
      }
    }

    if (!best) {
      return null;
    }

    let bestGroup = null;
    let bestRadius = 0;

    for (const group of best.querySelectorAll("g")) {
      const radius = getBoardRadius(group);
      if (radius > bestRadius) {
        bestRadius = radius;
        bestGroup = group;
      }
    }

    const radius = bestRadius || getBoardRadius(best);
    if (!radius) {
      return null;
    }

    return { group: bestGroup || best, radius };
  }

  /**
   * Stellt sicher, dass es eine Overlay-Gruppe für Ziel-Markierungen gibt.
   * @param {Element} boardGroup - SVG-Gruppe des Boards.
   * @returns {SVGGElement}
   */
  function ensureOverlayGroup(boardGroup) {
    let overlay = boardGroup.querySelector(`#${OVERLAY_ID}`);
    if (!overlay) {
      overlay = document.createElementNS(SVG_NS, "g");
      overlay.id = OVERLAY_ID;
      boardGroup.appendChild(overlay);
    }
    return overlay;
  }

  /**
   * Entfernt alle bisherigen Ziel-Elemente aus dem Overlay.
   * @param {Element} overlay - Overlay-Gruppe.
   * @returns {void}
   */
  function clearOverlay(overlay) {
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }
  }

  /**
   * Rechnet Polar-Koordinaten in SVG-Koordinaten um.
   * @param {number} r - Radius, z.B. 100.
   * @param {number} deg - Winkel in Grad, z.B. 45.
   * @returns {{x: number, y: number}}
   */
  function polar(r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
  }

  /**
   * Baut einen Keil (Segment) als SVG-Pfad zwischen zwei Radien.
   * @param {number} rInner - Innenradius, z.B. 60.
   * @param {number} rOuter - Außenradius, z.B. 70.
   * @param {number} startDeg - Startwinkel in Grad, z.B. 36.
   * @param {number} endDeg - Endwinkel in Grad, z.B. 54.
   * @returns {string} - SVG-Pfadbeschreibung.
   */
  function wedgePath(rInner, rOuter, startDeg, endDeg) {
    const p0 = polar(rOuter, startDeg);
    const p1 = polar(rOuter, endDeg);
    const p2 = polar(rInner, endDeg);
    const p3 = polar(rInner, startDeg);
    const large = (endDeg - startDeg + 360) % 360 > 180 ? 1 : 0;
    return [
      `M ${p0.x} ${p0.y}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y}`,
      "Z",
    ].join(" ");
  }

  /**
   * Baut einen Ring (Donut) als SVG-Pfad zwischen zwei Radien.
   * @param {number} rInner - Innenradius, z.B. 10.
   * @param {number} rOuter - Außenradius, z.B. 20.
   * @returns {string} - SVG-Pfadbeschreibung.
   */
  function ringPath(rInner, rOuter) {
    const outer = [
      `M 0 ${-rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 1 0 ${rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 1 0 ${-rOuter}`,
      "Z",
    ].join(" ");
    const inner = [
      `M 0 ${-rInner}`,
      `A ${rInner} ${rInner} 0 1 0 0 ${rInner}`,
      `A ${rInner} ${rInner} 0 1 0 0 ${-rInner}`,
      "Z",
    ].join(" ");
    return `${outer} ${inner}`;
  }

  /**
   * Berechnet die Winkelgrenzen für ein Nummernsegment.
   * @param {number} value - Segmentwert 1..20, z.B. 20.
   * @returns {{start: number, end: number} | null}
   */
  function segmentAngles(value) {
    const index = SEGMENT_ORDER.indexOf(value);
    if (index === -1) {
      return null;
    }
    const center = index * 18;
    return { start: center - 9, end: center + 9 };
  }

  /**
   * Setzt CSS-Klassen und Variablen für Optik und Animation.
   * @param {SVGElement} element - Ziel-Shape im Overlay.
   * @param {number} radius - Boardradius, z.B. 200.
   * @returns {void}
   */
  function applyTargetStyles(element, radius) {
    element.classList.add(TARGET_CLASS);
    const effectClass = EFFECT_CLASSES[CONFIG.effect] || EFFECT_CLASSES.pulse;
    element.classList.add(effectClass);
    const strokeWidth = Math.max(1, radius * CONFIG.strokeWidthRatio);
    element.style.setProperty("--ad-ext-target-color", CONFIG.color);
    element.style.setProperty("--ad-ext-target-stroke", CONFIG.strokeColor);
    element.style.setProperty(
      "--ad-ext-target-stroke-width",
      `${strokeWidth}px`
    );
    element.style.setProperty(
      "--ad-ext-target-duration",
      `${CONFIG.animationMs}ms`
    );
    if (element.dataset.noStroke === "true") {
      element.style.stroke = "none";
      element.style.strokeWidth = "0";
    }
  }

  /**
   * Erzeugt ein Keil-Element für ein Ringsegment.
   * @param {number} radius - Boardradius, z.B. 200.
   * @param {number} innerRatio - Innenanteil, z.B. 0.43.
   * @param {number} outerRatio - Außenanteil, z.B. 0.48.
   * @param {number} startDeg - Startwinkel.
   * @param {number} endDeg - Endwinkel.
   * @returns {SVGPathElement}
   */
  function createWedge(radius, innerRatio, outerRatio, startDeg, endDeg) {
    const path = document.createElementNS(SVG_NS, "path");
    const padding = CONFIG.edgePaddingPx || 0;
    const rInner = Math.max(0, radius * innerRatio);
    const rOuter = Math.max(rInner + 0.5, radius * outerRatio + padding);
    path.setAttribute("d", wedgePath(rInner, rOuter, startDeg, endDeg));
    return path;
  }

  /**
   * Erzeugt Bull/Outer-Bull als Kreis oder Ring.
   * @param {number} radius - Boardradius.
   * @param {number} innerRatio - Innenanteil für Ring.
   * @param {number} outerRatio - Außenanteil für Ring.
   * @param {boolean} solid - true für gefüllten Kreis.
   * @returns {SVGCircleElement|SVGPathElement}
   */
  function createBull(radius, innerRatio, outerRatio, solid) {
    const padding = CONFIG.edgePaddingPx || 0;
    if (solid) {
      const circle = document.createElementNS(SVG_NS, "circle");
      const rOuter = Math.max(0, radius * outerRatio + padding);
      circle.setAttribute("r", String(rOuter));
      return circle;
    }

    const rInner = Math.max(0, radius * innerRatio);
    const rOuter = Math.max(rInner + 0.5, radius * outerRatio + padding);
    const ring = document.createElementNS(SVG_NS, "path");
    ring.setAttribute("d", ringPath(rInner, rOuter));
    ring.setAttribute("fill-rule", "evenodd");
    ring.dataset.noStroke = "true";
    return ring;
  }

  /**
   * Baut die passenden Shapes (Keil/Ring/Kreis) für ein Ziel.
   * @param {number} radius - Boardradius, z.B. 200.
   * @param {{ring: string, value?: number}} target - Ziel, z.B. { ring: "D", value: 20 }.
   * @returns {SVGElement[]}
   */
  function buildTargetShapes(radius, target) {
    const ratios = CONFIG.ringRatios;
    const shapes = [];

    if (target.ring === "DB") {
      shapes.push(createBull(radius, 0, ratios.outerBullInner, true));
      return shapes;
    }

    if (target.ring === "SB") {
      shapes.push(
        createBull(radius, ratios.outerBullInner, ratios.outerBullOuter, false)
      );
      return shapes;
    }

    const angles = segmentAngles(target.value);
    if (!angles) {
      return shapes;
    }

    if (target.ring === "T") {
      shapes.push(
        createWedge(
          radius,
          ratios.tripleInner,
          ratios.tripleOuter,
          angles.start,
          angles.end
        )
      );
      return shapes;
    }

    if (target.ring === "D") {
      shapes.push(
        createWedge(
          radius,
          ratios.doubleInner,
          ratios.doubleOuter,
          angles.start,
          angles.end
        )
      );
      return shapes;
    }

    const innerSingle = () =>
      createWedge(
        radius,
        ratios.outerBullOuter,
        ratios.tripleInner,
        angles.start,
        angles.end
      );

    const outerSingle = () =>
      createWedge(
        radius,
        ratios.tripleOuter,
        ratios.doubleInner,
        angles.start,
        angles.end
      );

    if (CONFIG.singleRing === "inner") {
      shapes.push(innerSingle());
    } else if (CONFIG.singleRing === "both") {
      shapes.push(innerSingle(), outerSingle());
    } else {
      shapes.push(outerSingle());
    }

    return shapes;
  }

  /**
   * Haupt-Update: Liest Checkout-Vorschlag und zeichnet Ziele aufs Board.
   * @returns {void}
   */
  function updateTargets() {
    const suggestionEl = document.querySelector(CONFIG.suggestionSelector);
    const text = suggestionEl?.textContent?.trim() || "";

    if (!isX01Variant()) {
      lastSuggestion = null;
      const board = findBoard();
      if (board) {
        clearOverlay(ensureOverlayGroup(board.group));
      }
      return;
    }

    if (text === lastSuggestion) {
      return;
    }
    lastSuggestion = text;

    const targets = parseTargets(text);
    const selected =
      CONFIG.highlightTargets === "all" ? targets : targets.slice(0, 1);
    const board = findBoard();
    if (!board) {
      return;
    }

    const overlay = ensureOverlayGroup(board.group);
    clearOverlay(overlay);

    if (!selected.length) {
      return;
    }

    selected.forEach((target) => {
      const shapes = buildTargetShapes(board.radius, target);
      shapes.forEach((shape) => {
        applyTargetStyles(shape, board.radius);
        overlay.appendChild(shape);
      });
    });
  }

  let scheduled = false;
  /**
   * Fasst viele DOM-Änderungen zusammen, um nur einmal pro Frame zu reagieren.
   * @returns {void}
   */
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateTargets();
    });
  }

  ensureStyle();
  updateTargets();

  // Beobachtet Text- und DOM-Änderungen, um Checkout-Ziele zu aktualisieren.
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
