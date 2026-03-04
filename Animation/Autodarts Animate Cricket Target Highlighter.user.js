// ==UserScript==
// @name         Autodarts Animate Cricket Target Highlighter
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.8
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
  const LEGACY_OVERLAY_ID = "ad-ext-cricket-targets";
  const OVERLAY_ID = "ad-ext-cricket-targets-v2";
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

  function getBoardPresentation(stateInfo) {
    return String(
      stateInfo?.boardPresentation || stateInfo?.presentation || "open"
    );
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

  function resolveLiveBoardResolution(snapshot) {
    const fallbackResolution = getActivePlayerResolution(snapshot);
    const fallbackIndex = getFallbackBoardPlayerIndex(snapshot);
    const playerSlots = Array.isArray(snapshot?.playerSlots)
      ? snapshot.playerSlots
      : [];
    if (
      !playerSlots.length ||
      !cricketStateShared ||
      typeof cricketStateShared.resolveActivePlayerResolution !== "function"
    ) {
      return fallbackResolution || { columnIndex: fallbackIndex, source: "snapshot-board" };
    }

    const playerDisplayRoot = document.getElementById("ad-ext-player-display");
    if (!playerDisplayRoot) {
      return fallbackResolution || { columnIndex: fallbackIndex, source: "snapshot-board" };
    }

    const visiblePlayers = sortPlayerNodesByVisualOrder(
      Array.from(playerDisplayRoot.querySelectorAll(CONFIG.playerSelector)).filter(
        isLayoutVisible
      )
    );
    if (!visiblePlayers.length) {
      return fallbackResolution || { columnIndex: fallbackIndex, source: "snapshot-board" };
    }

    const activeEntries = visiblePlayers.reduce((entries, player, displayIndex) => {
      const isActive =
        player.matches(CONFIG.activePlayerSelector) ||
        (typeof player.querySelector === "function" &&
          player.querySelector(CONFIG.activePlayerSelector));
      if (!isActive) {
        return entries;
      }
      const identity = readPlayerNodeIdentity(player);
      entries.push({
        index: displayIndex,
        playerId: identity.playerId || "",
        nameKey: identity.nameKey || "",
      });
      return entries;
    }, []);

    if (!activeEntries.length) {
      return fallbackResolution || { columnIndex: fallbackIndex, source: "snapshot-board" };
    }

    const stateIndex =
      gameStateShared && typeof gameStateShared.getActivePlayerIndex === "function"
        ? gameStateShared.getActivePlayerIndex()
        : Number.isFinite(fallbackResolution?.matchIndex)
          ? fallbackResolution.matchIndex
          : null;
    const activeInfo =
      activeEntries.length === 1
        ? {
            index: activeEntries[0].index,
            displayIndex: activeEntries[0].index,
            source: "visible-dom",
            playerId: activeEntries[0].playerId || "",
            nameKey: activeEntries[0].nameKey || "",
            activeCandidates: activeEntries,
            stateIndex,
          }
        : {
            index: Number.isFinite(stateIndex) ? stateIndex : activeEntries[0].index,
            displayIndex: null,
            source: "visible-dom-ambiguous",
            playerId: "",
            nameKey: "",
            activeCandidates: activeEntries,
            stateIndex,
          };
    const resolved = cricketStateShared.resolveActivePlayerResolution(
      activeInfo,
      playerSlots,
      Number.isFinite(snapshot?.playerCount) ? snapshot.playerCount : playerSlots.length
    );
    return resolved && Number.isFinite(resolved.columnIndex)
      ? resolved
      : fallbackResolution || { columnIndex: fallbackIndex, source: "snapshot-board" };
  }

  function resolveRenderBoardPlayerIndex(snapshot) {
    const resolution = resolveLiveBoardResolution(snapshot);
    return Number.isFinite(resolution?.columnIndex)
      ? resolution.columnIndex
      : getFallbackBoardPlayerIndex(snapshot);
  }

  function getRenderBoardPresentation(stateInfo, boardPlayerIndex) {
    const cellStates = Array.isArray(stateInfo?.cellStates) ? stateInfo.cellStates : [];
    if (
      Number.isFinite(boardPlayerIndex) &&
      boardPlayerIndex >= 0 &&
      boardPlayerIndex < cellStates.length
    ) {
      return String(cellStates[boardPlayerIndex]?.presentation || "open");
    }
    return getBoardPresentation(stateInfo);
  }

  function rgba(alpha, color = CONFIG.baseColor) {
    const { r, g, b } = color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const STYLE_TEXT = `
#${LEGACY_OVERLAY_ID} {
  display: none !important;
  pointer-events: none !important;
}

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

  function renderTargets(stateContext) {
    const snapshot = stateContext?.snapshot || null;
    const stateMap = stateContext?.stateMap || new Map();
    const boardPlayerIndex = Number.isFinite(stateContext?.boardPlayerIndex)
      ? stateContext.boardPlayerIndex
      : resolveRenderBoardPlayerIndex(snapshot);
    const board = findBoard();
    if (!board) {
      return;
    }

    const activeTargets = snapshot?.targetSet || new Set();

    const overlay = ensureOverlayGroup(board.group, OVERLAY_ID);
    const legacyOverlay =
      board.group && typeof board.group.querySelector === "function"
        ? board.group.querySelector(`#${LEGACY_OVERLAY_ID}`)
        : null;
    if (legacyOverlay) {
      clearOverlay(legacyOverlay);
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
        const boardPresentation = getRenderBoardPresentation(
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
        overlay.appendChild(shape);
      });
    });
  }

  function buildStateKey(stateContext) {
    const snapshot = stateContext?.snapshot || null;
    const stateMap = stateContext?.stateMap || new Map();
    const targetOrder = snapshot?.targetOrder || [];
    const gameMode = snapshot?.gameModeInfo?.normalized || "";
    const modeFamily = snapshot?.modeInfo?.family || "";
    const playerMappingSource = snapshot?.playerMappingSource || "";
    const activeResolution = getActivePlayerResolution(snapshot);
    const liveBoardResolution = resolveLiveBoardResolution(snapshot);
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
    const activePlayerIndex = Number.isFinite(liveBoardResolution?.columnIndex)
      ? liveBoardResolution.columnIndex
      : getFallbackBoardPlayerIndex(snapshot);
    const playerCount = Number.isFinite(snapshot?.playerCount)
      ? snapshot.playerCount
      : "";
    const targets = targetOrder
      .map((label) => {
        const state = stateMap.get(label);
        const marks = Array.isArray(state?.marksByPlayer)
          ? state.marksByPlayer.join(",")
          : "";
        const boardPresentation = getRenderBoardPresentation(
          state,
          activePlayerIndex
        );
        return `${label}:${boardPresentation}:${marks}`;
      })
      .join("|");
    return [
      gameMode,
      modeFamily,
      playerMappingSource,
      activeResolution?.source || "",
      Number.isFinite(activeResolution?.displayIndex)
        ? activeResolution.displayIndex
        : "",
      Number.isFinite(activeResolution?.matchIndex)
        ? activeResolution.matchIndex
        : "",
      liveBoardResolution?.source || "",
      playerSlots,
      activePlayerIndex,
      playerCount,
      targets,
    ].join("|");
  }

  function warnIfBoardResolutionLooksWrong(snapshot) {
    if (!DEBUG_ENABLED) {
      return;
    }
    const resolution = getActivePlayerResolution(snapshot);
    const liveResolution = resolveLiveBoardResolution(snapshot);
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
        boardPlayerIndex: resolution.columnIndex,
        matchIndex: resolution.matchIndex,
        resolutionSource: resolution.source,
        visibleActiveCandidates: resolution.visibleActiveCandidates || 0,
        playerMappingSource: snapshot?.playerMappingSource || "",
      });
    }
    if (
      liveResolution &&
      Number.isFinite(liveResolution.columnIndex) &&
      Number.isFinite(snapshot?.boardPlayerIndex) &&
      liveResolution.columnIndex !== snapshot.boardPlayerIndex
    ) {
      debugLog("board-player-resolution-live-override", {
        _signature: [
          snapshot?.playerMappingSource || "",
          snapshot.boardPlayerIndex,
          liveResolution.columnIndex,
          liveResolution.source || "",
        ].join("|"),
        snapshotBoardPlayerIndex: snapshot.boardPlayerIndex,
        liveBoardPlayerIndex: liveResolution.columnIndex,
        liveResolutionSource: liveResolution.source || "",
        snapshotResolutionSource: resolution.source || "",
        playerMappingSource: snapshot?.playerMappingSource || "",
      });
    }
    if (!resolution.usedVisibleDom) {
      return;
    }
    if (
      !Number.isFinite(resolution.displayIndex) ||
      !Number.isFinite(resolution.columnIndex)
    ) {
      return;
    }
    if (resolution.displayIndex === resolution.columnIndex) {
      return;
    }
    debugLog("board-player-resolution-mismatch", {
      _signature: [
        snapshot?.playerMappingSource || "",
        resolution.source || "",
        resolution.displayIndex,
        resolution.columnIndex,
        resolution.matchIndex,
        resolution.visibleActiveCandidates || 0,
      ].join("|"),
      boardPlayerIndex: resolution.columnIndex,
      displayIndex: resolution.displayIndex,
      matchIndex: resolution.matchIndex,
      resolutionSource: resolution.source,
      visibleActiveCandidates: resolution.visibleActiveCandidates || 0,
      playerMappingSource: snapshot?.playerMappingSource || "",
    });
  }

  function readStateContext() {
    if (!cricketStateShared) {
      debugError("Shared cricket state helper missing");
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
    const boardPlayerIndex = resolveRenderBoardPlayerIndex(snapshot);
    return {
      snapshot,
      stateMap,
      boardPlayerIndex,
    };
  }

  function clearOverlayState() {
    const board = findBoard();
    if (board) {
      clearOverlay(ensureOverlayGroup(board.group, OVERLAY_ID));
      const legacyOverlay =
        board.group && typeof board.group.querySelector === "function"
          ? board.group.querySelector(`#${LEGACY_OVERLAY_ID}`)
          : null;
      if (legacyOverlay) {
        clearOverlay(legacyOverlay);
      }
    }
    lastStateKey = null;
    lastBoardKey = null;
  }

  function updateTargets() {
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

    const boardKey = `${board.radius}:${board.group.id || "board"}`;
    const stateKey = buildStateKey(stateContext);
    const existingOverlay =
      board.group && typeof board.group.querySelector === "function"
        ? board.group.querySelector(`#${OVERLAY_ID}`)
        : null;
    const overlayNeedsRefresh =
      !existingOverlay ||
      !existingOverlay.isConnected ||
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
      snapshotBoardPlayerIndex: stateContext.snapshot?.boardPlayerIndex,
      resolution: getActivePlayerResolution(stateContext.snapshot),
      liveResolution: resolveLiveBoardResolution(stateContext.snapshot),
      playerMappingSource: stateContext.snapshot?.playerMappingSource || "",
    });
    renderTargets(stateContext);
  }

  const scheduleUpdate = createRafScheduler(updateTargets);

  ensureStyle(STYLE_ID, STYLE_TEXT);
  debugTrace("init", {
    debug: DEBUG_ENABLED,
    showDeadTargets: RESOLVED_SHOW_DEAD_TARGETS,
    theme: RESOLVED_THEME_KEY,
    intensity: RESOLVED_INTENSITY_KEY,
  });

  updateTargets();

  observeMutations({
    onChange: scheduleUpdate,
  });
  if (gameStateShared && typeof gameStateShared.subscribe === "function") {
    gameStateShared.subscribe(scheduleUpdate);
  }
  setInterval(updateTargets, 300);
})();
