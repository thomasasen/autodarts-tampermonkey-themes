// ==UserScript==
// @name         Autodarts Animate Cricket Grid FX
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.1.8
// @description  Erweitert die Cricket-/Tactics-Zielmatrix um klare Live-Effekte für Treffer, Gefahr und Zugwechsel.
// @xconfig-description  Macht wichtige Cricket-/Tactics-Zustände in der Zielmatrix schneller sichtbar und hält das Bild dabei gut lesbar.
// @xconfig-title  Cricket-Grid-Effekte
// @xconfig-variant      cricket / tactics
// @xconfig-readme-anchor  animation-autodarts-animate-cricket-grid-fx
// @xconfig-tech-anchor  animation-autodarts-animate-cricket-grid-fx
// @xconfig-background     assets/Autodarts-Animate-Cricket-Grid-FX.png
// @xconfig-settings-version 7
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-cricket-state-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Grid%20FX.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Grid%20FX.user.js
// ==/UserScript==

(function () {
  "use strict";

  const shared = window.autodartsAnimationShared || {};
  const cricketState = window.autodartsCricketStateShared || null;
  const gameState = window.autodartsGameStateShared || null;
  const SCRIPT_VERSION = "1.1.8";
  const FEATURE_KEY = "ad-ext/a-cricket-grid-fx";
  const SOURCE_PATH = "Animation/Autodarts Animate Cricket Grid FX.user.js";
  const EXPECTED_SHARED_MODULE_ID = "autodarts-cricket-state-shared";
  const EXPECTED_SHARED_API_VERSION = 2;
  const EXPECTED_SHARED_BUILD_SIGNATURE =
    `${EXPECTED_SHARED_MODULE_ID}@${EXPECTED_SHARED_API_VERSION}:2026-03-label-cell-shortfall-fix`;

  const CRICKET_THEME_STYLE_ID = "autodarts-cricket-custom-style";
  const VARIANT_ID = "ad-ext-game-variant";

  const STYLE_ID = "ad-ext-crfx-style";
  const ROOT_CLASS = "ad-ext-crfx-root";
  const CELL_CLASS = "ad-ext-crfx-cell";
  const THREAT_CLASS = "ad-ext-crfx-threat";
  const SCORE_CLASS = "ad-ext-crfx-score";
  const DEAD_CLASS = "ad-ext-crfx-dead";
  const PRESSURE_CLASS = "ad-ext-crfx-pressure";
  const BADGE_CLASS = "ad-ext-crfx-badge";
  const LABEL_CELL_CLASS = "ad-ext-crfx-label-cell";
  const BADGE_BEACON_CLASS = "ad-ext-crfx-badge-beacon";
  const BADGE_BURST_CLASS = "ad-ext-crfx-badge-burst";
  const BADGE_STATE_NEUTRAL_CLASS = "ad-ext-crfx-badge-state-neutral";
  const BADGE_STATE_OFFENSE_CLASS = "ad-ext-crfx-badge-state-offense";
  const BADGE_STATE_DANGER_CLASS = "ad-ext-crfx-badge-state-danger";
  const BADGE_STATE_DEAD_CLASS = "ad-ext-crfx-badge-state-dead";
  const LABEL_STATE_NEUTRAL_CLASS = "ad-ext-crfx-label-state-neutral";
  const LABEL_STATE_OFFENSE_CLASS = "ad-ext-crfx-label-state-offense";
  const LABEL_STATE_DANGER_CLASS = "ad-ext-crfx-label-state-danger";
  const LABEL_STATE_DEAD_CLASS = "ad-ext-crfx-label-state-dead";
  const MARK_PROGRESS_CLASS = "ad-ext-crfx-mark-progress";
  const MARK_L1_CLASS = "ad-ext-crfx-mark-l1";
  const MARK_L2_CLASS = "ad-ext-crfx-mark-l2";
  const MARK_L3_CLASS = "ad-ext-crfx-mark-l3";
  const ROW_WAVE_CLASS = "ad-ext-crfx-row-wave";
  const DELTA_CLASS = "ad-ext-crfx-delta";
  const SPARK_CLASS = "ad-ext-crfx-spark";
  const WIPE_CLASS = "ad-ext-crfx-wipe";

  // xConfig: {"type":"toggle","label":"Zeilen-Sweep","description":"Zeigt bei Änderungen einen kurzen Lichtlauf über die betroffene Zeile.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_ROW_RAIL_PULSE = true;
  // xConfig: {"type":"toggle","label":"Ziel-Badge-Hinweis","description":"Hebt das linke Ziel-Badge bei wichtigen Situationen deutlicher hervor.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_BADGE_BEACON = true;
  // xConfig: {"type":"toggle","label":"Mark-Fortschritt","description":"Animiert Mark-Symbole bei Trefferzuwachs.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_MARK_PROGRESS_ANIMATOR = true;
  // xConfig: {"type":"toggle","label":"Gefahrenkante","description":"Markiert gefährliche Zeilen mit klaren Warnkanten.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_THREAT_EDGE = true;
  // xConfig: {"type":"toggle","label":"Offensiv-Lane","description":"Hebt Zeilen hervor, auf denen du aktuell offensiv Druck machen kannst.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_SCORING_LANE_HIGHLIGHT = true;
  // xConfig: {"type":"toggle","label":"Geschlossene Zeilen abdunkeln","description":"Dimmt bereits vollständig geschlossene Zeilen.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_DEAD_ROW_COLLAPSE = true;
  // xConfig: {"type":"toggle","label":"Delta-Chips","description":"Zeigt bei neuem Treffer kurz +1, +2 oder +3 in der Zelle.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_DELTA_CHIPS = true;
  // xConfig: {"type":"toggle","label":"Treffer-Impuls","description":"Ergänzt einen kurzen Treffer-Impuls direkt am Ereignisort.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_HIT_SPARK = true;
  // xConfig: {"type":"toggle","label":"Zugwechsel-Übergang","description":"Zeigt bei Spielerwechsel einen kurzen Übergang über das Grid.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_ROUND_TRANSITION_WIPE = true;
  // xConfig: {"type":"toggle","label":"Gegnerdruck-Overlay","description":"Markiert Zeilen mit akutem Defensivdruck.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_OPPONENT_PRESSURE_OVERLAY = true;
  // xConfig: {"type":"select","label":"Farbthema","description":"Farbschema fuer Offense-/Danger-Effekte. Soll dem Target Highlighter entsprechen.","options":[{"value":"standard","label":"Standard"},{"value":"high-contrast","label":"High Contrast"}]}
  const xConfig_FARBTHEMA = "standard";
  // xConfig: {"type":"select","label":"Intensitaet","description":"Deckkraft und Kontrast der Effekte. Soll dem Target Highlighter entsprechen.","options":[{"value":"subtle","label":"Dezent"},{"value":"normal","label":"Standard"},{"value":"strong","label":"Stark"}]}
  const xConfig_INTENSITAET = "normal";
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

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
      highlightOpacity: 0.32,
      strokeBoost: 0.14,
    },
    normal: {
      highlightOpacity: 0.45,
      strokeBoost: 0.2,
    },
    strong: {
      highlightOpacity: 0.62,
      strokeBoost: 0.3,
    },
  };

  function resolveDebugToggle(value) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
  }

  function asBool(value, fallbackValue) {
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

  const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
  const DEBUG_PREFIX = "[xConfig][Cricket Grid FX]";
  const DEBUG_TRACE_ENABLED = false;
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

  const CFG = {
    rowRailPulse: asBool(xConfig_ROW_RAIL_PULSE, true),
    badgeBeacon: asBool(xConfig_BADGE_BEACON, true),
    markProgress: asBool(xConfig_MARK_PROGRESS_ANIMATOR, true),
    threatEdge: asBool(xConfig_THREAT_EDGE, true),
    scoringLane: asBool(xConfig_SCORING_LANE_HIGHLIGHT, true),
    deadRowCollapse: asBool(xConfig_DEAD_ROW_COLLAPSE, true),
    deltaChips: asBool(xConfig_DELTA_CHIPS, true),
    hitSpark: asBool(xConfig_HIT_SPARK, true),
    roundWipe: asBool(xConfig_ROUND_TRANSITION_WIPE, true),
    pressureOverlay: asBool(xConfig_OPPONENT_PRESSURE_OVERLAY, true),
    theme: RESOLVED_THEME,
    intensity: RESOLVED_INTENSITY,
    themeKey: RESOLVED_THEME_KEY,
    intensityKey: RESOLVED_INTENSITY_KEY,
  };

  const state = {
    root: null,
    marksByLabel: new Map(),
    rowStateByLabel: new Map(),
    turnToken: "",
  };
  let mutationObserver = null;
  let unsubscribeGameState = null;
  let refreshTimer = null;
  let resizeHandler = null;
  let visibilityHandler = null;
  let instanceReleased = false;
  let loggedVariantSkip = false;
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
      cricketState &&
        cricketState.__moduleId === EXPECTED_SHARED_MODULE_ID &&
        cricketState.__apiVersion === EXPECTED_SHARED_API_VERSION &&
        cricketState.__buildSignature === EXPECTED_SHARED_BUILD_SIGNATURE &&
        typeof cricketState.buildGridSnapshot === "function" &&
        typeof cricketState.computeTargetStates === "function"
    );
  }

  function logSharedHelperMismatch() {
    debugLog("shared-helper-version-mismatch", {
      _signature: [
        cricketState?.__moduleId || "missing",
        cricketState?.__apiVersion || "missing",
        cricketState?.__buildSignature || "missing",
      ].join("|"),
      expectedModuleId: EXPECTED_SHARED_MODULE_ID,
      expectedApiVersion: EXPECTED_SHARED_API_VERSION,
      expectedBuildSignature: EXPECTED_SHARED_BUILD_SIGNATURE,
      actualModuleId: cricketState?.__moduleId || "",
      actualApiVersion: cricketState?.__apiVersion || "",
      actualBuildSignature: cricketState?.__buildSignature || "",
    });
  }

  const ensureStyle =
    shared.ensureStyle ||
    function fallbackEnsureStyle(id, css) {
      if (!id) {
        return false;
      }
      let styleNode = document.getElementById(id);
      if (!styleNode) {
        styleNode = document.createElement("style");
        styleNode.id = id;
        (document.head || document.documentElement).appendChild(styleNode);
      }
      if (styleNode.textContent !== css) {
        styleNode.textContent = css;
      }
      return true;
    };

  const makeScheduler =
    shared.createRafScheduler ||
    function fallbackScheduler(callback) {
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
    };

  const observe =
    shared.observeMutations ||
    function fallbackObserve(options) {
      if (!options || typeof options.onChange !== "function") {
        return null;
      }
      const observer = new MutationObserver(() => options.onChange());
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      return observer;
    };

  function toArray(value) {
    return Array.isArray(value) ? value : Array.from(value || []);
  }

  function clampMark(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(3, Math.round(numeric)));
  }

  function clampAlpha(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return Math.max(0, Math.min(1, Number(fallback) || 0));
    }
    return Math.max(0, Math.min(1, numeric));
  }

  function rgbaColor(color, alpha) {
    const r = Number.isFinite(color?.r) ? Math.round(color.r) : 0;
    const g = Number.isFinite(color?.g) ? Math.round(color.g) : 0;
    const b = Number.isFinite(color?.b) ? Math.round(color.b) : 0;
    return `rgba(${r},${g},${b},${clampAlpha(alpha)})`;
  }

  function isCricketVariantActive() {
    if (
      gameState &&
      typeof gameState.isCricketVariant === "function" &&
      gameState.isCricketVariant({ allowMissing: false, allowEmpty: false })
    ) {
      return true;
    }
    const variant = String(
      document.getElementById(VARIANT_ID)?.textContent || ""
    )
      .trim()
      .toLowerCase();
    return (
      variant === "cricket" ||
      variant.startsWith("cricket ") ||
      variant === "tactics" ||
      variant.startsWith("tactics ")
    );
  }

  function isContextActive() {
    if (!isCricketVariantActive()) {
      return false;
    }
    return Boolean(document.getElementById(CRICKET_THEME_STYLE_ID));
  }

  function getTurnToken(activePlayerIndex) {
    const turn = gameState && typeof gameState.getActiveTurn === "function"
      ? gameState.getActiveTurn()
      : null;
    if (turn && typeof turn === "object") {
      const round = Number.isFinite(turn.round) ? turn.round : "";
      const part = Number.isFinite(turn.turn) ? turn.turn : "";
      return `${turn.id || ""}|${turn.playerId || ""}|${round}|${part}|${turn.createdAt || ""}`;
    }
    const throws =
      gameState && typeof gameState.getActiveThrows === "function"
        ? gameState.getActiveThrows()
        : [];
    return `fallback:${activePlayerIndex}:${Array.isArray(throws) ? throws.length : 0}`;
  }

  function createRowState(targetState) {
    const marksByPlayer = targetState ? targetState.marksByPlayer || [] : [];
    const cellStates = targetState ? targetState.cellStates || [] : [];
    const activePlayerIndex =
      targetState && Number.isFinite(targetState.activePlayerIndex)
        ? targetState.activePlayerIndex
        : -1;
    const presentation = targetState ? targetState.presentation : "open";
    return {
      offense: Boolean(targetState && targetState.offense),
      danger: Boolean(targetState && targetState.danger),
      dead: Boolean(targetState && targetState.dead),
      pressure: Boolean(targetState && targetState.pressure),
      activePlayerIndex,
      presentation,
      key: [
        activePlayerIndex,
        presentation,
        marksByPlayer.join(","),
        cellStates.map((state) => state.presentation || "").join(","),
      ].join("|"),
    };
  }

  function readCellPresentation(targetState, index) {
    const cellStates = Array.isArray(targetState?.cellStates)
      ? targetState.cellStates
      : [];
    if (index < 0 || index >= cellStates.length) {
      return "neutral";
    }
    return String(cellStates[index]?.presentation || "neutral");
  }

  function syncClassState(node, className, enabled) {
    if (!node || !className) {
      return;
    }
    node.classList.toggle(className, Boolean(enabled));
  }

  function resolveBadgeStateToken(presentation) {
    const normalized = String(presentation || "").trim().toLowerCase();
    if (normalized === "offense") {
      return "offense";
    }
    if (normalized === "danger" || normalized === "pressure") {
      return "danger";
    }
    if (normalized === "dead") {
      return "dead";
    }
    return "neutral";
  }

  function syncStateTokenClass(node, classMap, stateToken) {
    if (!node || !classMap || typeof classMap !== "object") {
      return;
    }
    Object.values(classMap).forEach((className) => {
      if (className) {
        node.classList.remove(className);
      }
    });
    const resolvedClassName = classMap[stateToken] || classMap.neutral || "";
    if (resolvedClassName) {
      node.classList.add(resolvedClassName);
    }
  }

  function isDomElement(node) {
    return Boolean(node && typeof node.querySelector === "function");
  }

  function pulseRow(row) {
    if (!CFG.rowRailPulse) {
      return;
    }
    row.playerCells.forEach((cell) => {
      if (!isDomElement(cell)) {
        return;
      }
      toArray(cell.querySelectorAll(`.${ROW_WAVE_CLASS}`)).forEach((node) =>
        node.remove()
      );
      const wave = document.createElement("span");
      wave.className = ROW_WAVE_CLASS;
      cell.appendChild(wave);
      wave.addEventListener("animationend", () => wave.remove(), { once: true });
    });
  }

  function burstBadge(row) {
    const badgeNode = getDecoratableBadgeNode(row);
    if (!CFG.badgeBeacon || !badgeNode) {
      return;
    }
    badgeNode.classList.remove(BADGE_BURST_CLASS);
    void badgeNode.offsetWidth;
    badgeNode.classList.add(BADGE_BURST_CLASS);
    setTimeout(() => badgeNode?.classList.remove(BADGE_BURST_CLASS), 700);
  }

  function animateMark(cell, markNow) {
    if (!CFG.markProgress || !isDomElement(cell)) {
      return;
    }
    const target = cell.querySelector(
      "img,svg,.chakra-image,[data-marks],[data-mark],[data-hits],[data-hit]"
    );
    if (!target) {
      return;
    }

    target.classList.remove(
      MARK_PROGRESS_CLASS,
      MARK_L1_CLASS,
      MARK_L2_CLASS,
      MARK_L3_CLASS
    );
    void target.offsetWidth;
    target.classList.add(MARK_PROGRESS_CLASS);

    const level = clampMark(markNow);
    target.classList.add(
      level <= 1 ? MARK_L1_CLASS : level === 2 ? MARK_L2_CLASS : MARK_L3_CLASS
    );
    setTimeout(() => {
      target.classList.remove(
        MARK_PROGRESS_CLASS,
        MARK_L1_CLASS,
        MARK_L2_CLASS,
        MARK_L3_CLASS
      );
    }, 520);
  }

  function addDelta(cell, delta) {
    if (
      !CFG.deltaChips ||
      !Number.isFinite(delta) ||
      delta <= 0 ||
      !isDomElement(cell)
    ) {
      return;
    }
    const chip = document.createElement("span");
    chip.className = DELTA_CLASS;
    chip.textContent = `+${delta}`;
    cell.appendChild(chip);
    chip.addEventListener("animationend", () => chip.remove(), { once: true });
  }

  function addSpark(cell) {
    if (!CFG.hitSpark || !isDomElement(cell)) {
      return;
    }
    toArray(cell.querySelectorAll(`.${SPARK_CLASS}`)).forEach((node) =>
      node.remove()
    );
    const spark = document.createElement("span");
    spark.className = SPARK_CLASS;
    cell.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }

  function addWipe(root) {
    if (!CFG.roundWipe || !root) {
      return;
    }
    toArray(root.querySelectorAll(`.${WIPE_CLASS}`)).forEach((node) => node.remove());
    const wipe = document.createElement("span");
    wipe.className = WIPE_CLASS;
    root.appendChild(wipe);
    wipe.addEventListener("animationend", () => wipe.remove(), { once: true });
  }

  function clearRoot(root) {
    if (!root) {
      return;
    }
    root.classList.remove(ROOT_CLASS);
    toArray(root.querySelectorAll(`.${CELL_CLASS}`)).forEach((cell) => {
      cell.classList.remove(
        CELL_CLASS,
        THREAT_CLASS,
        SCORE_CLASS,
        DEAD_CLASS,
        PRESSURE_CLASS
      );
    });
    toArray(root.querySelectorAll(`.${BADGE_CLASS}`)).forEach((node) => {
      node.classList.remove(
        BADGE_CLASS,
        BADGE_BEACON_CLASS,
        BADGE_BURST_CLASS,
        BADGE_STATE_NEUTRAL_CLASS,
        BADGE_STATE_OFFENSE_CLASS,
        BADGE_STATE_DANGER_CLASS,
        BADGE_STATE_DEAD_CLASS
      );
    });
    toArray(root.querySelectorAll(`.${LABEL_CELL_CLASS}`)).forEach((node) => {
      node.classList.remove(
        LABEL_CELL_CLASS,
        LABEL_STATE_NEUTRAL_CLASS,
        LABEL_STATE_OFFENSE_CLASS,
        LABEL_STATE_DANGER_CLASS,
        LABEL_STATE_DEAD_CLASS
      );
    });
    toArray(root.querySelectorAll(`.${MARK_PROGRESS_CLASS}`)).forEach((node) => {
      node.classList.remove(
        MARK_PROGRESS_CLASS,
        MARK_L1_CLASS,
        MARK_L2_CLASS,
        MARK_L3_CLASS
      );
    });
    toArray(
      root.querySelectorAll(
        `.${ROW_WAVE_CLASS},.${DELTA_CLASS},.${SPARK_CLASS},.${WIPE_CLASS}`
      )
    ).forEach((node) => node.remove());
  }

  function reset() {
    state.marksByLabel.clear();
    state.rowStateByLabel.clear();
    state.turnToken = "";
    if (state.root) {
      clearRoot(state.root);
      state.root = null;
    }
  }

  function readSnapshot() {
    if (!isCompatibleCricketStateHelper()) {
      logSharedHelperMismatch();
      return null;
    }

    return cricketState.buildGridSnapshot({
      playerSelector: ".ad-ext-player",
      activePlayerSelector: ".ad-ext-player-active",
      gameStateShared: gameState,
      debugLog: DEBUG_ENABLED ? debugLog : null,
    });
  }

  function getElementRect(element) {
    if (!element || typeof element.getBoundingClientRect !== "function") {
      return null;
    }
    return element.getBoundingClientRect();
  }

  function isDecoratableBadgeNode(badgeNode, labelCell) {
    if (!badgeNode || !labelCell || badgeNode === labelCell) {
      return false;
    }

    const badgeRect = getElementRect(badgeNode);
    const cellRect = getElementRect(labelCell);
    if (!badgeRect || !cellRect) {
      return false;
    }

    if (
      !Number.isFinite(badgeRect.width) ||
      !Number.isFinite(badgeRect.height) ||
      !Number.isFinite(cellRect.width) ||
      !Number.isFinite(cellRect.height)
    ) {
      return false;
    }

    if (
      badgeRect.width <= 0 ||
      badgeRect.height <= 0 ||
      cellRect.width <= 0 ||
      cellRect.height <= 0
    ) {
      return false;
    }

    if (badgeRect.width >= cellRect.width * 0.78) {
      return false;
    }
    if (badgeRect.height >= cellRect.height * 0.9) {
      return false;
    }

    return true;
  }

  function getDecoratableBadgeNode(row) {
    if (!row) {
      return null;
    }
    return isDecoratableBadgeNode(row.badgeNode, row.labelCell)
      ? row.badgeNode
      : null;
  }

  function apply() {
    if (!isContextActive()) {
      if (!loggedVariantSkip) {
        debugTrace("variant-skip", { reason: "not-cricket-family-context" });
        loggedVariantSkip = true;
      }
      reset();
      return;
    }
    loggedVariantSkip = false;

    const snapshot = readSnapshot();
    if (!snapshot || !snapshot.rows.length) {
      reset();
      return;
    }

    if (state.root && state.root !== snapshot.root) {
      clearRoot(state.root);
      state.marksByLabel.clear();
      state.rowStateByLabel.clear();
      state.turnToken = "";
    }

    state.root = snapshot.root;
    syncClassState(snapshot.root, ROOT_CLASS, true);

    const targetStates = cricketState.computeTargetStates(snapshot, {
      showDeadTargets: true,
    });
    if (!targetStates.size) {
      reset();
      return;
    }

    const turnToken = getTurnToken(snapshot.activePlayerIndex);
    if (CFG.roundWipe && state.turnToken && turnToken !== state.turnToken) {
      addWipe(snapshot.root);
      debugTrace("trigger", { type: "turn-change", turnToken });
    }
    state.turnToken = turnToken;

    const seen = new Set();
    let changedRows = 0;

    snapshot.rows.forEach((row) => {
      const targetState = targetStates.get(row.label);
      if (!targetState) {
        return;
      }

      seen.add(row.label);
      const currentRowState = createRowState(targetState);
      const currentMarks = targetState.marksByPlayer.slice();
      const prevMarks =
        state.marksByLabel.get(row.label) ||
        new Array(snapshot.playerCount).fill(0);
      const prevRowState = state.rowStateByLabel.get(row.label) || null;
      const badgeStateToken = resolveBadgeStateToken(targetState.presentation);

      row.playerCells.forEach((cell, index) => {
        const cellPresentation = readCellPresentation(targetState, index);
        syncClassState(cell, CELL_CLASS, true);
        syncClassState(
          cell,
          THREAT_CLASS,
          CFG.threatEdge &&
            (cellPresentation === "danger" || cellPresentation === "pressure")
        );
        syncClassState(
          cell,
          SCORE_CLASS,
          CFG.scoringLane && cellPresentation === "offense"
        );
        syncClassState(
          cell,
          DEAD_CLASS,
          CFG.deadRowCollapse && cellPresentation === "dead"
        );
        syncClassState(
          cell,
          PRESSURE_CLASS,
          CFG.pressureOverlay && cellPresentation === "pressure"
        );
      });

      if (row.labelCell) {
        syncClassState(row.labelCell, LABEL_CELL_CLASS, true);
        syncStateTokenClass(
          row.labelCell,
          {
            neutral: LABEL_STATE_NEUTRAL_CLASS,
            offense: LABEL_STATE_OFFENSE_CLASS,
            danger: LABEL_STATE_DANGER_CLASS,
            dead: LABEL_STATE_DEAD_CLASS,
          },
          badgeStateToken
        );
      }

      const badgeNode = getDecoratableBadgeNode(row);
      if (badgeNode) {
        syncClassState(badgeNode, BADGE_CLASS, true);
        syncStateTokenClass(
          badgeNode,
          {
            neutral: BADGE_STATE_NEUTRAL_CLASS,
            offense: BADGE_STATE_OFFENSE_CLASS,
            danger: BADGE_STATE_DANGER_CLASS,
            dead: BADGE_STATE_DEAD_CLASS,
          },
          badgeStateToken
        );
        syncClassState(
          badgeNode,
          BADGE_BEACON_CLASS,
          CFG.badgeBeacon &&
            (targetState.offense || targetState.danger || targetState.pressure)
        );
      }

      let increased = false;
      row.playerCells.forEach((cell, index) => {
        const delta = clampMark(currentMarks[index]) - clampMark(prevMarks[index] || 0);
        if (!isDomElement(cell)) {
          if (delta > 0) {
            debugLog("missing-player-cell-delta", {
              _signature: `${row.label}|${index}|${delta}|${turnToken}`,
              label: row.label,
              columnIndex: index,
              delta,
              turnToken,
              marksNow: clampMark(currentMarks[index]),
              marksPrev: clampMark(prevMarks[index] || 0),
            });
          }
          return;
        }
        if (delta > 0) {
          increased = true;
          animateMark(cell, currentMarks[index]);
          addDelta(cell, delta);
          addSpark(cell);
        }
      });

      if (increased) {
        changedRows += 1;
        pulseRow(row);
        burstBadge(row);
      } else if (
        CFG.rowRailPulse &&
        prevRowState &&
        prevRowState.key !== currentRowState.key &&
        (targetState.offense || targetState.danger || targetState.pressure)
      ) {
        changedRows += 1;
        pulseRow(row);
      }

      state.marksByLabel.set(row.label, currentMarks);
      state.rowStateByLabel.set(row.label, currentRowState);
    });

    toArray(state.marksByLabel.keys()).forEach((label) => {
      if (!seen.has(label)) {
        state.marksByLabel.delete(label);
      }
    });
    toArray(state.rowStateByLabel.keys()).forEach((label) => {
      if (!seen.has(label)) {
        state.rowStateByLabel.delete(label);
      }
    });

    if (changedRows > 0) {
      debugTrace("trigger", {
        changedRows,
        rowsScanned: snapshot.rows.length,
      });
    }
  }

  const offenseColor = CFG.theme.offense;
  const dangerColor = CFG.theme.danger;
  const effectAlpha = clampAlpha(CFG.intensity.highlightOpacity, 0.45);
  const strokeAlpha = clampAlpha(effectAlpha + (CFG.intensity.strokeBoost || 0), 0.65);
  const scoreBorderColor = rgbaColor(offenseColor, strokeAlpha);
  const scoreBandStrong = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.44));
  const scoreBandWeak = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.12));
  const dangerBorderColor = rgbaColor(dangerColor, strokeAlpha);
  const dangerBandStrong = rgbaColor(dangerColor, clampAlpha(effectAlpha * 0.3));
  const dangerBandWeak = rgbaColor(dangerColor, clampAlpha(effectAlpha * 0.1));
  const waveMidColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.8));
  const waveEdgeColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.48));
  const dangerWaveColor = rgbaColor(dangerColor, clampAlpha(effectAlpha * 0.48));
  const badgeBackColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.42));
  const badgeBorderColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.88));
  const dangerBadgeBackColor = rgbaColor(dangerColor, clampAlpha(effectAlpha * 0.4));
  const dangerBadgeBorderColor = rgbaColor(dangerColor, clampAlpha(effectAlpha * 0.9));
  const neutralBadgeBackColor = "rgba(6, 58, 74, 0.72)";
  const neutralBadgeBorderColor = "rgba(127, 214, 247, 0.4)";
  const deadBadgeBackColor = "rgba(78, 85, 94, 0.48)";
  const deadBadgeBorderColor = "rgba(195, 203, 214, 0.42)";
  const neutralBadgeTextColor = "rgba(233, 247, 255, 0.92)";
  const deadBadgeTextColor = "rgba(206, 214, 224, 0.8)";
  const markL1Color = rgbaColor(offenseColor, 0.62);
  const markL2Color = rgbaColor(offenseColor, 0.78);
  const markL3Color = rgbaColor(offenseColor, 0.92);
  const deltaBackColor = rgbaColor(offenseColor, 0.95);
  const sparkMidColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 1.05));
  const sparkOuterColor = rgbaColor(offenseColor, 0);
  const wipeMidColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.8));
  const wipeEdgeColor = rgbaColor(offenseColor, clampAlpha(effectAlpha * 0.24));

  const CSS = `
.${ROOT_CLASS}{position:relative;isolation:isolate;}
.${ROOT_CLASS} .${CELL_CLASS}{position:relative;overflow:visible;transition:filter .18s ease,opacity .18s ease,box-shadow .18s ease,background .18s ease;}
.${ROOT_CLASS} .${LABEL_CELL_CLASS},
.${ROOT_CLASS} .${BADGE_CLASS}{
  --ad-ext-crfx-badge-bg:${neutralBadgeBackColor};
  --ad-ext-crfx-badge-border:${neutralBadgeBorderColor};
  --ad-ext-crfx-badge-text:${neutralBadgeTextColor};
  --ad-ext-crfx-badge-glow:${waveEdgeColor};
}
.${ROOT_CLASS} .${LABEL_CELL_CLASS}{position:relative;}
.${ROOT_CLASS} .${LABEL_CELL_CLASS}.${LABEL_STATE_NEUTRAL_CLASS},
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_STATE_NEUTRAL_CLASS}{
  --ad-ext-crfx-badge-bg:${neutralBadgeBackColor};
  --ad-ext-crfx-badge-border:${neutralBadgeBorderColor};
  --ad-ext-crfx-badge-text:${neutralBadgeTextColor};
  --ad-ext-crfx-badge-glow:${waveEdgeColor};
}
.${ROOT_CLASS} .${LABEL_CELL_CLASS}.${LABEL_STATE_OFFENSE_CLASS},
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_STATE_OFFENSE_CLASS}{
  --ad-ext-crfx-badge-bg:${badgeBackColor};
  --ad-ext-crfx-badge-border:${badgeBorderColor};
  --ad-ext-crfx-badge-text:#ffffff;
  --ad-ext-crfx-badge-glow:${waveEdgeColor};
}
.${ROOT_CLASS} .${LABEL_CELL_CLASS}.${LABEL_STATE_DANGER_CLASS},
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_STATE_DANGER_CLASS}{
  --ad-ext-crfx-badge-bg:${dangerBadgeBackColor};
  --ad-ext-crfx-badge-border:${dangerBadgeBorderColor};
  --ad-ext-crfx-badge-text:#ffe5e5;
  --ad-ext-crfx-badge-glow:${dangerWaveColor};
}
.${ROOT_CLASS} .${LABEL_CELL_CLASS}.${LABEL_STATE_DEAD_CLASS},
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_STATE_DEAD_CLASS}{
  --ad-ext-crfx-badge-bg:${deadBadgeBackColor};
  --ad-ext-crfx-badge-border:${deadBadgeBorderColor};
  --ad-ext-crfx-badge-text:${deadBadgeTextColor};
  --ad-ext-crfx-badge-glow:rgba(173, 181, 189, 0.36);
}
.${ROOT_CLASS} .${CELL_CLASS}.${THREAT_CLASS}{box-shadow:inset 0 0 0 1px ${dangerBorderColor},inset 0 0 28px ${dangerBandStrong};background-image:repeating-linear-gradient(135deg,${dangerBandStrong} 0px,${dangerBandStrong} 8px,${dangerBandWeak} 8px,${dangerBandWeak} 16px);}
.${ROOT_CLASS} .${CELL_CLASS}.${SCORE_CLASS}{box-shadow:inset 0 0 0 1px ${scoreBorderColor};background-image:linear-gradient(90deg,${scoreBandStrong} 0%,${scoreBandWeak} 28%,${scoreBandWeak} 72%,${scoreBandStrong} 100%);}
.${ROOT_CLASS} .${CELL_CLASS}.${DEAD_CLASS}{filter:grayscale(.88) saturate(.25) brightness(.72);opacity:.72;}
.${ROOT_CLASS} .${CELL_CLASS}.${PRESSURE_CLASS}{box-shadow:inset 0 0 0 1px ${dangerBorderColor},inset 0 0 28px ${dangerBandStrong};background-image:repeating-linear-gradient(135deg,${dangerBandStrong} 0px,${dangerBandStrong} 8px,${dangerBandWeak} 8px,${dangerBandWeak} 16px);}
.${ROOT_CLASS} .${ROW_WAVE_CLASS}{position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,rgba(0,0,0,0) 0%,${waveEdgeColor} 42%,${waveMidColor} 52%,${waveEdgeColor} 62%,rgba(0,0,0,0) 100%);transform:translateX(-110%);animation:adCrfxRowWave .76s cubic-bezier(.2,.7,.2,1) forwards;z-index:6;}
.${ROOT_CLASS} .${BADGE_CLASS}{position:absolute !important;left:8px !important;top:50% !important;transform:translateY(-50%);z-index:12;margin:0 !important;white-space:nowrap;pointer-events:none;color:var(--ad-ext-crfx-badge-text)!important;background-color:var(--ad-ext-crfx-badge-bg)!important;border:1px solid var(--ad-ext-crfx-badge-border);transition:color .16s ease,background-color .16s ease,border-color .16s ease,box-shadow .16s ease;}
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_BEACON_CLASS}{box-shadow:0 0 0 1px var(--ad-ext-crfx-badge-border),0 0 14px var(--ad-ext-crfx-badge-glow);}
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_BURST_CLASS}{animation:adCrfxBadgeBurst .7s ease;}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}{transform-origin:center center;animation:adCrfxMark .46s cubic-bezier(.2,.8,.2,1);}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}.${MARK_L1_CLASS}{filter:drop-shadow(0 0 4px ${markL1Color});}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}.${MARK_L2_CLASS}{filter:drop-shadow(0 0 6px ${markL2Color});}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}.${MARK_L3_CLASS}{filter:drop-shadow(0 0 8px ${markL3Color});}
.${ROOT_CLASS} .${DELTA_CLASS}{position:absolute;top:4px;right:6px;padding:1px 7px;border-radius:999px;font-size:2.22rem;font-weight:800;line-height:1.3;letter-spacing:.02em;color:#052e16;background:${deltaBackColor};box-shadow:0 4px 12px rgba(0,0,0,.38);pointer-events:none;z-index:10;animation:adCrfxDelta .92s ease forwards;}
.${ROOT_CLASS} .${SPARK_CLASS}{position:absolute;left:50%;top:50%;width:44px;height:44px;border-radius:999px;pointer-events:none;transform:translate(-50%,-50%) scale(.2);background:radial-gradient(circle,rgba(255,255,255,.95) 0%,${sparkMidColor} 34%,${sparkOuterColor} 72%);z-index:9;animation:adCrfxSpark .42s ease-out forwards;}
.${ROOT_CLASS} .${WIPE_CLASS}{position:absolute;inset:0;pointer-events:none;z-index:11;background:linear-gradient(110deg,rgba(0,0,0,0) 0%,${wipeEdgeColor} 38%,${wipeMidColor} 50%,${wipeEdgeColor} 62%,rgba(0,0,0,0) 100%);transform:translateX(-135%);animation:adCrfxWipe .72s cubic-bezier(.2,.7,.2,1) forwards;}
@keyframes adCrfxRowWave{0%{transform:translateX(-110%);opacity:0;}15%{opacity:1;}100%{transform:translateX(110%);opacity:0;}}
@keyframes adCrfxBadgeBurst{0%{transform:translateY(-50%) scale(1);}24%{transform:translateY(-50%) scale(1.09);}100%{transform:translateY(-50%) scale(1);}}
@keyframes adCrfxMark{0%{transform:scale(.72);opacity:.55;}45%{transform:scale(1.15);opacity:1;}100%{transform:scale(1);opacity:1;}}
@keyframes adCrfxDelta{0%{transform:translateY(10px) scale(.86);opacity:0;}15%{transform:translateY(0) scale(1);opacity:1;}80%{transform:translateY(-6px) scale(1);opacity:1;}100%{transform:translateY(-12px) scale(.9);opacity:0;}}
@keyframes adCrfxSpark{0%{transform:translate(-50%,-50%) scale(.2);opacity:0;}16%{opacity:1;}100%{transform:translate(-50%,-50%) scale(1.45);opacity:0;}}
@keyframes adCrfxWipe{0%{transform:translateX(-135%);opacity:0;}15%{opacity:1;}100%{transform:translateX(135%);opacity:0;}}
`;

  const executionContext = resolveExecutionSource();
  const claimFeatureInstance = shared.claimFeatureInstance;
  const releaseFeatureInstance = shared.releaseFeatureInstance;
  const getFeatureInstance = shared.getFeatureInstance;

  if (
    typeof claimFeatureInstance !== "function" ||
    typeof releaseFeatureInstance !== "function" ||
    typeof getFeatureInstance !== "function"
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

    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler, { passive: true });
    }
    resizeHandler = null;

    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler, {
        passive: true,
      });
    }
    visibilityHandler = null;

    reset();
    releaseFeatureInstance(FEATURE_KEY, instanceClaim.token);
    debugTrace("feature-instance-disposed", {
      featureKey: FEATURE_KEY,
      reason,
    });
  }

  ensureStyle(STYLE_ID, CSS);

  const schedule = makeScheduler(() => {
    if (!instanceReleased && isCurrentInstanceOwner()) {
      apply();
    }
  });
  debugTrace("applied", {
    effectsEnabled: [
      CFG.rowRailPulse,
      CFG.badgeBeacon,
      CFG.markProgress,
      CFG.threatEdge,
      CFG.scoringLane,
      CFG.deadRowCollapse,
      CFG.deltaChips,
      CFG.hitSpark,
      CFG.roundWipe,
      CFG.pressureOverlay,
    ].filter(Boolean).length,
    theme: CFG.themeKey,
    intensity: CFG.intensityKey,
    executionSource: executionContext.executionSource,
  });
  schedule();

  mutationObserver = observe({ onChange: schedule });
  if (gameState && typeof gameState.subscribe === "function") {
    unsubscribeGameState = gameState.subscribe(schedule);
  }
  resizeHandler = schedule;
  visibilityHandler = schedule;
  window.addEventListener("resize", resizeHandler, { passive: true });
  document.addEventListener("visibilitychange", visibilityHandler, {
    passive: true,
  });
  refreshTimer = setInterval(() => {
    if (!instanceReleased && isCurrentInstanceOwner()) {
      apply();
    }
  }, 300);
})();
