// ==UserScript==
// @name         Autodarts Animate Cricket Grid FX [Beta]
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0.2-beta.1
// @description  Erweitert die Cricket-Zielmatrix um klare Live-Effekte für Treffer, Gefahr und Zugwechsel.
// @xconfig-description  Beta: GSAP-Effektpipeline und optionaler mo.js-Hit-Spark mit robustem Fallback.
// @xconfig-title  Cricket-Grid-Effekte [Beta]
// @xconfig-variant      cricket
// @xconfig-readme-anchor  animation-autodarts-animate-cricket-grid-fx
// @xconfig-tech-anchor  animation-autodarts-animate-cricket-grid-fx
// @xconfig-background     assets/Autodarts-Animate-Cricket-Grid-FX.png

// @xconfig-settings-version 4
// @xconfig-beta         true
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/gsap.min.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/mo.umd.min.js
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Cricket%20Grid%20FX%20Beta.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Cricket%20Grid%20FX%20Beta.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtCricketGridFxBeta";
  const previous = window[INSTANCE_KEY];
  if (previous && typeof previous.cleanup === "function") {
    try {
      previous.cleanup();
    } catch (_) {
      // ignore stale instance cleanup
    }
  }

  const shared = window.autodartsAnimationShared || {};
  const gameState = window.autodartsGameStateShared || null;
  const gsapLib = window.gsap || null;
  const mojsLib = window.mojs || null;

  const TARGETS = ["20", "19", "18", "17", "16", "15", "BULL"];
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
  // xConfig: {"type":"toggle","label":"Scoring-Lane","description":"Hebt Zeilen hervor, auf denen du aktuell Punkte machen kannst.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
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

  /*
    Variablen und gesteuerter Effekt:
    - xConfig_ROW_RAIL_PULSE: Effekt 1, Zeilen-Sweep bei relevanten Triggern.
    - xConfig_BADGE_BEACON: Effekt 2, linkes Badge wird hervorgehoben.
    - xConfig_MARK_PROGRESS_ANIMATOR: Effekt 3, Symbol-Progress Animation.
    - xConfig_THREAT_EDGE: Effekt 4, seitliche Danger-Warnkanten.
    - xConfig_SCORING_LANE_HIGHLIGHT: Effekt 5, gruene Scoring-Lane.
    - xConfig_DEAD_ROW_COLLAPSE: Effekt 6, Dead-Row optisch reduziert.
    - xConfig_DELTA_CHIPS: Effekt 8, +Delta als kurzes Overlay.
    - xConfig_HIT_SPARK: Effekt 10, kurzer Spark beim Treffer.
    - xConfig_ROUND_TRANSITION_WIPE: Effekt 13, Wipe bei Turn-Wechsel.
    - xConfig_OPPONENT_PRESSURE_OVERLAY: Effekt 15, Pressure-Overlay.
  */


	function resolveDebugToggle(value) {
		if (typeof value === "boolean") {
			return value;
		}
		const normalized = String(value || "").trim().toLowerCase();
		return ["1", "true", "yes", "on", "aktiv", "active"].includes(normalized);
	}

	const DEBUG_ENABLED = resolveDebugToggle(xConfig_DEBUG);
	const DEBUG_PREFIX = "[xConfig][Cricket Grid FX]";

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

	function debugWarn(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.warn(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.warn(`${DEBUG_PREFIX} ${event}`, payload);
	}

	function debugError(event, payload) {
		if (!DEBUG_ENABLED) {
			return;
		}
		if (typeof payload === "undefined") {
			console.error(`${DEBUG_PREFIX} ${event}`);
			return;
		}
		console.error(`${DEBUG_PREFIX} ${event}`, payload);
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
      const v = value.trim().toLowerCase();
      if (["true", "yes", "on", "aktiv", "active"].includes(v)) {
        return true;
      }
      if (["false", "no", "off", "inaktiv", "inactive"].includes(v)) {
        return false;
      }
    }
    return fallbackValue;
  }

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
    rowTimelineByLabel: new Map(),
    markCleanupTimers: new Set(),
    observer: null,
    unsubscribeState: null,
    fallbackIntervalId: 0,
    activeMoBursts: new Set(),
    cleanedUp: false,
  };
  let loggedVariantSkip = false;

  const ensureStyle = shared.ensureStyle || function fallbackEnsureStyle(id, css) {
    if (!id) {
      return false;
    }
    let styleNode = document.getElementById(id);
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = id;
      (document.head || document.documentElement)?.appendChild(styleNode);
    }
    if (styleNode.textContent !== css) {
      styleNode.textContent = css;
    }
    return true;
  };

  const makeScheduler = shared.createRafScheduler || function fallbackScheduler(fn) {
    let scheduled = false;
    return function schedule() {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn();
      });
    };
  };

  const observe = shared.observeMutations || function fallbackObserve(opts) {
    if (!opts || typeof opts.onChange !== "function") {
      return null;
    }
    const observer = new MutationObserver(() => opts.onChange());
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });
    return observer;
  };

  function setManagedTimeout(callback, delayMs) {
    const handle = setTimeout(() => {
      state.markCleanupTimers.delete(handle);
      callback();
    }, Math.max(0, Number(delayMs) || 0));
    state.markCleanupTimers.add(handle);
    return handle;
  }

  function clearManagedTimeouts() {
    state.markCleanupTimers.forEach((handle) => clearTimeout(handle));
    state.markCleanupTimers.clear();
  }

  function killRowTimeline(label) {
    if (!label) {
      return;
    }
    const timeline = state.rowTimelineByLabel.get(label);
    if (timeline && typeof timeline.kill === "function") {
      timeline.kill();
    }
    state.rowTimelineByLabel.delete(label);
  }

  function killAllRowTimelines() {
    state.rowTimelineByLabel.forEach((timeline) => {
      if (timeline && typeof timeline.kill === "function") {
        timeline.kill();
      }
    });
    state.rowTimelineByLabel.clear();
  }

  function clearMoBursts() {
    state.activeMoBursts.forEach((burst) => {
      try {
        if (burst && typeof burst.tune === "function") {
          burst.tune({ isRunLess: true });
        }
      } catch (_) {
        // ignore
      }
    });
    state.activeMoBursts.clear();
  }

  function toArray(v) {
    return Array.isArray(v) ? v : Array.from(v || []);
  }

  function clampMark(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      return 0;
    }
    return Math.max(0, Math.min(3, Math.round(n)));
  }

  function normLabel(text) {
    const raw = String(text || "").toUpperCase();
    if (!raw.trim()) {
      return "";
    }
    if (raw.includes("BULL") || raw.includes("25")) {
      return "BULL";
    }
    const m = raw.match(/\b(20|19|18|17|16|15)\b/);
    return m ? m[1] : "";
  }

  function isCricketVariantActive() {
    if (gameState?.isCricketVariant && gameState.isCricketVariant({ allowMissing: false, allowEmpty: false })) {
      return true;
    }
    const variant = String(document.getElementById(VARIANT_ID)?.textContent || "").trim().toLowerCase();
    return variant === "cricket" || variant.startsWith("cricket ");
  }

  function isContextActive() {
    if (!isCricketVariantActive()) {
      return false;
    }
    // Fixed scope: this FX module is intentionally bound to Theme Cricket.
    return Boolean(document.getElementById(CRICKET_THEME_STYLE_ID));
  }

  function countLabels(el) {
    const set = new Set();
    toArray(el?.querySelectorAll("p,span,div,td,th")).forEach((n) => {
      const l = normLabel(n.textContent);
      if (l) {
        set.add(l);
      }
    });
    return set.size;
  }

  function findGridRoot() {
    if (state.root && state.root.isConnected && countLabels(state.root) >= 5) {
      return state.root;
    }

    let best = null;
    const labels = toArray(document.querySelectorAll("p,span,div,td,th")).filter((n) => normLabel(n.textContent));
    labels.forEach((n) => {
      let cur = n.parentElement;
      let depth = 0;
      while (cur && depth < 8) {
        const labelCount = countLabels(cur);
        if (labelCount >= 5) {
          const childCount = cur.children.length;
          const display = getComputedStyle(cur).display || "";
          let score = labelCount * 100;
          if (display.includes("grid")) {
            score += 60;
          }
          if (childCount >= 14) {
            score += 20;
          }
          if (childCount > 0 && childCount % 7 === 0) {
            score += 12;
          }
          score -= depth * 3;
          if (!best || score > best.score) {
            best = { node: cur, score };
          }
        }
        cur = cur.parentElement;
        depth += 1;
      }
    });

    state.root = best ? best.node : null;
    return state.root;
  }

  function detectColumns(root) {
    const children = toArray(root?.children).filter((el) => el.nodeType === 1);
    const idx = [];
    children.forEach((cell, i) => {
      if (normLabel(cell.textContent)) {
        idx.push(i);
      }
    });
    if (idx.length >= 2) {
      const diff = [];
      for (let i = 1; i < idx.length; i += 1) {
        const d = idx[i] - idx[i - 1];
        if (d > 0 && d <= 8) {
          diff.push(d);
        }
      }
      if (diff.length) {
        const count = new Map();
        diff.forEach((d) => count.set(d, (count.get(d) || 0) + 1));
        let best = null;
        count.forEach((c, d) => {
          if (!best || c > best.c) {
            best = { d, c };
          }
        });
        if (best?.d) {
          return best.d;
        }
      }
    }
    const players = toArray(document.querySelectorAll(".ad-ext-player"));
    return players.length >= 2 ? players.length : 2;
  }

  function findBadge(cell, label) {
    if (!cell) {
      return null;
    }
    const candidates = toArray(cell.querySelectorAll("p,span,div")).filter((n) => normLabel(n.textContent) === label);
    if (!candidates.length) {
      return null;
    }
    // Keep the number visually "front/left": pick the left-most matching label node.
    const sorted = candidates
      .map((node) => ({ node, left: node.getBoundingClientRect().left }))
      .sort((a, b) => a.left - b.left);
    return sorted[0].node;
  }

  function buildRows(root, columns) {
    const rows = new Map();
    const children = toArray(root?.children).filter((el) => el.nodeType === 1);
    for (let i = 0; i < children.length; i += 1) {
      const label = normLabel(children[i].textContent);
      if (!label || rows.has(label)) {
        continue;
      }
      const cells = children.slice(i, i + columns);
      if (cells.length < columns) {
        continue;
      }
      if (cells.slice(1).some((c) => normLabel(c.textContent))) {
        continue;
      }
      rows.set(label, { label, cells, badge: findBadge(cells[0], label) });
    }
    return TARGETS.map((k) => rows.get(k)).filter(Boolean);
  }

  function parseMarkString(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) {
      return null;
    }
    if (text.includes("closed")) {
      return 3;
    }
    if (text.includes("open")) {
      return 0;
    }
    const m = text.match(/\b([0-3])\b/);
    if (m) {
      return Number(m[1]);
    }
    return null;
  }

  function marksFromAttrs(el) {
    if (!el) {
      return null;
    }
    const keys = ["data-marks", "data-mark", "data-hits", "data-hit", "data-value", "aria-label", "title", "alt"];
    for (const k of keys) {
      const parsed = parseMarkString(el.getAttribute(k));
      if (parsed !== null) {
        return parsed;
      }
    }
    for (const [k, v] of Object.entries(el.dataset || {})) {
      if (!/mark|hit|count|value/i.test(k)) {
        continue;
      }
      const parsed = parseMarkString(v);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  function getMarks(cell, rowLabel) {
    const direct = marksFromAttrs(cell);
    if (direct !== null) {
      return clampMark(direct);
    }

    const iconNodes = toArray(cell.querySelectorAll("img,svg,[aria-label],[title],[alt]"));
    let best = null;
    iconNodes.forEach((n) => {
      const parsed = parseMarkString(n.getAttribute("alt")) ?? parseMarkString(n.getAttribute("aria-label")) ?? parseMarkString(n.getAttribute("title"));
      if (parsed !== null) {
        best = best === null ? parsed : Math.max(best, parsed);
      }
    });
    if (best !== null) {
      return clampMark(best);
    }
    if (iconNodes.length > 0) {
      return Math.min(3, iconNodes.filter((n) => n.matches("img,svg")).length);
    }

    let text = String(cell.textContent || "");
    text = text
      .replace(new RegExp(`\\b${rowLabel}\\b`, "gi"), "")
      .replace(/\b(BULL|BULLSEYE|25)\b/gi, "")
      .trim()
      .normalize("NFKC")
      .toUpperCase();
    if (!text) {
      return 0;
    }
    if (/[\u2297\u2A02\u29BB]/u.test(text)) {
      return 3;
    }
    if (/[X\u00D7\u2715\u2716\u2573]/u.test(text)) {
      return 2;
    }
    if (text.includes("/")) {
      return 1;
    }
    const m = text.match(/\b([0-3])\b/);
    return m ? clampMark(m[1]) : 0;
  }

  function getActiveColumn(columns) {
    const idx = gameState?.getActivePlayerIndex?.();
    if (Number.isFinite(idx) && idx >= 0 && columns > 0) {
      return idx < columns ? idx : idx % columns;
    }
    const players = toArray(document.querySelectorAll(".ad-ext-player"));
    const activeIdx = players.findIndex((n) => n.classList.contains("ad-ext-player-active"));
    if (activeIdx >= 0 && columns > 0) {
      return activeIdx < columns ? activeIdx : activeIdx % columns;
    }
    return 0;
  }

  function getTurnToken(activeCol) {
    const turn = gameState?.getActiveTurn?.();
    if (turn && typeof turn === "object") {
      const round = Number.isFinite(turn.round) ? turn.round : "";
      const part = Number.isFinite(turn.turn) ? turn.turn : "";
      return `${turn.id || ""}|${turn.playerId || ""}|${round}|${part}|${turn.createdAt || ""}`;
    }
    const throws = gameState?.getActiveThrows?.();
    return `fallback:${activeCol}:${Array.isArray(throws) ? throws.length : 0}`;
  }

  function rowState(marks, activeCol) {
    const list = marks.map((m) => clampMark(m));
    const a = Math.max(0, Math.min(activeCol, list.length - 1));
    const active = list[a] || 0;
    const opp = list.filter((_, i) => i !== a);
    const oppClosed = opp.some((m) => m >= 3);
    const oppOpen = opp.some((m) => m < 3);
    const dead = list.length > 1 && list.every((m) => m >= 3);
    const score = active >= 3 && oppOpen && !dead;
    const danger = active < 3 && oppClosed && !dead;
    const pressure = active <= 1 && oppClosed && !dead && !score;
    return { score, danger, dead, pressure, key: `${list.join(",")}|${score ? 1 : 0}${danger ? 1 : 0}${dead ? 1 : 0}${pressure ? 1 : 0}` };
  }

  function pulseRow(row) {
    if (!CFG.rowRailPulse) {
      return;
    }

    const waves = [];
    row.cells.forEach((cell) => {
      toArray(cell.querySelectorAll(`.${ROW_WAVE_CLASS}`)).forEach((n) => n.remove());
      const wave = document.createElement("span");
      wave.className = ROW_WAVE_CLASS;
      cell.appendChild(wave);
      waves.push(wave);
    });

    if (!waves.length) {
      return;
    }

    if (gsapLib && typeof gsapLib.timeline === "function") {
      killRowTimeline(row.label);
      waves.forEach((wave) => {
        wave.style.animation = "none";
      });
      const tl = gsapLib.timeline({
        onComplete: () => {
          waves.forEach((wave) => wave.remove());
          state.rowTimelineByLabel.delete(row.label);
        },
      });
      tl.set(waves, { xPercent: -120, opacity: 0, willChange: "transform,opacity" });
      tl.to(waves, {
        xPercent: 120,
        opacity: 1,
        duration: 0.42,
        ease: "power2.out",
        stagger: 0.04,
      });
      tl.to(waves, {
        opacity: 0,
        duration: 0.14,
        ease: "sine.out",
        stagger: 0.03,
      }, "-=0.14");
      state.rowTimelineByLabel.set(row.label, tl);
      return;
    }

    waves.forEach((wave) => {
      wave.addEventListener("animationend", () => wave.remove(), { once: true });
    });
  }

  function burstBadge(row) {
    if (!CFG.badgeBeacon || !row.badge) {
      return;
    }

    if (gsapLib && typeof gsapLib.to === "function") {
      if (typeof gsapLib.killTweensOf === "function") {
        gsapLib.killTweensOf(row.badge);
      }
      gsapLib.fromTo(
        row.badge,
        { scale: 1, transformOrigin: "50% 50%" },
        {
          scale: 1.1,
          duration: 0.16,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
          overwrite: "auto",
        }
      );
      return;
    }

    row.badge.classList.remove(BADGE_BURST_CLASS);
    void row.badge.offsetWidth;
    row.badge.classList.add(BADGE_BURST_CLASS);
    setManagedTimeout(() => row.badge?.classList.remove(BADGE_BURST_CLASS), 700);
  }

  function animateMark(cell, markNow) {
    if (!CFG.markProgress) {
      return;
    }
    const target = cell.querySelector("img,svg,.chakra-image,[data-marks],[data-mark],[data-hits],[data-hit]");
    if (!target) {
      return;
    }
    target.classList.remove(MARK_PROGRESS_CLASS, MARK_L1_CLASS, MARK_L2_CLASS, MARK_L3_CLASS);
    const level = clampMark(markNow);
    const levelClass = level <= 1 ? MARK_L1_CLASS : level === 2 ? MARK_L2_CLASS : MARK_L3_CLASS;
    target.classList.add(MARK_PROGRESS_CLASS, levelClass);

    if (gsapLib && typeof gsapLib.fromTo === "function") {
      if (typeof gsapLib.killTweensOf === "function") {
        gsapLib.killTweensOf(target);
      }
      gsapLib.fromTo(
        target,
        { scale: 0.72, opacity: 0.55, transformOrigin: "50% 50%" },
        {
          scale: 1,
          opacity: 1,
          duration: 0.42,
          ease: "back.out(2)",
          overwrite: "auto",
          onComplete: () => {
            target.classList.remove(MARK_PROGRESS_CLASS, MARK_L1_CLASS, MARK_L2_CLASS, MARK_L3_CLASS);
          },
        }
      );
      return;
    }

    void target.offsetWidth;
    setManagedTimeout(() => {
      target.classList.remove(MARK_PROGRESS_CLASS, MARK_L1_CLASS, MARK_L2_CLASS, MARK_L3_CLASS);
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

    if (gsapLib && typeof gsapLib.fromTo === "function") {
      gsapLib.fromTo(
        chip,
        { y: 10, opacity: 0, scale: 0.86 },
        {
          y: -12,
          opacity: 0,
          scale: 0.9,
          duration: 0.9,
          ease: "power2.out",
          overwrite: true,
          onStart: () => {
            chip.style.opacity = "1";
          },
          onComplete: () => {
            chip.remove();
          },
        }
      );
      return;
    }

    chip.addEventListener("animationend", () => chip.remove(), { once: true });
  }

  function addSpark(cell) {
    if (!CFG.hitSpark) {
      return;
    }

    if (mojsLib && typeof mojsLib.Burst === "function") {
      try {
        const rect = cell.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const burst = new mojsLib.Burst({
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
            radius: { 0: Math.max(22, Math.min(52, rect.width * 0.6)) },
            count: 10,
            children: {
              shape: ["circle", "line"],
              stroke: ["#7dd3fc", "#38bdf8", "#f8fafc"],
              strokeWidth: { 4: 0 },
              radius: { 6: 0 },
              duration: 420,
              easing: "quad.out",
            },
          });
          state.activeMoBursts.add(burst);
          burst.replay();
          setManagedTimeout(() => {
            state.activeMoBursts.delete(burst);
          }, 600);
          return;
        }
      } catch (_) {
        // fallback to CSS spark
      }
    }

    toArray(cell.querySelectorAll(`.${SPARK_CLASS}`)).forEach((n) => n.remove());
    const spark = document.createElement("span");
    spark.className = SPARK_CLASS;
    cell.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }

  function addWipe(root) {
    if (!CFG.roundWipe || !root) {
      return;
    }
    toArray(root.querySelectorAll(`.${WIPE_CLASS}`)).forEach((n) => n.remove());
    const wipe = document.createElement("span");
    wipe.className = WIPE_CLASS;
    root.appendChild(wipe);

    if (gsapLib && typeof gsapLib.fromTo === "function") {
      gsapLib.fromTo(
        wipe,
        { xPercent: -135, opacity: 0 },
        {
          xPercent: 135,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          onStart: () => {
            wipe.style.opacity = "1";
          },
          onComplete: () => wipe.remove(),
        }
      );
      return;
    }

    wipe.addEventListener("animationend", () => wipe.remove(), { once: true });
  }

  function clearRoot(root) {
    if (!root) {
      return;
    }
    if (gsapLib && typeof gsapLib.killTweensOf === "function") {
      gsapLib.killTweensOf(root.querySelectorAll(`.${CELL_CLASS}, .${BADGE_CLASS}, .${MARK_PROGRESS_CLASS}, .${DELTA_CLASS}, .${ROW_WAVE_CLASS}, .${WIPE_CLASS}`));
    }
    root.classList.remove(ROOT_CLASS);
    toArray(root.querySelectorAll(`.${CELL_CLASS}`)).forEach((cell) => {
      cell.classList.remove(CELL_CLASS, THREAT_CLASS, SCORE_CLASS, DEAD_CLASS, PRESSURE_CLASS);
    });
    toArray(root.querySelectorAll(`.${BADGE_CLASS}`)).forEach((n) => n.classList.remove(BADGE_CLASS, BADGE_BEACON_CLASS, BADGE_BURST_CLASS));
    toArray(root.querySelectorAll(`.${MARK_PROGRESS_CLASS}`)).forEach((n) => n.classList.remove(MARK_PROGRESS_CLASS, MARK_L1_CLASS, MARK_L2_CLASS, MARK_L3_CLASS));
    toArray(root.querySelectorAll(`.${ROW_WAVE_CLASS},.${DELTA_CLASS},.${SPARK_CLASS},.${WIPE_CLASS}`)).forEach((n) => n.remove());
  }

  function reset() {
    clearManagedTimeouts();
    clearMoBursts();
    killAllRowTimelines();
    state.marksByLabel.clear();
    state.rowStateByLabel.clear();
    state.turnToken = "";
    if (state.root) {
      clearRoot(state.root);
      state.root = null;
    }
  }

  function apply() {
    if (!isContextActive()) {
      if (!loggedVariantSkip) {
        debugLog("variant-skip", { reason: "not-cricket-context" });
        loggedVariantSkip = true;
      }
      reset();
      return;
    }
    loggedVariantSkip = false;

    const root = findGridRoot();
    if (!root) {
      reset();
      return;
    }

    if (state.root && state.root !== root) {
      clearRoot(state.root);
      state.marksByLabel.clear();
      state.rowStateByLabel.clear();
      state.turnToken = "";
    }

    state.root = root;
    root.classList.add(ROOT_CLASS);

    const cols = detectColumns(root);
    const rows = buildRows(root, cols);
    if (!rows.length) {
      return;
    }

    const activeCol = getActiveColumn(cols);
    const turnToken = getTurnToken(activeCol);
    if (CFG.roundWipe && state.turnToken && turnToken !== state.turnToken) {
      addWipe(root);
      debugLog("trigger", { type: "turn-change", turnToken });
    }
    state.turnToken = turnToken;

    const seen = new Set();
    let changedRows = 0;

    rows.forEach((row) => {
      seen.add(row.label);
      const marks = row.cells.map((cell) => getMarks(cell, row.label));
      const st = rowState(marks, activeCol);
      const prevMarks = state.marksByLabel.get(row.label) || new Array(row.cells.length).fill(0);
      const prevState = state.rowStateByLabel.get(row.label) || null;

      row.cells.forEach((cell) => {
        cell.classList.add(CELL_CLASS);
        cell.classList.remove(THREAT_CLASS, SCORE_CLASS, DEAD_CLASS, PRESSURE_CLASS);
        if (CFG.threatEdge && st.danger) {
          cell.classList.add(THREAT_CLASS);
        }
        if (CFG.scoringLane && st.score) {
          cell.classList.add(SCORE_CLASS);
        }
        if (CFG.deadRowCollapse && st.dead) {
          cell.classList.add(DEAD_CLASS);
        }
        if (CFG.pressureOverlay && st.pressure) {
          cell.classList.add(PRESSURE_CLASS);
        }
      });

      if (row.badge) {
        row.badge.classList.add(BADGE_CLASS);
        row.badge.classList.toggle(BADGE_BEACON_CLASS, CFG.badgeBeacon && (st.score || st.danger || st.pressure));
      }

      let increased = false;
      for (let i = 0; i < row.cells.length; i += 1) {
        const delta = clampMark(marks[i]) - clampMark(prevMarks[i] || 0);
        if (delta > 0) {
          increased = true;
          animateMark(row.cells[i], marks[i]);
          addDelta(row.cells[i], delta);
          addSpark(row.cells[i]);
        }
      }

      if (increased) {
        changedRows += 1;
        pulseRow(row);
        burstBadge(row);
      } else if (CFG.rowRailPulse && prevState && prevState.key !== st.key && (st.score || st.danger || st.pressure)) {
        changedRows += 1;
        pulseRow(row);
      }

      state.marksByLabel.set(row.label, marks);
      state.rowStateByLabel.set(row.label, st);
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
    toArray(state.rowTimelineByLabel.keys()).forEach((label) => {
      if (!seen.has(label)) {
        killRowTimeline(label);
      }
    });
    if (changedRows > 0) {
      debugLog("trigger", { changedRows, rowsScanned: rows.length });
    }
  }

  const CSS = `
.${ROOT_CLASS}{position:relative;isolation:isolate;}
.${ROOT_CLASS} .${CELL_CLASS}{position:relative;overflow:visible;transition:filter .18s ease,opacity .18s ease,box-shadow .18s ease,background .18s ease;}
.${ROOT_CLASS} .${CELL_CLASS}.${THREAT_CLASS}{box-shadow:inset 3px 0 rgba(245,158,11,.95),inset -3px 0 rgba(245,158,11,.95),inset 0 0 0 1px rgba(245,158,11,.35);}
.${ROOT_CLASS} .${CELL_CLASS}.${SCORE_CLASS}{box-shadow:inset 0 0 0 1px rgba(16,185,129,.42);background-image:linear-gradient(90deg,rgba(16,185,129,.18) 0%,rgba(16,185,129,.04) 28%,rgba(16,185,129,.04) 72%,rgba(16,185,129,.18) 100%);}
.${ROOT_CLASS} .${CELL_CLASS}.${DEAD_CLASS}{filter:grayscale(.88) saturate(.25) brightness(.72);opacity:.72;}
.${ROOT_CLASS} .${CELL_CLASS}.${PRESSURE_CLASS}{box-shadow:inset 0 0 0 1px rgba(251,113,133,.45),inset 0 0 28px rgba(190,24,93,.18);background-image:repeating-linear-gradient(135deg,rgba(251,113,133,.12) 0px,rgba(251,113,133,.12) 8px,rgba(251,113,133,.04) 8px,rgba(251,113,133,.04) 16px);}
.${ROOT_CLASS} .${ROW_WAVE_CLASS}{position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,rgba(56,189,248,0) 0%,rgba(56,189,248,.32) 42%,rgba(125,211,252,.54) 52%,rgba(56,189,248,.32) 62%,rgba(56,189,248,0) 100%);transform:translateX(-110%);animation:adCrfxRowWave .76s cubic-bezier(.2,.7,.2,1) forwards;z-index:6;}
.${ROOT_CLASS} .${BADGE_CLASS}{
  position:absolute !important;
  left:8px !important;
  top:50% !important;
  transform:translateY(-50%);
  z-index:12;
  margin:0 !important;
  white-space:nowrap;
}
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
  debugLog("applied", { effectsEnabled: Object.values(CFG).filter(Boolean).length });
  schedule();

  state.observer = observe({ onChange: schedule });
  if (gameState?.subscribe) {
    state.unsubscribeState = gameState.subscribe(schedule);
  } else {
    state.fallbackIntervalId = setInterval(schedule, 1200);
  }
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule, { passive: true });
  window.addEventListener("beforeunload", cleanupInstance, { once: true });
  window.addEventListener("pagehide", cleanupInstance, { once: true });

  const instanceId = Symbol("adExtCricketGridFxBeta");
  function cleanupInstance() {
    if (state.cleanedUp) {
      return;
    }
    state.cleanedUp = true;

    if (state.observer && typeof state.observer.disconnect === "function") {
      state.observer.disconnect();
      state.observer = null;
    }

    if (typeof state.unsubscribeState === "function") {
      state.unsubscribeState();
      state.unsubscribeState = null;
    }

    if (state.fallbackIntervalId) {
      clearInterval(state.fallbackIntervalId);
      state.fallbackIntervalId = 0;
    }

    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", schedule);
    window.removeEventListener("beforeunload", cleanupInstance);
    window.removeEventListener("pagehide", cleanupInstance);

    reset();

    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].id === instanceId) {
      delete window[INSTANCE_KEY];
    }
  }

  window[INSTANCE_KEY] = {
    id: instanceId,
    cleanup: cleanupInstance,
  };

	debugLog("init", { debug: DEBUG_ENABLED, usesGsap: Boolean(gsapLib), usesMojs: Boolean(mojsLib) });
})();



