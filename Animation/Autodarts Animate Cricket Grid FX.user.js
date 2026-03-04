// ==UserScript==
// @name         Autodarts Animate Cricket Grid FX
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0.6
// @description  Erweitert die Cricket-/Tactics-Zielmatrix um klare Live-Effekte für Treffer, Gefahr und Zugwechsel.
// @xconfig-description  Macht wichtige Cricket-/Tactics-Zustände in der Zielmatrix schneller sichtbar und hält das Bild dabei gut lesbar.
// @xconfig-title  Cricket-Grid-Effekte
// @xconfig-variant      cricket / tactics
// @xconfig-readme-anchor  animation-autodarts-animate-cricket-grid-fx
// @xconfig-tech-anchor  animation-autodarts-animate-cricket-grid-fx
// @xconfig-background     assets/Autodarts-Animate-Cricket-Grid-FX.png
// @xconfig-settings-version 6
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
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

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

  const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
  const DEBUG_PREFIX = "[xConfig][Cricket Grid FX]";

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
  };

  const state = {
    root: null,
    marksByLabel: new Map(),
    rowStateByLabel: new Map(),
    turnToken: "",
  };
  let loggedVariantSkip = false;

  function debugLog(event, payload) {
    if (!DEBUG_ENABLED) {
      return;
    }
    if (typeof payload === "undefined") {
      console.log(`${DEBUG_PREFIX} ${event}`);
      return;
    }
    console.log(`${DEBUG_PREFIX} ${event}`, payload);
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
    return {
      offense: Boolean(targetState && targetState.offense),
      danger: Boolean(targetState && targetState.danger),
      dead: Boolean(targetState && targetState.dead),
      pressure: Boolean(targetState && targetState.pressure),
      presentation: targetState ? targetState.presentation : "open",
      key: `${marksByPlayer.join(",")}|${targetState ? targetState.presentation : ""}`,
    };
  }

  function pulseRow(row) {
    if (!CFG.rowRailPulse) {
      return;
    }
    row.playerCells.forEach((cell) => {
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
    if (!CFG.badgeBeacon || !row.badgeNode) {
      return;
    }
    row.badgeNode.classList.remove(BADGE_BURST_CLASS);
    void row.badgeNode.offsetWidth;
    row.badgeNode.classList.add(BADGE_BURST_CLASS);
    setTimeout(() => row.badgeNode?.classList.remove(BADGE_BURST_CLASS), 700);
  }

  function animateMark(cell, markNow) {
    if (!CFG.markProgress) {
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
    if (!CFG.deltaChips || !Number.isFinite(delta) || delta <= 0) {
      return;
    }
    const chip = document.createElement("span");
    chip.className = DELTA_CLASS;
    chip.textContent = `+${delta}`;
    cell.appendChild(chip);
    chip.addEventListener("animationend", () => chip.remove(), { once: true });
  }

  function addSpark(cell) {
    if (!CFG.hitSpark) {
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
      node.classList.remove(BADGE_CLASS, BADGE_BEACON_CLASS, BADGE_BURST_CLASS);
    });
    toArray(root.querySelectorAll(`.${LABEL_CELL_CLASS}`)).forEach((node) => {
      node.classList.remove(LABEL_CELL_CLASS);
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
    if (!cricketState) {
      debugLog("shared-helper-missing");
      return null;
    }

    return cricketState.buildGridSnapshot({
      playerSelector: ".ad-ext-player",
      activePlayerSelector: ".ad-ext-player-active",
      gameStateShared: gameState,
      debugLog: DEBUG_ENABLED ? debugLog : null,
    });
  }

  function apply() {
    if (!isContextActive()) {
      if (!loggedVariantSkip) {
        debugLog("variant-skip", { reason: "not-cricket-family-context" });
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
    snapshot.root.classList.add(ROOT_CLASS);

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
      debugLog("trigger", { type: "turn-change", turnToken });
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

      row.playerCells.forEach((cell) => {
        cell.classList.add(CELL_CLASS);
        cell.classList.remove(
          THREAT_CLASS,
          SCORE_CLASS,
          DEAD_CLASS,
          PRESSURE_CLASS
        );
        if (CFG.threatEdge && targetState.danger) {
          cell.classList.add(THREAT_CLASS);
        }
        if (CFG.scoringLane && targetState.offense) {
          cell.classList.add(SCORE_CLASS);
        }
        if (CFG.deadRowCollapse && targetState.dead) {
          cell.classList.add(DEAD_CLASS);
        }
        if (CFG.pressureOverlay && targetState.pressure) {
          cell.classList.add(PRESSURE_CLASS);
        }
      });

      if (row.labelCell) {
        row.labelCell.classList.add(LABEL_CELL_CLASS);
      }

      const badgeNode =
        row.badgeNode && row.badgeNode !== row.labelCell ? row.badgeNode : null;
      if (badgeNode) {
        badgeNode.classList.add(BADGE_CLASS);
        badgeNode.classList.toggle(
          BADGE_BEACON_CLASS,
          CFG.badgeBeacon &&
            (targetState.offense || targetState.danger || targetState.pressure)
        );
      }

      let increased = false;
      row.playerCells.forEach((cell, index) => {
        const delta = clampMark(currentMarks[index]) - clampMark(prevMarks[index] || 0);
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
      debugLog("trigger", {
        changedRows,
        rowsScanned: snapshot.rows.length,
      });
    }
  }

  const CSS = `
.${ROOT_CLASS}{position:relative;isolation:isolate;}
.${ROOT_CLASS} .${CELL_CLASS}{position:relative;overflow:visible;transition:filter .18s ease,opacity .18s ease,box-shadow .18s ease,background .18s ease;}
.${ROOT_CLASS} .${LABEL_CELL_CLASS}{position:relative;}
.${ROOT_CLASS} .${CELL_CLASS}.${THREAT_CLASS}{box-shadow:inset 0 0 0 1px rgba(251,113,133,.45),inset 0 0 28px rgba(190,24,93,.18);background-image:repeating-linear-gradient(135deg,rgba(251,113,133,.12) 0px,rgba(251,113,133,.12) 8px,rgba(251,113,133,.04) 8px,rgba(251,113,133,.04) 16px);}
.${ROOT_CLASS} .${CELL_CLASS}.${SCORE_CLASS}{box-shadow:inset 0 0 0 1px rgba(16,185,129,.42);background-image:linear-gradient(90deg,rgba(16,185,129,.18) 0%,rgba(16,185,129,.04) 28%,rgba(16,185,129,.04) 72%,rgba(16,185,129,.18) 100%);}
.${ROOT_CLASS} .${CELL_CLASS}.${DEAD_CLASS}{filter:grayscale(.88) saturate(.25) brightness(.72);opacity:.72;}
.${ROOT_CLASS} .${CELL_CLASS}.${PRESSURE_CLASS}{box-shadow:inset 0 0 0 1px rgba(251,113,133,.45),inset 0 0 28px rgba(190,24,93,.18);background-image:repeating-linear-gradient(135deg,rgba(251,113,133,.12) 0px,rgba(251,113,133,.12) 8px,rgba(251,113,133,.04) 8px,rgba(251,113,133,.04) 16px);}
.${ROOT_CLASS} .${ROW_WAVE_CLASS}{position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,rgba(56,189,248,0) 0%,rgba(56,189,248,.32) 42%,rgba(125,211,252,.54) 52%,rgba(56,189,248,.32) 62%,rgba(56,189,248,0) 100%);transform:translateX(-110%);animation:adCrfxRowWave .76s cubic-bezier(.2,.7,.2,1) forwards;z-index:6;}
.${ROOT_CLASS} .${BADGE_CLASS}{position:absolute !important;left:8px !important;top:50% !important;transform:translateY(-50%);z-index:12;margin:0 !important;white-space:nowrap;pointer-events:none;}
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_BEACON_CLASS}{box-shadow:0 0 0 1px rgba(56,189,248,.4),0 0 14px rgba(56,189,248,.42);background-color:rgba(8,47,73,.72)!important;}
.${ROOT_CLASS} .${BADGE_CLASS}.${BADGE_BURST_CLASS}{animation:adCrfxBadgeBurst .7s ease;}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}{transform-origin:center center;animation:adCrfxMark .46s cubic-bezier(.2,.8,.2,1);}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}.${MARK_L1_CLASS}{filter:drop-shadow(0 0 4px rgba(56,189,248,.65));}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}.${MARK_L2_CLASS}{filter:drop-shadow(0 0 6px rgba(251,191,36,.78));}
.${ROOT_CLASS} .${MARK_PROGRESS_CLASS}.${MARK_L3_CLASS}{filter:drop-shadow(0 0 8px rgba(34,197,94,.9));}
.${ROOT_CLASS} .${DELTA_CLASS}{position:absolute;top:4px;right:6px;padding:1px 7px;border-radius:999px;font-size:2.22rem;font-weight:800;line-height:1.3;letter-spacing:.02em;color:#052e16;background:rgba(134,239,172,.95);box-shadow:0 4px 12px rgba(0,0,0,.38);pointer-events:none;z-index:10;animation:adCrfxDelta .92s ease forwards;}
.${ROOT_CLASS} .${SPARK_CLASS}{position:absolute;left:50%;top:50%;width:44px;height:44px;border-radius:999px;pointer-events:none;transform:translate(-50%,-50%) scale(.2);background:radial-gradient(circle,rgba(255,255,255,.95) 0%,rgba(125,211,252,.62) 34%,rgba(125,211,252,0) 72%);z-index:9;animation:adCrfxSpark .42s ease-out forwards;}
.${ROOT_CLASS} .${WIPE_CLASS}{position:absolute;inset:0;pointer-events:none;z-index:11;background:linear-gradient(110deg,rgba(56,189,248,0) 0%,rgba(56,189,248,.12) 38%,rgba(125,211,252,.42) 50%,rgba(56,189,248,.12) 62%,rgba(56,189,248,0) 100%);transform:translateX(-135%);animation:adCrfxWipe .72s cubic-bezier(.2,.7,.2,1) forwards;}
@keyframes adCrfxRowWave{0%{transform:translateX(-110%);opacity:0;}15%{opacity:1;}100%{transform:translateX(110%);opacity:0;}}
@keyframes adCrfxBadgeBurst{0%{transform:translateY(-50%) scale(1);}24%{transform:translateY(-50%) scale(1.09);}100%{transform:translateY(-50%) scale(1);}}
@keyframes adCrfxMark{0%{transform:scale(.72);opacity:.55;}45%{transform:scale(1.15);opacity:1;}100%{transform:scale(1);opacity:1;}}
@keyframes adCrfxDelta{0%{transform:translateY(10px) scale(.86);opacity:0;}15%{transform:translateY(0) scale(1);opacity:1;}80%{transform:translateY(-6px) scale(1);opacity:1;}100%{transform:translateY(-12px) scale(.9);opacity:0;}}
@keyframes adCrfxSpark{0%{transform:translate(-50%,-50%) scale(.2);opacity:0;}16%{opacity:1;}100%{transform:translate(-50%,-50%) scale(1.45);opacity:0;}}
@keyframes adCrfxWipe{0%{transform:translateX(-135%);opacity:0;}15%{opacity:1;}100%{transform:translateX(135%);opacity:0;}}
`;

  ensureStyle(STYLE_ID, CSS);

  const schedule = makeScheduler(apply);
  debugLog("applied", {
    effectsEnabled: Object.values(CFG).filter(Boolean).length,
  });
  schedule();

  observe({ onChange: schedule });
  if (gameState && typeof gameState.subscribe === "function") {
    gameState.subscribe(schedule);
  }
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule, { passive: true });
  setInterval(schedule, 900);
})();
