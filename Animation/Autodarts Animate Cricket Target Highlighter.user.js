// ==UserScript==
// @name         Autodarts Animate Cricket Target Highlighter
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.9
// @description  Zeigt Zielzustände in Cricket und Tactics als Overlay direkt auf dem virtuellen Dartboard.
// @xconfig-description  Markiert in Cricket und Tactics relevante Zielzustände auf dem virtuellen Dartboard. Funktioniert nicht mit dem Live Dartboard.
// @xconfig-title  Cricket-Ziel-Highlighter
// @xconfig-variant      cricket / tactics
// @xconfig-readme-anchor  animation-autodarts-animate-cricket-target-highlighter
// @xconfig-tech-anchor  animation-autodarts-animate-cricket-target-highlighter
// @xconfig-background     assets/animation-cricket-target-highlighter-xConfig.png
// @xconfig-settings-version 5
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-cricket-state-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js
// ==/UserScript==

(function () {
  "use strict";

  // xConfig: {"type":"toggle","label":"Dead-Ziele anzeigen","description":"Zeigt auch Ziele, die bei allen Spielern bereits geschlossen sind.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_DEAD_ZIELE_ANZEIGEN = true;
  // xConfig: {"type":"select","label":"Farbthema","description":"Wählt das Farbschema für Zielzustände.","options":[{"value":"standard","label":"Standard"},{"value":"high-contrast","label":"High Contrast"}]}
  const xConfig_FARBTHEMA = "standard";
  // xConfig: {"type":"select","label":"Intensität","description":"Steuert Deckkraft und Kontrast der Markierungen.","options":[{"value":"subtle","label":"Dezent"},{"value":"normal","label":"Standard"},{"value":"strong","label":"Stark"}]}
  const xConfig_INTENSITAET = "normal";
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

  function resolveToggle(value, fallbackValue) {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === 1 || value === "1") {
      return true;
    }
    if (value === 0 || value === "0") {
      return false;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "on", "aktiv", "active"].includes(normalized)) {
        return true;
      }
      if (["false", "no", "off", "inaktiv", "inactive"].includes(normalized)) {
        return false;
      }
    }
    return fallbackValue;
  }

  function resolveStringChoice(value, fallbackValue, allowedValues) {
    const normalizedValue = String(value || "").trim();
    return allowedValues.includes(normalizedValue)
      ? normalizedValue
      : fallbackValue;
  }

  function resolveDebugToggle(value) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
  }

  const CRICKET_THEME_PRESETS = {
    standard: {
      offense: { r: 0, g: 178, b: 135 },
      danger: { r: 239, g: 68, b: 68 },
    },
    "high-contrast": {
      offense: { r: 34, g: 197, b: 94 },
      danger: { r: 239, g: 68, b: 68 },
    },
  };
  const CRICKET_INTENSITY_PRESETS = {
    subtle: {
      closed: 0.68,
      dead: 0.86,
      inactive: 0.66,
      highlightOpacity: 0.32,
      strokeBoost: 0.14,
    },
    normal: {
      closed: 0.8,
      dead: 0.98,
      inactive: 0.8,
      highlightOpacity: 0.45,
      strokeBoost: 0.2,
    },
    strong: {
      closed: 0.92,
      dead: 1,
      inactive: 0.9,
      highlightOpacity: 0.62,
      strokeBoost: 0.3,
    },
  };

  const RESOLVED_SHOW_DEAD_TARGETS = resolveToggle(
    xConfig_DEAD_ZIELE_ANZEIGEN,
    true
  );
  const RESOLVED_THEME_KEY = resolveStringChoice(
    xConfig_FARBTHEMA,
    "standard",
    ["standard", "high-contrast"]
  );
  const RESOLVED_INTENSITY_KEY = resolveStringChoice(
    xConfig_INTENSITAET,
    "normal",
    ["subtle", "normal", "strong"]
  );
  const RESOLVED_THEME =
    CRICKET_THEME_PRESETS[RESOLVED_THEME_KEY] || CRICKET_THEME_PRESETS.standard;
  const RESOLVED_INTENSITY =
    CRICKET_INTENSITY_PRESETS[RESOLVED_INTENSITY_KEY] ||
    CRICKET_INTENSITY_PRESETS.normal;
  const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
  const SCRIPT_VERSION = "2.9";
  const FEATURE_KEY = "ad-ext/a-cricket-target";
  const SOURCE_PATH =
    "Animation/Autodarts Animate Cricket Target Highlighter.user.js";
  const EXPECTED_SHARED_MODULE_ID = "autodarts-cricket-state-shared";
  const EXPECTED_SHARED_API_VERSION = 2;
  const EXPECTED_SHARED_BUILD_SIGNATURE =
    `${EXPECTED_SHARED_MODULE_ID}@${EXPECTED_SHARED_API_VERSION}:2026-03-runtime-ownership`;

  const animationShared = window.autodartsAnimationShared || {};
  const cricketStateShared = window.autodartsCricketStateShared || null;
  const gameStateShared = window.autodartsGameStateShared || null;

  const {
    ensureStyle,
    createRafScheduler,
    observeMutations,
    isCricketVariant,
    findBoard,
    ensureOverlayGroup,
    clearOverlay,
    claimFeatureInstance,
    releaseFeatureInstance,
    getFeatureInstance,
    markOverlayOwner,
    readOverlayOwner,
    segmentAngles,
    createWedge,
    createBull,
  } = animationShared;

  const CONFIG = {
    variantElementId: "ad-ext-game-variant",
    tableSelector: null,
    playerSelector: ".ad-ext-player",
    activePlayerSelector: ".ad-ext-player-active",
    showDeadTargets: RESOLVED_SHOW_DEAD_TARGETS,
    strokeWidthRatio: 0.006,
    edgePaddingPx: 0.8,
    baseColor: {
      r: 90,
      g: 90,
      b: 90,
    },
    opacity: {
      closed: RESOLVED_INTENSITY.closed,
      dead: RESOLVED_INTENSITY.dead,
      inactive: RESOLVED_INTENSITY.inactive,
    },
    highlight: {
      offense: {
        r: RESOLVED_THEME.offense.r,
        g: RESOLVED_THEME.offense.g,
        b: RESOLVED_THEME.offense.b,
        opacity: RESOLVED_INTENSITY.highlightOpacity,
        strokeBoost: RESOLVED_INTENSITY.strokeBoost,
      },
      danger: {
        r: RESOLVED_THEME.danger.r,
        g: RESOLVED_THEME.danger.g,
        b: RESOLVED_THEME.danger.b,
        opacity: RESOLVED_INTENSITY.highlightOpacity,
        strokeBoost: RESOLVED_INTENSITY.strokeBoost,
      },
    },
    ringRatios: {
      outerBullInner: 0.031112,
      outerBullOuter: 0.075556,
      tripleInner: 0.431112,
      tripleOuter: 0.475556,
      doubleInner: 0.711112,
      doubleOuter: 0.755556,
    },
  };

  const ALL_TARGETS = [
    ...Array.from({ length: 20 }, (_, index) => {
      const value = index + 1;
      return { label: String(value), value };
    }),
    { label: "BULL", ring: "BULL" },
  ];

  const STYLE_ID = "autodarts-cricket-target-style";
  const OVERLAY_ID = "ad-ext-cricket-targets";
  const TARGET_CLASS = "ad-ext-cricket-target";
  const OPEN_CLASS = "ad-ext-cricket-target--open";
  const CLOSED_CLASS = "ad-ext-cricket-target--closed";
  const DEAD_CLASS = "ad-ext-cricket-target--dead";
  const INACTIVE_CLASS = "ad-ext-cricket-target--inactive";
  const SCORE_CLASS = "ad-ext-cricket-target--score";
  const DANGER_CLASS = "ad-ext-cricket-target--danger";
  const DEBUG_PREFIX = "[xConfig][Cricket Target Highlighter]";
  const DEBUG_TRACE_ENABLED = false;

  let lastStateKey = null;
  let lastBoardKey = null;
  let mutationObserver = null;
  let unsubscribeGameState = null;
  let refreshTimer = null;
  let instanceReleased = false;
  const boardDecisionState = {
    conflictKey: "",
    conflictCount: 0,
    lastChosenIndex: null,
    lastDecisionSource: "",
  };
  const debugWarnSignatures = new Set();

  function stripDebugSignature(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return payload;
    }
    const nextPayload = { ...payload };
    delete nextPayload._signature;
    return nextPayload;
  }

  function buildDebugSignature(event, payload) {
    const explicitSignature =
      payload && typeof payload === "object" ? payload._signature : "";
    if (explicitSignature) {
      return `${event}|${explicitSignature}`;
    }
    try {
      return `${event}|${JSON.stringify(stripDebugSignature(payload))}`;
    } catch (error) {
      return event;
    }
  }

  function debugLog(event, payload, level = "warn") {
    if (!DEBUG_ENABLED) {
      return;
    }
    const normalizedPayload = stripDebugSignature(payload);
    if (level === "trace") {
      if (!DEBUG_TRACE_ENABLED) {
        return;
      }
      if (typeof normalizedPayload === "undefined") {
        console.log(`${DEBUG_PREFIX} ${event}`);
        return;
      }
      console.log(`${DEBUG_PREFIX} ${event}`, normalizedPayload);
      return;
    }
    if (level === "error") {
      if (typeof normalizedPayload === "undefined") {
        console.error(`${DEBUG_PREFIX} ${event}`);
        return;
      }
      console.error(`${DEBUG_PREFIX} ${event}`, normalizedPayload);
      return;
    }

    const signature = buildDebugSignature(event, payload);
    if (debugWarnSignatures.has(signature)) {
      return;
    }
    debugWarnSignatures.add(signature);
    if (typeof normalizedPayload === "undefined") {
      console.warn(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.warn(`${DEBUG_PREFIX} ${event}`, normalizedPayload);
  }

  function debugError(event, payload) {
    debugLog(event, payload, "error");
  }

  function debugTrace(event, payload) {
    debugLog(event, payload, "trace");
  }

  function normalizeSourcePath(value) {
    return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
  }

  function getCurrentExecution() {
    const runtimeApi = window.__adXConfigRuntime;
    const execution =
      runtimeApi && typeof runtimeApi.getCurrentExecution === "function"
        ? runtimeApi.getCurrentExecution()
        : null;
    return execution && typeof execution === "object" ? execution : null;
  }

  function resolveExecutionSource() {
    const execution = getCurrentExecution();
    const currentSourcePath = normalizeSourcePath(execution?.sourcePath || "");
    return {
      execution,
      executionSource:
        currentSourcePath === normalizeSourcePath(SOURCE_PATH)
          ? "xconfig-loader"
          : "standalone-userscript",
    };
  }

  function isCompatibleCricketStateHelper() {
    return Boolean(
      cricketStateShared &&
        cricketStateShared.__moduleId === EXPECTED_SHARED_MODULE_ID &&
        cricketStateShared.__apiVersion === EXPECTED_SHARED_API_VERSION &&
        cricketStateShared.__buildSignature === EXPECTED_SHARED_BUILD_SIGNATURE &&
        typeof cricketStateShared.buildGridSnapshot === "function" &&
        typeof cricketStateShared.computeTargetStates === "function"
    );
  }

  function logSharedHelperMismatch() {
    debugLog("shared-helper-version-mismatch", {
      _signature: [
        cricketStateShared?.__moduleId || "missing",
        cricketStateShared?.__apiVersion || "missing",
        cricketStateShared?.__buildSignature || "missing",
      ].join("|"),
      expectedModuleId: EXPECTED_SHARED_MODULE_ID,
      expectedApiVersion: EXPECTED_SHARED_API_VERSION,
      expectedBuildSignature: EXPECTED_SHARED_BUILD_SIGNATURE,
      actualModuleId: cricketStateShared?.__moduleId || "",
      actualApiVersion: cricketStateShared?.__apiVersion || "",
      actualBuildSignature: cricketStateShared?.__buildSignature || "",
    });
  }

  function isOverlayOwnedByInstance(overlay, instanceToken) {
    const owner = readOverlayOwner(overlay);
    return Boolean(
      owner &&
        owner.featureKey === FEATURE_KEY &&
        owner.token &&
        owner.token === instanceToken
    );
  }

  function acquireOverlayOwnership(overlay, instanceMeta) {
    if (!overlay || !instanceMeta) {
      return false;
    }
    const owner = readOverlayOwner(overlay);
    if (!owner || !owner.featureKey) {
      markOverlayOwner(overlay, instanceMeta);
      return true;
    }
    if (owner.featureKey === FEATURE_KEY && owner.token === instanceMeta.token) {
      return true;
    }
    debugLog("overlay-owner-mismatch", {
      _signature: [
        owner.featureKey || "",
        owner.token || "",
        instanceMeta.token || "",
        owner.version || "",
      ].join("|"),
      overlayId: overlay.id || "",
      owner,
      expectedOwner: instanceMeta,
    });
    return false;
  }

  function getBoardPresentation(stateInfo) {
    return String(
      stateInfo?.boardPresentation || stateInfo?.presentation || "open"
    );
  }

  function getPresentationForBoardIndex(stateInfo, boardPlayerIndex) {
    const cellStates = Array.isArray(stateInfo?.cellStates)
      ? stateInfo.cellStates
      : [];
    if (
      Number.isFinite(boardPlayerIndex) &&
      boardPlayerIndex >= 0 &&
      boardPlayerIndex < cellStates.length
    ) {
      return String(
        cellStates[boardPlayerIndex]?.presentation ||
          getBoardPresentation(stateInfo)
      );
    }
    return getBoardPresentation(stateInfo);
  }

  function getActivePlayerResolution(snapshot) {
    const resolution = snapshot?.activePlayerResolution;
    return resolution && typeof resolution === "object" ? resolution : null;
  }

  function isElement(node) {
    return Boolean(node) && node.nodeType === 1;
  }

  function isLayoutVisible(element) {
    if (!isElement(element) || !element.isConnected) {
      return false;
    }
    let current = element;
    while (isElement(current)) {
      const style = getComputedStyle(current);
      if (!style) {
        return false;
      }
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return false;
      }
      current = current.parentElement;
    }
    const rect = element.getBoundingClientRect();
    return (
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function normalizeIdentityKey(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}@._ -]+/gu, "")
      .trim();
  }

  function readNodeAttribute(element, attributeName) {
    if (!isElement(element) || !attributeName) {
      return "";
    }
    return String(element.getAttribute(attributeName) || "").trim();
  }

  function readPlayerNodeIdentity(node) {
    if (!isElement(node)) {
      return { playerId: "", nameKey: "" };
    }
    const playerId =
      readNodeAttribute(node, "data-player-id") ||
      readNodeAttribute(node, "data-user-id") ||
      readNodeAttribute(node, "data-id") ||
      readNodeAttribute(node, "data-player");
    const nameNode =
      node.querySelector(".ad-ext-player-name") ||
      node.querySelector("[data-player-name]") ||
      node.querySelector("[data-username]") ||
      node.querySelector("[data-name]");
    const rawName = nameNode?.textContent || node.textContent || "";
    return {
      playerId,
      nameKey: normalizeIdentityKey(rawName),
    };
  }

  function sortPlayerNodesByVisualOrder(nodes) {
    return (Array.isArray(nodes) ? nodes.slice() : [])
      .filter((node) => isElement(node))
      .map((node, index) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          index,
          top: Number.isFinite(rect.top) ? rect.top : 0,
          left: Number.isFinite(rect.left) ? rect.left : 0,
          width: Number.isFinite(rect.width) ? rect.width : 0,
          height: Number.isFinite(rect.height) ? rect.height : 0,
        };
      })
      .sort((first, second) => {
        if (Math.abs(first.top - second.top) > 8) {
          return first.top - second.top;
        }
        if (first.left !== second.left) {
          return first.left - second.left;
        }
        if (first.width !== second.width) {
          return first.width - second.width;
        }
        if (first.height !== second.height) {
          return first.height - second.height;
        }
        return first.index - second.index;
      })
      .map((entry) => entry.node);
  }

  function getFallbackBoardPlayerIndex(snapshot) {
    if (Number.isFinite(snapshot?.boardPlayerIndex)) {
      return snapshot.boardPlayerIndex;
    }
    if (Number.isFinite(snapshot?.activePlayerIndex)) {
      return snapshot.activePlayerIndex;
    }
    return 0;
  }

  function resolveStateMappedBoardPlayerIndex(snapshot) {
    const stateIndex =
      gameStateShared && typeof gameStateShared.getActivePlayerIndex === "function"
        ? gameStateShared.getActivePlayerIndex()
        : null;
    if (!Number.isFinite(stateIndex)) {
      return {
        stateIndex: null,
        stateMappedIndex: null,
      };
    }
    const playerSlots = Array.isArray(snapshot?.playerSlots)
      ? snapshot.playerSlots
      : [];
    const matchedSlot = playerSlots.find((slot) => slot?.matchIndex === stateIndex);
    return {
      stateIndex,
      stateMappedIndex: Number.isFinite(matchedSlot?.columnIndex)
        ? matchedSlot.columnIndex
        : null,
    };
  }

  function resetBoardDecisionState() {
    boardDecisionState.conflictKey = "";
    boardDecisionState.conflictCount = 0;
    boardDecisionState.lastChosenIndex = null;
    boardDecisionState.lastDecisionSource = "";
  }

  function resolveBoardRenderDecision(snapshot) {
    const snapshotBoardIndex = getFallbackBoardPlayerIndex(snapshot);
    const resolution = getActivePlayerResolution(snapshot);
    const resolutionSource = String(resolution?.source || "");
    const { stateIndex, stateMappedIndex } =
      resolveStateMappedBoardPlayerIndex(snapshot);
    const hasConflict =
      resolutionSource.startsWith("visible-dom") &&
      Number.isFinite(snapshotBoardIndex) &&
      Number.isFinite(stateMappedIndex) &&
      stateMappedIndex !== snapshotBoardIndex;

    if (!hasConflict) {
      resetBoardDecisionState();
      boardDecisionState.lastChosenIndex = snapshotBoardIndex;
      boardDecisionState.lastDecisionSource = "snapshot";
      return {
        boardPlayerIndex: snapshotBoardIndex,
        decisionSource: "snapshot",
        snapshotBoardIndex,
        stateMappedIndex,
        stateIndex,
      };
    }

    const conflictKey = [
      snapshotBoardIndex,
      stateMappedIndex,
      stateIndex,
      resolutionSource,
      snapshot?.playerMappingSource || "",
      resolution?.matchIndex,
    ].join("|");
    if (boardDecisionState.conflictKey === conflictKey) {
      boardDecisionState.conflictCount += 1;
    } else {
      boardDecisionState.conflictKey = conflictKey;
      boardDecisionState.conflictCount = 1;
    }

    const previousChosenIndex = boardDecisionState.lastChosenIndex;
    const shouldForceStateForDisplayConflict =
      resolutionSource === "visible-dom-display";
    const shouldPreferState =
      shouldForceStateForDisplayConflict ||
      previousChosenIndex === stateMappedIndex ||
      boardDecisionState.conflictCount >= 2;
    const boardPlayerIndex = shouldPreferState
      ? stateMappedIndex
      : snapshotBoardIndex;
    const decisionSource = shouldPreferState
      ? shouldForceStateForDisplayConflict
        ? "game-state-display-override"
        : "game-state-conflict-override"
      : "snapshot-conflict-first-pass";

    boardDecisionState.lastChosenIndex = boardPlayerIndex;
    boardDecisionState.lastDecisionSource = decisionSource;

    debugLog("board-player-render-override", {
      _signature: [
        conflictKey,
        decisionSource,
        boardDecisionState.conflictCount,
      ].join("|"),
      snapshotBoardIndex,
      stateMappedIndex,
      chosenBoardIndex: boardPlayerIndex,
      stateIndex,
      resolutionSource,
      resolutionMatchIndex: resolution?.matchIndex,
      resolutionDisplayIndex: resolution?.displayIndex,
      visibleActiveCandidates: resolution?.visibleActiveCandidates || 0,
      playerMappingSource: snapshot?.playerMappingSource || "",
      conflictCount: boardDecisionState.conflictCount,
      previousChosenIndex,
      decisionSource,
    });

    return {
      boardPlayerIndex,
      decisionSource,
      snapshotBoardIndex,
      stateMappedIndex,
      stateIndex,
    };
  }

  function rgba(alpha, color = CONFIG.baseColor) {
    const { r, g, b } = color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const STYLE_TEXT = `
.${TARGET_CLASS} {
  fill: var(--ad-ext-cricket-fill, transparent);
  stroke: var(--ad-ext-cricket-stroke, transparent);
  stroke-width: var(--ad-ext-cricket-stroke-width, 1px);
  opacity: var(--ad-ext-cricket-opacity, 0.25);
  pointer-events: none;
}

.${OPEN_CLASS} {
  --ad-ext-cricket-fill: var(--ad-ext-cricket-open-fill);
  --ad-ext-cricket-stroke: var(--ad-ext-cricket-open-stroke);
  --ad-ext-cricket-opacity: var(--ad-ext-cricket-open-opacity);
}

.${CLOSED_CLASS} {
  --ad-ext-cricket-fill: var(--ad-ext-cricket-closed-fill);
  --ad-ext-cricket-stroke: var(--ad-ext-cricket-closed-stroke);
  --ad-ext-cricket-opacity: var(--ad-ext-cricket-closed-opacity);
}

.${DEAD_CLASS} {
  --ad-ext-cricket-fill: var(--ad-ext-cricket-dead-fill);
  --ad-ext-cricket-stroke: var(--ad-ext-cricket-dead-stroke);
  --ad-ext-cricket-opacity: var(--ad-ext-cricket-dead-opacity);
}

.${INACTIVE_CLASS} {
  --ad-ext-cricket-fill: var(--ad-ext-cricket-inactive-fill);
  --ad-ext-cricket-stroke: var(--ad-ext-cricket-inactive-stroke);
  --ad-ext-cricket-opacity: var(--ad-ext-cricket-inactive-opacity);
}

.${SCORE_CLASS} {
  --ad-ext-cricket-fill: var(--ad-ext-cricket-score-fill);
  --ad-ext-cricket-stroke: var(--ad-ext-cricket-score-stroke);
  --ad-ext-cricket-opacity: var(--ad-ext-cricket-score-opacity);
}

.${DANGER_CLASS} {
  --ad-ext-cricket-fill: var(--ad-ext-cricket-danger-fill);
  --ad-ext-cricket-stroke: var(--ad-ext-cricket-danger-stroke);
  --ad-ext-cricket-opacity: var(--ad-ext-cricket-danger-opacity);
}
`;

  function isCricketVariantActive() {
    if (gameStateShared && typeof gameStateShared.isCricketVariant === "function") {
      if (
        gameStateShared.isCricketVariant({
          allowMissing: false,
          allowEmpty: false,
        })
      ) {
        return true;
      }
    }

    if (typeof isCricketVariant !== "function") {
      return false;
    }

    return isCricketVariant(CONFIG.variantElementId, {
      allowMissing: false,
      allowEmpty: false,
    });
  }

  function buildTargetShapes(radius, target) {
    const ratios = CONFIG.ringRatios;
    const shapes = [];

    if (target.ring === "BULL") {
      shapes.push(
        createBull(radius, 0, ratios.outerBullInner, true, {
          edgePaddingPx: CONFIG.edgePaddingPx,
        })
      );
      shapes.push(
        createBull(radius, ratios.outerBullInner, ratios.outerBullOuter, false, {
          edgePaddingPx: CONFIG.edgePaddingPx,
        })
      );
      return shapes;
    }

    if (!target.value) {
      return shapes;
    }

    const angles = segmentAngles(target.value);
    if (!angles) {
      return shapes;
    }

    shapes.push(
      createWedge(
        radius,
        ratios.outerBullOuter,
        ratios.tripleInner,
        angles.start,
        angles.end,
        CONFIG.edgePaddingPx
      )
    );
    shapes.push(
      createWedge(
        radius,
        ratios.tripleInner,
        ratios.tripleOuter,
        angles.start,
        angles.end,
        CONFIG.edgePaddingPx
      )
    );
    shapes.push(
      createWedge(
        radius,
        ratios.tripleOuter,
        ratios.doubleInner,
        angles.start,
        angles.end,
        CONFIG.edgePaddingPx
      )
    );
    shapes.push(
      createWedge(
        radius,
        ratios.doubleInner,
        ratios.doubleOuter,
        angles.start,
        angles.end,
        CONFIG.edgePaddingPx
      )
    );

    return shapes;
  }

  function applyOverlayTheme(overlay, radius) {
    overlay.style.setProperty("--ad-ext-cricket-open-fill", rgba(0));
    overlay.style.setProperty("--ad-ext-cricket-open-stroke", rgba(0));
    overlay.style.setProperty("--ad-ext-cricket-open-opacity", "0");
    overlay.style.setProperty(
      "--ad-ext-cricket-closed-fill",
      rgba(CONFIG.opacity.closed)
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-closed-stroke",
      rgba(Math.min(1, CONFIG.opacity.closed + 0.11))
    );
    overlay.style.setProperty("--ad-ext-cricket-closed-opacity", "1");
    overlay.style.setProperty(
      "--ad-ext-cricket-dead-fill",
      rgba(CONFIG.opacity.inactive, { r: 33, g: 33, b: 33 })
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-dead-stroke",
      rgba(0, { r: 33, g: 33, b: 33 })
    );
    overlay.style.setProperty("--ad-ext-cricket-dead-opacity", "1");
    overlay.style.setProperty(
      "--ad-ext-cricket-inactive-fill",
      rgba(CONFIG.opacity.inactive, { r: 33, g: 33, b: 33 })
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-inactive-stroke",
      rgba(0, { r: 33, g: 33, b: 33 })
    );
    overlay.style.setProperty("--ad-ext-cricket-inactive-opacity", "1");
    overlay.style.setProperty(
      "--ad-ext-cricket-score-fill",
      rgba(CONFIG.highlight.offense.opacity, CONFIG.highlight.offense)
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-score-stroke",
      rgba(
        Math.min(
          1,
          CONFIG.highlight.offense.opacity + CONFIG.highlight.offense.strokeBoost
        ),
        CONFIG.highlight.offense
      )
    );
    overlay.style.setProperty("--ad-ext-cricket-score-opacity", "1");
    overlay.style.setProperty(
      "--ad-ext-cricket-danger-fill",
      rgba(CONFIG.highlight.danger.opacity, CONFIG.highlight.danger)
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-danger-stroke",
      rgba(
        Math.min(
          1,
          CONFIG.highlight.danger.opacity + CONFIG.highlight.danger.strokeBoost
        ),
        CONFIG.highlight.danger
      )
    );
    overlay.style.setProperty("--ad-ext-cricket-danger-opacity", "1");

    const strokeWidth = Math.max(1, radius * CONFIG.strokeWidthRatio);
    overlay.style.setProperty("--ad-ext-cricket-stroke-width", `${strokeWidth}px`);
  }

  const executionContext = resolveExecutionSource();

  if (
    typeof ensureStyle !== "function" ||
    typeof createRafScheduler !== "function" ||
    typeof observeMutations !== "function" ||
    typeof findBoard !== "function" ||
    typeof ensureOverlayGroup !== "function" ||
    typeof clearOverlay !== "function" ||
    typeof claimFeatureInstance !== "function" ||
    typeof releaseFeatureInstance !== "function" ||
    typeof getFeatureInstance !== "function" ||
    typeof markOverlayOwner !== "function" ||
    typeof readOverlayOwner !== "function"
  ) {
    debugError("animation-runtime-missing", {
      sourcePath: SOURCE_PATH,
      executionSource: executionContext.executionSource,
    });
    return;
  }

  if (!isCompatibleCricketStateHelper()) {
    logSharedHelperMismatch();
    return;
  }

  const instanceClaim = claimFeatureInstance({
    featureKey: FEATURE_KEY,
    version: SCRIPT_VERSION,
    sourcePath: SOURCE_PATH,
    executionSource: executionContext.executionSource,
    onDispose: () => {
      dispose("replaced-by-newer-instance");
    },
  });

  if (!instanceClaim.active) {
    debugLog("feature-instance-skipped", {
      _signature: [
        FEATURE_KEY,
        SCRIPT_VERSION,
        instanceClaim.reason,
        instanceClaim.ownerMeta?.token || "",
      ].join("|"),
      featureKey: FEATURE_KEY,
      version: SCRIPT_VERSION,
      reason: instanceClaim.reason,
      ownerMeta: instanceClaim.ownerMeta,
      executionSource: executionContext.executionSource,
    });
    return;
  }

  if (instanceClaim.reason === "replaced-older-owner") {
    debugLog("feature-instance-replaced", {
      _signature: [
        FEATURE_KEY,
        SCRIPT_VERSION,
        instanceClaim.reason,
        executionContext.executionSource,
      ].join("|"),
      featureKey: FEATURE_KEY,
      version: SCRIPT_VERSION,
      reason: instanceClaim.reason,
      executionSource: executionContext.executionSource,
    });
  } else {
    debugTrace("feature-instance-claimed", {
      featureKey: FEATURE_KEY,
      version: SCRIPT_VERSION,
      reason: instanceClaim.reason,
      executionSource: executionContext.executionSource,
    });
  }

  function isCurrentInstanceOwner() {
    if (instanceReleased) {
      return false;
    }
    const currentOwner = getFeatureInstance(FEATURE_KEY);
    return !currentOwner || currentOwner.token === instanceClaim.token;
  }

  function dispose(reason = "dispose") {
    if (instanceReleased) {
      return;
    }
    instanceReleased = true;

    if (mutationObserver && typeof mutationObserver.disconnect === "function") {
      mutationObserver.disconnect();
    }
    mutationObserver = null;

    if (typeof unsubscribeGameState === "function") {
      unsubscribeGameState();
    }
    unsubscribeGameState = null;

    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    refreshTimer = null;

    const board = findBoard();
    const overlay =
      board?.group && typeof board.group.querySelector === "function"
        ? board.group.querySelector(`#${OVERLAY_ID}`)
        : null;
    if (overlay && isOverlayOwnedByInstance(overlay, instanceClaim.token)) {
      clearOverlay(overlay);
    }

    releaseFeatureInstance(FEATURE_KEY, instanceClaim.token);
    lastStateKey = null;
    lastBoardKey = null;
    debugTrace("feature-instance-disposed", {
      featureKey: FEATURE_KEY,
      reason,
    });
  }

  function renderTargets(stateContext) {
    if (!isCurrentInstanceOwner()) {
      return;
    }

    const snapshot = stateContext?.snapshot || null;
    const stateMap = stateContext?.stateMap || new Map();
    const boardPlayerIndex = Number.isFinite(stateContext?.boardPlayerIndex)
      ? stateContext.boardPlayerIndex
      : getFallbackBoardPlayerIndex(snapshot);
    const board = findBoard();
    if (!board) {
      return;
    }

    const activeTargets = snapshot?.targetSet || new Set();
    const overlay = ensureOverlayGroup(board.group, OVERLAY_ID);
    if (!overlay || !acquireOverlayOwnership(overlay, instanceClaim.ownerMeta)) {
      return;
    }

    applyOverlayTheme(overlay, board.radius);
    clearOverlay(overlay);

    ALL_TARGETS.forEach((target) => {
      const isCricketTarget = activeTargets.has(target.label);
      const stateInfo = stateMap.get(target.label);
      if (isCricketTarget && !stateInfo) {
        return;
      }

      buildTargetShapes(board.radius, target).forEach((shape) => {
        shape.classList.add(TARGET_CLASS);
        const boardPresentation = getPresentationForBoardIndex(
          stateInfo,
          boardPlayerIndex
        );
        if (!isCricketTarget) {
          shape.classList.add(INACTIVE_CLASS);
        } else if (
          boardPresentation === "danger" ||
          boardPresentation === "pressure"
        ) {
          shape.classList.add(DANGER_CLASS);
        } else if (boardPresentation === "offense") {
          shape.classList.add(SCORE_CLASS);
        } else if (boardPresentation === "dead") {
          shape.classList.add(DEAD_CLASS);
        } else if (boardPresentation === "closed") {
          shape.classList.add(CLOSED_CLASS);
        } else {
          shape.classList.add(OPEN_CLASS);
        }
        shape.dataset.boardPlayerIndex = String(boardPlayerIndex);
        overlay.appendChild(shape);
      });
    });
  }

  function buildStateKey(stateContext) {
    const snapshot = stateContext?.snapshot || null;
    const stateMap = stateContext?.stateMap || new Map();
    const boardDecision = stateContext?.boardDecision || null;
    const targetOrder = snapshot?.targetOrder || [];
    const gameMode = snapshot?.gameModeInfo?.normalized || "";
    const modeFamily = snapshot?.modeInfo?.family || "";
    const playerMappingSource = snapshot?.playerMappingSource || "";
    const activeResolution = getActivePlayerResolution(snapshot);
    const boardPlayerIndex = Number.isFinite(boardDecision?.boardPlayerIndex)
      ? boardDecision.boardPlayerIndex
      : Number.isFinite(snapshot?.boardPlayerIndex)
        ? snapshot.boardPlayerIndex
        : getFallbackBoardPlayerIndex(snapshot);
    const playerSlots = Array.isArray(snapshot?.playerSlots)
      ? snapshot.playerSlots
          .map((slot) =>
            [
              Number.isFinite(slot?.columnIndex) ? slot.columnIndex : "",
              Number.isFinite(slot?.displayIndex) ? slot.displayIndex : "",
              Number.isFinite(slot?.matchIndex) ? slot.matchIndex : "",
              slot?.playerId || "",
              slot?.nameKey || "",
              slot?.source || "",
            ].join(":")
          )
          .join(",")
      : "";
    const activePlayerIndex = Number.isFinite(snapshot?.activePlayerIndex)
      ? snapshot.activePlayerIndex
      : "";
    const playerCount = Number.isFinite(snapshot?.playerCount)
      ? snapshot.playerCount
      : "";
    const targets = targetOrder
      .map((label) => {
        const state = stateMap.get(label);
        const marks = Array.isArray(state?.marksByPlayer)
          ? state.marksByPlayer.join(",")
          : "";
        const boardPresentation = getPresentationForBoardIndex(
          state,
          boardPlayerIndex
        );
        return `${label}:${boardPresentation}:${marks}`;
      })
      .join("|");
    return [
      gameMode,
      modeFamily,
      playerMappingSource,
      snapshot?.runtimeSourceHint || "",
      activeResolution?.source || "",
      Number.isFinite(activeResolution?.displayIndex)
        ? activeResolution.displayIndex
        : "",
      Number.isFinite(activeResolution?.matchIndex)
        ? activeResolution.matchIndex
        : "",
      Number.isFinite(activeResolution?.columnIndex)
        ? activeResolution.columnIndex
        : "",
      activePlayerIndex,
      boardPlayerIndex,
      boardDecision?.decisionSource || "",
      Number.isFinite(boardDecision?.stateMappedIndex)
        ? boardDecision.stateMappedIndex
        : "",
      playerCount,
      playerSlots,
      targets,
    ].join("|");
  }

  function warnIfBoardResolutionLooksWrong(snapshot) {
    if (!DEBUG_ENABLED) {
      return;
    }
    const resolution = getActivePlayerResolution(snapshot);
    if (!resolution) {
      return;
    }
    if ((resolution.visibleActiveCandidates || 0) > 1) {
      debugLog("board-player-resolution-ambiguous", {
        _signature: [
          snapshot?.playerMappingSource || "",
          resolution.source || "",
          resolution.matchIndex,
          resolution.columnIndex,
          resolution.visibleActiveCandidates || 0,
        ].join("|"),
        boardPlayerIndex: snapshot?.boardPlayerIndex,
        matchIndex: resolution.matchIndex,
        resolutionSource: resolution.source,
        visibleActiveCandidates: resolution.visibleActiveCandidates || 0,
        playerMappingSource: snapshot?.playerMappingSource || "",
      });
    }
    if (
      resolution.usedVisibleDom &&
      Number.isFinite(resolution.displayIndex) &&
      Number.isFinite(snapshot?.boardPlayerIndex) &&
      resolution.displayIndex !== snapshot.boardPlayerIndex
    ) {
      debugLog("board-player-resolution-mismatch", {
        _signature: [
          snapshot?.playerMappingSource || "",
          resolution.source || "",
          resolution.displayIndex,
          snapshot.boardPlayerIndex,
          resolution.matchIndex,
          resolution.visibleActiveCandidates || 0,
        ].join("|"),
        boardPlayerIndex: snapshot.boardPlayerIndex,
        displayIndex: resolution.displayIndex,
        matchIndex: resolution.matchIndex,
        resolutionSource: resolution.source,
        visibleActiveCandidates: resolution.visibleActiveCandidates || 0,
        playerMappingSource: snapshot?.playerMappingSource || "",
      });
    }
  }

  function readStateContext() {
    if (!isCompatibleCricketStateHelper()) {
      logSharedHelperMismatch();
      return null;
    }

    const snapshot = cricketStateShared.buildGridSnapshot({
      tableSelector: CONFIG.tableSelector,
      playerSelector: CONFIG.playerSelector,
      activePlayerSelector: CONFIG.activePlayerSelector,
      gameStateShared,
      debugLog: DEBUG_ENABLED ? debugLog : null,
    });
    if (!snapshot) {
      return null;
    }

    const stateMap = cricketStateShared.computeTargetStates(snapshot, {
      showDeadTargets: CONFIG.showDeadTargets,
    });
    warnIfBoardResolutionLooksWrong(snapshot);
    const boardDecision = resolveBoardRenderDecision(snapshot);
    const boardPlayerIndex = Number.isFinite(boardDecision?.boardPlayerIndex)
      ? boardDecision.boardPlayerIndex
      : Number.isFinite(snapshot?.boardPlayerIndex)
        ? snapshot.boardPlayerIndex
        : getFallbackBoardPlayerIndex(snapshot);
    return {
      snapshot,
      stateMap,
      boardPlayerIndex,
      boardDecision,
    };
  }

  function clearOverlayState() {
    const board = findBoard();
    const overlay =
      board?.group && typeof board.group.querySelector === "function"
        ? board.group.querySelector(`#${OVERLAY_ID}`)
        : null;
    if (
      overlay &&
      (!readOverlayOwner(overlay) || isOverlayOwnedByInstance(overlay, instanceClaim.token))
    ) {
      if (!readOverlayOwner(overlay)) {
        markOverlayOwner(overlay, instanceClaim.ownerMeta);
      }
      clearOverlay(overlay);
    }
    lastStateKey = null;
    lastBoardKey = null;
    resetBoardDecisionState();
  }

  function updateTargets() {
    if (!isCurrentInstanceOwner()) {
      return;
    }

    if (!isCompatibleCricketStateHelper()) {
      logSharedHelperMismatch();
      clearOverlayState();
      return;
    }

    if (!isCricketVariantActive()) {
      clearOverlayState();
      debugTrace("updateTargets: not cricket/tactics");
      return;
    }

    const stateContext = readStateContext();
    if (!stateContext || !stateContext.stateMap || !stateContext.stateMap.size) {
      clearOverlayState();
      debugTrace("updateTargets: no state map");
      return;
    }

    const board = findBoard();
    if (!board) {
      debugTrace("updateTargets: no board");
      return;
    }

    const existingOverlay =
      board.group && typeof board.group.querySelector === "function"
        ? board.group.querySelector(`#${OVERLAY_ID}`)
        : null;
    if (
      existingOverlay &&
      !acquireOverlayOwnership(existingOverlay, instanceClaim.ownerMeta)
    ) {
      return;
    }

    const boardKey = `${board.radius}:${board.group.id || "board"}`;
    const stateKey = buildStateKey(stateContext);
    const overlayNeedsRefresh =
      !existingOverlay ||
      !existingOverlay.isConnected ||
      !isOverlayOwnedByInstance(existingOverlay, instanceClaim.token) ||
      existingOverlay.childElementCount === 0;

    if (
      stateKey === lastStateKey &&
      boardKey === lastBoardKey &&
      !overlayNeedsRefresh
    ) {
      return;
    }

    lastStateKey = stateKey;
    lastBoardKey = boardKey;
    debugTrace("updateTargets: render", {
      boardKey,
      stateKey,
      boardPlayerIndex: stateContext.boardPlayerIndex,
      boardDecision: stateContext.boardDecision,
      snapshotBoardPlayerIndex: stateContext.snapshot?.boardPlayerIndex,
      resolution: getActivePlayerResolution(stateContext.snapshot),
      playerMappingSource: stateContext.snapshot?.playerMappingSource || "",
    });
    renderTargets(stateContext);
  }

  const scheduleUpdate = createRafScheduler(() => {
    if (instanceReleased) {
      return;
    }
    updateTargets();
  });

  ensureStyle(STYLE_ID, STYLE_TEXT);
  debugTrace("init", {
    debug: DEBUG_ENABLED,
    showDeadTargets: RESOLVED_SHOW_DEAD_TARGETS,
    theme: RESOLVED_THEME_KEY,
    intensity: RESOLVED_INTENSITY_KEY,
    executionSource: executionContext.executionSource,
  });

  updateTargets();

  mutationObserver = observeMutations({
    onChange: scheduleUpdate,
  });
  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    unsubscribeGameState = gameStateShared.subscribe(scheduleUpdate);
  }
  refreshTimer = setInterval(() => {
    if (!instanceReleased) {
      updateTargets();
    }
  }, 300);
})();
