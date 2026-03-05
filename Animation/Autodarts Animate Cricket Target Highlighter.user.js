// ==UserScript==
// @name         Autodarts Animate Cricket Target Highlighter
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.17
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
  const SCRIPT_VERSION = "2.17";
  const FEATURE_KEY = "ad-ext/a-cricket-target";
  const SOURCE_PATH =
    "Animation/Autodarts Animate Cricket Target Highlighter.user.js";
  const EXPECTED_SHARED_MODULE_ID = "autodarts-cricket-state-shared";
  const EXPECTED_SHARED_API_VERSION = 2;
  const EXPECTED_SHARED_BUILD_SIGNATURE =
    `${EXPECTED_SHARED_MODULE_ID}@${EXPECTED_SHARED_API_VERSION}:2026-03-label-cell-shortfall-fix`;

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
  const DEBUG_HISTORY_KEY = "__adExtCricketTargetDebugHistory";
  const DEBUG_HISTORY_STORAGE_KEY = "__adExtCricketTargetDebugHistorySession";
  const DEBUG_HISTORY_LIMIT = 600;
  const PROTECTED_TOP_OVERLAY_IDS = new Set([
    "ad-ext-dart-image-overlay",
    "ad-ext-winner-fireworks",
  ]);

  let lastStateKey = null;
  let lastBoardKey = null;
  let mutationObserver = null;
  let unsubscribeGameState = null;
  let refreshTimer = null;
  let instanceReleased = false;
  let unstableSnapshotStartedAt = 0;
  const debugWarnSignatures = new Set();
  const debugInfoSignatures = new Map();
  const debugTargetLineSignatures = new Map();

  function loadPersistedDebugHistory() {
    if (!DEBUG_ENABLED) {
      return [];
    }
    try {
      const stored = sessionStorage.getItem(DEBUG_HISTORY_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function persistDebugHistory(history) {
    if (!DEBUG_ENABLED) {
      return;
    }
    try {
      sessionStorage.setItem(
        DEBUG_HISTORY_STORAGE_KEY,
        JSON.stringify(Array.isArray(history) ? history : [])
      );
    } catch (error) {
      // intentionally ignored
    }
  }

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

  function pushDebugHistory(event, payload, level = "warn") {
    if (!DEBUG_ENABLED) {
      return;
    }
    const entry = {
      ts: new Date().toISOString(),
      level,
      event,
      payload:
        typeof payload === "undefined" ? undefined : stripDebugSignature(payload),
    };
    const history = Array.isArray(window[DEBUG_HISTORY_KEY])
      ? window[DEBUG_HISTORY_KEY]
      : loadPersistedDebugHistory();
    history.push(entry);
    if (history.length > DEBUG_HISTORY_LIMIT) {
      history.splice(0, history.length - DEBUG_HISTORY_LIMIT);
    }
    window[DEBUG_HISTORY_KEY] = history;
    persistDebugHistory(history);
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
      pushDebugHistory(event, normalizedPayload, "trace");
      if (typeof normalizedPayload === "undefined") {
        console.log(`${DEBUG_PREFIX} ${event}`);
        return;
      }
      console.log(`${DEBUG_PREFIX} ${event}`, normalizedPayload);
      return;
    }
    if (level === "error") {
      pushDebugHistory(event, normalizedPayload, "error");
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
    pushDebugHistory(event, normalizedPayload, "warn");
    if (typeof normalizedPayload === "undefined") {
      console.warn(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.warn(`${DEBUG_PREFIX} ${event}`, normalizedPayload);
  }

  function debugError(event, payload) {
    debugLog(event, payload, "error");
  }

  function debugInfoOnChange(event, payload, signature) {
    if (!DEBUG_ENABLED) {
      return;
    }
    const normalizedPayload = stripDebugSignature(payload);
    const resolvedSignature =
      signature ||
      (typeof normalizedPayload === "undefined"
        ? event
        : buildDebugSignature(event, normalizedPayload));
    if (debugInfoSignatures.get(event) === resolvedSignature) {
      return;
    }
    debugInfoSignatures.set(event, resolvedSignature);
    pushDebugHistory(event, normalizedPayload, "info");
    if (typeof normalizedPayload === "undefined") {
      console.log(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.log(`${DEBUG_PREFIX} ${event}`, normalizedPayload);
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

  function describeBoardGroupChildren(boardGroup) {
    if (!boardGroup || !boardGroup.children) {
      return [];
    }
    return Array.from(boardGroup.children).map((child, index) => ({
      index,
      tag: String(child.tagName || "").toLowerCase(),
      id: child.id || "",
      className:
        typeof child.getAttribute === "function"
          ? child.getAttribute("class") || ""
          : "",
      childCount: child.childElementCount || 0,
    }));
  }

  function summarizeBoardOverlayStack(boardGroup) {
    return describeBoardGroupChildren(boardGroup).map((entry) => {
      if (entry.id) {
        return entry.id;
      }
      if (entry.className) {
        return `${entry.tag}.${String(entry.className).split(/\s+/)[0]}`;
      }
      return entry.tag || "unknown";
    });
  }

  function getProtectedTopOverlay(boardGroup, overlay) {
    if (!boardGroup || !boardGroup.children) {
      return null;
    }
    return (
      Array.from(boardGroup.children).find((child) => {
        return child !== overlay && PROTECTED_TOP_OVERLAY_IDS.has(child.id);
      }) || null
    );
  }

  function getOverlayZOrderInfo(boardGroup, overlay) {
    if (!boardGroup || !overlay) {
      return {
        needsMove: false,
        protectedAnchorId: "",
        currentLastChildId: "",
        overlayOrder: [],
      };
    }
    const protectedAnchor = getProtectedTopOverlay(boardGroup, overlay);
    const needsMove = protectedAnchor
      ? overlay.nextElementSibling !== protectedAnchor
      : boardGroup.lastElementChild !== overlay;
    return {
      needsMove,
      protectedAnchorId: protectedAnchor?.id || "",
      currentLastChildId:
        boardGroup.lastElementChild?.id ||
        String(boardGroup.lastElementChild?.tagName || "").toLowerCase(),
      overlayOrder: summarizeBoardOverlayStack(boardGroup),
    };
  }

  function ensureOverlayZOrder(boardGroup, overlay) {
    const currentInfo = getOverlayZOrderInfo(boardGroup, overlay);
    if (!currentInfo.needsMove) {
      return { ...currentInfo, changed: false };
    }
    const protectedAnchor = getProtectedTopOverlay(boardGroup, overlay);
    if (protectedAnchor) {
      boardGroup.insertBefore(overlay, protectedAnchor);
    } else {
      boardGroup.appendChild(overlay);
    }
    return {
      ...getOverlayZOrderInfo(boardGroup, overlay),
      changed: true,
    };
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

  function resolveBoardRenderDecision(snapshot) {
    const snapshotBoardIndex = getFallbackBoardPlayerIndex(snapshot);
    const resolution = getActivePlayerResolution(snapshot);
    const resolutionSource = String(resolution?.source || "");
    const sourceConfidence = String(
      resolution?.sourceConfidence || "low"
    ).toLowerCase();
    const usesVisibleDom = Boolean(resolution?.usedVisibleDom);
    const stabilityHold = Boolean(resolution?.stabilityHold);
    const visibleActiveCandidates = Number.isFinite(
      resolution?.visibleActiveCandidates
    )
      ? resolution.visibleActiveCandidates
      : 0;
    const playerCount = Number.isFinite(snapshot?.playerCount)
      ? snapshot.playerCount
      : Array.isArray(snapshot?.playerSlots)
        ? snapshot.playerSlots.length
        : 0;
    const { stateIndex, stateMappedIndex } =
      resolveStateMappedBoardPlayerIndex(snapshot);
    const hasSnapshotBoardIndex =
      Number.isFinite(snapshotBoardIndex) &&
      snapshotBoardIndex >= 0 &&
      (playerCount <= 0 || snapshotBoardIndex < playerCount);
    const hasStateMappedIndex =
      Number.isFinite(stateMappedIndex) &&
      stateMappedIndex >= 0 &&
      (playerCount <= 0 || stateMappedIndex < playerCount);
    const hasConflict =
      hasSnapshotBoardIndex &&
      hasStateMappedIndex &&
      stateMappedIndex !== snapshotBoardIndex;
    let boardPlayerIndex = hasSnapshotBoardIndex ? snapshotBoardIndex : 0;
    let decisionSource = "snapshot-board-index";

    if (!hasSnapshotBoardIndex && hasStateMappedIndex) {
      boardPlayerIndex = stateMappedIndex;
      decisionSource = "state-map-out-of-range-fallback";
    } else if (hasConflict) {
      const domSignalReliable =
        usesVisibleDom &&
        !stabilityHold &&
        visibleActiveCandidates <= 1 &&
        (sourceConfidence === "high" || sourceConfidence === "medium");
      const shouldPreferStateMapped =
        hasStateMappedIndex &&
        (!domSignalReliable || stabilityHold || sourceConfidence === "low");
      if (shouldPreferStateMapped) {
        boardPlayerIndex = stateMappedIndex;
        if (stabilityHold) {
          decisionSource = "state-map-stability-hold-override";
        } else if (sourceConfidence === "low") {
          decisionSource = "state-map-low-confidence-override";
        } else {
          decisionSource = "state-map-conflict-override";
        }
      } else {
        decisionSource = "snapshot-board-index-dom-priority";
      }
    }

    if (hasConflict) {
      debugLog("board-player-resolution-conflict", {
        _signature: [
          snapshotBoardIndex,
          stateMappedIndex,
          stateIndex,
          resolutionSource,
          resolution?.sourceConfidence || "",
          resolution?.stabilityHold ? "hold" : "direct",
          snapshot?.playerMappingSource || "",
        ].join("|"),
        snapshotBoardIndex,
        stateMappedIndex,
        stateIndex,
        resolutionSource,
        sourceConfidence: resolution?.sourceConfidence || "",
        stabilityHold: Boolean(resolution?.stabilityHold),
        stabilityReason: resolution?.stabilityReason || "",
        decisionSource,
        boardPlayerIndex,
        playerMappingSource: snapshot?.playerMappingSource || "",
      });
    }

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
      rgba(CONFIG.opacity.dead, { r: 33, g: 33, b: 33 })
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
    debugInfoOnChange("feature-instance-claimed", {
      featureKey: FEATURE_KEY,
      version: SCRIPT_VERSION,
      reason: instanceClaim.reason,
      executionSource: executionContext.executionSource,
    }, [
      FEATURE_KEY,
      SCRIPT_VERSION,
      instanceClaim.reason,
      executionContext.executionSource,
      instanceClaim.ownerMeta?.token || "",
    ].join("|"));
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
    const overlayOrderInfo = ensureOverlayZOrder(board.group, overlay);
    if (overlayOrderInfo.changed) {
      debugLog("overlay-z-order-restored", {
        _signature: [
          board.group?.id || "board",
          overlayOrderInfo.protectedAnchorId || "end",
          (overlayOrderInfo.overlayOrder || []).join(","),
        ].join("|"),
        boardGroupId: board.group?.id || "board",
        overlayId: OVERLAY_ID,
        protectedAnchorId: overlayOrderInfo.protectedAnchorId || "",
        overlayOrder: overlayOrderInfo.overlayOrder || [],
        currentLastChildId: overlayOrderInfo.currentLastChildId || "",
      });
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
        shape.dataset.targetLabel = String(target.label || "");
        shape.dataset.targetPresentation = String(boardPresentation || "open");
        overlay.appendChild(shape);
      });
    });

    logBoardRenderState(stateContext, board, overlayOrderInfo);
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
      activeResolution?.sourceConfidence || "",
      activeResolution?.stabilityHold ? "hold" : "direct",
      activeResolution?.stabilityReason || "",
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

  function buildBoardTargetSummary(stateMap, boardPlayerIndex, snapshot = null) {
    const labels = [
      "20",
      "19",
      "18",
      "17",
      "16",
      "15",
      "14",
      "13",
      "12",
      "11",
      "10",
      "BULL",
    ];
    return labels.reduce((summary, label) => {
      const state = stateMap.get(label);
      if (!state) {
        return summary;
      }
      const row = snapshot?.rowMap?.get(label) || null;
      const markReadMeta = Array.isArray(row?.markReadMeta) ? row.markReadMeta : [];
      summary[label] = {
        board: getPresentationForBoardIndex(state, boardPlayerIndex),
        marks: Array.isArray(state.marksByPlayer)
          ? state.marksByPlayer.join("/")
          : "",
        cells: Array.isArray(state.cellStates)
          ? state.cellStates
              .map((cellState) => String(cellState?.presentation || "open"))
              .join("/")
          : "",
        playerCells: Array.isArray(row?.playerCells) ? row.playerCells.length : 0,
        markSources: markReadMeta
          .map((entry) =>
            [
              Number.isFinite(entry?.columnIndex) ? entry.columnIndex : "?",
              entry?.rowSlotMappingMethod || "direct",
              entry?.source || "none",
              Number.isFinite(entry?.initialMarks) ? entry.initialMarks : 0,
              Number.isFinite(entry?.finalMarks) ? entry.finalMarks : 0,
            ].join(":")
          )
          .join("/"),
        markRaw: markReadMeta
          .map((entry) =>
            [
              Number.isFinite(entry?.columnIndex) ? entry.columnIndex : "?",
              Number.isFinite(entry?.cellCenterX)
                ? Math.round(entry.cellCenterX)
                : "na",
              String(entry?.raw || "").replace(/\s+/g, " ").trim().slice(0, 40),
            ].join(":")
          )
          .join("/"),
      };
      return summary;
    }, {});
  }

  function buildTargetSummaryCompactLine(targetSummary) {
    return Object.entries(targetSummary || {})
      .map(([label, entry]) =>
        [
          label,
          entry.board || "open",
          entry.marks || "",
          entry.cells || "",
          entry.playerCells || 0,
          entry.markSources || "-",
        ].join(":")
      )
      .join(" | ");
  }

  function logTargetSummaryByLabel(targetSummary, boardPlayerIndex) {
    if (!DEBUG_ENABLED) {
      return;
    }
    Object.entries(targetSummary || {}).forEach(([label, entry]) => {
      const line = [
        `board=${boardPlayerIndex}`,
        `label=${label}`,
        `presentation=${entry.board || "open"}`,
        `marks=${entry.marks || "-"}`,
        `cells=${entry.cells || "-"}`,
        `playerCells=${entry.playerCells || 0}`,
        `sources=${entry.markSources || "-"}`,
        `raw=${entry.markRaw || "-"}`,
      ].join(" ");
      const signature = `${boardPlayerIndex}|${label}|${line}`;
      if (debugTargetLineSignatures.get(label) === signature) {
        return;
      }
      debugTargetLineSignatures.set(label, signature);
      console.log(`${DEBUG_PREFIX} target-line ${line}`);
      pushDebugHistory("target-line", {
        boardPlayerIndex,
        label,
        presentation: entry.board || "open",
        marks: entry.marks || "",
        cells: entry.cells || "",
        playerCells: entry.playerCells || 0,
        markSources: entry.markSources || "",
        markRaw: entry.markRaw || "",
      }, "info");
    });
  }

  function logBoardRenderState(stateContext, board, overlayInfo = null) {
    if (!DEBUG_ENABLED) {
      return;
    }
    const snapshot = stateContext?.snapshot || null;
    const stateMap = stateContext?.stateMap || new Map();
    const boardDecision = stateContext?.boardDecision || null;
    const gameStateSnapshot =
      gameStateShared && typeof gameStateShared.getState === "function"
        ? gameStateShared.getState()
        : null;
    const gameStateUpdatedAt = Number.isFinite(gameStateSnapshot?.updatedAt)
      ? gameStateSnapshot.updatedAt
      : 0;
    const gameStateAgeMs =
      gameStateUpdatedAt > 0 ? Math.max(0, Date.now() - gameStateUpdatedAt) : null;
    const boardPlayerIndex = Number.isFinite(stateContext?.boardPlayerIndex)
      ? stateContext.boardPlayerIndex
      : getFallbackBoardPlayerIndex(snapshot);
    const resolution = getActivePlayerResolution(snapshot);
    const playerSlots = Array.isArray(snapshot?.playerSlots)
      ? snapshot.playerSlots.map((slot) => ({
          columnIndex: Number.isFinite(slot?.columnIndex)
            ? slot.columnIndex
            : null,
          displayIndex: Number.isFinite(slot?.displayIndex)
            ? slot.displayIndex
            : null,
          matchIndex: Number.isFinite(slot?.matchIndex)
            ? slot.matchIndex
            : null,
          playerId: slot?.playerId || "",
          nameKey: slot?.nameKey || "",
          source: slot?.source || "",
        }))
      : [];
    const targetSummary = buildBoardTargetSummary(
      stateMap,
      boardPlayerIndex,
      snapshot
    );
    const payload = {
      boardPlayerIndex,
      snapshotBoardIndex: Number.isFinite(snapshot?.boardPlayerIndex)
        ? snapshot.boardPlayerIndex
        : null,
      activePlayerIndex: Number.isFinite(snapshot?.activePlayerIndex)
        ? snapshot.activePlayerIndex
        : null,
      decisionSource: boardDecision?.decisionSource || "snapshot",
      stateMappedIndex: Number.isFinite(boardDecision?.stateMappedIndex)
        ? boardDecision.stateMappedIndex
        : null,
      stateIndex: Number.isFinite(boardDecision?.stateIndex)
        ? boardDecision.stateIndex
        : null,
      resolutionSource: resolution?.source || "",
      sourceConfidence: resolution?.sourceConfidence || "",
      stabilityHold: Boolean(resolution?.stabilityHold),
      stabilityReason: resolution?.stabilityReason || "",
      stabilityAgeMs: Number.isFinite(resolution?.stabilityAgeMs)
        ? resolution.stabilityAgeMs
        : 0,
      rawResolutionSource: resolution?.rawSource || "",
      resolutionDisplayIndex: Number.isFinite(resolution?.displayIndex)
        ? resolution.displayIndex
        : null,
      resolutionMatchIndex: Number.isFinite(resolution?.matchIndex)
        ? resolution.matchIndex
        : null,
      playerDisplayRootId: resolution?.playerDisplayRootId || "",
      playerDisplayRootCount: Number.isFinite(resolution?.playerDisplayRootCount)
        ? resolution.playerDisplayRootCount
        : 0,
      playerMappingSource: snapshot?.playerMappingSource || "",
      runtimeSourceHint: snapshot?.runtimeSourceHint || "",
      gameStateSource: gameStateSnapshot?.source || "",
      gameStateTopic: gameStateSnapshot?.topic || "",
      gameStatePayloadKind: gameStateSnapshot?.payloadKind || "",
      gameStateUpdatedAt,
      gameStateAgeMs,
      overlayOrder:
        overlayInfo?.overlayOrder || summarizeBoardOverlayStack(board?.group),
      protectedAnchorId: overlayInfo?.protectedAnchorId || "",
      currentLastChildId: overlayInfo?.currentLastChildId || "",
      targets: targetSummary,
      playerSlots,
    };
    const signature = [
      payload.boardPlayerIndex,
      payload.snapshotBoardIndex,
      payload.decisionSource,
      payload.stateMappedIndex,
      payload.stateIndex,
      payload.resolutionSource,
      payload.sourceConfidence,
      payload.stabilityHold ? "hold" : "direct",
      payload.stabilityReason,
      payload.playerMappingSource,
      JSON.stringify(targetSummary),
      JSON.stringify(playerSlots),
      (payload.overlayOrder || []).join(","),
    ].join("|");
    debugInfoOnChange("board-render-state", payload, signature);
    const compactAge = Number.isFinite(payload.gameStateAgeMs)
      ? Math.floor(payload.gameStateAgeMs / 1000)
      : "na";
    const compactLine = [
      `board=${payload.boardPlayerIndex}`,
      `snapshot=${payload.snapshotBoardIndex}`,
      `decision=${payload.decisionSource}`,
      `stateMap=${payload.stateMappedIndex}`,
      `src=${payload.resolutionSource || "none"}`,
      `conf=${payload.sourceConfidence || "low"}`,
      `hold=${payload.stabilityHold ? "1" : "0"}`,
      `reason=${payload.stabilityReason || "-"}`,
      `root=${payload.playerDisplayRootId || "-"}/${payload.playerDisplayRootCount || 0}`,
      `gs=${payload.gameStateSource || "none"}`,
      `topic=${payload.gameStateTopic || "-"}`,
      `kind=${payload.gameStatePayloadKind || "-"}`,
      `age_s=${compactAge}`,
    ].join(" ");
    debugInfoOnChange("board-render-state-compact", compactLine, compactLine);
    const targetCompactLine = buildTargetSummaryCompactLine(targetSummary);
    debugInfoOnChange(
      "board-targets-compact",
      targetCompactLine,
      `${payload.boardPlayerIndex}|${targetCompactLine}`
    );
    logTargetSummaryByLabel(targetSummary, boardPlayerIndex);
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

  function resolveUnstableSnapshotDefer(stateContext) {
    const snapshot = stateContext?.snapshot || null;
    const resolution = getActivePlayerResolution(snapshot);
    const sourceConfidence = String(resolution?.sourceConfidence || "").toLowerCase();
    const resolutionSource = String(resolution?.source || "").toLowerCase();
    const playerCount = Number.isFinite(snapshot?.playerCount)
      ? snapshot.playerCount
      : 0;
    const visiblePlayerCount = Number.isFinite(snapshot?.visiblePlayerCount)
      ? snapshot.visiblePlayerCount
      : 0;
    const detectedPlayerCount = Number.isFinite(snapshot?.detectedPlayerCount)
      ? snapshot.detectedPlayerCount
      : 0;
    const playerMappingSource = String(snapshot?.playerMappingSource || "");
    const gameStateSnapshot =
      gameStateShared && typeof gameStateShared.getState === "function"
        ? gameStateShared.getState()
        : null;
    const gameStateSource = String(gameStateSnapshot?.source || "");
    const lowConfidence = sourceConfidence === "low";
    const unstableResolutionSource =
      resolutionSource.includes("dom-fallback") ||
      resolutionSource.includes("default-zero");
    const undercountLikely = playerCount <= 1 && (visiblePlayerCount <= 1 || detectedPlayerCount <= 1);
    const missingRealtimeState = !gameStateSource;
    const suspiciousSnapshot =
      lowConfidence &&
      unstableResolutionSource &&
      undercountLikely &&
      missingRealtimeState;

    if (!suspiciousSnapshot) {
      unstableSnapshotStartedAt = 0;
      return { defer: false, reason: "" };
    }

    const now = Date.now();
    if (!unstableSnapshotStartedAt) {
      unstableSnapshotStartedAt = now;
    }
    const holdMs = now - unstableSnapshotStartedAt;
    const maxHoldMs = 1500;
    const defer = holdMs < maxHoldMs;
    return {
      defer,
      reason: "unstable-low-confidence-single-player-snapshot",
      holdMs,
      maxHoldMs,
      payload: {
        playerCount,
        visiblePlayerCount,
        detectedPlayerCount,
        playerMappingSource,
        resolutionSource,
        sourceConfidence,
        gameStateSource: gameStateSource || "none",
        boardPlayerIndex: Number.isFinite(stateContext?.boardPlayerIndex)
          ? stateContext.boardPlayerIndex
          : null,
      },
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
    unstableSnapshotStartedAt = 0;
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

    const unstableSnapshot = resolveUnstableSnapshotDefer(stateContext);
    if (unstableSnapshot.defer) {
      const payload = {
        ...unstableSnapshot.payload,
        holdMs: unstableSnapshot.holdMs,
        maxHoldMs: unstableSnapshot.maxHoldMs,
      };
      const signature = [
        unstableSnapshot.reason || "",
        payload.playerCount,
        payload.visiblePlayerCount,
        payload.detectedPlayerCount,
        payload.playerMappingSource || "",
        payload.resolutionSource || "",
        payload.sourceConfidence || "",
        payload.gameStateSource || "",
      ].join("|");
      debugInfoOnChange("updateTargets: deferred-unstable-snapshot", payload, signature);
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
    const overlayNeedsStructuralRefresh =
      !existingOverlay ||
      !existingOverlay.isConnected ||
      !isOverlayOwnedByInstance(existingOverlay, instanceClaim.token) ||
      existingOverlay.childElementCount === 0;
    const overlayZOrderInfo =
      existingOverlay && isOverlayOwnedByInstance(existingOverlay, instanceClaim.token)
        ? getOverlayZOrderInfo(board.group, existingOverlay)
        : null;
    const overlayNeedsRefresh =
      overlayNeedsStructuralRefresh || Boolean(overlayZOrderInfo?.needsMove);

    if (
      stateKey === lastStateKey &&
      boardKey === lastBoardKey &&
      !overlayNeedsStructuralRefresh &&
      overlayZOrderInfo?.needsMove &&
      existingOverlay
    ) {
      const restoredOrder = ensureOverlayZOrder(board.group, existingOverlay);
      debugLog("overlay-z-order-restored", {
        _signature: [
          board.group?.id || "board",
          restoredOrder.protectedAnchorId || "end",
          (restoredOrder.overlayOrder || []).join(","),
        ].join("|"),
        boardGroupId: board.group?.id || "board",
        overlayId: OVERLAY_ID,
        protectedAnchorId: restoredOrder.protectedAnchorId || "",
        overlayOrder: restoredOrder.overlayOrder || [],
        currentLastChildId: restoredOrder.currentLastChildId || "",
      });
      logBoardRenderState(stateContext, board, restoredOrder);
      return;
    }

    if (
      stateKey === lastStateKey &&
      boardKey === lastBoardKey &&
      !overlayNeedsRefresh
    ) {
      return;
    }

    lastStateKey = stateKey;
    lastBoardKey = boardKey;
    debugInfoOnChange("updateTargets: render", {
      boardKey,
      stateKey,
      boardPlayerIndex: stateContext.boardPlayerIndex,
      boardDecision: stateContext.boardDecision,
      snapshotBoardPlayerIndex: stateContext.snapshot?.boardPlayerIndex,
      resolution: getActivePlayerResolution(stateContext.snapshot),
      playerMappingSource: stateContext.snapshot?.playerMappingSource || "",
      overlayNeedsRefresh,
      overlayOrder:
        overlayZOrderInfo?.overlayOrder || summarizeBoardOverlayStack(board.group),
    });
    const renderTargetSummary = buildBoardTargetSummary(
      stateContext.stateMap,
      stateContext.boardPlayerIndex,
      stateContext.snapshot
    );
    const renderCompactLine = [
      `board=${stateContext.boardPlayerIndex}`,
      `snapshot=${Number.isFinite(stateContext.snapshot?.boardPlayerIndex)
        ? stateContext.snapshot.boardPlayerIndex
        : "na"}`,
      `decision=${stateContext.boardDecision?.decisionSource || "snapshot"}`,
      `resolution=${getActivePlayerResolution(stateContext.snapshot)?.source || "none"}`,
      `mapping=${stateContext.snapshot?.playerMappingSource || "-"}`,
      `targets=${buildTargetSummaryCompactLine(renderTargetSummary) || "-"}`,
    ].join(" ");
    debugInfoOnChange("updateTargets: render compact", renderCompactLine, renderCompactLine);
    renderTargets(stateContext);
  }

  function exposeDebugHelpers() {
    if (!DEBUG_ENABLED) {
      return;
    }
    window.__adExtCricketTargetGetDebugHistory = function (limit = 200) {
      const history = Array.isArray(window[DEBUG_HISTORY_KEY])
        ? window[DEBUG_HISTORY_KEY]
        : loadPersistedDebugHistory();
      const resolvedLimit = Number.isFinite(Number(limit))
        ? Math.max(0, Math.round(Number(limit)))
        : 200;
      if (!(resolvedLimit > 0)) {
        return [];
      }
      return history.slice(Math.max(0, history.length - resolvedLimit));
    };
    window.__adExtCricketTargetClearDebugHistory = function () {
      window[DEBUG_HISTORY_KEY] = [];
      persistDebugHistory([]);
      debugTargetLineSignatures.clear();
      debugInfoSignatures.clear();
      debugWarnSignatures.clear();
      return true;
    };
    window.__adExtCricketTargetDumpState = function () {
      const stateContext = readStateContext();
      const board = findBoard();
      const payload = {
        hasStateContext: Boolean(stateContext),
        hasBoard: Boolean(board),
        boardRadius: Number.isFinite(board?.radius) ? board.radius : null,
        boardPlayerIndex: Number.isFinite(stateContext?.boardPlayerIndex)
          ? stateContext.boardPlayerIndex
          : null,
        snapshotBoardPlayerIndex: Number.isFinite(stateContext?.snapshot?.boardPlayerIndex)
          ? stateContext.snapshot.boardPlayerIndex
          : null,
        activePlayerIndex: Number.isFinite(stateContext?.snapshot?.activePlayerIndex)
          ? stateContext.snapshot.activePlayerIndex
          : null,
        boardDecision: stateContext?.boardDecision || null,
        activePlayerResolution: getActivePlayerResolution(stateContext?.snapshot),
        playerSlots: Array.isArray(stateContext?.snapshot?.playerSlots)
          ? stateContext.snapshot.playerSlots
          : [],
        targetSummary:
          stateContext?.stateMap && Number.isFinite(stateContext?.boardPlayerIndex)
            ? buildBoardTargetSummary(
                stateContext.stateMap,
                stateContext.boardPlayerIndex,
                stateContext.snapshot
              )
            : {},
      };
      console.log(`${DEBUG_PREFIX} debug-dump`, payload);
      pushDebugHistory("debug-dump", payload, "info");
      return payload;
    };
  }

  const scheduleUpdate = createRafScheduler(() => {
    if (instanceReleased) {
      return;
    }
    updateTargets();
  });

  ensureStyle(STYLE_ID, STYLE_TEXT);
  exposeDebugHelpers();
  debugInfoOnChange("init", {
    debug: DEBUG_ENABLED,
    showDeadTargets: RESOLVED_SHOW_DEAD_TARGETS,
    theme: RESOLVED_THEME_KEY,
    intensity: RESOLVED_INTENSITY_KEY,
    scriptVersion: SCRIPT_VERSION,
    featureKey: FEATURE_KEY,
    sharedBuildSignature: cricketStateShared?.__buildSignature || "",
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
