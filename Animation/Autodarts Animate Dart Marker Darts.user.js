// ==UserScript==// @name         Autodarts Animate Dart Marker Darts
	// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
	// @version      1.5.3
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

		// Dart design options (set DART_DESIGN to one of these):
		// Dart_autodarts.png, Dart_blackblue.png, Dart_blackgreen.png, Dart_blackred.png,
		// Dart_blue.png, Dart_camoflage.png, Dart_green.png, Dart_pride.png,
		// Dart_red.png, Dart_white.png, Dart_whitetrible.png, Dart_yellow.png,
		// Dart_yellowscull.png
		const DART_DESIGN = "Dart_autodarts.png";
		const DART_BASE_URL = "https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/";
		// Toggle dart flight animation on/off.
		const ANIMATE_DARTS = true;

		/**
   * Configuration for dart image placement (toggle ANIMATE_DARTS above).
   * - dartImageUrl: set to your PNG URL or data URI.
   * - dartLengthRatio: length relative to the board radius.
   * - dartAspectRatio: width / height of the PNG (used to keep aspect ratio).
   * - tipOffsetXRatio/YRatio: tip position within the image as a ratio (0..1).
   * - rotateToCenter: rotate darts so the tip points toward board center.
   * - baseAngleDeg: angle of the PNG tip direction (left = 180, right = 0).
   * - dartTransparency: transparency of the dart image (0 = opaque, 1 = fully transparent).
   * - hideMarkers: hide the original hit markers when darts are shown.
   * - animateDarts: enable flight + impact animation.
   * - animationStyle: "arc" or "linear".
   * - flightDurationMs: duration of the flight animation.
   * - flightDistanceRatio: how far the dart starts from impact (relative to dart length).
   * - arcHeightRatio: arc height relative to dart length.
   * - flightEasing: easing for flight animation.
   * - wobbleDurationMs: duration of the impact wobble.
   * - wobbleAngleDeg: max wobble rotation in degrees.
   * - wobbleEasing: easing for wobble animation.
   * - blurPx: motion blur strength during flight.
   * - scaleFrom: starting scale during flight.
   * - fadeFrom: starting opacity during flight.
   */
		const CONFIG = {
			dartImageUrl: `${DART_BASE_URL}${DART_DESIGN}`,
			dartLengthRatio: 0.416,
			dartAspectRatio: 472 / 198,
			tipOffsetXRatio: 0,
			tipOffsetYRatio: 130 / 198,
			rotateToCenter: true,
			baseAngleDeg: 180,
			dartTransparency: 0,
			hideMarkers: false,
			animateDarts: ANIMATE_DARTS,
			animationStyle: "arc",
			flightDurationMs: 320,
			flightDistanceRatio: 1.2,
			arcHeightRatio: 0.18,
			flightEasing: "cubic-bezier(0.15, 0.7, 0.2, 1)",
			wobbleDurationMs: 280,
			wobbleAngleDeg: 4,
			wobbleEasing: "cubic-bezier(0.2, 0.6, 0.2, 1)",
			blurPx: 2,
			scaleFrom: 0.94,
			fadeFrom: 0.2,
			markerSelector: 'circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]'
		};

		const STYLE_ID = "ad-ext-dart-image-style";
		const OVERLAY_ID = "ad-ext-dart-image-overlay";
		const OVERLAY_CLASS = "ad-ext-dart-image-overlay";
		const DART_CLASS = "ad-ext-dart-image";
		const DART_FLIGHT_CLASS = "ad-ext-dart-flight";
		const DART_WOBBLE_CLASS = "ad-ext-dart-wobble";
		const SVG_NS = "http://www.w3.org/2000/svg";
		const XLINK_NS = "http://www.w3.org/1999/xlink";
		const MARKER_OPACITY_KEY = "adExtOriginalOpacity";
		const dartByMarker = new Map();

		function ensureStyle() {
			if (document.getElementById(STYLE_ID)) {
				return;
			}

			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = `
.${OVERLAY_CLASS} {
  position: fixed;
  overflow: visible;
  pointer-events: none;
  z-index: 5;
}

.${DART_FLIGHT_CLASS} {
  pointer-events: none;
  will-change: transform, opacity, filter;
}

.${DART_CLASS} {
  pointer-events: none;
  user-select: none;
  transform-box: fill-box;
}
`;

			const target = document.head || document.documentElement;
			if (target) {
				target.appendChild(style);
			} else {
				document.addEventListener("DOMContentLoaded", () => {
					const fallbackTarget = document.head || document.documentElement;
					if (fallbackTarget && !document.getElementById(STYLE_ID)) {
						fallbackTarget.appendChild(style);
					}
				}, {once: true});
			}
		}

		function getBoardRadius(root) {
			return [... root.querySelectorAll("circle")].reduce((max, circle) => {
				const r = Number.parseFloat(circle.getAttribute("r"));
				return Number.isFinite(r) && r > max ? r : max;
			}, 0);
		}

		function getSvgScale(svg) {
			const matrix = svg.getScreenCTM();
			if (! matrix) {
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
			if (! svgs.length) {
				return null;
			}

			let best = null;
			let bestScore = -1;

			for (const svg of svgs) {
				const numbers = new Set([... svg.querySelectorAll("text")].map((text) => Number.parseInt(text.textContent, 10)).filter((value) => value >= 1 && value <= 20));
				const numberScore = numbers.size;
				const radius = getBoardRadius(svg);
				const score = numberScore * 1000 + radius;
				if (score > bestScore) {
					best = svg;
					bestScore = score;
				}
			}

			if (! best) {
				return null;
			}

			const radius = getBoardRadius(best);
			if (! radius) {
				return null;
			}

			return {svg: best, radius};
		}

		function ensureOverlaySvg() {
			let overlay = document.getElementById(OVERLAY_ID);
			if (overlay && overlay.tagName.toLowerCase() !== "svg") {
				overlay.remove();
				overlay = null;
			}
			if (! overlay) {
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

		function removeOverlay() {
			const overlay = document.getElementById(OVERLAY_ID);
			if (overlay) {
				overlay.remove();
			}
			dartByMarker.clear();
		}

		function clearDarts() {
			const overlay = document.getElementById(OVERLAY_ID);
			if (overlay) {
				clearOverlay(overlay);
			}
			dartByMarker.clear();
		}

		function resetMarkers() {
			document.querySelectorAll(CONFIG.markerSelector).forEach((marker) => setMarkerHidden(marker, false));
		}

		function getDartSize(radiusPx) {
			const length = Math.max(1, radiusPx * CONFIG.dartLengthRatio);
			const height = Math.max(1, length / CONFIG.dartAspectRatio);
			return {width: length, height};
		}

		function getOverlayPadding(size) {
			const tailRatio = Math.max(0, 1 - CONFIG.tipOffsetXRatio);
			let padding = Math.max(16, size.width * tailRatio);
			if (CONFIG.animateDarts) {
				const arcExtra = CONFIG.animationStyle === "arc" ? CONFIG.arcHeightRatio : 0;
				const flightPadding = size.width * (CONFIG.flightDistanceRatio + arcExtra);
				padding = Math.max(padding, flightPadding);
			}
			return padding;
		}

		function updateOverlayLayout(overlay, boardRect, paddingPx) {
			const width = boardRect.width + paddingPx * 2;
			const height = boardRect.height + paddingPx * 2;
			const left = boardRect.left - paddingPx;
			const top = boardRect.top - paddingPx;

			overlay.style.left = `${left}px`;
			overlay.style.top = `${top}px`;
			overlay.style.width = `${width}px`;
			overlay.style.height = `${height}px`;
			overlay.setAttribute("width", String(width));
			overlay.setAttribute("height", String(height));
			overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);

			return overlay.getBoundingClientRect();
		}

		function isBoardVisible(svg, rect) {
			if (! svg || ! svg.isConnected) {
				return false;
			}
			if (! rect || rect.width<= 1 || rect.height <= 1) {
      return false;
    }
    const style = window.getComputedStyle(svg);
    if (!style) {
      return true;
    }
    if (style.display === "none") {
      return false;
    }
    if (style.visibility === "hidden" || style.visibility === "collapse") {
      return false;
    }
    const opacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(opacity) && opacity <= 0) {
      return false;
    }
    return true;
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
    if (!marker || typeof marker.getBoundingClientRect !== "function") {
      return null;
    }

    const rect = marker.getBoundingClientRect();
    if (
      Number.isFinite(rect.width)
      && Number.isFinite(rect.height)
      && rect.width > 0
      && rect.height > 0
    ) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

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
      return null;
    }

    const screenPoint = point.matrixTransform(matrix);
    if (!Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) {
      return null;
    }
    return { x: screenPoint.x, y: screenPoint.y };
  }

  function canAnimateDarts() {
    if (!CONFIG.animateDarts) {
      return false;
    }
    if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") {
      return false;
    }
    if (typeof window.matchMedia === "function") {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reducedMotion && reducedMotion.matches) {
        return false;
      }
    }
    return true;
  }

  function getDartOffsets(size) {
    return {
      offsetX: size.width * CONFIG.tipOffsetXRatio, offsetY: size.height * CONFIG.tipOffsetYRatio
    };
  }

  function getDartOpacity() {
    const transparency = Number.parseFloat(CONFIG.dartTransparency);
    if (!Number.isFinite(transparency)) {
      return 1;
    }
    return Math.min(1, Math.max(0, 1 - transparency));
  }

  function nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }

  function createDartElements(center, size, boardCenter) {
    const flightGroup = document.createElementNS(SVG_NS, "g");
    flightGroup.classList.add(DART_FLIGHT_CLASS);

    const rotateGroup = document.createElementNS(SVG_NS, "g");
    const image = document.createElementNS(SVG_NS, "image");
    image.classList.add(DART_CLASS, DART_WOBBLE_CLASS);
    rotateGroup.appendChild(image);
    flightGroup.appendChild(rotateGroup);

    const entry = {
      container: flightGroup,
      rotateGroup,
      image,
      animated: false,
      flightAnimation: null,
      flightStartedAt: 0,
      wobbleAnimation: null,
      settleUntil: 0
    };

    updateDartElement(entry, center, size, boardCenter);
    return entry;
  }

  function updateDartElement(entry, center, size, boardCenter) {
    const image = entry.image;
    image.setAttribute("href", CONFIG.dartImageUrl);
    image.setAttributeNS(XLINK_NS, "href", CONFIG.dartImageUrl);
    image.setAttribute("width", String(size.width));
    image.setAttribute("height", String(size.height));

    const offsets = getDartOffsets(size);
    const x = center.x - offsets.offsetX;
    const y = center.y - offsets.offsetY;
    image.setAttribute("x", String(x));
    image.setAttribute("y", String(y));

    if (size.width > 0 && size.height > 0) {
      const originX = Math.min(100, Math.max(0, (offsets.offsetX / size.width) * 100));
      const originY = Math.min(100, Math.max(0, (offsets.offsetY / size.height) * 100));
      image.style.transformOrigin = `${originX}% ${originY}%`;
    } else {
      image.style.transformOrigin = "";
    }

    image.style.opacity = String(getDartOpacity());

    if (CONFIG.rotateToCenter && boardCenter) {
      const dx = boardCenter.x - center.x;
      const dy = boardCenter.y - center.y;
      const angleToCenter = (Math.atan2(dy, dx) * 180) / Math.PI;
      const rotation = angleToCenter - CONFIG.baseAngleDeg;
      entry.rotateGroup.setAttribute(
        "transform", `rotate(${rotation} ${center.x} ${center.y})`
      );
    } else {
      entry.rotateGroup.removeAttribute("transform");
    }
  }

  function getFlightOffsets(center, boardCenter, size) {
    let dx = center.x - boardCenter.x;
    let dy = center.y - boardCenter.y;
    let length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length < 0.001) {
      dx = 1;
      dy = 0;
      length = 1;
    }

    const dirX = dx / length;
    const dirY = dy / length;
    const startDistance = size.width * CONFIG.flightDistanceRatio;
    const start = { x: dirX * startDistance, y: dirY * startDistance };
    const mid = { x: start.x * 0.5, y: start.y * 0.5 };

    if (CONFIG.animationStyle === "arc") {
      const arcHeight = size.width * CONFIG.arcHeightRatio;
      if (arcHeight > 0) {
        const gravityX = 0;
        const gravityY = 1;
        const dot = gravityX * dirX + gravityY * dirY;
        let perpX = gravityX - dot * dirX;
        let perpY = gravityY - dot * dirY;
        const perpLength = Math.hypot(perpX, perpY);
        if (perpLength> 0.001) {
				perpX /= perpLength;
				perpY /= perpLength;
				mid.x += perpX * arcHeight;
				mid.y += perpY * arcHeight;
			}
		}
	}

	return {start, mid};
}

function animateDart (entry, center, boardCenter, size) {
	if (entry.animated || !canAnimateDarts()) {
		return;
	}

	entry.animated = true;

	const startTime = nowMs();
	const flightGroup = entry.container;
	const image = entry.image;
	const flightDuration = Math.max(0, CONFIG.flightDurationMs);
	const wobbleDuration = Math.max(0, CONFIG.wobbleDurationMs);
	const blurFrom = Math.max(0, CONFIG.blurPx);
	const fadeFrom = Math.min(1, Math.max(0, CONFIG.fadeFrom));
	const scaleFrom = Math.max(0.1, CONFIG.scaleFrom);
	const scaleMid = Math.min(1, (scaleFrom + 1) / 2);
	const fadeMid = Math.min(1, fadeFrom + 0.7);
	const blurMid = blurFrom * 0.4;
	const wobbleAngle = Math.max(0, CONFIG.wobbleAngleDeg);

	const offsets = getFlightOffsets(center, boardCenter, size);
	const flightKeyframes = [
		{
			transform: `translate(${
				offsets.start.x
			}px, ${
				offsets.start.y
			}px) scale(${scaleFrom})`,
			opacity: fadeFrom,
			filter: `blur(${blurFrom}px)`
		}, {
			transform: `translate(${
				offsets.mid.x
			}px, ${
				offsets.mid.y
			}px) scale(${scaleMid})`,
			opacity: fadeMid,
			filter: `blur(${blurMid}px)`
		}, {
			transform: "translate(0px, 0px) scale(1)",
			opacity: 1,
			filter: "blur(0px)"
		}
	];

	const flightAnimation = flightGroup.animate(flightKeyframes, {
		duration: flightDuration,
		easing: CONFIG.flightEasing,
		fill: "both"
	});

	entry.flightAnimation = flightAnimation;
	entry.flightStartedAt = startTime;
	entry.settleUntil = Math.max(entry.settleUntil || 0, startTime + flightDuration + 140);

	const cleanupFlight = () => {
		if (entry.flightAnimation !== flightAnimation) {
			return;
		}
		entry.flightAnimation = null;
		entry.flightStartedAt = 0;
		flightGroup.style.transform = "";
		flightGroup.style.opacity = "";
		flightGroup.style.filter = "";
	};
	flightAnimation.onfinish = cleanupFlight;
	flightAnimation.oncancel = cleanupFlight;

	if (wobbleDuration > 0 && wobbleAngle > 0) {
		const wobbleKeyframes = [
			{
				transform: "rotate(0deg)"
			},
			{
				transform: `rotate(${ - wobbleAngle
				}deg)`
			},
			{
				transform: `rotate(${
					wobbleAngle * 0.6
				}deg)`
			},
			{
				transform: `rotate(${ - wobbleAngle * 0.35
				}deg)`
			}, {
				transform: "rotate(0deg)"
			}
		];

		const wobbleAnimation = image.animate(wobbleKeyframes, {
			duration: wobbleDuration,
			delay: flightDuration,
			easing: CONFIG.wobbleEasing,
			fill: "both"
		});

		entry.wobbleAnimation = wobbleAnimation;
		const cleanupWobble = () => {
			if (entry.wobbleAnimation !== wobbleAnimation) {
				return;
			}
			entry.wobbleAnimation = null;
			image.style.transform = "";
		};
		wobbleAnimation.onfinish = cleanupWobble;
		wobbleAnimation.oncancel = cleanupWobble;
	}
}

function updateDarts () {
	const board = findBoard();
	if (! board) {
		removeOverlay();
		resetMarkers();
		return;
	}

	const boardRect = board.svg.getBoundingClientRect();
	if (!isBoardVisible(board.svg, boardRect)) {
		removeOverlay();
		resetMarkers();
		return;
	}

	const markers = Array.from(board.svg.querySelectorAll(CONFIG.markerSelector));
	if (! markers.length) {
		clearDarts();
		return;
	}

	const shouldHideMarkers = CONFIG.hideMarkers && Boolean(CONFIG.dartImageUrl);

	if (! shouldHideMarkers) {
		markers.forEach((marker) => setMarkerHidden(marker, false));
	}

	if (!CONFIG.dartImageUrl) {
		clearDarts();
		return;
	}

	const scale = getSvgScale(board.svg);
	const radiusPx = board.radius * scale;
	const size = getDartSize(radiusPx);
	const paddingPx = getOverlayPadding(size);
	const overlay = ensureOverlaySvg();
	const overlayRect = updateOverlayLayout(overlay, boardRect, paddingPx);

	const boardCenter = {
		x: boardRect.width / 2 + paddingPx,
		y: boardRect.height / 2 + paddingPx
	};

	const markerSet = new Set(markers);
	let removedAny = false;
	for (const [marker, entry] of dartByMarker.entries()) {
		if (! markerSet.has(marker) || !marker.isConnected) {
			if (entry.container && entry.container.parentNode) {
				entry.container.remove();
			}
			dartByMarker.delete(marker);
			setMarkerHidden(marker, false);
			removedAny = true;
		}
	}

	const shouldAnimate = canAnimateDarts();
	const now = nowMs();
	const settleDurationMs = Math.max(220, CONFIG.flightDurationMs + 160);
	const flightTimeoutMs = Math.max(240, CONFIG.flightDurationMs + 180);
	const retryDelayMs = Math.max(60, Math.min(140, Math.round(CONFIG.flightDurationMs / 3)));

	let createdAny = false;
	let needsRetry = false;
	const markerEntries = [];

	markers.forEach((marker, index) => {
		const screenPoint = getMarkerScreenPoint(marker);
		if (! screenPoint) {
			needsRetry = true;
			return;
		}

		const center = {
			x: screenPoint.x - overlayRect.left,
			y: screenPoint.y - overlayRect.top
		};

		let entry = dartByMarker.get(marker);
		if (! entry) {
			entry = createDartElements(center, size, boardCenter);
			entry.settleUntil = now + settleDurationMs;
			overlay.appendChild(entry.container);
			dartByMarker.set(marker, entry);
			createdAny = true;
			if (shouldAnimate) {
				animateDart(entry, center, boardCenter, size);
			}
		} else {
			if (entry.flightAnimation && entry.flightStartedAt && now - entry.flightStartedAt > flightTimeoutMs) {
				try {
					entry.flightAnimation.finish();
				} catch (error) {
					entry.flightAnimation.cancel();
				}
			}
			updateDartElement(entry, center, size, boardCenter);
		}

		if (shouldHideMarkers) {
			setMarkerHidden(marker, true);
		}

		if (entry.settleUntil && now < entry.settleUntil) {
			needsRetry = true;
		}

		markerEntries.push({entry, center, index});
	});

	if (createdAny || removedAny) {
		markerEntries.sort((a, b) => {
			const deltaY = a.center.y - b.center.y;
			if (Math.abs(deltaY) > 0.001) {
				return deltaY;
			}
			return a.index - b.index;
		});

		for (const item of markerEntries) {
			if (item.entry && item.entry.container) {
				overlay.appendChild(item.entry.container);
			}
		}
	}

	if (needsRetry) {
		scheduleRetry(retryDelayMs);
	}
}

let scheduled = false;
function scheduleUpdate () {
	if (scheduled) {
		return;
	}
	scheduled = true;
	requestAnimationFrame(() => {
		scheduled = false;
		updateDarts();
	})


}

let retryTimer = 0;
function scheduleRetry (delayMs) {
	if (retryTimer) {
		return;
	}
	retryTimer = window.setTimeout(() => {
		retryTimer = 0;
		scheduleUpdate();
	}, Math.max(0, delayMs));
}

let lastUrl = location.href;
function handleLocationChange () {
	if (location.href === lastUrl) {
		return;
	}
	lastUrl = location.href;
	removeOverlay();
	resetMarkers();
	scheduleUpdate();
}

function watchLocationChanges () {
	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	history.pushState = function (...args) {
		originalPushState.apply(this, args);
		handleLocationChange();
	};
	history.replaceState = function (...args) {
		originalReplaceState.apply(this, args);
		handleLocationChange();
	};

	window.addEventListener("popstate", handleLocationChange);
	window.addEventListener("hashchange", handleLocationChange);
	setInterval(handleLocationChange, 500);
}

ensureStyle();
updateDarts();

const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		if (mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes") {
			scheduleUpdate();
			break;
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true,
	characterData: true,
	attributes: true
});

window.addEventListener("resize", scheduleUpdate);
window.addEventListener("scroll", scheduleUpdate, true);
watchLocationChanges();})();
