(function (global) {
  "use strict";

  // Shared helper for the animation userscripts in Animation/.
  // Load this file via @require in Tampermonkey; do not install it separately.
  // Update the @require URL if you fork the repository.

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SEGMENT_ORDER = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];

  function ensureStyle(styleId, cssText) {
    if (!styleId) {
      return false;
    }

    const target = document.head || document.documentElement;
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      if (existingStyle.textContent !== cssText) {
        existingStyle.textContent = cssText;
      }
      if (target && existingStyle.parentElement !== target) {
        target.appendChild(existingStyle);
      }
      return true;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = cssText;

    if (target) {
      target.appendChild(style);
      return true;
    }

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        const fallbackTarget = document.head || document.documentElement;
        if (fallbackTarget && !document.getElementById(styleId)) {
          fallbackTarget.appendChild(style);
        }
      },
      { once: true }
    );

    return true;
  }

  function createRafScheduler(callback) {
    let scheduled = false;
    return function schedule() {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        callback();
      });
    };
  }

  function observeMutations(options) {
    if (!options || typeof options.onChange !== "function") {
      return null;
    }

    const {
      onChange,
      target,
      types,
      options: observerOptions,
      attributeFilter,
    } = options;

    const observedTypes = new Set(
      Array.isArray(types) && types.length
        ? types
        : ["childList", "characterData", "attributes"]
    );

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (observedTypes.has(mutation.type)) {
          onChange(mutation, mutations);
          break;
        }
      }
    });

    const baseOptions = {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    };
    const finalOptions = {
      ...baseOptions,
      ...(observerOptions || {}),
    };

    if (Array.isArray(attributeFilter) && attributeFilter.length) {
      finalOptions.attributes = true;
      finalOptions.attributeFilter = attributeFilter;
    }

    const startObserving = (root) => {
      if (root) {
        observer.observe(root, finalOptions);
      }
    };

    const root = target || document.documentElement;
    if (root) {
      startObserving(root);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          startObserving(target || document.documentElement);
        },
        { once: true }
      );
    }

    return observer;
  }

  function getVariantText(variantElementId) {
    const elementId = variantElementId || "ad-ext-game-variant";
    const variantEl = document.getElementById(elementId);
    return variantEl?.textContent?.trim().toLowerCase() || "";
  }

  function isX01Variant(variantElementId, options) {
    const config = options || {};
    const variant = getVariantText(variantElementId);

    if (!variant) {
      return Boolean(config.allowEmpty || config.allowMissing);
    }

    if (variant.includes("x01")) {
      return true;
    }

    if (config.allowNumeric) {
      return /\b\d+01\b/.test(variant);
    }

    return false;
  }

  function isCricketVariant(variantElementId, options) {
    const config = options || {};
    const variant = getVariantText(variantElementId);

    if (!variant) {
      return Boolean(config.allowEmpty || config.allowMissing);
    }

    return variant === "cricket" || variant.startsWith("cricket ");
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

    return {
      svg: best,
      group: bestGroup || best,
      radius,
    };
  }

  function ensureOverlayGroup(boardGroup, overlayId) {
    if (!boardGroup || !overlayId) {
      return null;
    }

    let overlay = boardGroup.querySelector(`#${overlayId}`);
    if (!overlay) {
      overlay = document.createElementNS(SVG_NS, "g");
      overlay.id = overlayId;
      boardGroup.appendChild(overlay);
    }

    return overlay;
  }

  function clearOverlay(overlay) {
    if (!overlay) {
      return;
    }
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

  function segmentAngles(value) {
    const index = SEGMENT_ORDER.indexOf(value);
    if (index === -1) {
      return null;
    }
    const center = index * 18;
    return { start: center - 9, end: center + 9 };
  }

  function createWedge(
    radius,
    innerRatio,
    outerRatio,
    startDeg,
    endDeg,
    edgePaddingPx
  ) {
    const path = document.createElementNS(SVG_NS, "path");
    const padding = edgePaddingPx || 0;
    const rInner = Math.max(0, radius * innerRatio);
    const rOuter = Math.max(rInner + 0.5, radius * outerRatio + padding);
    path.setAttribute("d", wedgePath(rInner, rOuter, startDeg, endDeg));
    return path;
  }

  function createBull(radius, innerRatio, outerRatio, solid, options) {
    const config = options || {};
    const padding = config.edgePaddingPx || 0;

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
    if (config.noStroke) {
      ring.dataset.noStroke = "true";
    }
    return ring;
  }

  global.autodartsAnimationShared = {
    SVG_NS,
    SEGMENT_ORDER,
    ensureStyle,
    createRafScheduler,
    observeMutations,
    getVariantText,
    isX01Variant,
    isCricketVariant,
    getBoardRadius,
    findBoard,
    ensureOverlayGroup,
    clearOverlay,
    polar,
    wedgePath,
    ringPath,
    segmentAngles,
    createWedge,
    createBull,
  };
})(window);
