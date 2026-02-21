// ==UserScript==
// @name         Autodarts Animate Cricket Closeout Radar [Beta]
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0-beta.1
// @description  Zeigt bei Cricket-Drucksituationen einen Radar-Impuls am betroffenen Ziel-Badge.
// @xconfig-description  Beta: mo.js Radar-Puls bei Danger/Pressure-Übergängen mit GameState-Diff und CSS-Fallback.
// @xconfig-title  Cricket Closeout Radar [Beta]
// @xconfig-variant      cricket
// @xconfig-readme-anchor  animation-autodarts-animate-cricket-closeout-radar
// @xconfig-tech-anchor  animation-autodarts-animate-cricket-closeout-radar
// @xconfig-background     assets/Autodarts-Animate-Cricket-Grid-FX.png

// @xconfig-settings-version 1
// @xconfig-beta         true
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-animation-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/autodarts-game-state-shared.js
// @require      https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/vendor/mo.umd.min.js
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Cricket%20Closeout%20Radar%20Beta.user.js
// @updateURL    https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Animation/Autodarts%20Animate%20Cricket%20Closeout%20Radar%20Beta.user.js
// ==/UserScript==

(function () {
  "use strict";

  const INSTANCE_KEY = "__adExtCricketCloseoutRadarBeta";
  const previous = window[INSTANCE_KEY];
  if (previous && typeof previous.cleanup === "function") {
    try {
      previous.cleanup();
    } catch (_) {
      // ignore stale instance cleanup
    }
  }

  // xConfig: {"type":"toggle","label":"Danger-Radar","description":"Radar bei neuen Danger-Zuständen aktivieren.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_DANGER_RADAR = true;
  // xConfig: {"type":"toggle","label":"Pressure-Radar","description":"Radar bei neuen Pressure-Zuständen aktivieren.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
  const xConfig_PRESSURE_RADAR = true;
  // xConfig: {"type":"select","label":"Cooldown","description":"Mindestabstand zwischen zwei Radar-Impulsen pro Ziel.","options":[{"value":550,"label":"Kurz"},{"value":850,"label":"Standard"},{"value":1200,"label":"Lang"}]}
  const xConfig_COOLDOWN_MS = 850;
  // xConfig: {"type":"toggle","label":"Debug","description":"Nur bei Fehlersuche aktivieren. Zeigt zusätzliche Hinweise in der Browser-Konsole.","options":[{"value":false,"label":"Aus"},{"value":true,"label":"An"}]}
  const xConfig_DEBUG = false;

  const shared = window.autodartsAnimationShared || {};
  const gameState = window.autodartsGameStateShared || null;
  const mojsLib = window.mojs || null;

  const createRafScheduler = typeof shared.createRafScheduler === "function"
    ? shared.createRafScheduler
    : function fallbackScheduler(callback) {
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

  const observeMutations = typeof shared.observeMutations === "function"
    ? shared.observeMutations
    : function fallbackObserver(options) {
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

  const ensureStyle = typeof shared.ensureStyle === "function" ? shared.ensureStyle : null;

  const TARGETS = ["20", "19", "18", "17", "16", "15", "BULL"];
  const STYLE_ID = "ad-ext-cricket-closeout-radar-style";
  const BADGE_CLASS = "ad-ext-ccr-badge";
  const PULSE_CLASS = "ad-ext-ccr-badge-pulse";

  const STYLE_TEXT = `
.${BADGE_CLASS} {
  position: relative;
  isolation: isolate;
}
.${BADGE_CLASS}.${PULSE_CLASS}::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  border: 2px solid rgba(56,189,248,.85);
  pointer-events: none;
  animation: adExtCcrPulse .55s ease-out forwards;
}
@keyframes adExtCcrPulse {
  0% { opacity: .95; transform: scale(.65); }
  100% { opacity: 0; transform: scale(1.55); }
}
`;

  function resolveToggle(value, fallbackValue) {
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value || "").trim().toLowerCase();
    if (["1", "true", "yes", "on", "aktiv", "active"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off", "inaktiv", "inactive"].includes(normalized)) {
      return false;
    }
    return fallbackValue;
  }

  function resolveNumberChoice(value, fallbackValue, allowedValues) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && allowedValues.includes(numeric)) {
      return numeric;
    }
    return fallbackValue;
  }

  const CFG = {
    dangerRadar: resolveToggle(xConfig_DANGER_RADAR, true),
    pressureRadar: resolveToggle(xConfig_PRESSURE_RADAR, true),
    cooldownMs: resolveNumberChoice(xConfig_COOLDOWN_MS, 850, [550, 850, 1200]),
    debug: resolveToggle(xConfig_DEBUG, false),
  };

  function debugLog(event, payload) {
    if (!CFG.debug) {
      return;
    }
    if (typeof payload === "undefined") {
      console.log(`[xConfig][Cricket Closeout Radar Beta] ${event}`);
      return;
    }
    console.log(`[xConfig][Cricket Closeout Radar Beta] ${event}`, payload);
  }

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

  function normLabel(text) {
    const raw = String(text || "").toUpperCase();
    if (!raw.trim()) {
      return "";
    }
    if (raw.includes("BULL") || raw.includes("25")) {
      return "BULL";
    }
    const match = raw.match(/\b(20|19|18|17|16|15)\b/);
    return match ? match[1] : "";
  }

  function isCricketVariantActive() {
    if (gameState && typeof gameState.isCricketVariant === "function") {
      return gameState.isCricketVariant({ allowMissing: false, allowEmpty: false });
    }
    const variantText = String(document.getElementById("ad-ext-game-variant")?.textContent || "")
      .trim()
      .toLowerCase();
    return variantText === "cricket" || variantText.startsWith("cricket ");
  }

  function countLabels(root) {
    const labels = new Set();
    toArray(root?.querySelectorAll("p,span,div,td,th")).forEach((node) => {
      const label = normLabel(node.textContent);
      if (label) {
        labels.add(label);
      }
    });
    return labels.size;
  }

  const state = {
    root: null,
    rowStateByLabel: new Map(),
    lastRadarAtByLabel: new Map(),
    observer: null,
    unsubscribeState: null,
    fallbackIntervalId: 0,
    cleanupTimeouts: new Set(),
    cleanedUp: false,
  };

  function setManagedTimeout(callback, delayMs) {
    const handle = setTimeout(() => {
      state.cleanupTimeouts.delete(handle);
      callback();
    }, Math.max(0, Number(delayMs) || 0));
    state.cleanupTimeouts.add(handle);
    return handle;
  }

  function clearManagedTimeouts() {
    state.cleanupTimeouts.forEach((handle) => clearTimeout(handle));
    state.cleanupTimeouts.clear();
  }

  function findGridRoot() {
    if (state.root && state.root.isConnected && countLabels(state.root) >= 5) {
      return state.root;
    }

    let best = null;
    const labeledNodes = toArray(document.querySelectorAll("p,span,div,td,th")).filter((node) => normLabel(node.textContent));
    labeledNodes.forEach((node) => {
      let cursor = node.parentElement;
      let depth = 0;
      while (cursor && depth < 8) {
        const labelCount = countLabels(cursor);
        if (labelCount >= 5) {
          const display = getComputedStyle(cursor).display || "";
          let score = labelCount * 100;
          if (display.includes("grid")) {
            score += 60;
          }
          score -= depth * 3;
          if (!best || score > best.score) {
            best = { node: cursor, score };
          }
        }
        cursor = cursor.parentElement;
        depth += 1;
      }
    });

    state.root = best ? best.node : null;
    return state.root;
  }

  function detectColumns(root) {
    const children = toArray(root?.children).filter((node) => node.nodeType === 1);
    const labelIndexes = [];

    children.forEach((cell, index) => {
      if (normLabel(cell.textContent)) {
        labelIndexes.push(index);
      }
    });

    if (labelIndexes.length >= 2) {
      const diffs = [];
      for (let i = 1; i < labelIndexes.length; i += 1) {
        const diff = labelIndexes[i] - labelIndexes[i - 1];
        if (diff > 0 && diff <= 8) {
          diffs.push(diff);
        }
      }
      if (diffs.length > 0) {
        const histogram = new Map();
        diffs.forEach((value) => histogram.set(value, (histogram.get(value) || 0) + 1));
        let best = null;
        histogram.forEach((count, diff) => {
          if (!best || count > best.count) {
            best = { diff, count };
          }
        });
        if (best && best.diff) {
          return best.diff;
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
    const candidates = toArray(cell.querySelectorAll("p,span,div")).filter((node) => normLabel(node.textContent) === label);
    if (!candidates.length) {
      return null;
    }

    const sorted = candidates
      .map((node) => ({ node, left: node.getBoundingClientRect().left }))
      .sort((a, b) => a.left - b.left);

    return sorted[0].node;
  }

  function buildRows(root, columns) {
    const rows = new Map();
    const children = toArray(root?.children).filter((node) => node.nodeType === 1);

    for (let index = 0; index < children.length; index += 1) {
      const label = normLabel(children[index].textContent);
      if (!label || rows.has(label)) {
        continue;
      }
      const cells = children.slice(index, index + columns);
      if (cells.length < columns) {
        continue;
      }
      if (cells.slice(1).some((cell) => normLabel(cell.textContent))) {
        continue;
      }
      rows.set(label, { label, cells, badge: findBadge(cells[0], label) });
    }

    return TARGETS.map((label) => rows.get(label)).filter(Boolean);
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
    const numeric = text.match(/\b([0-3])\b/);
    if (numeric) {
      return Number(numeric[1]);
    }
    return null;
  }

  function marksFromAttrs(cell) {
    if (!cell) {
      return null;
    }
    const keys = ["data-marks", "data-mark", "data-hits", "data-hit", "data-value", "aria-label", "title", "alt"];
    for (const key of keys) {
      const parsed = parseMarkString(cell.getAttribute(key));
      if (parsed !== null) {
        return parsed;
      }
    }
    for (const [key, value] of Object.entries(cell.dataset || {})) {
      if (!/mark|hit|count|value/i.test(key)) {
        continue;
      }
      const parsed = parseMarkString(value);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  }

  function getMarks(cell, rowLabel) {
    const attrMarks = marksFromAttrs(cell);
    if (attrMarks !== null) {
      return clampMark(attrMarks);
    }

    const iconNodes = toArray(cell.querySelectorAll("img,svg,[aria-label],[title],[alt]"));
    let parsedBest = null;
    iconNodes.forEach((node) => {
      const parsed = parseMarkString(node.getAttribute("alt"))
        ?? parseMarkString(node.getAttribute("aria-label"))
        ?? parseMarkString(node.getAttribute("title"));
      if (parsed !== null) {
        parsedBest = parsedBest === null ? parsed : Math.max(parsedBest, parsed);
      }
    });

    if (parsedBest !== null) {
      return clampMark(parsedBest);
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
    if (/[@\u2297\u2A02\u29BB]/u.test(text)) {
      return 3;
    }
    if (/[X\u00D7\u2715\u2716\u2573]/u.test(text)) {
      return 2;
    }
    if (text.includes("/")) {
      return 1;
    }
    const numeric = text.match(/\b([0-3])\b/);
    return numeric ? clampMark(numeric[1]) : 0;
  }

  function getActiveColumn(columns) {
    const stateIndex = typeof gameState?.getActivePlayerIndex === "function" ? gameState.getActivePlayerIndex() : null;
    if (Number.isFinite(stateIndex) && stateIndex >= 0 && columns > 0) {
      return stateIndex < columns ? stateIndex : stateIndex % columns;
    }

    const players = toArray(document.querySelectorAll(".ad-ext-player"));
    const activeIndex = players.findIndex((node) => node.classList.contains("ad-ext-player-active"));
    if (activeIndex >= 0 && columns > 0) {
      return activeIndex < columns ? activeIndex : activeIndex % columns;
    }
    return 0;
  }

  function rowState(marks, activeCol) {
    const normalized = marks.map((mark) => clampMark(mark));
    const active = normalized[Math.max(0, Math.min(activeCol, normalized.length - 1))] || 0;
    const opp = normalized.filter((_, index) => index !== activeCol);
    const oppClosed = opp.some((value) => value >= 3);
    const oppOpen = opp.some((value) => value < 3);
    const dead = normalized.length > 1 && normalized.every((value) => value >= 3);
    const score = active >= 3 && oppOpen && !dead;
    const danger = active < 3 && oppClosed && !dead;
    const pressure = active <= 1 && oppClosed && !dead && !score;
    return {
      score,
      danger,
      pressure,
      dead,
      key: `${normalized.join(",")}|${score ? 1 : 0}${danger ? 1 : 0}${pressure ? 1 : 0}${dead ? 1 : 0}`,
    };
  }

  function emitRadarAtBadge(badge, level) {
    if (!badge) {
      return;
    }

    const now = Date.now();
    const key = String(badge.textContent || badge.dataset?.label || badge.className || "badge");
    const previousAt = state.lastRadarAtByLabel.get(key) || 0;
    if (now - previousAt < CFG.cooldownMs) {
      return;
    }
    state.lastRadarAtByLabel.set(key, now);

    badge.classList.add(BADGE_CLASS);

    if (mojsLib && typeof mojsLib.Burst === "function") {
      try {
        const rect = badge.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const burst = new mojsLib.Burst({
          left: centerX,
          top: centerY,
          radius: { 0: level === "danger" ? 52 : 44 },
          count: level === "danger" ? 12 : 9,
          children: {
            shape: ["circle", "line"],
            stroke: level === "danger"
              ? ["#f59e0b", "#f97316", "#fde68a"]
              : ["#fb7185", "#ec4899", "#fbcfe8"],
            strokeWidth: { 4: 0 },
            radius: { 7: 0 },
            duration: 520,
            easing: "quad.out",
          },
        });
        burst.replay();
        return;
      } catch (_) {
        // fallback to css pulse
      }
    }

    badge.classList.remove(PULSE_CLASS);
    void badge.offsetWidth;
    badge.classList.add(PULSE_CLASS);
    setManagedTimeout(() => badge.classList.remove(PULSE_CLASS), 600);
  }

  function apply() {
    if (!isCricketVariantActive()) {
      state.rowStateByLabel.clear();
      state.lastRadarAtByLabel.clear();
      return;
    }

    const root = findGridRoot();
    if (!root) {
      return;
    }

    state.root = root;
    const cols = detectColumns(root);
    const rows = buildRows(root, cols);
    if (!rows.length) {
      return;
    }

    const activeCol = getActiveColumn(cols);

    rows.forEach((row) => {
      const marks = row.cells.map((cell) => getMarks(cell, row.label));
      const nextState = rowState(marks, activeCol);
      const previousState = state.rowStateByLabel.get(row.label);

      const dangerActivated = CFG.dangerRadar && nextState.danger && !previousState?.danger;
      const pressureActivated = CFG.pressureRadar && nextState.pressure && !previousState?.pressure;

      if (dangerActivated) {
        emitRadarAtBadge(row.badge, "danger");
        debugLog("radar", { row: row.label, kind: "danger" });
      } else if (pressureActivated) {
        emitRadarAtBadge(row.badge, "pressure");
        debugLog("radar", { row: row.label, kind: "pressure" });
      }

      state.rowStateByLabel.set(row.label, nextState);
    });

    const currentLabels = new Set(rows.map((row) => row.label));
    Array.from(state.rowStateByLabel.keys()).forEach((label) => {
      if (!currentLabels.has(label)) {
        state.rowStateByLabel.delete(label);
      }
    });
  }

  const scheduleApply = createRafScheduler(apply);

  function cleanup() {
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

    clearManagedTimeouts();

    window.removeEventListener("resize", scheduleApply);
    document.removeEventListener("visibilitychange", scheduleApply);
    window.removeEventListener("beforeunload", cleanup);
    window.removeEventListener("pagehide", cleanup);

    if (window[INSTANCE_KEY] && window[INSTANCE_KEY].cleanup === cleanup) {
      delete window[INSTANCE_KEY];
    }
  }

  if (typeof ensureStyle === "function") {
    ensureStyle(STYLE_ID, STYLE_TEXT);
  }

  state.observer = observeMutations({
    target: document.documentElement,
    onChange: scheduleApply,
  });

  if (gameState && typeof gameState.subscribe === "function") {
    state.unsubscribeState = gameState.subscribe(scheduleApply);
  } else {
    state.fallbackIntervalId = setInterval(scheduleApply, 1200);
  }

  window.addEventListener("resize", scheduleApply, { passive: true });
  document.addEventListener("visibilitychange", scheduleApply, { passive: true });
  window.addEventListener("beforeunload", cleanup, { once: true });
  window.addEventListener("pagehide", cleanup, { once: true });

  window[INSTANCE_KEY] = {
    cleanup,
  };

  scheduleApply();
  debugLog("init", {
    dangerRadar: CFG.dangerRadar,
    pressureRadar: CFG.pressureRadar,
    cooldownMs: CFG.cooldownMs,
    usesMojs: Boolean(mojsLib && typeof mojsLib.Burst === "function"),
  });
})();


