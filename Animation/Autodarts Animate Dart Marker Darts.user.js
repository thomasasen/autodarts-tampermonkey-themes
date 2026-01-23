// ==UserScript==
// @name         Autodarts Animate Dart Marker Darts
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0
// @description  Replaces dart hit markers with a configurable dart image aligned to the hit point.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Darts.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Darts.user.js
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Configuration for dart image placement.
   * - dartImageUrl: set to your PNG URL or data URI.
   * - dartLengthRatio: length relative to the board radius.
   * - dartAspectRatio: width / height of the PNG (used to keep aspect ratio).
   * - tipOffsetXRatio/YRatio: tip position within the image as a ratio (0..1).
   * - rotateToCenter: rotate darts so the tip points toward board center.
   * - baseAngleDeg: angle of the PNG tip direction (left = 180, right = 0).
   * - hideMarkers: hide the original hit markers when darts are shown.
   */
  const CONFIG = {
    dartImageUrl: "https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/screenshots/dart.png",
    dartLengthRatio: 0.32,
    dartAspectRatio: 472 / 198,
    tipOffsetXRatio: 0.04,
    tipOffsetYRatio: 0.5,
    rotateToCenter: true,
    baseAngleDeg: 180,
    hideMarkers: true,
    markerSelector:
      'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]',
  };

  const STYLE_ID = "ad-ext-dart-image-style";
  const OVERLAY_ID = "ad-ext-dart-image-overlay";
  const DART_CLASS = "ad-ext-dart-image";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const MARKER_OPACITY_KEY = "adExtOriginalOpacity";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.${DART_CLASS} {
  pointer-events: none;
  user-select: none;
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

    return { svg: best, group: bestGroup || best, radius };
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

  function getDartSize(radius) {
    const length = Math.max(1, radius * CONFIG.dartLengthRatio);
    const height = Math.max(1, length / CONFIG.dartAspectRatio);
    return { width: length, height };
  }

  function setMarkerHidden(marker, hidden) {
    if (hidden) {
      if (marker.dataset[MARKER_OPACITY_KEY] === undefined) {
        marker.dataset[MARKER_OPACITY_KEY] = marker.style.opacity || "";
      }
      marker.style.opacity = "0";
      return;
    }

    if (marker.dataset[MARKER_OPACITY_KEY] !== undefined) {
      marker.style.opacity = marker.dataset[MARKER_OPACITY_KEY];
      delete marker.dataset[MARKER_OPACITY_KEY];
    } else {
      marker.style.opacity = "";
    }
  }

  function getMarkerCenter(marker, boardGroup) {
    const svg = marker.ownerSVGElement;
    if (!svg || typeof svg.createSVGPoint !== "function") {
      return null;
    }

    let x = Number.parseFloat(marker.getAttribute("cx"));
    let y = Number.parseFloat(marker.getAttribute("cy"));

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const bbox = marker.getBBox();
      x = bbox.x + bbox.width / 2;
      y = bbox.y + bbox.height / 2;
    }

    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;

    const markerMatrix = marker.getCTM();
    const boardMatrix = boardGroup.getCTM();

    if (!markerMatrix || !boardMatrix) {
      return { x, y };
    }

    const globalPoint = point.matrixTransform(markerMatrix);
    let inverse = null;
    try {
      inverse = boardMatrix.inverse();
    } catch (err) {
      return { x, y };
    }
    const boardPoint = globalPoint.matrixTransform(inverse);
    return { x: boardPoint.x, y: boardPoint.y };
  }

  function createDartImage(center, size) {
    const image = document.createElementNS(SVG_NS, "image");
    image.classList.add(DART_CLASS);
    image.setAttribute("href", CONFIG.dartImageUrl);
    image.setAttributeNS(XLINK_NS, "href", CONFIG.dartImageUrl);
    image.setAttribute("width", String(size.width));
    image.setAttribute("height", String(size.height));

    const offsetX = size.width * CONFIG.tipOffsetXRatio;
    const offsetY = size.height * CONFIG.tipOffsetYRatio;
    const x = center.x - offsetX;
    const y = center.y - offsetY;
    image.setAttribute("x", String(x));
    image.setAttribute("y", String(y));

    if (CONFIG.rotateToCenter) {
      const angleToCenter =
        (Math.atan2(-center.y, -center.x) * 180) / Math.PI;
      const rotation = angleToCenter - CONFIG.baseAngleDeg;
      image.setAttribute(
        "transform",
        `rotate(${rotation} ${center.x} ${center.y})`
      );
    }

    return image;
  }

  function updateDarts() {
    const board = findBoard();
    if (!board) {
      return;
    }

    const overlay = ensureOverlayGroup(board.group);
    clearOverlay(overlay);

    const markers = Array.from(
      board.svg.querySelectorAll(CONFIG.markerSelector)
    );
    if (!markers.length) {
      return;
    }

    const shouldHideMarkers = CONFIG.hideMarkers && Boolean(CONFIG.dartImageUrl);

    if (!shouldHideMarkers) {
      markers.forEach((marker) => setMarkerHidden(marker, false));
    }

    if (!CONFIG.dartImageUrl) {
      return;
    }

    const size = getDartSize(board.radius);

    markers.forEach((marker) => {
      const center = getMarkerCenter(marker, board.group);
      if (!center) {
        return;
      }

      const dart = createDartImage(center, size);
      overlay.appendChild(dart);

      if (shouldHideMarkers) {
        setMarkerHidden(marker, true);
      }
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
      updateDarts();
    });
  }

  ensureStyle();
  updateDarts();

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
