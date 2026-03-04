(function (global) {
  "use strict";

  // Shared helper for the animation userscripts in Animation/.
  // Load this file via @require in Tampermonkey; do not install it separately.
  // Update the @require URL if you fork the repository.

  const SVG_NS = "http://www.w3.org/2000/svg";
  const FEATURE_INSTANCE_GLOBAL_KEY = "__adExtFeatureInstances";
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

  function classifyCricketGameMode(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
      return "";
    }
    if (normalized === "tactics" || normalized.startsWith("tactics ")) {
      return "tactics";
    }
    if (
      normalized === "hidden cricket" ||
      normalized.startsWith("hidden cricket ")
    ) {
      return "hidden-cricket";
    }
    if (normalized === "cricket" || normalized.startsWith("cricket ")) {
      return "cricket";
    }
    return "";
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

    const mode = classifyCricketGameMode(variant);
    if (mode === "hidden-cricket") {
      return Boolean(config.includeHiddenCricket);
    }
    return mode === "cricket" || mode === "tactics";
  }

  function getCricketGameMode(variantElementId, options) {
    const config = options || {};
    const variant = getVariantText(variantElementId);
    const mode = classifyCricketGameMode(variant);

    if (!mode) {
      return "";
    }
    if (mode === "hidden-cricket" && !config.includeHiddenCricket) {
      return "";
    }
    return variant;
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

  function getFeatureRegistry() {
    let registry = global[FEATURE_INSTANCE_GLOBAL_KEY];
    if (!(registry instanceof Map)) {
      registry = new Map();
      global[FEATURE_INSTANCE_GLOBAL_KEY] = registry;
    }
    return registry;
  }

  function normalizeVersion(value) {
    return String(value || "0")
      .trim()
      .split(".")
      .map((segment) => {
        const numeric = Number.parseInt(segment, 10);
        return Number.isFinite(numeric) ? numeric : 0;
      });
  }

  function compareVersions(leftValue, rightValue) {
    const left = normalizeVersion(leftValue);
    const right = normalizeVersion(rightValue);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const leftSegment = left[index] || 0;
      const rightSegment = right[index] || 0;
      if (leftSegment > rightSegment) {
        return 1;
      }
      if (leftSegment < rightSegment) {
        return -1;
      }
    }
    return 0;
  }

  function toOwnerMeta(record) {
    if (!record || typeof record !== "object") {
      return null;
    }
    return {
      featureKey: String(record.featureKey || ""),
      token: String(record.token || ""),
      version: String(record.version || ""),
      sourcePath: String(record.sourcePath || ""),
      executionSource: String(record.executionSource || "unknown"),
    };
  }

  function claimFeatureInstance(options) {
    const config = options || {};
    const featureKey = String(config.featureKey || "").trim();
    const version = String(config.version || "0").trim() || "0";
    const sourcePath = String(config.sourcePath || "").trim();
    const executionSource =
      String(config.executionSource || "unknown").trim() || "unknown";
    const onDispose =
      typeof config.onDispose === "function" ? config.onDispose : null;
    const token = `${featureKey || "feature"}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    if (!featureKey) {
      return {
        active: false,
        token,
        reason: "older-version-rejected",
        ownerMeta: null,
      };
    }

    const registry = getFeatureRegistry();
    const existing = registry.get(featureKey);
    const candidateRecord = {
      featureKey,
      token,
      version,
      sourcePath,
      executionSource,
      onDispose,
    };

    if (!existing) {
      registry.set(featureKey, candidateRecord);
      return {
        active: true,
        token,
        reason: "claimed",
        ownerMeta: toOwnerMeta(candidateRecord),
      };
    }

    const comparison = compareVersions(version, existing.version);
    if (comparison > 0) {
      if (typeof existing.onDispose === "function") {
        try {
          existing.onDispose({
            reason: "replaced-by-newer-version",
            replacedBy: toOwnerMeta(candidateRecord),
            previousOwner: toOwnerMeta(existing),
          });
        } catch (error) {
          console.warn("[autodarts-animation-shared] feature dispose failed", {
            featureKey,
            error,
          });
        }
      }
      registry.set(featureKey, candidateRecord);
      return {
        active: true,
        token,
        reason: "replaced-older-owner",
        ownerMeta: toOwnerMeta(candidateRecord),
      };
    }

    return {
      active: false,
      token,
      reason:
        comparison === 0
          ? "same-version-already-active"
          : "older-version-rejected",
      ownerMeta: toOwnerMeta(existing),
    };
  }

  function releaseFeatureInstance(featureKey, token) {
    const normalizedFeatureKey = String(featureKey || "").trim();
    const normalizedToken = String(token || "").trim();
    if (!normalizedFeatureKey || !normalizedToken) {
      return false;
    }

    const registry = getFeatureRegistry();
    const existing = registry.get(normalizedFeatureKey);
    if (!existing || existing.token !== normalizedToken) {
      return false;
    }
    registry.delete(normalizedFeatureKey);
    return true;
  }

  function revokeFeatureInstance(featureKey, options) {
    const normalizedFeatureKey = String(featureKey || "").trim();
    if (!normalizedFeatureKey) {
      return {
        revoked: false,
        reason: "missing-feature-key",
        ownerMeta: null,
      };
    }

    const registry = getFeatureRegistry();
    const existing = registry.get(normalizedFeatureKey);
    if (!existing) {
      return {
        revoked: false,
        reason: "not-found",
        ownerMeta: null,
      };
    }

    const config = options && typeof options === "object" ? options : {};
    const payload = {
      reason: String(config.reason || "revoked-by-runtime"),
      requestedBy: String(config.requestedBy || "unknown"),
      details:
        config.details && typeof config.details === "object"
          ? config.details
          : null,
      owner: toOwnerMeta(existing),
    };

    if (typeof existing.onDispose === "function") {
      try {
        existing.onDispose(payload);
      } catch (error) {
        console.warn(
          "[autodarts-animation-shared] feature revoke dispose failed",
          {
            featureKey: normalizedFeatureKey,
            error,
          }
        );
      }
    }

    registry.delete(normalizedFeatureKey);
    return {
      revoked: true,
      reason: "revoked",
      ownerMeta: toOwnerMeta(existing),
    };
  }

  function getFeatureInstance(featureKey) {
    const normalizedFeatureKey = String(featureKey || "").trim();
    if (!normalizedFeatureKey) {
      return null;
    }
    return toOwnerMeta(getFeatureRegistry().get(normalizedFeatureKey));
  }

  function listFeatureInstances() {
    const registry = getFeatureRegistry();
    return Array.from(registry.values())
      .map((record) => toOwnerMeta(record))
      .filter(Boolean);
  }

  function markOverlayOwner(overlay, meta) {
    if (!overlay || !overlay.dataset || !meta) {
      return null;
    }
    overlay.dataset.adExtFeatureKey = String(meta.featureKey || "");
    overlay.dataset.adExtFeatureToken = String(meta.token || "");
    overlay.dataset.adExtFeatureVersion = String(meta.version || "");
    overlay.dataset.adExtFeatureSource = String(meta.sourcePath || "");
    return readOverlayOwner(overlay);
  }

  function readOverlayOwner(overlay) {
    if (!overlay || !overlay.dataset) {
      return null;
    }
    const featureKey = String(overlay.dataset.adExtFeatureKey || "");
    const token = String(overlay.dataset.adExtFeatureToken || "");
    const version = String(overlay.dataset.adExtFeatureVersion || "");
    const sourcePath = String(overlay.dataset.adExtFeatureSource || "");
    if (!featureKey && !token && !version && !sourcePath) {
      return null;
    }
    return {
      featureKey,
      token,
      version,
      sourcePath,
    };
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
    getCricketGameMode,
    getBoardRadius,
    findBoard,
    ensureOverlayGroup,
    clearOverlay,
    claimFeatureInstance,
    releaseFeatureInstance,
    revokeFeatureInstance,
    getFeatureInstance,
    listFeatureInstances,
    markOverlayOwner,
    readOverlayOwner,
    polar,
    wedgePath,
    ringPath,
    segmentAngles,
    createWedge,
    createBull,
  };
})(window);
