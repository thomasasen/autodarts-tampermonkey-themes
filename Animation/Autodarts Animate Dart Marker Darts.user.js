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
    dartLengthRatio: 0.416,
    dartAspectRatio: 472 / 198,
    tipOffsetXRatio: 0,
    tipOffsetYRatio: 130 / 198,
    rotateToCenter: true,
    baseAngleDeg: 180,
    hideMarkers: false,
    markerSelector:
      'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]',
  };

  const STYLE_ID = "ad-ext-dart-image-style";
  const OVERLAY_ID = "ad-ext-dart-image-overlay";
  const OVERLAY_CLASS = "ad-ext-dart-image-overlay";
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
.${OVERLAY_CLASS} {
  position: absolute;
  overflow: visible;
  pointer-events: none;
  z-index: 5;
}

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

  function getSvgScale(svg) {
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return 1;
    }
    const scaleX = Math.hypot(matrix.a, matrix.b);
    const scaleY = Math.hypot(matrix.c, matrix.d);
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) {
      return 1;
    }
    return Math.min(scaleX, scaleY);
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

    const radius = getBoardRadius(best);
    if (!radius) {
      return null;
    }

    return { svg: best, radius };
  }

  function ensureOverlaySvg() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay && overlay.tagName.toLowerCase() !== "svg") {
      overlay.remove();
      overlay = null;
    }
    if (!overlay) {
      overlay = document.createElementNS(SVG_NS, "svg");
      overlay.id = OVERLAY_ID;
      overlay.classList.add(OVERLAY_CLASS);
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("focusable", "false");
      (document.body || document.documentElement).appendChild(overlay);
    }
    return overlay;
  }

  function clearOverlay(overlay) {
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }
  }

  function getDartSize(radiusPx) {
    const length = Math.max(1, radiusPx * CONFIG.dartLengthRatio);
    const height = Math.max(1, length / CONFIG.dartAspectRatio);
    return { width: length, height };
  }

  function getOverlayPadding(size) {
    const tailRatio = Math.max(0, 1 - CONFIG.tipOffsetXRatio);
    return Math.max(16, size.width * tailRatio);
  }

  function updateOverlayLayout(overlay, boardRect, paddingPx) {
    const width = boardRect.width + paddingPx * 2;
    const height = boardRect.height + paddingPx * 2;
    const left = boardRect.left + window.scrollX - paddingPx;
    const top = boardRect.top + window.scrollY - paddingPx;

    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.setAttribute("width", String(width));
    overlay.setAttribute("height", String(height));
    overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);

    return overlay.getBoundingClientRect();
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

  function getMarkerScreenPoint(marker) {
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

    const matrix = marker.getScreenCTM();
    if (!matrix) {
      return { x, y };
    }

    const screenPoint = point.matrixTransform(matrix);
    return { x: screenPoint.x, y: screenPoint.y };
  }

  function createDartImage(center, size, boardCenter) {
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

    if (CONFIG.rotateToCenter && boardCenter) {
      const dx = boardCenter.x - center.x;
      const dy = boardCenter.y - center.y;
      const angleToCenter = (Math.atan2(dy, dx) * 180) / Math.PI;
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

    const boardRect = board.svg.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height) {
      return;
    }

    const markers = Array.from(
      board.svg.querySelectorAll(CONFIG.markerSelector)
    );
    if (!markers.length) {
      const existingOverlay = document.getElementById(OVERLAY_ID);
      if (existingOverlay) {
        clearOverlay(existingOverlay);
      }
      return;
    }

    const shouldHideMarkers = CONFIG.hideMarkers && Boolean(CONFIG.dartImageUrl);

    if (!shouldHideMarkers) {
      markers.forEach((marker) => setMarkerHidden(marker, false));
    }

    if (!CONFIG.dartImageUrl) {
      const existingOverlay = document.getElementById(OVERLAY_ID);
      if (existingOverlay) {
        clearOverlay(existingOverlay);
      }
      return;
    }

    const scale = getSvgScale(board.svg);
    const radiusPx = board.radius * scale;
    const size = getDartSize(radiusPx);
    const paddingPx = getOverlayPadding(size);
    const overlay = ensureOverlaySvg();
    const overlayRect = updateOverlayLayout(overlay, boardRect, paddingPx);
    clearOverlay(overlay);

    const boardCenter = {
      x: boardRect.width / 2 + paddingPx,
      y: boardRect.height / 2 + paddingPx,
    };

    markers.forEach((marker) => {
      const screenPoint = getMarkerScreenPoint(marker);
      if (!screenPoint) {
        return;
      }

      const center = {
        x: screenPoint.x - overlayRect.left,
        y: screenPoint.y - overlayRect.top,
      };

      const dart = createDartImage(center, size, boardCenter);
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

  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("scroll", scheduleUpdate, true);
})();
