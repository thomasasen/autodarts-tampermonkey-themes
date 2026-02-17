// ==UserScript==
// @name         Autodarts Animate Cricket Target Highlighter
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      2.2
// @description  Zeigt im Cricket die Zielzustände (offen, geschlossen, punktbar, tot) als Board-Overlay.
// @xconfig-description  Liest Cricket-Marks pro Spieler und visualisiert Zielzustände für 15-20 und Bull direkt auf dem Board.
// @xconfig-variant      cricket
// @xconfig-readme-anchor  animation-autodarts-animate-cricket-target-highlighter
// @xconfig-background     assets/animation-cricket-target-highlighter-xConfig.png
// @xconfig-settings-version 2
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-animation-shared.js
// @require      https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/autodarts-game-state-shared.js
// @grant        none
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js
// ==/UserScript==
(function () {
		"use strict";

		// xConfig: {"type":"toggle","label":"Dead-Ziele anzeigen","description":"Zeigt auch Ziele an, die von allen Spielern bereits geschlossen wurden.","options":[{"value":true,"label":"An"},{"value":false,"label":"Aus"}]}
		const xConfig_DEAD_ZIELE_ANZEIGEN = true;
		// xConfig: {"type":"select","label":"Farbthema","description":"Wählt das Farbschema für Score- und Danger-Ziele.","options":[{"value":"standard","label":"Standard"},{"value":"high-contrast","label":"High Contrast"}]}
		const xConfig_FARBTHEMA = "standard";
		// xConfig: {"type":"select","label":"Intensität","description":"Steuert Deckkraft und Kontrast der Overlay-Hervorhebungen.","options":[{"value":"subtle","label":"Dezent"},{"value":"normal","label":"Standard"},{"value":"strong","label":"Stark"}]}
		const xConfig_INTENSITAET = "normal";

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

		const CRICKET_THEME_PRESETS = {
			standard: {
				score: {r: 0, g: 178, b: 135},
				danger: {r: 222, g: 120, b: 0},
			},
			"high-contrast": {
				score: {r: 34, g: 197, b: 94},
				danger: {r: 239, g: 68, b: 68},
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

		const RESOLVED_SHOW_DEAD_TARGETS = resolveToggle(xConfig_DEAD_ZIELE_ANZEIGEN, true);
		const RESOLVED_THEME_KEY = resolveStringChoice(xConfig_FARBTHEMA, "standard", ["standard", "high-contrast"]);
		const RESOLVED_INTENSITY_KEY = resolveStringChoice(xConfig_INTENSITAET, "normal", ["subtle", "normal", "strong"]);
		const RESOLVED_THEME = CRICKET_THEME_PRESETS[RESOLVED_THEME_KEY] || CRICKET_THEME_PRESETS.standard;
		const RESOLVED_INTENSITY = CRICKET_INTENSITY_PRESETS[RESOLVED_INTENSITY_KEY] || CRICKET_INTENSITY_PRESETS.normal;

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
			createBull
		} = window.autodartsAnimationShared;
		const gameStateShared = window.autodartsGameStateShared || null;

		// Skript-Ziel: Cricket-Marks je Spieler lesen und die ZustÃ¤nde als Board-Overlay darstellen.
		// Ablauf:
		// 1) Ermittelt die Cricket-Tabelle und die Spieleranzahl (funktioniert mit 1, 2 und mehr Spielern).
		// 2) Liest pro Zeile (15-20, Bull) die Marks aus Symbolen/Icons/alt-Texten.
		// 3) Berechnet daraus den Status je Ziel:
		//    - offen: Spieler hat <3 Marks und kein Gegner ist bereits geschlossen.
		//    - geschlossen: Spieler hat 3 Marks, alle Gegner ebenfalls geschlossen.
		//    - score: Spieler hat 3 Marks, mindestens ein Gegner ist noch offen (Punkten mÃ¶glich).
		//    - danger: Spieler ist offen, mindestens ein Gegner hat bereits geschlossen (Gegner kann punkten).
		//    - tot: alle Spieler haben geschlossen (keine Punkte mehr mÃ¶glich).
		// 4) Rendert ein SVG-Overlay auf dem Board:
		//    - Nicht-Cricket-Felder (1-14) werden ausgeblendet.
		//    - Cricket-Ziele werden je Status eingefÃ¤rbt (konfigurierbar am Skriptanfang).
		/**
   * Konfiguration fÃ¼r Selektoren und Optik.
   * @property {string} variantElementId - Element mit Spielvariante-Text.
   * @property {string|null} tableSelector - Optionaler Selektor fÃ¼r die Cricket-Tabelle.
   * @property {string} playerSelector - Selektor fÃ¼r Spieler-Karten.
   * @property {string} activePlayerSelector - Selektor fÃ¼r den aktiven Spieler.
   * @property {string} markElementSelector - Selektor zum ZÃ¤hlen von Mark-Icons.
   * @property {boolean} showDeadTargets - Auch Ziele markieren, die von allen Spielern geschlossen sind.
   * @property {number} strokeWidthRatio - StrichstÃ¤rke relativ zum Board-Radius.
   * @property {number} edgePaddingPx - ZusÃ¤tzlicher Rand fÃ¼r Overlay-Formen.
   * @property {Object} baseColor - Basisfarbe fÃ¼rs Ausblenden (RGB).
   * @property {Object} opacity - Deckkraft fÃ¼r geschlossen/tot/inaktiv (0..1).
   * @property {Object} highlight - Farben fÃ¼r Score/Danger-Highlights.
   * @property {Object} ringRatios - Ring-Grenzen des Dartboards.
   */
		const CONFIG = {
			variantElementId: "ad-ext-game-variant",
			tableSelector: null,
			playerSelector: ".ad-ext-player",
			activePlayerSelector: ".ad-ext-player-active",
			markElementSelector: "[data-mark], [data-marks], [data-hit], [data-hits], " + "[class*='mark'], [class*='hit'], [class*='slash'], [class*='cross'], " + ".chakra-icon, svg, img[alt]",
			showDeadTargets: RESOLVED_SHOW_DEAD_TARGETS,
			strokeWidthRatio: 0.006,
			edgePaddingPx: 0.8,
			baseColor: {
				r: 90,
				g: 90,
				b: 90
			},
			opacity: {
				closed: RESOLVED_INTENSITY.closed,
				dead: RESOLVED_INTENSITY.dead,
				inactive: RESOLVED_INTENSITY.inactive
			},
			highlight: {
				score: {
					r: RESOLVED_THEME.score.r,
					g: RESOLVED_THEME.score.g,
					b: RESOLVED_THEME.score.b,
					opacity: RESOLVED_INTENSITY.highlightOpacity,
					strokeBoost: RESOLVED_INTENSITY.strokeBoost
				},
				danger: {
					r: RESOLVED_THEME.danger.r,
					g: RESOLVED_THEME.danger.g,
					b: RESOLVED_THEME.danger.b,
					opacity: RESOLVED_INTENSITY.highlightOpacity,
					strokeBoost: RESOLVED_INTENSITY.strokeBoost
				}
			},
			ringRatios: {
				outerBullInner: 0.031112,
				outerBullOuter: 0.075556,
				tripleInner: 0.431112,
				tripleOuter: 0.475556,
				doubleInner: 0.711112,
				doubleOuter: 0.755556
			},
			debug: false
		};

		const TARGETS = [
			{
				label: "20",
				value: 20
			},
			{
				label: "19",
				value: 19
			},
			{
				label: "18",
				value: 18
			},
			{
				label: "17",
				value: 17
			}, {
				label: "16",
				value: 16
			}, {
				label: "15",
				value: 15
			}, {
				label: "BULL",
				ring: "BULL"
			},
		];
		const ALL_NUMBER_TARGETS = Array.from({
			length: 20
		}, (_, index) => {
			const value = index + 1;
			return {label: String(value), value};
		});
		const ALL_TARGETS = [
			... ALL_NUMBER_TARGETS, {
				label: "BULL",
				ring: "BULL"
			}
		];
		const CRICKET_LABELS = new Set(TARGETS.map((target) => target.label));

		const LABEL_SET = new Set(TARGETS.map((target) => target.label));

		const STYLE_ID = "autodarts-cricket-target-style";
		const OVERLAY_ID = "ad-ext-cricket-targets";
		const TARGET_CLASS = "ad-ext-cricket-target";
		const OPEN_CLASS = "ad-ext-cricket-target--open";
		const CLOSED_CLASS = "ad-ext-cricket-target--closed";
		const DEAD_CLASS = "ad-ext-cricket-target--dead";
		const INACTIVE_CLASS = "ad-ext-cricket-target--inactive";
		const SCORE_CLASS = "ad-ext-cricket-target--score";
		const DANGER_CLASS = "ad-ext-cricket-target--danger";

		let cachedGridRoot = null;
		let lastStateKey = null;
		let lastBoardKey = null;
		const logPrefix = "[Autodarts Cricket Highlighter]";

		function debugLog(...args) {
			if (! CONFIG.debug) {
				return;
			}
			console.log(logPrefix, ...args);
		}

		/**
   * Baut eine RGBA-Farbe aus Basis-RGB und Alpha.
   * @param {number} alpha - Alpha 0..1.
   * @returns {string}
   */
		function rgba(alpha, color = CONFIG.baseColor) {
			const {r, g, b} = color;
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}

		/**
   * FÃ¼gt die benÃ¶tigten CSS-Regeln einmalig ein.
   * @returns {void}
   */
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
				const fromState = gameStateShared.isCricketVariant({
					allowMissing: false,
					allowEmpty: false
				});
				if (fromState) {
					return true;
				}
			}

			const variantEl = document.getElementById(CONFIG.variantElementId);
			if (! variantEl) {
				debugLog("Variant element missing:", CONFIG.variantElementId);
				return false;
			}
			const variant = variantEl.textContent ?. trim().toLowerCase() || "";
			const isCricket = isCricketVariant(CONFIG.variantElementId, {
				allowMissing: false,
				allowEmpty: false
			});
			debugLog("Variant detected via #ad-ext-game-variant:", variant, isCricket);
			return isCricket;
		}

		/**
   * Normalisiert ein Zeilen-Label auf "20".."15" oder "BULL".
   * @param {string|null} text - Rohtext aus der Tabelle.
   * @returns {string}
   */
		function normalizeLabel(text) {
			if (! text) {
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
			const players = Array.from(document.querySelectorAll(CONFIG.playerSelector));
			const activeIndex = players.findIndex((player) => player.matches(CONFIG.activePlayerSelector) || player.querySelector(CONFIG.activePlayerSelector));
			return {
				players,
				activeIndex: activeIndex >= 0 ? activeIndex : 0
			};
		}

		/**
   * Findet Elemente, die wie Cricket-Zeilenlabels aussehen.
   * @param {Element} scope - Wurzel-Element fÃ¼r die Suche.
   * @returns {Element[]}
   */
		function findLabelNodes(scope) {
			if (! scope) {
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
				if (! label) {
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
				debugLog("findCricketGridRoot: tableSelector", CONFIG.tableSelector, !! direct);
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
					const count = labelNodes.reduce((total, node) => total + (current.contains(node) ? 1 : 0), 0);
					if (count >= 5) {
						if (! best || count > best.count || (count === best.count && depth < best.depth)) {
							best = {
								node: current,
								count,
								depth
							};
						}
					}
					current = current.parentElement;
					depth += 1;
				}
			});

			cachedGridRoot = best ? best.node : null;
			debugLog("findCricketGridRoot: root found", !! cachedGridRoot);
			return cachedGridRoot;
		}

		/**
   * Baut Zeilen anhand linearer Grid-Children (Label in erster Zelle).
   * @param {Element} root - Wurzel der Cricket-Tabelle.
   * @param {number|null} playerCount - Anzahl der Spieler.
   * @returns {Map<string, {row: Element, cells: Element[], fromAlignment: boolean}>|null}
   */
		function buildRowsFromLinearGrid(root, playerCount) {
			if (! root || ! playerCount) {
				return null;
			}
			const children = Array.from(root.children);
			if (children.length<playerCount) {
      return null;
    }

    const rows = new Map();
    children.forEach((child, index) => {
				const label = normalizeLabel(child.textContent);
				if (! label || rows.has(label)) {
					return;
				}
				const cells = children.slice(index, index + playerCount);
				if (cells.length<playerCount) {
        return;
      }
      const extraLabel = cells
        .slice(1)
        .some((cell) =>normalizeLabel(cell.textContent)) 

					if (extraLabel) {
						return;
					}
				
				rows.set(label, {
					row: root,
					cells,
					fromAlignment: false
				});
			}) 


				if (rows.size < 4) {
					return null;
				}
			
			debugLog("buildRowsFromLinearGrid: rows", rows.size);
			return rows;
		}

		/**
   * Ermittelt die Spieleranzahl anhand des linearen Grid-Aufbaus.
   * @param {Element} root - Wurzel der Cricket-Tabelle.
   * @returns {number|null}
   */
		function detectPlayerCountFromGrid(root) {
			if (! root) {
				return null;
			}
			const children = Array.from(root.children);
			if (! children.length) {
				return null;
			}

			const labelIndices = [];
			children.forEach((child, index) => {
				if (normalizeLabel(child.textContent)) {
					labelIndices.push(index);
				}
			});

			if (labelIndices.length < 2) {
				return null;
			}

			const diffs = [];
			for (let i = 1; i < labelIndices.length; i += 1) {
				const diff = labelIndices[i] - labelIndices[i - 1];
				if (diff > 0 && diff < 10) {
					diffs.push(diff);
				}
			}

			if (! diffs.length) {
				return null;
			}

			const counts = new Map();
			diffs.forEach((diff) => {
				counts.set(diff, (counts.get(diff) || 0) + 1);
			});

			let best = null;
			counts.forEach((count, diff) => {
				if (! best || count > best.count) {
					best = {
						diff,
						count
					};
				}
			});

			if (! best || best.diff < 1) {
				return null;
			}

			debugLog("detectPlayerCountFromGrid:", best.diff);
			return best.diff;
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
   * WÃ¤hlt die plausibelsten Zellen einer Zeile.
   * @param {Element[]} candidates - MÃ¶gliche Zellen.
   * @param {number|null} playerCount - Anzahl der Spieler (falls bekannt).
   * @returns {Element[]}
   */
		function pickCells(candidates, playerCount) {
			if (! candidates.length) {
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
			if (! playerCount || ! cells.length) {
				return cells;
			}

			let adjusted = [... cells];
			let labelIndex = adjusted.findIndex((cell) => cell.contains(labelNode));

			if (labelIndex === -1 && adjusted.length<playerCount) {
      const labelCell = labelNode.closest("div, td, th");
      if (labelCell && !adjusted.includes(labelCell)) {
        adjusted = [labelCell, ...adjusted];
        labelIndex = adjusted.findIndex((cell) => cell.contains(labelNode)) 

			

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
function getRowCells (row, labelNode, playerCount) {
	const directChildren = Array.from(row.children);
	const labelChild = directChildren.find((child) => child.contains(labelNode));

	if (labelChild) {
		const siblings = directChildren.filter((child) => child !== labelChild);
		if (siblings.length) {
			const preferNested = siblings.length === 1 && siblings[0].children.length >= (playerCount || 2);
			const cells = preferNested ? Array.from(siblings[0].children) : [
				labelChild,
				... siblings
			];
			return pickCells(adjustCellsForLabel(cells, labelNode, playerCount), playerCount);
		}
	}

	const cellCandidates = Array.from(row.querySelectorAll("[role='cell'], td, .cell, [class*='cell']")).filter((cell) => !cell.contains(labelNode));

	return pickCells(adjustCellsForLabel(cellCandidates, labelNode, playerCount), playerCount);
}

/**
   * Bestimmt Zellen anhand der Zeilen-Ausrichtung (Fallback fÃ¼r getrennte Spalten).
   * @param {Element} root - Wurzel der Cricket-Tabelle.
   * @param {Element} labelNode - Label-Element.
   * @param {number|null} playerCount - Anzahl der Spieler (falls bekannt).
   * @returns {Element[]}
   */
function getRowCellsByAlignment (root, labelNode, playerCount) {
	const labelRect = labelNode.getBoundingClientRect();
	if (! labelRect.height) {
		return [];
	}

	const rootRect = root.getBoundingClientRect();
	const rowMidY = labelRect.top + labelRect.height / 2;
	const tolerance = Math.max(6, labelRect.height * 0.7);

	const candidates = Array.from(root.querySelectorAll("div, span, p, td")).filter((node) => {
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
		const hasMark = getMarksFromText(node.textContent) !== null || node.querySelector(CONFIG.markElementSelector);
		const hasCellSize = rect.width >= 28 && rect.height >= 18;
		return hasMark || hasCellSize;
	});

	if (! candidates.length) {
		return [];
	}

	const groups = [];
	const sorted = candidates.map((node) => {
		const rect = node.getBoundingClientRect();
		return {
			node,
			rect,
			centerX: rect.left + rect.width / 2,
			area: rect.width * rect.height
		};
	}).sort((a, b) => a.centerX - b.centerX || a.area - b.area);

	const gap = 8;
	sorted.forEach((entry) => {
		const group = groups.find((item) => Math.abs(item.centerX - entry.centerX) <= gap);
		if (! group) {
			groups.push({centerX: entry.centerX, entries: [entry]});
			return;
		}
		group.entries.push(entry);
	});

	const cells = groups.map((group) => group.entries.reduce((best, current) => current.area<best.area ? current : best
        )
      )
      .map((entry) => entry.node);

	return pickCells(adjustCellsForLabel(cells, labelNode, playerCount), playerCount);
}

/**
   * Liest Marks aus Attributen wie data-marks oder aria-label.
   * @param {Element} element - Ziel-Element.
   * @returns {number|null}
   */
function getMarksFromAttributes (element) {
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
		if (! value) {
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
   * Liest Marks aus Zelltext (unterstÃ¼tzt gÃ¤ngige Cricket-Symbole).
   * @param {string|null} text - Zelltext.
   * @returns {number|null}
   */
function getMarksFromText (text) {
	if (! text) {
		return null;
	}
	const normalized = String(text).normalize("NFKC");
	const cleaned = normalized.replace(/\s+/g, "").toUpperCase();
	if (! cleaned) {
		return null;
	}

	if (/[\u2A02\u2297\u29BB]/u.test(cleaned)) {
		return 3;
	}
	if (/[\u00D7X\u2715\u2716\u2573]/u.test(cleaned)) {
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
   * ZÃ¤hlt Mark-Icons anhand eines Selektors.
   * @param {Element} cell - Zellen-Element.
   * @returns {number|null}
   */
function getMarksFromElements (cell) {
	const marks = cell.querySelectorAll(CONFIG.markElementSelector);
	if (! marks.length) {
		return null;
	}
	let maxAlt = null;
	marks.forEach((mark) => {
		const altValue = getMarksFromAttributes(mark);
		if (altValue !== null) {
			maxAlt = maxAlt === null ? altValue : Math.max(maxAlt, altValue);
		}
	});
	if (maxAlt !== null) {
		return Math.min(3, maxAlt);
	}
	return Math.min(3, marks.length);
}

/**
   * Bestimmt die Marks pro Zelle mit mehreren Heuristiken.
   * @param {Element} cell - Zellen-Element.
   * @returns {number|null}
   */
function getMarks (cell) {
	if (! cell) {
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

	const nestedAttributeTarget = cell.querySelector("[data-marks], [data-mark], [data-hits], [data-hit]") || cell.querySelector("[aria-label], [title], [alt]");

	if (nestedAttributeTarget) {
		const nestedAttributeMarks = getMarksFromAttributes(nestedAttributeTarget);
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
function isEmptyCell (cell) {
	if (! cell) {
		return false;
	}
	const text = cell.textContent ?. trim() || "";
	if (text) {
		return false;
	}
	return ! cell.querySelector(CONFIG.markElementSelector);
}

/**
   * Baut eine Zustands-Map fÃ¼r den aktiven Spieler.
   * @param {number} playerCount - Anzahl der Spieler.
   * @param {number} activeIndex - Index des aktiven Spielers.
   * @returns {Map<string, {state: string}>|null}
   */
function getCricketStates (playerCount, activeIndex) {
	const root = findCricketGridRoot();
	if (! root) {
		debugLog("getCricketStates: no grid root");
		return null;
	}

	const gridPlayerCount = detectPlayerCountFromGrid(root);
	let effectivePlayerCount = playerCount || gridPlayerCount;
	if (gridPlayerCount && playerCount && gridPlayerCount !== playerCount) {
		debugLog("getCricketStates: player count mismatch", playerCount, gridPlayerCount);
		effectivePlayerCount = gridPlayerCount;
	}

	let rows = buildRowsFromLinearGrid(root, effectivePlayerCount || null);
	if (! rows) {
		const labelNodes = findLabelNodes(root);
		if (! labelNodes.length) {
			return null;
		}

		rows = new Map();
		labelNodes.forEach((labelNode) => {
			const label = normalizeLabel(labelNode.textContent);
			if (! label || rows.has(label)) {
				return;
			}
			const row = findRowContainer(root, labelNode);
			let cells = getRowCells(row, labelNode, effectivePlayerCount || null);
			let fromAlignment = false;
			if (! cells.length) {
				cells = getRowCellsByAlignment(root, labelNode, effectivePlayerCount || null);
				fromAlignment = cells.length > 0;
			}
			if (! cells.length) {
				return;
			}
			rows.set(label, {row, cells, fromAlignment});
		});
	}

	if (! rows.size) {
		debugLog("getCricketStates: no rows found");
		return null;
	}

	const stateMap = new Map();
	TARGETS.forEach((target) => {
		const rowInfo = rows.get(target.label);
		if (! rowInfo) {
			return;
		}
		const cells = rowInfo.cells;
		const fromAlignment = rowInfo.fromAlignment;
		const marks = cells.map((candidate) => {
			const mark = getMarks(candidate);
			if (mark !== null && mark !== undefined) {
				return mark;
			}
			return candidate.querySelector(CONFIG.markElementSelector) ? null : 0;
		});

		const safeActiveIndex = effectivePlayerCount && effectivePlayerCount > 0 ? Math.min(activeIndex, effectivePlayerCount - 1) : Math.min(activeIndex, marks.length - 1);
		const activeMarks = marks[safeActiveIndex] !== undefined ? marks[safeActiveIndex] : marks[0];

		if (activeMarks === null || activeMarks === undefined) {
			return;
		}

		const normalizedMarks = marks.map((mark) => mark === null || mark === undefined ? 0 : mark);

		const opponentMarks = normalizedMarks.filter((_, index) => index !== safeActiveIndex);
		const anyOpponentOpen = opponentMarks.some((mark) => mark !== null && mark < 3);
		const anyOpponentClosed = opponentMarks.some((mark) => mark !== null && mark >= 3);

		let allClosed = false;
		if (CONFIG.showDeadTargets && normalizedMarks.length > 1) {
			allClosed = normalizedMarks.every((mark) => mark !== null && mark >= 3);
		}

		let state = "open";
		if (allClosed) {
			state = "dead";
		} else if (activeMarks >= 3 && anyOpponentOpen) {
			state = "score";
		} else if (activeMarks < 3 && anyOpponentClosed) {
			state = "danger";
		} else if (activeMarks >= 3) {
			state = "closed";
		}

		stateMap.set(target.label, {state});
	});

	return stateMap;
}

/**
   * Baut die Highlight-Formen fÃ¼r ein Ziel.
   * @param {number} radius - Board-Radius.
   * @param {{label: string, value?: number, ring?: string}} target - Zielinfo.
   * @returns {SVGElement[]}
   */
function buildTargetShapes (radius, target) {
	const ratios = CONFIG.ringRatios;
	const shapes = [];

	if (target.ring === "BULL") {
		shapes.push(createBull(radius, 0, ratios.outerBullInner, true, {edgePaddingPx: CONFIG.edgePaddingPx}));
		shapes.push(createBull(radius, ratios.outerBullInner, ratios.outerBullOuter, false, {edgePaddingPx: CONFIG.edgePaddingPx}));
		return shapes;
	}

	if (! target.value) {
		return shapes;
	}

	const angles = segmentAngles(target.value);
	if (! angles) {
		return shapes;
	}

	shapes.push(createWedge(radius, ratios.outerBullOuter, ratios.tripleInner, angles.start, angles.end, CONFIG.edgePaddingPx));
	shapes.push(createWedge(radius, ratios.tripleInner, ratios.tripleOuter, angles.start, angles.end, CONFIG.edgePaddingPx));
	shapes.push(createWedge(radius, ratios.tripleOuter, ratios.doubleInner, angles.start, angles.end, CONFIG.edgePaddingPx));
	shapes.push(createWedge(radius, ratios.doubleInner, ratios.doubleOuter, angles.start, angles.end, CONFIG.edgePaddingPx));

	return shapes;
}

/**
   * Setzt CSS-Variablen fÃ¼r das Overlay.
   * @param {SVGGElement} overlay - Overlay-Gruppe.
   * @param {number} radius - Board-Radius.
   * @returns {void}
   */
function applyOverlayTheme (overlay, radius) {
	overlay.style.setProperty("--ad-ext-cricket-open-fill", rgba(0));
	overlay.style.setProperty("--ad-ext-cricket-open-stroke", rgba(0));
	overlay.style.setProperty("--ad-ext-cricket-open-opacity", "0");
	overlay.style.setProperty("--ad-ext-cricket-closed-fill", rgba(CONFIG.opacity.closed));
	overlay.style.setProperty("--ad-ext-cricket-closed-stroke", rgba(Math.min(1, CONFIG.opacity.closed + 0.11)));
	overlay.style.setProperty("--ad-ext-cricket-closed-opacity", "1");
	overlay.style.setProperty("--ad-ext-cricket-dead-fill", rgba(CONFIG.opacity.inactive, {
		r: 33,
		g: 33,
		b: 33
	}));
	overlay.style.setProperty("--ad-ext-cricket-dead-stroke", rgba(0, {
		r: 33,
		g: 33,
		b: 33
	}));
	overlay.style.setProperty("--ad-ext-cricket-dead-opacity", "1");
	overlay.style.setProperty("--ad-ext-cricket-inactive-fill", rgba(CONFIG.opacity.inactive, {
		r: 33,
		g: 33,
		b: 33
	}));
	overlay.style.setProperty("--ad-ext-cricket-inactive-stroke", rgba(0, {
		r: 33,
		g: 33,
		b: 33
	}));
	overlay.style.setProperty("--ad-ext-cricket-inactive-opacity", "1");
	overlay.style.setProperty("--ad-ext-cricket-score-fill", rgba(CONFIG.highlight.score.opacity, CONFIG.highlight.score));
	overlay.style.setProperty("--ad-ext-cricket-score-stroke", rgba(Math.min(1, CONFIG.highlight.score.opacity + CONFIG.highlight.score.strokeBoost), CONFIG.highlight.score));
	overlay.style.setProperty("--ad-ext-cricket-score-opacity", "1");
	overlay.style.setProperty("--ad-ext-cricket-danger-fill", rgba(CONFIG.highlight.danger.opacity, CONFIG.highlight.danger));
	overlay.style.setProperty("--ad-ext-cricket-danger-stroke", rgba(Math.min(1, CONFIG.highlight.danger.opacity + CONFIG.highlight.danger.strokeBoost), CONFIG.highlight.danger));
	overlay.style.setProperty("--ad-ext-cricket-danger-opacity", "1");
	const strokeWidth = Math.max(1, radius * CONFIG.strokeWidthRatio);
	overlay.style.setProperty("--ad-ext-cricket-stroke-width", `${strokeWidth}px`);
}

/**
   * Rendert die Ziel-Overlays anhand des aktuellen Zustands.
   * @param {Map<string, {state: string}>} stateMap - Map der ZielzustÃ¤nde.
   * @returns {void}
   */
function renderTargets (stateMap) {
	const board = findBoard();
	if (! board) {
		return;
	}

	const overlay = ensureOverlayGroup(board.group, OVERLAY_ID);
	applyOverlayTheme(overlay, board.radius);
	clearOverlay(overlay);

	ALL_TARGETS.forEach((target) => {
		const isCricketTarget = CRICKET_LABELS.has(target.label);
		const stateInfo = stateMap.get(target.label);
		if (isCricketTarget && ! stateInfo) {
			return;
		}
		const shapes = buildTargetShapes(board.radius, target);
		shapes.forEach((shape) => {
			shape.classList.add(TARGET_CLASS);
			if (! isCricketTarget) {
				shape.classList.add(INACTIVE_CLASS);
			} else if (stateInfo.state === "score") {
				shape.classList.add(SCORE_CLASS);
			} else if (stateInfo.state === "danger") {
				shape.classList.add(DANGER_CLASS);
			} else if (stateInfo.state === "dead") {
				shape.classList.add(DEAD_CLASS);
			} else if (stateInfo.state === "closed") {
				shape.classList.add(CLOSED_CLASS);
			} else {
				shape.classList.add(OPEN_CLASS);
			} overlay.appendChild(shape);
		});
	});
}

/**
   * Erstellt einen kompakten Status-Key, um unnÃ¶tige Updates zu vermeiden.
   * @param {Map<string, {state: string}>} stateMap - Map der ZielzustÃ¤nde.
   * @returns {string}
   */
function buildStateKey (stateMap) {
	return TARGETS.map((target) => {
		const state = stateMap.get(target.label);
		return `${
			target.label
		}:${
			state ? state.state : ""
		}`;
	}).join("|");
}

/**
   * Haupt-Update-Routine.
   * @returns {void}
   */
function updateTargets () {
	if (!isCricketVariantActive()) {
		const board = findBoard();
		if (board) {
			clearOverlay(ensureOverlayGroup(board.group, OVERLAY_ID));
		}
		lastStateKey = null;
		lastBoardKey = null;
		debugLog("updateTargets: not cricket");
		return;
	}

	const {players, activeIndex} = getPlayerInfo();
	const playerCount = players.length || null;
	const stateMap = getCricketStates(playerCount, activeIndex);
	if (! stateMap || ! stateMap.size) {
		debugLog("updateTargets: no state map");
		return;
	}

	const board = findBoard();
	if (! board) {
		debugLog("updateTargets: no board");
		return;
	}

	const boardKey = `${
		board.radius
	}:${
		board.group.id || "board"
	}`;
	const stateKey = buildStateKey(stateMap);
	const existingOverlay = board.group && typeof board.group.querySelector === "function"
		? board.group.querySelector(`#${OVERLAY_ID}`)
		: null;
	const overlayNeedsRefresh = ! existingOverlay || ! existingOverlay.isConnected || existingOverlay.childElementCount === 0;

	if (stateKey === lastStateKey && boardKey === lastBoardKey && ! overlayNeedsRefresh) {
		debugLog("updateTargets: no changes");
		return;
	}

	lastStateKey = stateKey;
	lastBoardKey = boardKey;
	debugLog("updateTargets: render", stateKey);
	renderTargets(stateMap);
}

		/**
   * Fasst viele DOM-Ã„nderungen zu einem Update pro Frame zusammen.
   * @returns {void}
   */
		const scheduleUpdate = createRafScheduler(updateTargets);

		ensureStyle(STYLE_ID, STYLE_TEXT);
		updateTargets();

		// Beobachtet DOM-Ã„nderungen der Cricket-Tabelle und des aktiven Spielers.
		observeMutations({
			onChange: scheduleUpdate
		});
	})();

