// ==UserScript==
// @name         Autodarts Animate Cricket Target Highlighter
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.09
// @description  Hebt im Cricket die offenen, geschlossenen und optional „toten“ Felder (15–20/Bull) für den aktiven Spieler direkt auf dem Board hervor.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js
// ==/UserScript==

(function () {
  "use strict";

  // Skript-Ziel: Cricket-Marks je Spieler lesen und offene/geschlossene Ziele als Board-Overlay markieren.
  /**
   * Konfiguration für Selektoren und Optik.
   * @property {string} variantElementId - Element mit Spielvariante-Text.
   * @property {string|null} tableSelector - Optionaler Selektor für die Cricket-Tabelle.
   * @property {string} playerSelector - Selektor für Spieler-Karten.
   * @property {string} activePlayerSelector - Selektor für den aktiven Spieler.
   * @property {string} markElementSelector - Selektor zum Zählen von Mark-Icons.
   * @property {boolean} showDeadTargets - Auch Ziele markieren, die von allen Spielern geschlossen sind.
   * @property {number} strokeWidthRatio - Strichstärke relativ zum Board-Radius.
   * @property {number} edgePaddingPx - Zusätzlicher Rand für Overlay-Formen.
   * @property {Object} baseColor - Basisfarbe fürs Ausblenden (RGB).
   * @property {Object} opacity - Deckkraft für geschlossen/tot/inaktiv (0..1).
   * @property {Object} ringRatios - Ring-Grenzen des Dartboards.
   */
  const CONFIG = {
    variantElementId: "ad-ext-game-variant",
    tableSelector: null,
    playerSelector: ".ad-ext-player",
    activePlayerSelector: ".ad-ext-player-active",
    markElementSelector:
      "[data-mark], [data-marks], [data-hit], [data-hits], " +
      "[class*='mark'], [class*='hit'], [class*='slash'], [class*='cross'], " +
      ".chakra-icon, svg",
    showDeadTargets: true,
    strokeWidthRatio: 0.006,
    edgePaddingPx: 0.8,
    baseColor: { r: 0, g: 0, b: 0 },
    opacity: {
      closed: 0.9,
      dead: 0.98,
      inactive: 0.92,
    },
    ringRatios: {
      outerBullInner: 0.031112,
      outerBullOuter: 0.075556,
      tripleInner: 0.431112,
      tripleOuter: 0.475556,
      doubleInner: 0.711112,
      doubleOuter: 0.755556,
    },
    debug: true,
  };

  const SEGMENT_ORDER = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];

  const TARGETS = [
    { label: "20", value: 20 },
    { label: "19", value: 19 },
    { label: "18", value: 18 },
    { label: "17", value: 17 },
    { label: "16", value: 16 },
    { label: "15", value: 15 },
    { label: "BULL", ring: "BULL" },
  ];
  const ALL_NUMBER_TARGETS = Array.from({ length: 20 }, (_, index) => {
    const value = index + 1;
    return { label: String(value), value };
  });
  const ALL_TARGETS = [...ALL_NUMBER_TARGETS, { label: "BULL", ring: "BULL" }];
  const CRICKET_LABELS = new Set(TARGETS.map((target) => target.label));

  const LABEL_SET = new Set(TARGETS.map((target) => target.label));

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STYLE_ID = "autodarts-cricket-target-style";
  const OVERLAY_ID = "ad-ext-cricket-targets";
  const TARGET_CLASS = "ad-ext-cricket-target";
  const OPEN_CLASS = "ad-ext-cricket-target--open";
  const CLOSED_CLASS = "ad-ext-cricket-target--closed";
  const DEAD_CLASS = "ad-ext-cricket-target--dead";
  const INACTIVE_CLASS = "ad-ext-cricket-target--inactive";

  let cachedGridRoot = null;
  let lastStateKey = null;
  let lastBoardKey = null;
  const logPrefix = "[Autodarts Cricket Highlighter]";

  function debugLog(...args) {
    if (!CONFIG.debug) {
      return;
    }
    console.log(logPrefix, ...args);
  }

  /**
   * Baut eine RGBA-Farbe aus Basis-RGB und Alpha.
   * @param {number} alpha - Alpha 0..1.
   * @returns {string}
   */
  function rgba(alpha) {
    const { r, g, b } = CONFIG.baseColor;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Fügt die benötigten CSS-Regeln einmalig ein.
   * @returns {void}
   */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
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
`;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          const fallbackTarget = document.head || document.documentElement;
          if (fallbackTarget && !document.getElementById(STYLE_ID)) {
            fallbackTarget.appendChild(style);
          }
        },
        { once: true }
      );
    }
  }

  /**
   * Prüft, ob die aktuelle Spielvariante Cricket ist.
   * @returns {boolean}
   */
  function isCricketVariant() {
    const variantEl = document.getElementById(CONFIG.variantElementId);
    const variant = variantEl?.textContent?.trim().toLowerCase() || "";
    if (variant.startsWith("cricket")) {
      debugLog("Variant detected via #ad-ext-game-variant:", variant);
      return true;
    }
    const hasGrid = Boolean(findCricketGridRoot());
    debugLog("Variant fallback via grid:", hasGrid);
    return hasGrid;
  }

  /**
   * Normalisiert ein Zeilen-Label auf "20".."15" oder "BULL".
   * @param {string|null} text - Rohtext aus der Tabelle.
   * @returns {string}
   */
  function normalizeLabel(text) {
    if (!text) {
      return "";
    }
    const cleaned = text.trim().toUpperCase();
    if (LABEL_SET.has(cleaned)) {
      return cleaned;
    }
    if (cleaned === "25" || cleaned === "BULLSEYE") {
      return "BULL";
    }
    if (cleaned.includes("BULL")) {
      return "BULL";
    }
    return "";
  }

  /**
   * Liefert die Spieler-Karten und den Index des aktiven Spielers.
   * @returns {{players: Element[], activeIndex: number}}
   */
  function getPlayerInfo() {
    const players = Array.from(
      document.querySelectorAll(CONFIG.playerSelector)
    );
    const activeIndex = players.findIndex((player) =>
      player.matches(CONFIG.activePlayerSelector)
    );
    return { players, activeIndex: activeIndex >= 0 ? activeIndex : 0 };
  }

  /**
   * Findet Elemente, die wie Cricket-Zeilenlabels aussehen.
   * @param {Element} scope - Wurzel-Element für die Suche.
   * @returns {Element[]}
   */
  function findLabelNodes(scope) {
    if (!scope) {
      debugLog("findLabelNodes: scope is null");
      return [];
    }
    const nodes = scope.querySelectorAll("div, span, p, td, th");
    const labels = [];
    nodes.forEach((node) => {
      if (node.children.length) {
        return;
      }
      const label = normalizeLabel(node.textContent);
      if (!label) {
        return;
      }
      labels.push(node);
    });
    return labels;
  }

  /**
   * Findet die Cricket-Tabelle anhand von Label-Clustern.
   * @returns {Element|null}
   */
  function findCricketGridRoot() {
    if (CONFIG.tableSelector) {
      const direct = document.querySelector(CONFIG.tableSelector);
      debugLog(
        "findCricketGridRoot: tableSelector",
        CONFIG.tableSelector,
        !!direct
      );
      return direct;
    }

    if (cachedGridRoot && cachedGridRoot.isConnected) {
      debugLog("findCricketGridRoot: using cached root");
      return cachedGridRoot;
    }

    if (!document.body) {
      debugLog("findCricketGridRoot: document.body not ready");
      return null;
    }

    const labelNodes = findLabelNodes(document.body);
    if (labelNodes.length < 4) {
      debugLog("findCricketGridRoot: not enough labels", labelNodes.length);
      return null;
    }

    let best = null;
    labelNodes.forEach((labelNode) => {
      let current = labelNode.parentElement;
      let depth = 0;
      while (current && depth < 6) {
        const count = labelNodes.reduce(
          (total, node) => total + (current.contains(node) ? 1 : 0),
          0
        );
        if (count >= 5) {
          if (
            !best ||
            count > best.count ||
            (count === best.count && depth < best.depth)
          ) {
            best = { node: current, count, depth };
          }
        }
        current = current.parentElement;
        depth += 1;
      }
    });

    cachedGridRoot = best ? best.node : null;
    debugLog("findCricketGridRoot: root found", !!cachedGridRoot);
    return cachedGridRoot;
  }

  /**
   * Findet den Zeilen-Container zu einem Label-Knoten.
   * @param {Element} root - Wurzel der Cricket-Tabelle.
   * @param {Element} labelNode - Label-Element.
   * @returns {Element}
   */
  function findRowContainer(root, labelNode) {
    const tableRow = labelNode.closest("tr, [role='row']");
    if (tableRow && root.contains(tableRow)) {
      return tableRow;
    }

    let current = labelNode.parentElement;
    while (current && current !== root) {
      if (current.children.length >= 2) {
        return current;
      }
      current = current.parentElement;
    }
    return labelNode.parentElement || root;
  }

  /**
   * Wählt die plausibelsten Zellen einer Zeile.
   * @param {Element[]} candidates - Mögliche Zellen.
   * @param {number|null} playerCount - Anzahl der Spieler (falls bekannt).
   * @returns {Element[]}
   */
  function pickCells(candidates, playerCount) {
    if (!candidates.length) {
      return [];
    }
    if (playerCount && candidates.length >= playerCount) {
      return candidates.slice(0, playerCount);
    }
    return candidates;
  }

  /**
   * Passt Zellen an, wenn das Label in einer Spieler-Zelle steckt.
   * @param {Element[]} cells - Gefundene Zellen.
   * @param {Element} labelNode - Label-Element.
   * @param {number|null} playerCount - Anzahl der Spieler.
   * @returns {Element[]}
   */
  function adjustCellsForLabel(cells, labelNode, playerCount) {
    if (!playerCount || !cells.length) {
      return cells;
    }

    let adjusted = [...cells];
    let labelIndex = adjusted.findIndex((cell) => cell.contains(labelNode));

    if (labelIndex === -1 && adjusted.length < playerCount) {
      const labelCell = labelNode.closest("div, td, th");
      if (labelCell && !adjusted.includes(labelCell)) {
        adjusted = [labelCell, ...adjusted];
        labelIndex = adjusted.findIndex((cell) => cell.contains(labelNode));
      }
    }

    if (labelIndex !== -1 && adjusted.length > playerCount) {
      adjusted = adjusted.filter((_, index) => index !== labelIndex);
    }

    return adjusted;
  }

  /**
   * Extrahiert Spieler-Zellen aus einer Zeile.
   * @param {Element} row - Zeilen-Container.
   * @param {Element} labelNode - Label-Element.
   * @param {number|null} playerCount - Anzahl der Spieler (falls bekannt).
   * @returns {Element[]}
   */
  function getRowCells(row, labelNode, playerCount) {
    const directChildren = Array.from(row.children);
    const labelChild = directChildren.find((child) =>
      child.contains(labelNode)
    );

    if (labelChild) {
      const siblings = directChildren.filter((child) => child !== labelChild);
      if (siblings.length) {
        const preferNested =
          siblings.length === 1 &&
          siblings[0].children.length >= (playerCount || 2);
        const cells = preferNested
          ? Array.from(siblings[0].children)
          : [labelChild, ...siblings];
        return pickCells(
          adjustCellsForLabel(cells, labelNode, playerCount),
          playerCount
        );
      }
    }

    const cellCandidates = Array.from(
      row.querySelectorAll("[role='cell'], td, .cell, [class*='cell']")
    ).filter((cell) => !cell.contains(labelNode));

    return pickCells(
      adjustCellsForLabel(cellCandidates, labelNode, playerCount),
      playerCount
    );
  }

  /**
   * Bestimmt Zellen anhand der Zeilen-Ausrichtung (Fallback für getrennte Spalten).
   * @param {Element} root - Wurzel der Cricket-Tabelle.
   * @param {Element} labelNode - Label-Element.
   * @param {number|null} playerCount - Anzahl der Spieler (falls bekannt).
   * @returns {Element[]}
   */
  function getRowCellsByAlignment(root, labelNode, playerCount) {
    const labelRect = labelNode.getBoundingClientRect();
    if (!labelRect.height) {
      return [];
    }

    const rootRect = root.getBoundingClientRect();
    const rowMidY = labelRect.top + labelRect.height / 2;
    const tolerance = Math.max(6, labelRect.height * 0.7);

    const candidates = Array.from(
      root.querySelectorAll("div, span, p, td")
    ).filter((node) => {
      if (node === labelNode) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      if (rect.height < 8 || rect.width < 12) {
        return false;
      }
      if (rect.width > rootRect.width * 0.7) {
        return false;
      }
      const midY = rect.top + rect.height / 2;
      if (Math.abs(midY - rowMidY) > tolerance) {
        return false;
      }
      const hasMark =
        getMarksFromText(node.textContent) !== null ||
        node.querySelector(CONFIG.markElementSelector);
      const hasCellSize = rect.width >= 28 && rect.height >= 18;
      return hasMark || hasCellSize;
    });

    if (!candidates.length) {
      return [];
    }

    const groups = [];
    const sorted = candidates
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          rect,
          centerX: rect.left + rect.width / 2,
          area: rect.width * rect.height,
        };
      })
      .sort((a, b) => a.centerX - b.centerX || a.area - b.area);

    const gap = 8;
    sorted.forEach((entry) => {
      const group = groups.find(
        (item) => Math.abs(item.centerX - entry.centerX) <= gap
      );
      if (!group) {
        groups.push({
          centerX: entry.centerX,
          entries: [entry],
        });
        return;
      }
      group.entries.push(entry);
    });

    const cells = groups
      .map((group) =>
        group.entries.reduce((best, current) =>
          current.area < best.area ? current : best
        )
      )
      .map((entry) => entry.node);

    return pickCells(
      adjustCellsForLabel(cells, labelNode, playerCount),
      playerCount
    );
  }

  /**
   * Liest Marks aus Attributen wie data-marks oder aria-label.
   * @param {Element} element - Ziel-Element.
   * @returns {number|null}
   */
  function getMarksFromAttributes(element) {
    const attributeKeys = [
      "data-marks",
      "data-mark",
      "data-hits",
      "data-hit",
      "data-value",
      "data-count",
      "aria-label",
      "title",
      "alt",
    ];

    for (const key of attributeKeys) {
      const value = element.getAttribute(key);
      if (!value) {
        continue;
      }
      const lowered = value.toLowerCase();
      if (/\bclosed\b/.test(lowered)) {
        return 3;
      }
      if (/\bopen\b/.test(lowered)) {
        return 0;
      }
      const match = value.match(/\b([0-3])\b/);
      if (match) {
        return Number(match[1]);
      }
    }

    for (const [key, value] of Object.entries(element.dataset || {})) {
      if (!/mark|hit|count/i.test(key)) {
        continue;
      }
      const match = String(value).match(/\b([0-3])\b/);
      if (match) {
        return Number(match[1]);
      }
    }

    return null;
  }

  /**
   * Liest Marks aus Zelltext (unterstützt gängige Cricket-Symbole).
   * @param {string|null} text - Zelltext.
   * @returns {number|null}
   */
  function getMarksFromText(text) {
    if (!text) {
      return null;
    }
    const cleaned = text.replace(/\s+/g, "").toUpperCase();
    if (!cleaned) {
      return null;
    }

    if (cleaned.includes("⨂") || cleaned.includes("⊗")) {
      return 3;
    }
    if (cleaned.includes("×") || cleaned.includes("X")) {
      return 2;
    }
    if (cleaned.includes("/")) {
      return 1;
    }

    const digitMatch = cleaned.match(/\b([0-3])\b/);
    if (digitMatch) {
      return Number(digitMatch[1]);
    }

    const slashCount = (cleaned.match(/\//g) || []).length;
    if (slashCount) {
      return Math.min(3, slashCount);
    }

    const barCount = (cleaned.match(/\|/g) || []).length;
    if (barCount) {
      return Math.min(3, barCount);
    }

    const xCount = (cleaned.match(/X/g) || []).length;
    if (xCount) {
      if (cleaned === "X") {
        return 2;
      }
      return Math.min(3, xCount);
    }

    if (cleaned === "O") {
      return 3;
    }

    return null;
  }

  /**
   * Zählt Mark-Icons anhand eines Selektors.
   * @param {Element} cell - Zellen-Element.
   * @returns {number|null}
   */
  function getMarksFromElements(cell) {
    const marks = cell.querySelectorAll(CONFIG.markElementSelector);
    if (!marks.length) {
      return null;
    }
    return Math.min(3, marks.length);
  }

  /**
   * Bestimmt die Marks pro Zelle mit mehreren Heuristiken.
   * @param {Element} cell - Zellen-Element.
   * @returns {number|null}
   */
  function getMarks(cell) {
    if (!cell) {
      return null;
    }

    const directAttributeMarks = getMarksFromAttributes(cell);
    if (directAttributeMarks !== null) {
      return directAttributeMarks;
    }

    const elementMarks = getMarksFromElements(cell);
    if (elementMarks !== null) {
      return elementMarks;
    }

    const textMarks = getMarksFromText(cell.textContent);
    if (textMarks !== null) {
      return textMarks;
    }

    const nestedAttributeTarget =
      cell.querySelector(
        "[data-marks], [data-mark], [data-hits], [data-hit]"
      ) || cell.querySelector("[aria-label], [title], [alt]");

    if (nestedAttributeTarget) {
      const nestedAttributeMarks = getMarksFromAttributes(
        nestedAttributeTarget
      );
      if (nestedAttributeMarks !== null) {
        return nestedAttributeMarks;
      }
    }

    return null;
  }

  /**
   * Prüft, ob eine Zelle visuell leer ist.
   * @param {Element} cell - Zellen-Element.
   * @returns {boolean}
   */
  function isEmptyCell(cell) {
    if (!cell) {
      return false;
    }
    const text = cell.textContent?.trim() || "";
    if (text) {
      return false;
    }
    return !cell.querySelector(CONFIG.markElementSelector);
  }

  /**
   * Baut eine Zustands-Map für den aktiven Spieler.
   * @param {number} playerCount - Anzahl der Spieler.
   * @param {number} activeIndex - Index des aktiven Spielers.
   * @returns {Map<string, {state: string}>|null}
   */
  function getCricketStates(playerCount, activeIndex) {
    const root = findCricketGridRoot();
    if (!root) {
      debugLog("getCricketStates: no grid root");
      return null;
    }

    const labelNodes = findLabelNodes(root);
    if (!labelNodes.length) {
      return null;
    }

    const rows = new Map();
    labelNodes.forEach((labelNode) => {
      const label = normalizeLabel(labelNode.textContent);
      if (!label || rows.has(label)) {
        return;
      }
      const row = findRowContainer(root, labelNode);
      let cells = getRowCells(row, labelNode, playerCount || null);
      let fromAlignment = false;
      if (!cells.length) {
        cells = getRowCellsByAlignment(root, labelNode, playerCount || null);
        fromAlignment = cells.length > 0;
      }
      if (!cells.length) {
        return;
      }
      rows.set(label, { row, cells, fromAlignment });
    });

    if (!rows.size) {
      debugLog("getCricketStates: no rows found");
      return null;
    }

    const stateMap = new Map();
    TARGETS.forEach((target) => {
      const rowInfo = rows.get(target.label);
      if (!rowInfo) {
        return;
      }
      const cells = rowInfo.cells;
      const fromAlignment = rowInfo.fromAlignment;
      const cell = cells[activeIndex] || cells[0];
      let activeMarks = getMarks(cell);
      if (activeMarks === null && fromAlignment && isEmptyCell(cell)) {
        activeMarks = 0;
      }
      if (activeMarks === null) {
        return;
      }

      let allClosed = false;
      if (CONFIG.showDeadTargets) {
        allClosed = cells.every((candidate) => {
          let marks = getMarks(candidate);
          if (marks === null && fromAlignment && isEmptyCell(candidate)) {
            marks = 0;
          }
          return marks !== null && marks >= 3;
        });
      }

      let state = "open";
      if (allClosed) {
        state = "dead";
      } else if (activeMarks >= 3) {
        state = "closed";
      }

      stateMap.set(target.label, { state });
    });

    return stateMap;
  }

  /**
   * Sucht den größten Kreisradius innerhalb eines SVG-Elements.
   * @param {Element} root - SVG- oder Gruppen-Element.
   * @returns {number}
   */
  function getBoardRadius(root) {
    return [...root.querySelectorAll("circle")].reduce((max, circle) => {
      const r = Number.parseFloat(circle.getAttribute("r"));
      return Number.isFinite(r) && r > max ? r : max;
    }, 0);
  }

  /**
   * Findet das wahrscheinlichste Dartboard-SVG.
   * @returns {{group: Element, radius: number} | null}
   */
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

    return { group: bestGroup || best, radius };
  }

  /**
   * Stellt sicher, dass eine Overlay-Gruppe existiert.
   * @param {Element} boardGroup - SVG-Gruppe.
   * @returns {SVGGElement}
   */
  function ensureOverlayGroup(boardGroup) {
    let overlay = boardGroup.querySelector(`#${OVERLAY_ID}`);
    if (!overlay) {
      overlay = document.createElementNS(SVG_NS, "g");
      overlay.id = OVERLAY_ID;
      boardGroup.appendChild(overlay);
    }
    return overlay;
  }

  /**
   * Entfernt vorhandene Ziel-Overlays.
   * @param {Element} overlay - Overlay-Gruppe.
   * @returns {void}
   */
  function clearOverlay(overlay) {
    while (overlay.firstChild) {
      overlay.removeChild(overlay.firstChild);
    }
  }

  /**
   * Wandelt Polar- in SVG-Koordinaten um.
   * @param {number} r - Radius.
   * @param {number} deg - Winkel in Grad.
   * @returns {{x: number, y: number}}
   */
  function polar(r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
  }

  /**
   * Baut einen Keil-Pfad zwischen zwei Radien.
   * @param {number} rInner - Innenradius.
   * @param {number} rOuter - Außenradius.
   * @param {number} startDeg - Startwinkel.
   * @param {number} endDeg - Endwinkel.
   * @returns {string}
   */
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

  /**
   * Baut einen Ring-Pfad zwischen zwei Radien.
   * @param {number} rInner - Innenradius.
   * @param {number} rOuter - Außenradius.
   * @returns {string}
   */
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

  /**
   * Berechnet die Winkelgrenzen für ein Segment.
   * @param {number} value - Segmentwert 1..20.
   * @returns {{start: number, end: number} | null}
   */
  function segmentAngles(value) {
    const index = SEGMENT_ORDER.indexOf(value);
    if (index === -1) {
      return null;
    }
    const center = index * 18;
    return { start: center - 9, end: center + 9 };
  }

  /**
   * Erstellt einen Keil für das Board-Overlay.
   * @param {number} radius - Board-Radius.
   * @param {number} innerRatio - Innenanteil.
   * @param {number} outerRatio - Außenanteil.
   * @param {number} startDeg - Startwinkel.
   * @param {number} endDeg - Endwinkel.
   * @returns {SVGPathElement}
   */
  function createWedge(radius, innerRatio, outerRatio, startDeg, endDeg) {
    const path = document.createElementNS(SVG_NS, "path");
    const padding = CONFIG.edgePaddingPx || 0;
    const rInner = Math.max(0, radius * innerRatio);
    const rOuter = Math.max(rInner + 0.5, radius * outerRatio + padding);
    path.setAttribute("d", wedgePath(rInner, rOuter, startDeg, endDeg));
    return path;
  }

  /**
   * Erstellt Bull-Ring oder -Kreis.
   * @param {number} radius - Board-Radius.
   * @param {number} innerRatio - Innenanteil.
   * @param {number} outerRatio - Außenanteil.
   * @param {boolean} solid - true für gefüllten Kreis.
   * @returns {SVGElement}
   */
  function createBull(radius, innerRatio, outerRatio, solid) {
    const padding = CONFIG.edgePaddingPx || 0;
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
    return ring;
  }

  /**
   * Baut die Highlight-Formen für ein Ziel.
   * @param {number} radius - Board-Radius.
   * @param {{label: string, value?: number, ring?: string}} target - Zielinfo.
   * @returns {SVGElement[]}
   */
  function buildTargetShapes(radius, target) {
    const ratios = CONFIG.ringRatios;
    const shapes = [];

    if (target.ring === "BULL") {
      shapes.push(createBull(radius, 0, ratios.outerBullInner, true));
      shapes.push(
        createBull(radius, ratios.outerBullInner, ratios.outerBullOuter, false)
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
        angles.end
      )
    );
    shapes.push(
      createWedge(
        radius,
        ratios.tripleInner,
        ratios.tripleOuter,
        angles.start,
        angles.end
      )
    );
    shapes.push(
      createWedge(
        radius,
        ratios.tripleOuter,
        ratios.doubleInner,
        angles.start,
        angles.end
      )
    );
    shapes.push(
      createWedge(
        radius,
        ratios.doubleInner,
        ratios.doubleOuter,
        angles.start,
        angles.end
      )
    );

    return shapes;
  }

  /**
   * Setzt CSS-Variablen für das Overlay.
   * @param {SVGGElement} overlay - Overlay-Gruppe.
   * @param {number} radius - Board-Radius.
   * @returns {void}
   */
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
      rgba(CONFIG.opacity.dead)
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-dead-stroke",
      rgba(Math.min(1, CONFIG.opacity.dead + 0.09))
    );
    overlay.style.setProperty("--ad-ext-cricket-dead-opacity", "1");
    overlay.style.setProperty(
      "--ad-ext-cricket-inactive-fill",
      rgba(CONFIG.opacity.inactive)
    );
    overlay.style.setProperty(
      "--ad-ext-cricket-inactive-stroke",
      rgba(Math.min(1, CONFIG.opacity.inactive + 0.09))
    );
    overlay.style.setProperty("--ad-ext-cricket-inactive-opacity", "1");
    const strokeWidth = Math.max(1, radius * CONFIG.strokeWidthRatio);
    overlay.style.setProperty(
      "--ad-ext-cricket-stroke-width",
      `${strokeWidth}px`
    );
  }

  /**
   * Rendert die Ziel-Overlays anhand des aktuellen Zustands.
   * @param {Map<string, {state: string}>} stateMap - Map der Zielzustände.
   * @returns {void}
   */
  function renderTargets(stateMap) {
    const board = findBoard();
    if (!board) {
      return;
    }

    const overlay = ensureOverlayGroup(board.group);
    applyOverlayTheme(overlay, board.radius);
    clearOverlay(overlay);

    ALL_TARGETS.forEach((target) => {
      const isCricketTarget = CRICKET_LABELS.has(target.label);
      const stateInfo = stateMap.get(target.label);
      if (isCricketTarget && !stateInfo) {
        return;
      }
      const shapes = buildTargetShapes(board.radius, target);
      shapes.forEach((shape) => {
        shape.classList.add(TARGET_CLASS);
        if (!isCricketTarget) {
          shape.classList.add(INACTIVE_CLASS);
        } else if (stateInfo.state === "dead") {
          shape.classList.add(DEAD_CLASS);
        } else if (stateInfo.state === "closed") {
          shape.classList.add(CLOSED_CLASS);
        } else {
          shape.classList.add(OPEN_CLASS);
        }
        overlay.appendChild(shape);
      });
    });
  }

  /**
   * Erstellt einen kompakten Status-Key, um unnötige Updates zu vermeiden.
   * @param {Map<string, {state: string}>} stateMap - Map der Zielzustände.
   * @returns {string}
   */
  function buildStateKey(stateMap) {
    return TARGETS.map((target) => {
      const state = stateMap.get(target.label);
      return `${target.label}:${state ? state.state : ""}`;
    }).join("|");
  }

  /**
   * Haupt-Update-Routine.
   * @returns {void}
   */
  function updateTargets() {
    if (!isCricketVariant()) {
      const board = findBoard();
      if (board) {
        clearOverlay(ensureOverlayGroup(board.group));
      }
      lastStateKey = null;
      lastBoardKey = null;
      debugLog("updateTargets: not cricket");
      return;
    }

    const { players, activeIndex } = getPlayerInfo();
    const playerCount = players.length || null;
    const stateMap = getCricketStates(playerCount, activeIndex);
    if (!stateMap || !stateMap.size) {
      debugLog("updateTargets: no state map");
      return;
    }

    const board = findBoard();
    if (!board) {
      debugLog("updateTargets: no board");
      return;
    }

    const boardKey = `${board.radius}:${board.group.id || "board"}`;
    const stateKey = buildStateKey(stateMap);
    if (stateKey === lastStateKey && boardKey === lastBoardKey) {
      debugLog("updateTargets: no changes");
      return;
    }

    lastStateKey = stateKey;
    lastBoardKey = boardKey;
    debugLog("updateTargets: render", stateKey);
    renderTargets(stateMap);
  }

  let scheduled = false;
  /**
   * Fasst viele DOM-Änderungen zu einem Update pro Frame zusammen.
   * @returns {void}
   */
  function scheduleUpdate() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateTargets();
    });
  }

  ensureStyle();
  updateTargets();

  // Beobachtet DOM-Änderungen der Cricket-Tabelle und des aktiven Spielers.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "childList" ||
        mutation.type === "characterData" ||
        mutation.type === "attributes"
      ) {
        scheduleUpdate();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
})();
