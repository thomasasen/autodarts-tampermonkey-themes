// ==UserScript==
// @name         Autodarts Animate Checkout Board Blink
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.3
// @description  Blink the checkout target segment on the board.
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

  let lastSuggestion = null;

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

  function isX01Variant() {
    if (!CONFIG.requireX01) {
      return true;
    }
    const variantEl = document.getElementById(CONFIG.variantElementId);
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    return variant.includes("x01");
  }

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

  function getBoardRadius(root) {
    return [...root.querySelectorAll("circle")].reduce((max, circle) => {
      const r = Number.parseFloat(circle.getAttribute("r"));
      return Number.isFinite(r) && r > max ? r : max;
    }, 0);
  }

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

  function ensureOverlayGroup(boardGroup) {
    let overlay = boardGroup.querySelector(`#${OVERLAY_ID}`);
    if (!overlay) {
      overlay = document.createElementNS(SVG_NS, "g");
      overlay.id = OVERLAY_ID;
      boardGroup.appendChild(overlay);
    }
    return overlay;
  }

  function clearOverlay(overlay) {
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }
  }

  function polar(r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
  }

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

  function segmentAngles(value) {
    const index = SEGMENT_ORDER.indexOf(value);
    if (index === -1) {
      return null;
    }
    const center = index * 18;
    return { start: center - 9, end: center + 9 };
  }

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
  }

  function createWedge(radius, innerRatio, outerRatio, startDeg, endDeg) {
    const path = document.createElementNS(SVG_NS, "path");
    const padding = CONFIG.edgePaddingPx || 0;
    const rInner = Math.max(0, radius * innerRatio - padding);
    const rOuter = Math.max(rInner + 0.5, radius * outerRatio + padding);
    path.setAttribute("d", wedgePath(rInner, rOuter, startDeg, endDeg));
    return path;
  }

  function createBull(radius, innerRatio, outerRatio, solid) {
    const circle = document.createElementNS(SVG_NS, "circle");
    const padding = CONFIG.edgePaddingPx || 0;
    if (solid) {
      const rOuter = Math.max(0, radius * outerRatio + padding);
      circle.setAttribute("r", String(rOuter));
    } else {
      const rInner = Math.max(0, radius * innerRatio - padding);
      const rOuter = Math.max(rInner + 0.5, radius * outerRatio + padding);
      const strokeWidth = Math.max(1, rOuter - rInner);
      circle.setAttribute("r", String((rInner + rOuter) / 2));
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke-width", String(strokeWidth));
    }
    return circle;
  }

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
