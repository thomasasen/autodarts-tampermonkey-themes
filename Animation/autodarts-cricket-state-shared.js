(function (global) {
  "use strict";

  if (
    global.autodartsCricketStateShared &&
    global.autodartsCricketStateShared.__initialized
  ) {
    return;
  }

  const MODULE_ID = "autodarts-cricket-state-shared";
  const API_VERSION = 2;
  const BUILD_SIGNATURE =
    `${MODULE_ID}@${API_VERSION}:2026-03-label-cell-shortfall-fix`;
  const CRICKET_TARGET_ORDER = ["20", "19", "18", "17", "16", "15", "BULL"];
  const TACTICS_TARGET_ORDER = [
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
  const TARGET_ORDER = CRICKET_TARGET_ORDER;
  const TARGET_SET = new Set(TACTICS_TARGET_ORDER);
  const LABEL_SELECTOR = "div, span, p, td, th";
  const PLAYER_SELECTOR = ".ad-ext-player";
  const ACTIVE_PLAYER_SELECTOR = ".ad-ext-player-active";
  const PLAYER_DISPLAY_ID = "ad-ext-player-display";
  const DECORATION_CLASS_NAMES = new Set([
    "ad-ext-crfx-row-wave",
    "ad-ext-crfx-delta",
    "ad-ext-crfx-spark",
    "ad-ext-crfx-wipe",
  ]);
  const DECORATION_ROOT_IDS = new Set(["ad-ext-cricket-targets"]);
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

  let cachedGridRoot = null;
  let lastUnknownModeKey = "";
  const DEBUG_TRACE_ENABLED = false;
  const ACTIVE_PLAYER_STABILITY_HOLD_MS = 2500;
  const ACTIVE_PLAYER_LOW_CONFIRMATIONS = 3;
  const GAME_STATE_STALE_MS = 4500;
  const debugWarningSignatures = new Set();
  const debugRootIds = new WeakMap();
  const activePlayerStabilityStateByKey = new Map();
  let nextDebugRootId = 1;

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

  function getDebugRootId(root) {
    if (!isElement(root)) {
      return "no-root";
    }
    let rootId = debugRootIds.get(root);
    if (!rootId) {
      rootId = `root-${nextDebugRootId++}`;
      debugRootIds.set(root, rootId);
    }
    return rootId;
  }

  function emitDebugLog(debugLog, event, payload, level = "warn") {
    if (typeof debugLog !== "function") {
      return;
    }
    debugLog(event, payload, level);
  }

  function debugTrace(debugLog, event, payload) {
    if (!DEBUG_TRACE_ENABLED) {
      return;
    }
    emitDebugLog(debugLog, event, payload, "trace");
  }

  function debugWarnOnce(debugLog, event, signature, payload) {
    if (typeof debugLog !== "function") {
      return;
    }
    const key = `${event}|${signature}`;
    if (debugWarningSignatures.has(key)) {
      return;
    }
    debugWarningSignatures.add(key);
    emitDebugLog(debugLog, event, payload, "warn");
  }

  function isElement(node) {
    return Boolean(node) && node.nodeType === 1;
  }

  function isLayoutVisible(element) {
    if (!isElement(element) || !element.isConnected) {
      return false;
    }

    if (typeof element.getBoundingClientRect !== "function") {
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
    if (
      !Number.isFinite(rect.width) ||
      !Number.isFinite(rect.height) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return false;
    }

    return true;
  }

  function hasDecorationClass(element) {
    if (!isElement(element)) {
      return false;
    }
    for (const className of DECORATION_CLASS_NAMES) {
      if (element.classList.contains(className)) {
        return true;
      }
    }
    return false;
  }

  function isIgnoredDecorationElement(element) {
    if (!isElement(element)) {
      return false;
    }
    if (SKIP_TAGS.has(element.tagName)) {
      return true;
    }
    if (DECORATION_ROOT_IDS.has(element.id)) {
      return true;
    }
    return hasDecorationClass(element);
  }

  function collectMeaningfulText(node) {
    if (!node) {
      return "";
    }
    if (node.nodeType === 3) {
      return node.textContent || "";
    }
    if (!isElement(node) || isIgnoredDecorationElement(node)) {
      return "";
    }

    let text = "";
    node.childNodes.forEach((childNode) => {
      text += collectMeaningfulText(childNode);
    });
    return text;
  }

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readVariantTextFromDom(doc) {
    const variantEl = (doc || document).getElementById("ad-ext-game-variant");
    return variantEl?.textContent?.trim() || "";
  }

  function getRuntimeSourceHint() {
    const runtimeApi = global.__adXConfigRuntime;
    const currentExecution =
      runtimeApi && typeof runtimeApi.getCurrentExecution === "function"
        ? runtimeApi.getCurrentExecution()
        : null;
    if (!currentExecution || typeof currentExecution !== "object") {
      return "";
    }
    return String(
      currentExecution.loaderMode ||
        currentExecution.sourcePath ||
        currentExecution.featureId ||
        ""
    );
  }

  function normalizeCricketGameMode(value) {
    return normalizeWhitespace(value).toLowerCase();
  }

  function classifyCricketGameMode(value) {
    const normalized = normalizeCricketGameMode(value);
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

  function getTargetOrderByGameMode(gameMode) {
    return classifyCricketGameMode(gameMode) === "tactics"
      ? TACTICS_TARGET_ORDER
      : CRICKET_TARGET_ORDER;
  }

  function inferCricketGameMode(parsedRows) {
    const labels = new Set((parsedRows?.rows || []).map((row) => row.label));
    const looksLikeTactics = ["14", "13", "12", "11", "10"].some((label) =>
      labels.has(label)
    );
    return looksLikeTactics ? "tactics" : "cricket";
  }

  function normalizeLabel(value) {
    const text = normalizeWhitespace(value).toUpperCase();
    if (!text) {
      return "";
    }
    if (TARGET_SET.has(text)) {
      return text;
    }
    if (text === "25" || text === "BULLSEYE" || text === "BULL'S EYE") {
      return "BULL";
    }
    if (text.includes("BULL")) {
      return "BULL";
    }

    const match = text.match(
      /(?:^|[^0-9])(20|19|18|17|16|15|14|13|12|11|10)(?:[^0-9]|$)/
    );
    return match ? match[1] : "";
  }

  function getNodeLabel(node) {
    return normalizeLabel(collectMeaningfulText(node));
  }

  function findLabelNodes(scope, options = {}) {
    if (!isElement(scope)) {
      return [];
    }

    const visibleOnly = options.visibleOnly === true;
    const labeledNodes = toArray(scope.querySelectorAll(LABEL_SELECTOR))
      .filter((node) => !isIgnoredDecorationElement(node))
      .filter((node) => !visibleOnly || isLayoutVisible(node))
      .map((node) => ({ node, label: getNodeLabel(node) }))
      .filter((entry) => entry.label);

    return labeledNodes
      .filter((entry) => {
        return !toArray(entry.node.querySelectorAll(LABEL_SELECTOR)).some((child) => {
          return child !== entry.node && getNodeLabel(child) === entry.label;
        });
      })
      .map((entry) => entry.node);
  }

  function countDistinctLabels(scope, options = {}) {
    return new Set(
      findLabelNodes(scope, options).map((node) => getNodeLabel(node))
    ).size;
  }

  function getViewportIntersectionArea(rect) {
    if (!rect) {
      return 0;
    }
    const viewportWidth =
      Number.isFinite(window.innerWidth) && window.innerWidth > 0
        ? window.innerWidth
        : 0;
    const viewportHeight =
      Number.isFinite(window.innerHeight) && window.innerHeight > 0
        ? window.innerHeight
        : 0;
    if (!(viewportWidth > 0) || !(viewportHeight > 0)) {
      return 0;
    }
    const left = Math.max(0, rect.left);
    const right = Math.min(viewportWidth, rect.right);
    const top = Math.max(0, rect.top);
    const bottom = Math.min(viewportHeight, rect.bottom);
    const width = right - left;
    const height = bottom - top;
    if (!(width > 0) || !(height > 0)) {
      return 0;
    }
    return width * height;
  }

  function getPlayerDisplayRootCandidates(options = {}) {
    const doc = options.document || document;
    const explicitRoot = isElement(options.playerDisplayRoot)
      ? [options.playerDisplayRoot]
      : [];
    const idMatches = toArray(doc.querySelectorAll(`[id="${PLAYER_DISPLAY_ID}"]`));
    return uniqueElements([...explicitRoot, ...idMatches]);
  }

  function getPlayerDisplayRoot(options = {}) {
    const doc = options.document || document;
    const playerSelector = options.playerSelector || PLAYER_SELECTOR;
    const activePlayerSelector =
      options.activePlayerSelector || ACTIVE_PLAYER_SELECTOR;
    const gameStateShared = options.gameStateShared || null;
    const stateIndex =
      gameStateShared && typeof gameStateShared.getActivePlayerIndex === "function"
        ? gameStateShared.getActivePlayerIndex()
        : null;
    const gridRoot = isElement(options.gridRoot) ? options.gridRoot : null;
    const gridRect =
      gridRoot && typeof gridRoot.getBoundingClientRect === "function"
        ? gridRoot.getBoundingClientRect()
        : null;
    const roots = getPlayerDisplayRootCandidates(options);

    if (!roots.length) {
      return doc.getElementById(PLAYER_DISPLAY_ID);
    }
    if (roots.length === 1) {
      return roots[0];
    }

    const scoredRoots = roots
      .map((root, index) => {
        const players = toArray(root.querySelectorAll(playerSelector)).filter(
          (node) => isElement(node)
        );
        const visiblePlayers = sortElementsByVisualOrder(
          players.filter(isVisiblePlayerNode),
          {
            preferHorizontal: true,
            rowTolerance: 12,
            sameRowTopTolerance: 64,
          }
        );
        const activeVisiblePlayers = visiblePlayers.filter((player) =>
          isActivePlayerNode(player, activePlayerSelector)
        );
        const activeVisibleIndices = activeVisiblePlayers
          .map((player) => visiblePlayers.indexOf(player))
          .filter((candidateIndex) => candidateIndex >= 0);
        const rect =
          typeof root.getBoundingClientRect === "function"
            ? root.getBoundingClientRect()
            : null;
        const area =
          rect &&
          Number.isFinite(rect.width) &&
          Number.isFinite(rect.height) &&
          rect.width > 0 &&
          rect.height > 0
            ? rect.width * rect.height
            : 0;
        const viewportArea = getViewportIntersectionArea(rect);

        let score = 0;
        if (isLayoutVisible(root)) {
          score += 1000;
        }
        score += Math.min(visiblePlayers.length, 4) * 260;
        if (activeVisiblePlayers.length === 1) {
          score += 420;
        } else if (activeVisiblePlayers.length > 1) {
          score += 220;
        }
        if (Number.isFinite(stateIndex)) {
          if (activeVisibleIndices.length === 1) {
            if (activeVisibleIndices[0] === stateIndex) {
              score += 720;
            } else {
              score -= 380;
            }
          } else if (activeVisibleIndices.length > 1) {
            score -= 160;
          }
          if (stateIndex >= visiblePlayers.length) {
            score -= 120;
          }
        }
        score += Math.min(260, viewportArea / 3500);
        score += Math.min(140, area / 7000);
        if (gridRect && rect) {
          const verticalDistance = Math.abs(gridRect.top - rect.bottom);
          score += Math.max(0, 220 - Math.min(220, verticalDistance));
        }

        return {
          root,
          index,
          score,
        };
      })
      .sort((first, second) => {
        if (first.score !== second.score) {
          return second.score - first.score;
        }
        return first.index - second.index;
      });

    return scoredRoots[0]?.root || roots[0];
  }

  function isVisiblePlayerNode(element) {
    return isLayoutVisible(element);
  }

  function isActivePlayerNode(playerNode, activePlayerSelector) {
    if (!isElement(playerNode)) {
      return false;
    }

    if (playerNode.classList.contains("ad-ext-player-active")) {
      return true;
    }
    if (playerNode.classList.contains("ad-ext-player-inactive")) {
      return false;
    }

    if (
      activePlayerSelector &&
      typeof playerNode.matches === "function" &&
      playerNode.matches(activePlayerSelector)
    ) {
      return true;
    }

    if (!activePlayerSelector || typeof playerNode.querySelector !== "function") {
      return false;
    }

    const activeMarker = playerNode.querySelector(activePlayerSelector);
    if (!isElement(activeMarker)) {
      return false;
    }

    const ownerPlayer =
      typeof activeMarker.closest === "function"
        ? activeMarker.closest(PLAYER_SELECTOR)
        : null;
    return ownerPlayer === playerNode;
  }

  function sortElementsByVisualOrder(elements, options = {}) {
    const rowTolerance = Number.isFinite(options.rowTolerance)
      ? options.rowTolerance
      : 8;
    const preferHorizontal = Boolean(options.preferHorizontal);
    const sameRowOverlapRatio = Number.isFinite(options.sameRowOverlapRatio)
      ? Math.max(0, Math.min(1, options.sameRowOverlapRatio))
      : 0.45;
    const sameRowTopTolerance = Number.isFinite(options.sameRowTopTolerance)
      ? Math.max(0, options.sameRowTopTolerance)
      : 48;

    return uniqueElements(elements)
      .filter((element) => isElement(element))
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          index,
          top: Number.isFinite(rect.top) ? rect.top : 0,
          left: Number.isFinite(rect.left) ? rect.left : 0,
          bottom: Number.isFinite(rect.bottom) ? rect.bottom : 0,
          width: Number.isFinite(rect.width) ? rect.width : 0,
          height: Number.isFinite(rect.height) ? rect.height : 0,
        };
      })
      .sort((first, second) => {
        if (preferHorizontal) {
          const overlap = Math.max(
            0,
            Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
          );
          const minHeight = Math.max(0, Math.min(first.height, second.height));
          const overlapRatio = minHeight > 0 ? overlap / minHeight : 0;
          const topDelta = Math.abs(first.top - second.top);
          const sameRow =
            overlapRatio >= sameRowOverlapRatio || topDelta <= sameRowTopTolerance;

          if (sameRow && first.left !== second.left) {
            return first.left - second.left;
          }
        }
        if (Math.abs(first.top - second.top) > rowTolerance) {
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
      .map((entry) => entry.element);
  }

  function getElementCenterX(element) {
    if (!isElement(element) || typeof element.getBoundingClientRect !== "function") {
      return null;
    }
    const rect = element.getBoundingClientRect();
    if (
      !Number.isFinite(rect.left) ||
      !Number.isFinite(rect.width) ||
      rect.width <= 0
    ) {
      return null;
    }
    return rect.left + rect.width / 2;
  }

  function collectPlayerColumnAnchorCenters(rows, playerCount) {
    const resolvedCount = Number.isFinite(playerCount)
      ? Math.max(0, Math.round(playerCount))
      : 0;
    if (!(resolvedCount > 0) || !Array.isArray(rows) || !rows.length) {
      return [];
    }

    const samplesByColumn = Array.from({ length: resolvedCount }, () => []);
    rows.forEach((row) => {
      const cells = sortElementsByVisualOrder(
        (Array.isArray(row?.playerCells) ? row.playerCells : []).filter((cell) =>
          isElement(cell)
        )
      );
      if (cells.length < 2) {
        return;
      }
      const limit = Math.min(resolvedCount, cells.length);
      for (let index = 0; index < limit; index += 1) {
        const centerX = getElementCenterX(cells[index]);
        if (Number.isFinite(centerX)) {
          samplesByColumn[index].push(centerX);
        }
      }
    });

    return samplesByColumn.map((samples) => {
      if (!samples.length) {
        return null;
      }
      const total = samples.reduce((sum, value) => sum + value, 0);
      return total / samples.length;
    });
  }

  function resolveNearestPlayerColumnIndex(cell, columnAnchors) {
    const centerX = getElementCenterX(cell);
    if (!Number.isFinite(centerX) || !Array.isArray(columnAnchors)) {
      return null;
    }

    let bestIndex = null;
    let bestDelta = Infinity;
    columnAnchors.forEach((anchor, index) => {
      if (!Number.isFinite(anchor)) {
        return;
      }
      const delta = Math.abs(centerX - anchor);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = index;
      }
    });
    return Number.isFinite(bestIndex) ? bestIndex : null;
  }

  function mapRowCellsToPlayerSlots(rowCells, playerCount, columnAnchors) {
    const resolvedCount = Number.isFinite(playerCount)
      ? Math.max(0, Math.round(playerCount))
      : 0;
    if (!(resolvedCount > 0)) {
      return [];
    }

    const orderedCells = sortElementsByVisualOrder(
      (Array.isArray(rowCells) ? rowCells : []).filter((cell) => isElement(cell))
    );
    if (!orderedCells.length) {
      return new Array(resolvedCount).fill(null);
    }
    if (orderedCells.length >= resolvedCount) {
      return orderedCells.slice(0, resolvedCount);
    }

    const slots = new Array(resolvedCount).fill(null);
    orderedCells.forEach((cell, fallbackIndex) => {
      const nearestIndex = resolveNearestPlayerColumnIndex(cell, columnAnchors);
      const targetIndex = Number.isFinite(nearestIndex)
        ? nearestIndex
        : Math.min(fallbackIndex, resolvedCount - 1);
      if (!(targetIndex >= 0 && targetIndex < resolvedCount)) {
        return;
      }
      if (!slots[targetIndex]) {
        slots[targetIndex] = cell;
        return;
      }

      const anchor = Array.isArray(columnAnchors)
        ? columnAnchors[targetIndex]
        : null;
      const existingCenter = getElementCenterX(slots[targetIndex]);
      const nextCenter = getElementCenterX(cell);
      const existingDelta = Number.isFinite(anchor) && Number.isFinite(existingCenter)
        ? Math.abs(existingCenter - anchor)
        : Infinity;
      const nextDelta = Number.isFinite(anchor) && Number.isFinite(nextCenter)
        ? Math.abs(nextCenter - anchor)
        : Infinity;

      if (nextDelta < existingDelta) {
        const displaced = slots[targetIndex];
        slots[targetIndex] = cell;
        const emptyIndex = slots.findIndex((entry) => !entry);
        if (emptyIndex >= 0) {
          slots[emptyIndex] = displaced;
        }
        return;
      }

      const emptyIndex = slots.findIndex((entry) => !entry);
      if (emptyIndex >= 0) {
        slots[emptyIndex] = cell;
      }
    });

    return slots;
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

  function extractIdentityTokenFromUrl(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    const uuidMatch = text.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
    if (uuidMatch) {
      return uuidMatch[0].toLowerCase();
    }

    const pathMatch = text.match(
      /(?:users?|players?|members?|profile|avatar)s?\/([^/?#]+)/i
    );
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]).trim().toLowerCase();
    }

    return "";
  }

  function readNamedPlayerText(node) {
    if (!isElement(node)) {
      return "";
    }

    const preferred =
      node.querySelector(".ad-ext-player-name") ||
      node.querySelector("[data-player-name]") ||
      node.querySelector("[data-username]") ||
      node.querySelector("[data-name]");

    if (preferred) {
      const text = normalizeWhitespace(collectMeaningfulText(preferred));
      if (text) {
        return text;
      }
    }

    return normalizeWhitespace(collectMeaningfulText(node));
  }

  function extractPlayerNodeIdentity(node) {
    const attributes = [
      "data-player-id",
      "data-user-id",
      "data-id",
      "data-player",
    ];
    for (const attribute of attributes) {
      const value = readNodeAttribute(node, attribute);
      if (value) {
        return {
          playerId: value,
          nameKey: normalizeIdentityKey(readNamedPlayerText(node)),
        };
      }
    }

    const linkedNode = isElement(node)
      ? node.querySelector("[href], [src], a[href], img[src]")
      : null;
    const linkedValue =
      readNodeAttribute(linkedNode, "href") || readNodeAttribute(linkedNode, "src");
    const tokenFromUrl = extractIdentityTokenFromUrl(linkedValue);
    if (tokenFromUrl) {
      return {
        playerId: tokenFromUrl,
        nameKey: normalizeIdentityKey(readNamedPlayerText(node)),
      };
    }

    return {
      playerId: "",
      nameKey: normalizeIdentityKey(readNamedPlayerText(node)),
    };
  }

  function extractMatchPlayerIdentity(player) {
    if (!player || typeof player !== "object") {
      return { playerId: "", nameKey: "" };
    }

    const playerId = String(
      player.id || player.userId || player.playerId || ""
    ).trim();
    const rawName =
      player.name ||
      player.displayName ||
      player.nickname ||
      player.username ||
      player.user?.name ||
      player.user?.displayName ||
      player.user?.nickname ||
      player.user?.username ||
      "";

    return {
      playerId,
      nameKey: normalizeIdentityKey(rawName),
    };
  }

  function readMatchData(gameStateShared) {
    if (!gameStateShared || typeof gameStateShared.getState !== "function") {
      return null;
    }

    const state = gameStateShared.getState();
    const match = state && state.match;
    return match && typeof match === "object" ? match : null;
  }

  function readGameStateSnapshot(gameStateShared) {
    if (!gameStateShared || typeof gameStateShared.getState !== "function") {
      return null;
    }
    const snapshot = gameStateShared.getState();
    return snapshot && typeof snapshot === "object" ? snapshot : null;
  }

  function uniqueElements(elements) {
    const merged = [];
    const seen = new Set();

    elements.forEach((element) => {
      if (!isElement(element) || seen.has(element)) {
        return;
      }
      seen.add(element);
      merged.push(element);
    });

    return merged;
  }

  function getPreferredPlayerNodes(options = {}) {
    const doc = options.document || document;
    const playerSelector = options.playerSelector || PLAYER_SELECTOR;
    const playerDisplayRoot = getPlayerDisplayRoot(options);
    const globalPlayers = toArray(doc.querySelectorAll(playerSelector)).filter(
      (element) => isElement(element)
    );
    const directDisplayPlayers = playerDisplayRoot
      ? getDirectChildren(playerDisplayRoot).filter((child) =>
          child.matches(playerSelector)
        )
      : [];
    const displayPlayers = playerDisplayRoot
      ? toArray(playerDisplayRoot.querySelectorAll(playerSelector))
      : [];
    const visibleDirectDisplayPlayers = directDisplayPlayers.filter(
      isVisiblePlayerNode
    );
    const visibleDisplayPlayers = displayPlayers.filter(isVisiblePlayerNode);
    const visibleGlobalPlayers = globalPlayers.filter(isVisiblePlayerNode);

    if (visibleDirectDisplayPlayers.length) {
      return sortElementsByVisualOrder(visibleDirectDisplayPlayers, {
        preferHorizontal: true,
        rowTolerance: 12,
        sameRowTopTolerance: 64,
      });
    }
    if (visibleDisplayPlayers.length) {
      return sortElementsByVisualOrder(visibleDisplayPlayers, {
        preferHorizontal: true,
        rowTolerance: 12,
        sameRowTopTolerance: 64,
      });
    }
    if (visibleGlobalPlayers.length) {
      return sortElementsByVisualOrder(visibleGlobalPlayers, {
        preferHorizontal: true,
        rowTolerance: 12,
        sameRowTopTolerance: 64,
      });
    }
    return sortElementsByVisualOrder(globalPlayers, {
      preferHorizontal: true,
      rowTolerance: 12,
      sameRowTopTolerance: 64,
    });
  }

  function getVisiblePlayerCount(options = {}) {
    return getPreferredPlayerNodes(options).filter(isVisiblePlayerNode).length;
  }

  function getDisplayPlayerNodes(options = {}) {
    return getPreferredPlayerNodes(options).filter(isVisiblePlayerNode);
  }

  function buildPlayerSlots(playerCount, displayPlayers) {
    return Array.from({ length: playerCount }, (_, columnIndex) => {
      const displayNode =
        Array.isArray(displayPlayers) && columnIndex < displayPlayers.length
          ? displayPlayers[columnIndex]
          : null;
      const displayIdentity = extractPlayerNodeIdentity(displayNode);
      return {
        columnIndex,
        displayIndex: displayNode ? columnIndex : null,
        matchIndex: null,
        playerId: displayIdentity.playerId || "",
        nameKey: displayIdentity.nameKey || "",
        source: displayNode ? "visual-order" : "grid-only",
        displayNode,
      };
    });
  }

  function summarizePlayerMappingSource(playerSlots) {
    const sources = new Set((playerSlots || []).map((slot) => slot.source));
    if (sources.has("order-fallback")) {
      return "order-fallback";
    }
    if (sources.has("active-anchor-2p")) {
      return "active-anchor-2p";
    }
    if (sources.has("active-anchor")) {
      return "active-anchor";
    }
    if (sources.has("name-match")) {
      return "name-match";
    }
    if (sources.has("id-match")) {
      return "id-match";
    }
    if (sources.has("visual-order")) {
      return "visual-order";
    }
    return "grid-only";
  }

  function buildPlayerSlotMapping(options = {}) {
    const playerCount = Number(options.playerCount);
    if (!(playerCount > 0)) {
      return {
        playerSlots: [],
        playerMappingSource: "grid-only",
      };
    }

    const gameStateShared = options.gameStateShared || null;
    const match = options.match || readMatchData(gameStateShared);
    const activePlayerInfo = options.activePlayerInfo || {};
    const displayPlayers = getDisplayPlayerNodes(options).slice(0, playerCount);
    const playerSlots = buildPlayerSlots(playerCount, displayPlayers);
    const matchPlayers = Array.isArray(match?.players) ? match.players : [];
    const matchIdentities = matchPlayers.map((player, matchIndex) => {
      const identity = extractMatchPlayerIdentity(player);
      return {
        matchIndex,
        playerId: identity.playerId || "",
        nameKey: identity.nameKey || "",
      };
    });
    const unusedMatchIndices = new Set(
      matchIdentities
        .slice(0, Math.max(playerCount, matchIdentities.length))
        .map((entry) => entry.matchIndex)
    );
    const unusedColumns = new Set(playerSlots.map((slot) => slot.columnIndex));

    function assignSlot(columnIndex, matchIndex, source) {
      const slot = playerSlots[columnIndex];
      const matchIdentity = matchIdentities[matchIndex];
      if (!slot || !matchIdentity) {
        return false;
      }
      if (!unusedColumns.has(columnIndex) || !unusedMatchIndices.has(matchIndex)) {
        return false;
      }
      slot.matchIndex = matchIndex;
      if (matchIdentity.playerId) {
        slot.playerId = matchIdentity.playerId;
      }
      if (matchIdentity.nameKey) {
        slot.nameKey = matchIdentity.nameKey;
      }
      slot.source = source;
      unusedColumns.delete(columnIndex);
      unusedMatchIndices.delete(matchIndex);
      return true;
    }

    playerSlots.forEach((slot) => {
      if (!slot.playerId) {
        return;
      }
      const matching = matchIdentities.filter(
        (entry) => entry.playerId && entry.playerId === slot.playerId
      );
      if (matching.length === 1) {
        assignSlot(slot.columnIndex, matching[0].matchIndex, "id-match");
      }
    });

    playerSlots.forEach((slot) => {
      if (slot.matchIndex !== null || !slot.nameKey) {
        return;
      }
      const matching = matchIdentities.filter(
        (entry) =>
          entry.nameKey &&
          entry.nameKey === slot.nameKey &&
          unusedMatchIndices.has(entry.matchIndex)
      );
      if (matching.length === 1) {
        assignSlot(slot.columnIndex, matching[0].matchIndex, "name-match");
      }
    });

    const displayIndex = Number.isFinite(activePlayerInfo.displayIndex)
      ? activePlayerInfo.displayIndex
      : null;
    const stateIndex = Number.isFinite(activePlayerInfo.stateIndex)
      ? activePlayerInfo.stateIndex
      : null;
    if (
      displayIndex !== null &&
      stateIndex !== null &&
      displayIndex >= 0 &&
      displayIndex < playerSlots.length &&
      stateIndex >= 0 &&
      stateIndex < matchIdentities.length
    ) {
      assignSlot(displayIndex, stateIndex, "active-anchor");
    }

    if (
      playerSlots.length === 2 &&
      unusedColumns.size === 1 &&
      unusedMatchIndices.size === 1
    ) {
      const [columnIndex] = Array.from(unusedColumns);
      const [matchIndex] = Array.from(unusedMatchIndices);
      assignSlot(columnIndex, matchIndex, "active-anchor-2p");
    }

    Array.from(unusedColumns)
      .sort((first, second) => first - second)
      .forEach((columnIndex) => {
        const matchIndex = Array.from(unusedMatchIndices)
          .sort((first, second) => first - second)
          .find((candidate) => Number.isFinite(candidate));
        if (Number.isFinite(matchIndex)) {
          assignSlot(columnIndex, matchIndex, "order-fallback");
        }
      });

    return {
      playerSlots: playerSlots.map((slot) => ({
        columnIndex: slot.columnIndex,
        displayIndex: Number.isFinite(slot.displayIndex) ? slot.displayIndex : null,
        matchIndex: Number.isFinite(slot.matchIndex) ? slot.matchIndex : null,
        playerId: slot.playerId || "",
        nameKey: slot.nameKey || "",
        source: slot.source,
      })),
      playerMappingSource: summarizePlayerMappingSource(playerSlots),
    };
  }

  function getExpectedPlayerCount(options = {}) {
    const explicit = Number(options.playerCount);
    if (Number.isFinite(explicit) && explicit > 0) {
      return Math.round(explicit);
    }

    const visiblePlayerCount = getVisiblePlayerCount(options);
    return visiblePlayerCount > 0 ? visiblePlayerCount : null;
  }

  function findMostCommonDiff(indices) {
    if (!Array.isArray(indices) || indices.length < 2) {
      return null;
    }

    const counts = new Map();
    for (let index = 1; index < indices.length; index += 1) {
      const diff = indices[index] - indices[index - 1];
      if (diff > 1 && diff < 12) {
        counts.set(diff, (counts.get(diff) || 0) + 1);
      }
    }

    let best = null;
    counts.forEach((count, diff) => {
      if (!best || count > best.count) {
        best = { diff, count };
      }
    });

    return best ? best.diff : null;
  }

  function getDirectChildren(root) {
    return toArray(root && root.children).filter(
      (child) => isElement(child) && !isIgnoredDecorationElement(child)
    );
  }

  function findGridRoot(options = {}) {
    const doc = options.document || document;
    const tableSelector = options.tableSelector || null;
    const debugLog =
      typeof options.debugLog === "function" ? options.debugLog : null;

    if (tableSelector) {
      const direct = doc.querySelector(tableSelector);
      if (direct) {
        cachedGridRoot = direct;
      }
      debugTrace(debugLog, "findGridRoot: tableSelector", {
        tableSelector,
        found: Boolean(direct),
      });
      return direct;
    }

    if (
      cachedGridRoot &&
      cachedGridRoot.isConnected &&
      isLayoutVisible(cachedGridRoot) &&
      countDistinctLabels(cachedGridRoot, { visibleOnly: true }) >= 5
    ) {
      return cachedGridRoot;
    }

    if (!doc.body) {
      return null;
    }

    function findBestRoot(visibleOnly) {
      const labelNodes = findLabelNodes(
        doc.body,
        visibleOnly ? { visibleOnly: true } : {}
      );
      if (labelNodes.length < 5) {
        return null;
      }

      let best = null;
      labelNodes.forEach((labelNode) => {
        let current = labelNode.parentElement;
        let depth = 0;

        while (current && depth < 8) {
          if (visibleOnly && !isLayoutVisible(current)) {
            current = current.parentElement;
            depth += 1;
            continue;
          }

          const labelCount = countDistinctLabels(
            current,
            visibleOnly ? { visibleOnly: true } : {}
          );
          if (labelCount >= 5) {
            const childCount = current.children.length;
            const display = getComputedStyle(current).display || "";
            let score = labelCount * 100;
            if (display.includes("grid") || display.includes("table")) {
              score += 60;
            }
            if (childCount >= 14) {
              score += 18;
            }
            if (childCount > 0 && childCount % 7 === 0) {
              score += 12;
            }
            if (childCount > 0 && childCount % 12 === 0) {
              score += 12;
            }
            if (isLayoutVisible(current)) {
              score += 80;
            }
            score -= depth * 3;

            if (!best || score > best.score) {
              best = { node: current, score };
            }
          }

          current = current.parentElement;
          depth += 1;
        }
      });

      return best;
    }

    const best = findBestRoot(true) || findBestRoot(false);
    cachedGridRoot = best ? best.node : null;
    debugTrace(debugLog, "findGridRoot: result", {
      found: Boolean(cachedGridRoot),
      visible: Boolean(cachedGridRoot && isLayoutVisible(cachedGridRoot)),
    });
    return cachedGridRoot;
  }

  function resolveActivePlayerIndex(options = {}) {
    const activeInfo = getResolvedActivePlayerInfo(options);
    return activeInfo.index;
  }

  function getResolvedActivePlayerInfo(options = {}) {
    const gameStateShared = options.gameStateShared || null;
    const activePlayerSelector =
      options.activePlayerSelector || ACTIVE_PLAYER_SELECTOR;
    const displayRoots = getPlayerDisplayRootCandidates(options);
    const selectedDisplayRoot = getPlayerDisplayRoot(options);
    const selectedDisplayRootId = getDebugRootId(selectedDisplayRoot);
    const displayRootCount = displayRoots.length;
    const fromState = gameStateShared && gameStateShared.getActivePlayerIndex
      ? gameStateShared.getActivePlayerIndex()
      : null;
    const players = getPreferredPlayerNodes(options);
    const visiblePlayerCount = players.filter(isVisiblePlayerNode).length;
    const activePlayers = players.reduce((entries, player, index) => {
      const isVisible = isVisiblePlayerNode(player);
      const isActive = isActivePlayerNode(player, activePlayerSelector);
      if (isVisible && isActive) {
        entries.push({
          index,
          player,
          identity: extractPlayerNodeIdentity(player),
        });
      }
      return entries;
    }, []);

    if (activePlayers.length > 0) {
      const activePlayer = activePlayers.length === 1 ? activePlayers[0] : null;
      return {
        index:
          activePlayer && Number.isFinite(activePlayer.index)
            ? activePlayer.index
            : Number.isFinite(fromState)
              ? fromState
            : activePlayers[0].index,
        displayIndex: activePlayer ? activePlayer.index : null,
        source: activePlayer ? "visible-dom" : "visible-dom-ambiguous",
        visiblePlayerCount,
        playerId: activePlayer?.identity?.playerId || "",
        nameKey: activePlayer?.identity?.nameKey || "",
        playerDisplayRootId: selectedDisplayRootId,
        playerDisplayRootCount: displayRootCount,
        activeCandidates: activePlayers.map((entry) => ({
          index: entry.index,
          playerId: entry.identity?.playerId || "",
          nameKey: entry.identity?.nameKey || "",
        })),
        stateIndex: fromState,
      };
    }

    if (Number.isFinite(fromState) && fromState >= 0) {
      return {
        index: fromState,
        displayIndex: null,
        source: "game-state",
        visiblePlayerCount,
        playerId: "",
        nameKey: "",
        playerDisplayRootId: selectedDisplayRootId,
        playerDisplayRootCount: displayRootCount,
        activeCandidates: [],
        stateIndex: fromState,
      };
    }

    const activeIndex = players.findIndex((player) => {
      return isActivePlayerNode(player, activePlayerSelector);
    });

    return {
      index: activeIndex >= 0 ? activeIndex : 0,
      displayIndex: activeIndex >= 0 ? activeIndex : null,
      source: activeIndex >= 0 ? "dom-fallback" : "default-zero",
      visiblePlayerCount,
      playerDisplayRootId: selectedDisplayRootId,
      playerDisplayRootCount: displayRootCount,
      playerId:
        activeIndex >= 0
          ? extractPlayerNodeIdentity(players[activeIndex]).playerId || ""
          : "",
      nameKey:
        activeIndex >= 0
          ? extractPlayerNodeIdentity(players[activeIndex]).nameKey || ""
          : "",
      activeCandidates: activeIndex >= 0
        ? [
            {
              index: activeIndex,
              playerId:
                extractPlayerNodeIdentity(players[activeIndex]).playerId || "",
              nameKey:
                extractPlayerNodeIdentity(players[activeIndex]).nameKey || "",
            },
          ]
        : [],
      stateIndex: fromState,
    };
  }

  function readCricketMode(gameStateShared, options = {}) {
    const debugLog =
      typeof options.debugLog === "function" ? options.debugLog : null;
    const raw = gameStateShared && gameStateShared.getCricketMode
      ? String(gameStateShared.getCricketMode() || "")
      : "";
    const normalized = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");

    let family = "standard";
    if (!normalized) {
      family = "standard";
    } else if (
      ["standard", "default", "normal", "regular", "classic"].includes(
        normalized
      )
    ) {
      family = "standard";
    } else if (normalized.replace(/-/g, "") === "cutthroat") {
      family = "cutthroat";
    } else if (
      [
        "no-score",
        "noscore",
        "practice",
        "practice-no-score",
        "practice-noscore",
      ].includes(normalized)
    ) {
      family = "neutral";
    } else {
      family = "neutral";
      if (debugLog && normalized && lastUnknownModeKey !== normalized) {
        lastUnknownModeKey = normalized;
        debugWarnOnce(
          debugLog,
          "readCricketMode: unknown mode treated as neutral",
          normalized,
          {
          raw,
          normalized,
          }
        );
      }
    }

    return {
      raw,
      normalized,
      family,
      supportsTacticalHighlights: family !== "neutral",
    };
  }

  function readCricketGameModeInfo(gameStateShared, options = {}) {
    const debugLog =
      typeof options.debugLog === "function" ? options.debugLog : null;
    const doc = options.document || document;
    const parsedRows = options.parsedRows || null;
    const candidates = [];

    if (gameStateShared && typeof gameStateShared.getCricketGameMode === "function") {
      candidates.push({
        source: "game-state",
        raw: String(
          gameStateShared.getCricketGameMode({ includeHiddenCricket: false }) || ""
        ),
      });
    }

    candidates.push({
      source: "dom",
      raw: readVariantTextFromDom(doc),
    });

    for (const candidate of candidates) {
      const normalized = classifyCricketGameMode(candidate.raw);
      if (!normalized || normalized === "hidden-cricket") {
        continue;
      }
      const targetOrder = getTargetOrderByGameMode(normalized);
      return {
        raw: candidate.raw,
        normalized,
        source: candidate.source,
        isTactics: normalized === "tactics",
        targetOrder,
        targetSet: new Set(targetOrder),
      };
    }

    if (
      gameStateShared &&
      typeof gameStateShared.isCricketVariant === "function" &&
      gameStateShared.isCricketVariant({
        allowMissing: false,
        allowEmpty: false,
      })
    ) {
      return {
        raw: "Cricket",
        normalized: "cricket",
        source: "game-state-family",
        isTactics: false,
        targetOrder: CRICKET_TARGET_ORDER,
        targetSet: new Set(CRICKET_TARGET_ORDER),
      };
    }

    const inferredMode = inferCricketGameMode(parsedRows);
    if (debugLog && inferredMode === "tactics") {
      debugTrace(debugLog, "readCricketGameModeInfo: inferred tactics from parsed rows", {
        labels: (parsedRows?.rows || []).map((row) => row.label),
      });
    }
    const targetOrder = getTargetOrderByGameMode(inferredMode);
    return {
      raw: inferredMode === "tactics" ? "Tactics" : "Cricket",
      normalized: inferredMode,
      source: "row-inference",
      isTactics: inferredMode === "tactics",
      targetOrder,
      targetSet: new Set(targetOrder),
    };
  }

  function parseMarkString(value, options = {}) {
    const allowStateWords = options.allowStateWords !== false;
    const text = String(value || "").trim().toLowerCase();
    if (!text) {
      return null;
    }
    if (allowStateWords && text.includes("closed")) {
      return 3;
    }
    if (allowStateWords && text.includes("open")) {
      return 0;
    }

    const match = text.match(/\b([0-3])\b/);
    return match ? Number(match[1]) : null;
  }

  function readMarkAttributesDetailed(element) {
    if (!isElement(element)) {
      return null;
    }

    const dataKeys = [
      "data-marks",
      "data-mark",
      "data-hits",
      "data-hit",
      "data-value",
      "data-count",
    ];
    const descriptiveKeys = [
      "aria-label",
      "title",
      "alt",
    ];

    for (const key of dataKeys) {
      const rawValue = element.getAttribute(key);
      const parsed = parseMarkString(rawValue);
      if (parsed !== null) {
        return {
          marks: clampMark(parsed),
          source: `attr:${key}`,
          raw: String(rawValue || ""),
        };
      }
    }
    for (const key of descriptiveKeys) {
      const rawValue = element.getAttribute(key);
      const parsed = parseMarkString(rawValue, {
        allowStateWords: false,
      });
      if (parsed !== null) {
        return {
          marks: clampMark(parsed),
          source: `attr:${key}`,
          raw: String(rawValue || ""),
        };
      }
    }

    for (const [key, value] of Object.entries(element.dataset || {})) {
      if (!/mark|hit|count|value/i.test(key)) {
        continue;
      }
      const parsed = parseMarkString(value);
      if (parsed !== null) {
        return {
          marks: clampMark(parsed),
          source: `dataset:${key}`,
          raw: String(value || ""),
        };
      }
    }

    return null;
  }

  function readMarkAttributes(element) {
    const detail = readMarkAttributesDetailed(element);
    return detail ? detail.marks : null;
  }

  function readMarksFromText(text) {
    const normalized = String(text || "").normalize("NFKC");
    const cleaned = normalized.replace(/\s+/g, "").toUpperCase();
    if (!cleaned) {
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

  function buildCellText(cell, rowLabel) {
    let text = collectMeaningfulText(cell);
    if (!text) {
      return "";
    }

    text = normalizeWhitespace(text)
      .replace(new RegExp(`\\b${rowLabel}\\b`, "gi"), "")
      .replace(/\b(BULL|BULLSEYE|25)\b/gi, "")
      .trim();

    return text;
  }

  function readMarksWithMeta(cell, rowLabel) {
    const empty = {
      marks: 0,
      source: "none",
      raw: "",
      iconCount: 0,
    };
    if (!isElement(cell)) {
      return {
        ...empty,
        source: "missing-cell",
      };
    }

    const directAttributeMarks = readMarkAttributesDetailed(cell);
    if (directAttributeMarks) {
      return {
        ...empty,
        ...directAttributeMarks,
      };
    }

    const iconNodes = toArray(
      cell.querySelectorAll("img, svg, [aria-label], [title], [alt]")
    ).filter((node) => !isIgnoredDecorationElement(node));

    let bestAttributeMarks = null;
    let bestAttributeSource = "";
    let bestAttributeRaw = "";
    iconNodes.forEach((iconNode) => {
      const parsed = readMarkAttributesDetailed(iconNode);
      if (parsed) {
        bestAttributeMarks =
          bestAttributeMarks === null
            ? parsed.marks
            : Math.max(bestAttributeMarks, parsed.marks);
        if (bestAttributeMarks === parsed.marks) {
          bestAttributeSource = parsed.source || "";
          bestAttributeRaw = parsed.raw || "";
        }
      }
    });
    if (bestAttributeMarks !== null) {
      return {
        ...empty,
        marks: clampMark(bestAttributeMarks),
        source: bestAttributeSource ? `icon-${bestAttributeSource}` : "icon-attr",
        raw: bestAttributeRaw,
        iconCount: iconNodes.length,
      };
    }

    if (iconNodes.length > 0) {
      const visualMarks = iconNodes.filter((iconNode) =>
        iconNode.matches("img, svg")
      ).length;
      if (visualMarks > 0) {
        return {
          ...empty,
          marks: Math.min(3, visualMarks),
          source: "icon-count",
          raw: String(visualMarks),
          iconCount: visualMarks,
        };
      }
    }

    const cellText = buildCellText(cell, rowLabel);
    const textMarks = readMarksFromText(cellText);
    if (textMarks !== null) {
      return {
        ...empty,
        marks: clampMark(textMarks),
        source: "text",
        raw: String(cellText || ""),
        iconCount: iconNodes.length,
      };
    }

    const nestedAttributeTarget =
      cell.querySelector("[data-marks], [data-mark], [data-hits], [data-hit]") ||
      cell.querySelector("[aria-label], [title], [alt]");
    if (nestedAttributeTarget) {
      const nestedDetail = readMarkAttributesDetailed(nestedAttributeTarget);
      if (nestedDetail) {
        return {
          ...empty,
          marks: nestedDetail.marks,
          source: `nested-${nestedDetail.source || "attr"}`,
          raw: nestedDetail.raw || "",
          iconCount: iconNodes.length,
        };
      }
    }

    return {
      ...empty,
      source: iconNodes.length > 0 ? "icon-no-mark" : "none",
      iconCount: iconNodes.length,
    };
  }

  function readMarks(cell, rowLabel) {
    return readMarksWithMeta(cell, rowLabel).marks;
  }

  function readThrowLabelFromValue(value, targetSet) {
    const label = normalizeLabel(value);
    if (!label) {
      return "";
    }
    if (targetSet instanceof Set && targetSet.size > 0 && !targetSet.has(label)) {
      return "";
    }
    return label;
  }

  function readThrowNumberValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    if (numeric === 25) {
      return 25;
    }
    if (numeric >= 1 && numeric <= 20) {
      return Math.round(numeric);
    }
    return null;
  }

  function readThrowLabel(throwData, targetSet) {
    if (!throwData || typeof throwData !== "object") {
      return "";
    }

    const stringCandidates = [
      throwData.segment?.name,
      throwData.segment,
      throwData.name,
      throwData.notation,
      throwData.dart,
      throwData.label,
      throwData.target,
      throwData.display,
      throwData.displayValue,
    ];

    for (const candidate of stringCandidates) {
      const label = readThrowLabelFromValue(candidate, targetSet);
      if (label) {
        return label;
      }
    }

    const numericCandidates = [
      throwData.segment?.number,
      throwData.number,
      throwData.targetNumber,
      throwData.segmentNumber,
    ];

    for (const candidate of numericCandidates) {
      const number = readThrowNumberValue(candidate);
      if (number === null) {
        continue;
      }
      const label = number === 25 ? "BULL" : String(number);
      if (!(targetSet instanceof Set) || targetSet.size === 0 || targetSet.has(label)) {
        return label;
      }
    }

    return "";
  }

  function readThrowMultiplierFromText(value, label) {
    const text = normalizeWhitespace(value).toUpperCase();
    if (!text) {
      return null;
    }

    if (/MISS|OUTSIDE|BOUNCE/i.test(text)) {
      return 0;
    }

    if (label === "BULL") {
      if (
        /(^|[^0-9])25([^0-9]|$)|S25|SINGLE\s*25|OUTER\s*BULL/i.test(text)
      ) {
        return 1;
      }
      if (
        /DBULL|DOUBLE\s*BULL|INNER\s*BULL|BULLSEYE|(^|[^A-Z])BULL([^A-Z]|$)/i.test(
          text
        )
      ) {
        return 2;
      }
    }

    if (/TRIPLE|(^|[^A-Z])T(?:20|19|18|17|16|15|14|13|12|11|10)([^0-9]|$)/i.test(text)) {
      return 3;
    }
    if (/DOUBLE|(^|[^A-Z])D(?:20|19|18|17|16|15|14|13|12|11|10|25)([^0-9]|$)/i.test(text)) {
      return 2;
    }
    if (
      /SINGLE(?:INNER|OUTER)?|(^|[^A-Z])S(?:I|O)?(?:20|19|18|17|16|15|14|13|12|11|10|25)([^0-9]|$)/i.test(
        text
      )
    ) {
      return 1;
    }

    return null;
  }

  function readThrowMultiplier(throwData, label) {
    if (!throwData || typeof throwData !== "object") {
      return 0;
    }

    const numericCandidates = [
      throwData.segment?.multiplier,
      throwData.multiplier,
    ];
    for (const candidate of numericCandidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 3) {
        return clampMark(numeric);
      }
    }

    const textCandidates = [
      throwData.segment?.bed,
      throwData.bed,
      throwData.segment?.name,
      throwData.segment,
      throwData.name,
      throwData.notation,
      throwData.dart,
      throwData.display,
      throwData.displayValue,
    ];
    for (const candidate of textCandidates) {
      const parsed = readThrowMultiplierFromText(candidate, label);
      if (parsed !== null) {
        return clampMark(parsed);
      }
    }

    const scoreCandidates = [throwData.score, throwData.points, throwData.value];
    const numberCandidates = [
      throwData.segment?.number,
      throwData.number,
      throwData.targetNumber,
      throwData.segmentNumber,
    ];
    const score = scoreCandidates
      .map((candidate) => Number(candidate))
      .find((candidate) => Number.isFinite(candidate));
    const number = numberCandidates
      .map(readThrowNumberValue)
      .find((candidate) => candidate !== null);
    if (Number.isFinite(score) && number !== undefined && number !== null) {
      if (number === 25) {
        if (score === 25) {
          return 1;
        }
        if (score === 50) {
          return 2;
        }
      } else if (number > 0) {
        const multiplier = score / number;
        if (Number.isFinite(multiplier) && multiplier >= 1 && multiplier <= 3) {
          return clampMark(multiplier);
        }
      }
    }

    return 0;
  }

  function readActiveThrowMarksByLabel(gameStateShared, targetSet) {
    if (
      !gameStateShared ||
      typeof gameStateShared.getActiveThrows !== "function"
    ) {
      return new Map();
    }

    const throws = gameStateShared.getActiveThrows();
    if (!Array.isArray(throws) || !throws.length) {
      return new Map();
    }

    const marksByLabel = new Map();
    throws.forEach((throwData) => {
      const label = readThrowLabel(throwData, targetSet);
      if (!label) {
        return;
      }
      const marks = readThrowMultiplier(throwData, label);
      if (!(marks > 0)) {
        return;
      }
      marksByLabel.set(
        label,
        clampMark((marksByLabel.get(label) || 0) + marks)
      );
    });

    return marksByLabel;
  }

  function readMatchTurns(gameStateShared) {
    const match = readMatchData(gameStateShared);
    if (!match || typeof match !== "object") {
      return null;
    }
    if (!Array.isArray(match.players) || !Array.isArray(match.turns)) {
      return null;
    }

    return match;
  }

  function readTurnMarksByLabel(gameStateShared, targetSet, playerSlots) {
    const match = readMatchTurns(gameStateShared);
    const slotCount = Array.isArray(playerSlots) ? playerSlots.length : 0;
    if (!match || !(slotCount > 0)) {
      return new Map();
    }

    const matchIndexById = new Map();
    match.players.forEach((player, index) => {
      const playerId =
        player && (player.id || player.userId || player.playerId || "");
      if (!playerId) {
        return;
      }
      matchIndexById.set(String(playerId), index);
    });
    const columnIndexByMatchIndex = new Map();
    playerSlots.forEach((slot) => {
      if (slot && Number.isFinite(slot.matchIndex)) {
        columnIndexByMatchIndex.set(slot.matchIndex, slot.columnIndex);
      }
    });

    if (!matchIndexById.size || !columnIndexByMatchIndex.size) {
      return new Map();
    }

    const marksByLabel = new Map();
    match.turns.forEach((turn) => {
      if (!turn || typeof turn !== "object" || !Array.isArray(turn.throws)) {
        return;
      }

      const playerId = String(turn.playerId || "");
      const matchIndex = matchIndexById.get(playerId);
      const columnIndex = columnIndexByMatchIndex.get(matchIndex);
      if (
        !Number.isFinite(columnIndex) ||
        columnIndex < 0 ||
        columnIndex >= slotCount
      ) {
        return;
      }

      turn.throws.forEach((throwData) => {
        const label = readThrowLabel(throwData, targetSet);
        if (!label) {
          return;
        }

        const marks = readThrowMultiplier(throwData, label);
        if (!(marks > 0)) {
          return;
        }

        const currentMarks =
          marksByLabel.get(label) || new Array(slotCount).fill(0);
        currentMarks[columnIndex] = clampMark(
          (currentMarks[columnIndex] || 0) + marks
        );
        marksByLabel.set(label, currentMarks);
      });
    });

    return marksByLabel;
  }

  function findDirectChildContaining(root, node) {
    if (!isElement(root) || !node) {
      return null;
    }

    return getDirectChildren(root).find((child) => child.contains(node)) || null;
  }

  function sanitizePlayerCells(cells, labelNode, labelCell, expectedPlayerCount) {
    const seen = new Set();
    const filtered = [];
    const rowLabel = getNodeLabel(labelNode);
    const labelRect =
      isElement(labelCell) && typeof labelCell.getBoundingClientRect === "function"
        ? labelCell.getBoundingClientRect()
        : null;
    const labelCenterX =
      labelRect &&
      Number.isFinite(labelRect.left) &&
      Number.isFinite(labelRect.width)
        ? labelRect.left + labelRect.width / 2
        : null;

    cells.forEach((cell) => {
      if (!isElement(cell) || seen.has(cell)) {
        return;
      }
      seen.add(cell);

      if (cell === labelCell || cell.contains(labelNode)) {
        return;
      }
      const cellLabel = getNodeLabel(cell);
      if (cellLabel) {
        const cellRect =
          typeof cell.getBoundingClientRect === "function"
            ? cell.getBoundingClientRect()
            : null;
        const cellCenterX =
          cellRect &&
          Number.isFinite(cellRect.left) &&
          Number.isFinite(cellRect.width)
            ? cellRect.left + cellRect.width / 2
            : null;
        const nearLabelColumn =
          Number.isFinite(labelCenterX) && Number.isFinite(cellCenterX)
            ? Math.abs(cellCenterX - labelCenterX) <= Math.max(14, (labelRect?.width || 24) * 0.45)
            : false;
        const narrowLikeLabel =
          cellRect && Number.isFinite(cellRect.width) && cellRect.width > 0
            ? Number.isFinite(labelRect?.width) && labelRect.width > 0
              ? cellRect.width <= labelRect.width * 1.12
              : cellRect.width <= 56
            : false;
        const looksLikeLabelReplica =
          cellLabel === rowLabel &&
          !isLikelyGridCellNode(cell) &&
          !hasMarkHints(cell, rowLabel) &&
          (nearLabelColumn || narrowLikeLabel);
        if (looksLikeLabelReplica) {
          return;
        }
      }
      filtered.push(cell);
    });

    const sorted = sortElementsByVisualOrder(filtered);
    if (expectedPlayerCount && sorted.length > expectedPlayerCount) {
      return sorted.slice(0, expectedPlayerCount);
    }
    return sorted;
  }

  function findBadgeNode(labelCell, fallbackNode, label) {
    const container = labelCell || fallbackNode;
    if (!isElement(container)) {
      return null;
    }

    const candidates = toArray(container.querySelectorAll(LABEL_SELECTOR))
      .filter((node) => getNodeLabel(node) === label)
      .filter((node) => {
        return !toArray(node.querySelectorAll(LABEL_SELECTOR)).some((child) => {
          return child !== node && getNodeLabel(child) === label;
        });
      });

    if (!candidates.length) {
      return null;
    }

    return candidates
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          left: Number.isFinite(rect.left) ? rect.left : 0,
          area:
            Number.isFinite(rect.width) && Number.isFinite(rect.height)
              ? rect.width * rect.height
              : 0,
        };
      })
      .sort((first, second) => {
        if (first.left !== second.left) {
          return first.left - second.left;
        }
        return first.area - second.area;
      })[0].node;
  }

  function findRowContainer(root, labelNode) {
    const tableRow = labelNode.closest("tr, [role='row']");
    if (tableRow && root.contains(tableRow)) {
      return tableRow;
    }

    let current = labelNode.parentElement;
    while (current && current !== root) {
      const directChildren = getDirectChildren(current);
      if (directChildren.length >= 2) {
        return current;
      }
      current = current.parentElement;
    }

    return labelNode.parentElement || root;
  }

  function hasMarkHints(node, rowLabel) {
    if (!isElement(node) || isIgnoredDecorationElement(node)) {
      return false;
    }
    if (readMarkAttributes(node) !== null) {
      return true;
    }
    if (node.querySelector("[data-marks], [data-mark], [data-hits], [data-hit]")) {
      return true;
    }
    if (node.querySelector("img, svg, [aria-label], [title], [alt]")) {
      return true;
    }

    return readMarksFromText(buildCellText(node, rowLabel)) !== null;
  }

  function isLikelyGridCellNode(node) {
    if (!isElement(node) || isIgnoredDecorationElement(node)) {
      return false;
    }

    const role = readNodeAttribute(node, "role").toLowerCase();
    const testId = readNodeAttribute(node, "data-testid").toLowerCase();
    const className = readNodeAttribute(node, "class").toLowerCase();
    const tagName = String(node.tagName || "").toLowerCase();

    if (role === "cell" || tagName === "td" || tagName === "th") {
      return true;
    }
    if (testId.includes("cell")) {
      return true;
    }
    if (className.includes("cell") || className.includes("chakra")) {
      return true;
    }

    return false;
  }

  function getElementWidth(node) {
    if (!isElement(node) || typeof node.getBoundingClientRect !== "function") {
      return null;
    }
    const rect = node.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || rect.width <= 0) {
      return null;
    }
    return rect.width;
  }

  function looksLikeMergedLabelPlayerCell(labelCell, playerCells) {
    if (!isElement(labelCell)) {
      return false;
    }

    const labelWidth = getElementWidth(labelCell);
    if (!Number.isFinite(labelWidth)) {
      return false;
    }

    const referenceWidths = (Array.isArray(playerCells) ? playerCells : [])
      .filter((cell) => isElement(cell))
      .map((cell) => getElementWidth(cell))
      .filter((width) => Number.isFinite(width));
    const referenceWidth =
      referenceWidths.length > 0
        ? referenceWidths.reduce((sum, width) => sum + width, 0) /
          referenceWidths.length
        : null;

    const hasRowLabel = Boolean(getNodeLabel(labelCell));
    if (!hasRowLabel) {
      return false;
    }

    if (Number.isFinite(referenceWidth) && referenceWidth > 0) {
      return labelWidth >= referenceWidth * 0.72;
    }

    return labelWidth >= 80;
  }

  function mergeUniqueElements(...collections) {
    const merged = [];
    const seen = new Set();

    collections.forEach((collection) => {
      collection.forEach((item) => {
        if (!isElement(item) || seen.has(item)) {
          return;
        }
        seen.add(item);
        merged.push(item);
      });
    });

    return merged;
  }

  function maybeIncludeLabelCellAsPlayerCell(
    playerCells,
    labelCell,
    label,
    expectedPlayerCount
  ) {
    const normalizedCells = Array.isArray(playerCells)
      ? playerCells.filter((cell) => isElement(cell))
      : [];
    if (!isElement(labelCell) || normalizedCells.includes(labelCell)) {
      return normalizedCells;
    }

    const resolvedExpectedCount = Number.isFinite(Number(expectedPlayerCount))
      ? Math.max(0, Math.round(Number(expectedPlayerCount)))
      : 0;
    const labelCellHasMarks = hasMarkHints(labelCell, label);
    const shortfallLikely =
      resolvedExpectedCount > 0 && normalizedCells.length < resolvedExpectedCount;
    const mergedLayoutHint =
      shortfallLikely && looksLikeMergedLabelPlayerCell(labelCell, normalizedCells);

    if (!labelCellHasMarks && !mergedLayoutHint) {
      return normalizedCells;
    }

    const resolvedCells = [labelCell, ...normalizedCells];
    if (
      resolvedExpectedCount > 0 &&
      resolvedCells.length > resolvedExpectedCount
    ) {
      return resolvedCells.slice(0, resolvedExpectedCount);
    }

    return resolvedCells;
  }

  function extractPlayerCellsFromRow(
    rowElement,
    labelNode,
    label,
    expectedPlayerCount
  ) {
    if (!isElement(rowElement)) {
      return { labelCell: null, playerCells: [] };
    }

    const directChildren = getDirectChildren(rowElement);
    const labelCell = findDirectChildContaining(rowElement, labelNode);

    let playerCells = [];
    if (labelCell) {
      const siblings = directChildren.filter((child) => child !== labelCell);
      if (
        siblings.length === 1 &&
        getDirectChildren(siblings[0]).length >= (expectedPlayerCount || 2)
      ) {
        playerCells = getDirectChildren(siblings[0]).filter(
          (child) => !getNodeLabel(child)
        );
      }
      if (!playerCells.length) {
        playerCells = siblings.filter((child) => !getNodeLabel(child));
      }
    }

    if (!playerCells.length) {
      playerCells = toArray(
        rowElement.querySelectorAll("[role='cell'], td, .cell, [class*='cell']")
      );
    }
    if (expectedPlayerCount && playerCells.length < expectedPlayerCount) {
      const nestedCandidates = toArray(
        rowElement.querySelectorAll(
          "[role='cell'], td, th, .cell, [class*='cell'], [data-testid*='cell'], [class*='chakra']"
        )
      ).filter((cell) => !isIgnoredDecorationElement(cell));
      playerCells = mergeUniqueElements(playerCells, nestedCandidates);
    }

    return {
      labelCell,
      playerCells: sanitizePlayerCells(
        playerCells,
        labelNode,
        labelCell,
        expectedPlayerCount
      ),
    };
  }

  function extractPlayerCellsByAlignment(
    root,
    labelNode,
    label,
    expectedPlayerCount
  ) {
    const labelRect = labelNode.getBoundingClientRect();
    if (!labelRect.height) {
      return [];
    }

    const rootRect = root.getBoundingClientRect();
    const rowMidY = labelRect.top + labelRect.height / 2;
    const tolerance = Math.max(6, labelRect.height * 0.7);

    const candidates = toArray(root.querySelectorAll(LABEL_SELECTOR)).filter(
      (node) => {
        if (
          !isElement(node) ||
          node === labelNode ||
          isIgnoredDecorationElement(node) ||
          node.contains(labelNode)
        ) {
          return false;
        }
        const nodeLabel = getNodeLabel(node);
        if (nodeLabel) {
          const keepLabeledGridCell =
            nodeLabel === label &&
            isLikelyGridCellNode(node) &&
            !labelNode.contains(node);
          if (!keepLabeledGridCell) {
            return false;
          }
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

        return (
          hasMarkHints(node, label) ||
          isLikelyGridCellNode(node) ||
          rect.width >= 28
        );
      }
    );

    if (!candidates.length) {
      return [];
    }

    const groups = [];
    const sorted = candidates
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          centerX: rect.left + rect.width / 2,
          area: rect.width * rect.height,
        };
      })
      .sort((first, second) => first.centerX - second.centerX || first.area - second.area);

    sorted.forEach((entry) => {
      const group = groups.find((candidateGroup) => {
        return Math.abs(candidateGroup.centerX - entry.centerX) <= 8;
      });
      if (!group) {
        groups.push({ centerX: entry.centerX, entries: [entry] });
        return;
      }
      group.entries.push(entry);
    });

    const groupedCells = groups
      .map((group) => {
        return group.entries.reduce((best, current) => {
          return current.area < best.area ? current : best;
        });
      })
      .map((entry) => entry.node);

    return expectedPlayerCount && groupedCells.length > expectedPlayerCount
      ? groupedCells.slice(0, expectedPlayerCount)
      : groupedCells;
  }

  function buildRowsFromLinearGrid(root, expectedPlayerCount) {
    const children = getDirectChildren(root);
    if (!children.length) {
      return null;
    }

    const labelIndices = children.reduce((indices, child, index) => {
      if (getNodeLabel(child)) {
        indices.push(index);
      }
      return indices;
    }, []);
    const rowSpan = findMostCommonDiff(labelIndices);
    if (!rowSpan || rowSpan < 2) {
      return null;
    }

    const rows = [];
    for (let index = 0; index < children.length; index += 1) {
      const label = getNodeLabel(children[index]);
      if (!label || rows.some((row) => row.label === label)) {
        continue;
      }

      const rowSlice = children.slice(index, index + rowSpan);
      if (rowSlice.length < rowSpan) {
        continue;
      }
      if (rowSlice.slice(1).some((cell) => getNodeLabel(cell))) {
        continue;
      }

      const labelCell = rowSlice[0];
      const playerCells = maybeIncludeLabelCellAsPlayerCell(
        sanitizePlayerCells(
          rowSlice.slice(1),
          labelCell,
          labelCell,
          expectedPlayerCount || rowSpan - 1
        ),
        labelCell,
        label,
        expectedPlayerCount
      );
      if (!playerCells.length) {
        continue;
      }

      rows.push({
        label,
        rowElement: root,
        labelCell,
        badgeNode: findBadgeNode(labelCell, labelCell, label),
        playerCells,
      });
    }

    if (rows.length < 5) {
      return null;
    }

    return {
      rows,
      detectedPlayerCount: rowSpan - 1,
    };
  }

  function buildRowsFromContainers(root, expectedPlayerCount) {
    const rows = [];
    const seenLabels = new Set();

    findLabelNodes(root).forEach((labelNode) => {
      const label = getNodeLabel(labelNode);
      if (!label || seenLabels.has(label)) {
        return;
      }

      const rowElement = findRowContainer(root, labelNode);
      const extracted = extractPlayerCellsFromRow(
        rowElement,
        labelNode,
        label,
        expectedPlayerCount
      );
      const alignedCells =
        !extracted.playerCells.length ||
        (expectedPlayerCount && extracted.playerCells.length < expectedPlayerCount)
          ? extractPlayerCellsByAlignment(root, labelNode, label, expectedPlayerCount)
          : [];

      const playerCells = maybeIncludeLabelCellAsPlayerCell(
        sanitizePlayerCells(
          mergeUniqueElements(extracted.playerCells, alignedCells),
          labelNode,
          extracted.labelCell,
          expectedPlayerCount
        ),
        extracted.labelCell,
        label,
        expectedPlayerCount
      );
      if (!playerCells.length) {
        return;
      }

      seenLabels.add(label);
      rows.push({
        label,
        rowElement,
        labelCell: extracted.labelCell || labelNode,
        badgeNode: findBadgeNode(extracted.labelCell || labelNode, labelNode, label),
        playerCells,
      });
    });

    if (rows.length < 5) {
      return null;
    }

    return {
      rows,
      detectedPlayerCount: rows.reduce((max, row) => {
        return Math.max(max, row.playerCells.length);
      }, 0),
    };
  }

  function resolveMappedActivePlayerIndex(activePlayerInfo, playerSlots, playerCount) {
    return resolveActivePlayerResolution(
      activePlayerInfo,
      playerSlots,
      playerCount
    ).columnIndex;
  }

  function resolveActivePlayerResolution(
    activePlayerInfo,
    playerSlots,
    playerCount
  ) {
    const slots = Array.isArray(playerSlots) ? playerSlots : [];
    const displayIndex = Number.isFinite(activePlayerInfo?.displayIndex)
      ? activePlayerInfo.displayIndex
      : null;
    const stateIndex = Number.isFinite(activePlayerInfo?.stateIndex)
      ? activePlayerInfo.stateIndex
      : null;
    const activeCandidates = Array.isArray(activePlayerInfo?.activeCandidates)
      ? activePlayerInfo.activeCandidates
          .filter((candidate) => candidate && Number.isFinite(candidate.index))
          .map((candidate) => ({
            index: candidate.index,
            playerId: String(candidate.playerId || "").trim(),
            nameKey: String(candidate.nameKey || "").trim(),
          }))
      : [];
    const playerId = String(activePlayerInfo?.playerId || "").trim();
    const nameKey = String(activePlayerInfo?.nameKey || "").trim();
    const fallbackIndex = Number.isFinite(activePlayerInfo?.index)
      ? activePlayerInfo.index
      : 0;
    const usedVisibleDom =
      displayIndex !== null && activePlayerInfo?.source === "visible-dom";
    const hasDomFallbackIndex =
      displayIndex !== null && activePlayerInfo?.source === "dom-fallback";

    function findUniqueSlot(predicate) {
      const matches = slots.filter((slot) => predicate(slot));
      return matches.length === 1 ? matches[0] : null;
    }

    function buildResolution(slot, source) {
      if (slot && Number.isFinite(slot.columnIndex)) {
        return {
          displayIndex,
          matchIndex: Number.isFinite(slot.matchIndex) ? slot.matchIndex : stateIndex,
          columnIndex: slot.columnIndex,
          source,
          usedVisibleDom,
        };
      }
      const columnIndex =
        playerCount > 0
          ? Math.max(0, Math.min(fallbackIndex, playerCount - 1))
          : 0;
      return {
        displayIndex,
        matchIndex: stateIndex,
        columnIndex,
        source,
        usedVisibleDom,
      };
    }

    function resolveCandidate(candidate, sourcePrefix) {
      if (!candidate || !Number.isFinite(candidate.index)) {
        return null;
      }
      const candidatePlayerId = String(candidate.playerId || "").trim();
      const candidateNameKey = String(candidate.nameKey || "").trim();
      const candidateById = candidatePlayerId
        ? findUniqueSlot(
            (slot) => slot.playerId && slot.playerId === candidatePlayerId
          )
        : null;
      if (candidateById) {
        return {
          ...buildResolution(candidateById, `${sourcePrefix}-id`),
          displayIndex: candidate.index,
          usedVisibleDom: true,
        };
      }
      const candidateByName = candidateNameKey
        ? findUniqueSlot(
            (slot) => slot.nameKey && slot.nameKey === candidateNameKey
          )
        : null;
      if (candidateByName) {
        return {
          ...buildResolution(candidateByName, `${sourcePrefix}-name`),
          displayIndex: candidate.index,
          usedVisibleDom: true,
        };
      }
      const candidateByDisplay = findUniqueSlot(
        (slot) => slot.displayIndex === candidate.index
      );
      if (candidateByDisplay) {
        return {
          ...buildResolution(candidateByDisplay, `${sourcePrefix}-display`),
          displayIndex: candidate.index,
          usedVisibleDom: true,
        };
      }
      return null;
    }

    if (activeCandidates.length > 1 && stateIndex !== null) {
      const candidateResolutions = activeCandidates
        .map((candidate) => resolveCandidate(candidate, "visible-dom-state"))
        .filter((resolution) => resolution && resolution.matchIndex === stateIndex);
      const uniqueColumns = new Set(
        candidateResolutions.map((resolution) => resolution.columnIndex)
      );
      if (candidateResolutions.length === 1 && uniqueColumns.size === 1) {
        return candidateResolutions[0];
      }
    }

    const slotByPlayerId = playerId
      ? findUniqueSlot((slot) => slot.playerId && slot.playerId === playerId)
      : null;
    if (usedVisibleDom && slotByPlayerId) {
      return buildResolution(slotByPlayerId, "visible-dom-id");
    }

    const slotByName = nameKey
      ? findUniqueSlot((slot) => slot.nameKey && slot.nameKey === nameKey)
      : null;
    if (usedVisibleDom && slotByName) {
      return buildResolution(slotByName, "visible-dom-name");
    }

    if (stateIndex !== null) {
      const matchedSlot = findUniqueSlot((slot) => slot.matchIndex === stateIndex);
      if (matchedSlot) {
        return buildResolution(matchedSlot, "game-state-match");
      }
    }

    if (usedVisibleDom && displayIndex !== null) {
      const matchedSlot = findUniqueSlot(
        (slot) => slot.displayIndex === displayIndex
      );
      if (matchedSlot) {
        return buildResolution(matchedSlot, "visible-dom-display");
      }
    }

    if (slotByPlayerId) {
      return buildResolution(slotByPlayerId, "identity-id");
    }
    if (slotByName) {
      return buildResolution(slotByName, "identity-name");
    }

    if (activeCandidates.length > 1) {
      const candidateResolutions = activeCandidates
        .map((candidate) => resolveCandidate(candidate, "visible-dom-candidate"))
        .filter(Boolean);
      const uniqueColumns = new Map();
      candidateResolutions.forEach((resolution) => {
        if (!uniqueColumns.has(resolution.columnIndex)) {
          uniqueColumns.set(resolution.columnIndex, resolution);
        }
      });
      if (uniqueColumns.size === 1) {
        return Array.from(uniqueColumns.values())[0];
      }
    }

    if (hasDomFallbackIndex) {
      const fallbackSlot = findUniqueSlot(
        (slot) => slot.displayIndex === displayIndex
      );
      if (fallbackSlot) {
        return buildResolution(fallbackSlot, "dom-fallback-display");
      }
    }

    return buildResolution(
      null,
      hasDomFallbackIndex ? "dom-fallback-index" : "index-fallback"
    );
  }

  function classifyActiveResolutionConfidence(source) {
    const normalized = String(source || "").trim().toLowerCase();
    if (!normalized) {
      return "low";
    }

    if (
      normalized === "visible-dom-id" ||
      normalized === "visible-dom-name" ||
      normalized === "game-state-match" ||
      normalized.startsWith("visible-dom-state-")
    ) {
      return "high";
    }

    if (
      normalized === "visible-dom-display" ||
      normalized === "dom-fallback-display" ||
      normalized.startsWith("identity-") ||
      normalized.startsWith("visible-dom-candidate-")
    ) {
      return "medium";
    }

    if (
      normalized === "dom-fallback-index" ||
      normalized === "index-fallback"
    ) {
      return "low";
    }

    return "medium";
  }

  function getActiveResolutionStabilityKey(options = {}) {
    const rootId = String(options.rootId || "no-root");
    const playerDisplayRootId = String(options.playerDisplayRootId || "no-display-root");
    const playerCount = Number.isFinite(options.playerCount)
      ? options.playerCount
      : 0;
    const gameStateSnapshot = options.gameStateSnapshot || null;
    const matchId = String(gameStateSnapshot?.match?.id || "");
    const topic = String(gameStateSnapshot?.topic || "");
    const identity = matchId || topic || "no-match";
    return `${identity}|${rootId}|${playerDisplayRootId}|${playerCount}`;
  }

  function stabilizeActivePlayerResolution(options = {}) {
    const key = String(options.key || "");
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const playerCount = Number.isFinite(options.playerCount)
      ? Math.max(1, options.playerCount)
      : 1;
    const fallbackIndex = Number.isFinite(options.fallbackIndex)
      ? Math.max(0, Math.min(options.fallbackIndex, playerCount - 1))
      : 0;
    const candidateIndex = Number.isFinite(options.candidateIndex)
      ? Math.max(0, Math.min(options.candidateIndex, playerCount - 1))
      : fallbackIndex;
    const rawSource = String(options.rawSource || "");
    const rawDisplayIndex = Number.isFinite(options.displayIndex)
      ? options.displayIndex
      : null;
    const rawMatchIndex = Number.isFinite(options.matchIndex)
      ? options.matchIndex
      : null;
    const rawUsedVisibleDom = Boolean(options.usedVisibleDom);
    const candidateConfidence = classifyActiveResolutionConfidence(rawSource);
    const holdMs = Number.isFinite(options.holdMs)
      ? Math.max(0, options.holdMs)
      : ACTIVE_PLAYER_STABILITY_HOLD_MS;
    const requiredLowConfirmations = Number.isFinite(options.lowConfirmations)
      ? Math.max(1, Math.round(options.lowConfirmations))
      : ACTIVE_PLAYER_LOW_CONFIRMATIONS;

    const previous =
      key && activePlayerStabilityStateByKey.has(key)
        ? activePlayerStabilityStateByKey.get(key)
        : null;
    const previousStableConfidence = String(previous?.stableConfidence || "low");
    const previousStableIndex = Number.isFinite(previous?.stableIndex)
      ? previous.stableIndex
      : null;
    const previousStableAgeMs =
      previous && Number.isFinite(previous.stableUpdatedAt)
        ? Math.max(0, now - previous.stableUpdatedAt)
        : 0;

    let stabilityHold = false;
    let stabilityReason = "";
    let effectiveIndex = candidateIndex;
    let effectiveSource = rawSource;
    let effectiveConfidence = candidateConfidence;
    let effectiveDisplayIndex = rawDisplayIndex;
    let effectiveMatchIndex = rawMatchIndex;
    let stableUpdatedAt = now;
    let pendingLowIndex = Number.isFinite(previous?.pendingLowIndex)
      ? previous.pendingLowIndex
      : null;
    let pendingLowCount = Number.isFinite(previous?.pendingLowCount)
      ? previous.pendingLowCount
      : 0;

    const canHoldOnFreshStable =
      previous &&
      previousStableIndex !== null &&
      candidateConfidence === "low" &&
      candidateIndex !== previousStableIndex &&
      (previousStableConfidence === "high" ||
        previousStableConfidence === "medium") &&
      previousStableAgeMs <= holdMs;

    if (!previous) {
      pendingLowIndex = null;
      pendingLowCount = 0;
    } else if (candidateConfidence === "high") {
      pendingLowIndex = null;
      pendingLowCount = 0;
    } else if (canHoldOnFreshStable) {
      stabilityHold = true;
      stabilityReason = "low-confidence-flip";
      effectiveIndex = previousStableIndex;
      effectiveSource = String(previous?.stableSource || rawSource);
      effectiveConfidence = classifyActiveResolutionConfidence(effectiveSource);
      effectiveDisplayIndex = Number.isFinite(previous?.stableDisplayIndex)
        ? previous.stableDisplayIndex
        : rawDisplayIndex;
      effectiveMatchIndex = Number.isFinite(previous?.stableMatchIndex)
        ? previous.stableMatchIndex
        : rawMatchIndex;
      stableUpdatedAt = Number.isFinite(previous?.stableUpdatedAt)
        ? previous.stableUpdatedAt
        : now;
      pendingLowIndex = candidateIndex;
      pendingLowCount =
        pendingLowIndex === previous?.pendingLowIndex
          ? (previous?.pendingLowCount || 0) + 1
          : 1;
    } else if (
      previous &&
      candidateConfidence === "low" &&
      previousStableIndex !== null &&
      candidateIndex !== previousStableIndex
    ) {
      pendingLowIndex =
        pendingLowIndex !== null && pendingLowIndex === candidateIndex
          ? pendingLowIndex
          : candidateIndex;
      pendingLowCount =
        pendingLowIndex === previous?.pendingLowIndex
          ? (previous?.pendingLowCount || 0) + 1
          : 1;
      if (pendingLowCount < requiredLowConfirmations) {
        stabilityHold = true;
        stabilityReason = "low-confidence-unconfirmed";
        effectiveIndex = previousStableIndex;
        effectiveSource = String(previous?.stableSource || rawSource);
        effectiveConfidence = classifyActiveResolutionConfidence(effectiveSource);
        effectiveDisplayIndex = Number.isFinite(previous?.stableDisplayIndex)
          ? previous.stableDisplayIndex
          : rawDisplayIndex;
        effectiveMatchIndex = Number.isFinite(previous?.stableMatchIndex)
          ? previous.stableMatchIndex
          : rawMatchIndex;
        stableUpdatedAt = Number.isFinite(previous?.stableUpdatedAt)
          ? previous.stableUpdatedAt
          : now;
      } else {
        pendingLowIndex = null;
        pendingLowCount = 0;
      }
    } else {
      pendingLowIndex = null;
      pendingLowCount = 0;
    }

    if (!stabilityHold) {
      stableUpdatedAt = now;
    }

    const nextState = {
      stableIndex: effectiveIndex,
      stableSource: effectiveSource,
      stableConfidence: effectiveConfidence,
      stableDisplayIndex: effectiveDisplayIndex,
      stableMatchIndex: effectiveMatchIndex,
      stableUpdatedAt,
      pendingLowIndex,
      pendingLowCount,
      lastRawIndex: candidateIndex,
      lastRawSource: rawSource,
      lastUpdatedAt: now,
    };
    if (key) {
      activePlayerStabilityStateByKey.set(key, nextState);
      if (activePlayerStabilityStateByKey.size > 256) {
        const oldestKey = activePlayerStabilityStateByKey.keys().next().value;
        if (oldestKey) {
          activePlayerStabilityStateByKey.delete(oldestKey);
        }
      }
    }

    return {
      index: effectiveIndex,
      source: effectiveSource,
      rawSource,
      sourceConfidence: effectiveConfidence,
      stabilityHold,
      stabilityReason,
      stabilityAgeMs: Math.max(0, now - stableUpdatedAt),
      displayIndex: effectiveDisplayIndex,
      matchIndex: effectiveMatchIndex,
      rawDisplayIndex,
      rawMatchIndex,
      usedVisibleDom:
        String(effectiveSource || "").startsWith("visible-dom") ||
        (rawUsedVisibleDom && effectiveSource === rawSource),
      pendingLowCount,
      pendingLowIndex,
      rawIndex: candidateIndex,
    };
  }

  function maybeWarnGameStateMissingOrStale(debugLog, options = {}) {
    if (typeof debugLog !== "function") {
      return;
    }
    const gameStateSnapshot = options.gameStateSnapshot || null;
    const updatedAt = Number.isFinite(gameStateSnapshot?.updatedAt)
      ? gameStateSnapshot.updatedAt
      : 0;
    const ageMs = updatedAt > 0 ? Math.max(0, Date.now() - updatedAt) : null;
    const stale = ageMs === null || ageMs > GAME_STATE_STALE_MS;
    if (!stale) {
      return;
    }

    const payload = {
      rootId: String(options.rootId || "no-root"),
      source: String(gameStateSnapshot?.source || "none"),
      topic: String(gameStateSnapshot?.topic || ""),
      payloadKind: String(gameStateSnapshot?.payloadKind || ""),
      ageMs,
      staleThresholdMs: GAME_STATE_STALE_MS,
      playerMappingSource: String(options.playerMappingSource || ""),
    };
    const signature = [
      payload.rootId,
      payload.source,
      payload.topic,
      payload.payloadKind,
      ageMs === null ? "missing" : "stale",
    ].join("|");
    debugWarnOnce(
      debugLog,
      "buildGridSnapshot: game-state-missing-or-stale",
      signature,
      payload
    );
  }

  function buildGridSnapshot(options = {}) {
    const debugLog =
      typeof options.debugLog === "function" ? options.debugLog : null;
    const root = options.root || findGridRoot(options);
    if (!root) {
      return null;
    }

    const rootId = getDebugRootId(root);
    const gameStateShared = options.gameStateShared || null;
    const gameStateSnapshot = readGameStateSnapshot(gameStateShared);
    const matchFromState =
      gameStateSnapshot && typeof gameStateSnapshot.match === "object"
        ? gameStateSnapshot.match
        : null;
    const playerContextOptions = {
      ...options,
      gridRoot: root,
      gameStateShared,
    };
    const expectedPlayerCount = getExpectedPlayerCount(playerContextOptions);
    const activePlayerInfo = getResolvedActivePlayerInfo(playerContextOptions);
    const visiblePlayerCount = activePlayerInfo.visiblePlayerCount;

    let parsedRows = buildRowsFromLinearGrid(root, expectedPlayerCount);
    if (!parsedRows) {
      parsedRows = buildRowsFromContainers(root, expectedPlayerCount);
    }
    if (!parsedRows || !parsedRows.rows.length) {
      debugTrace(debugLog, "buildGridSnapshot: no rows");
      return null;
    }

    const gameModeInfo = readCricketGameModeInfo(gameStateShared, {
      debugLog,
      document: options.document || document,
      parsedRows,
    });
    const targetOrder = gameModeInfo.targetOrder;
    const targetSet = gameModeInfo.targetSet;
    const modeInfo = readCricketMode(gameStateShared, { debugLog });
    const maxDetectedPlayers = parsedRows.rows.reduce((max, row) => {
      return Math.max(max, row.playerCells.length);
    }, 0);
    const detectedPlayerCount = Math.max(
      parsedRows.detectedPlayerCount || 0,
      maxDetectedPlayers
    );

    let playerCount = detectedPlayerCount;
    let playerSource = "grid";
    if (
      playerCount > 0 &&
      Number.isFinite(expectedPlayerCount) &&
      expectedPlayerCount > playerCount &&
      expectedPlayerCount - playerCount === 1
    ) {
      playerCount = expectedPlayerCount;
      playerSource = "visible-gap-repair";
    }
    if (!(playerCount > 0)) {
      if (Number.isFinite(expectedPlayerCount) && expectedPlayerCount > 0) {
        playerCount = expectedPlayerCount;
        playerSource =
          Number.isFinite(Number(options.playerCount)) && Number(options.playerCount) > 0
            ? "explicit"
            : "visible-players";
      } else {
        playerCount = 1;
        playerSource = "minimum-1";
      }
    }

    const playerMapping = buildPlayerSlotMapping({
      ...playerContextOptions,
      gameStateShared,
      match: matchFromState || readMatchData(gameStateShared),
      activePlayerInfo,
      playerCount,
    });
    const playerSlots = Array.isArray(playerMapping.playerSlots)
      ? playerMapping.playerSlots.slice(0, playerCount)
      : [];
    const activePlayerResolutionRaw = resolveActivePlayerResolution(
      activePlayerInfo,
      playerSlots,
      playerCount
    );
    const stabilizedResolution = stabilizeActivePlayerResolution({
      key: getActiveResolutionStabilityKey({
        rootId,
        playerDisplayRootId: activePlayerInfo.playerDisplayRootId || "",
        playerCount,
        gameStateSnapshot,
      }),
      now: Date.now(),
      playerCount,
      fallbackIndex: Number.isFinite(activePlayerInfo.index)
        ? activePlayerInfo.index
        : 0,
      candidateIndex: Number.isFinite(activePlayerResolutionRaw.columnIndex)
        ? activePlayerResolutionRaw.columnIndex
        : 0,
      rawSource: activePlayerResolutionRaw.source,
      displayIndex: activePlayerResolutionRaw.displayIndex,
      matchIndex: activePlayerResolutionRaw.matchIndex,
      usedVisibleDom: Boolean(activePlayerResolutionRaw.usedVisibleDom),
    });
    const activePlayerResolution = {
      ...activePlayerResolutionRaw,
      columnIndex: stabilizedResolution.index,
      displayIndex: stabilizedResolution.displayIndex,
      matchIndex: stabilizedResolution.matchIndex,
      source: stabilizedResolution.source,
      rawSource: stabilizedResolution.rawSource,
      sourceConfidence: stabilizedResolution.sourceConfidence,
      stabilityHold: stabilizedResolution.stabilityHold,
      stabilityReason: stabilizedResolution.stabilityReason,
      stabilityAgeMs: stabilizedResolution.stabilityAgeMs,
      rawDisplayIndex: stabilizedResolution.rawDisplayIndex,
      rawMatchIndex: stabilizedResolution.rawMatchIndex,
      rawIndex: stabilizedResolution.rawIndex,
      usedVisibleDom: Boolean(stabilizedResolution.usedVisibleDom),
      pendingLowCount: stabilizedResolution.pendingLowCount,
      pendingLowIndex: stabilizedResolution.pendingLowIndex,
    };
    const resolvedActivePlayerIndex = activePlayerResolution.columnIndex;
    const displayMappedPlayerIndex = Number.isFinite(activePlayerInfo.displayIndex)
      ? resolveMappedActivePlayerIndex(
          {
            displayIndex: activePlayerInfo.displayIndex,
            index: activePlayerInfo.displayIndex,
            source: "dom-fallback",
          },
          playerSlots,
          playerCount
        )
      : null;
    const stateMappedPlayerIndex = Number.isFinite(activePlayerInfo.stateIndex)
      ? resolveMappedActivePlayerIndex(
          {
            stateIndex: activePlayerInfo.stateIndex,
            index: activePlayerInfo.stateIndex,
          },
          playerSlots,
          playerCount
        )
      : null;
    const turnMarksByLabel = readTurnMarksByLabel(
      gameStateShared,
      targetSet,
      playerSlots
    );
    const activeThrowMarksByLabel = readActiveThrowMarksByLabel(
      gameStateShared,
      targetSet
    );
    if (debugLog && activePlayerResolution.stabilityHold) {
      const holdPayload = {
        rootId,
        playerDisplayRootId: activePlayerInfo.playerDisplayRootId || "",
        playerDisplayRootCount: activePlayerInfo.playerDisplayRootCount || 0,
        rawSource: activePlayerResolution.rawSource || "",
        rawIndex: Number.isFinite(activePlayerResolution.rawIndex)
          ? activePlayerResolution.rawIndex
          : null,
        stabilizedSource: activePlayerResolution.source || "",
        stabilizedIndex: resolvedActivePlayerIndex,
        sourceConfidence: activePlayerResolution.sourceConfidence || "low",
        stabilityReason: activePlayerResolution.stabilityReason || "",
        stabilityAgeMs: activePlayerResolution.stabilityAgeMs,
        pendingLowCount: activePlayerResolution.pendingLowCount || 0,
      };
      const holdSignature = [
        holdPayload.rootId,
        holdPayload.playerDisplayRootId,
        holdPayload.rawSource,
        holdPayload.rawIndex,
        holdPayload.stabilizedSource,
        holdPayload.stabilizedIndex,
        holdPayload.sourceConfidence,
        holdPayload.stabilityReason,
      ].join("|");
      debugWarnOnce(
        debugLog,
        "buildGridSnapshot: active-player-stability-hold",
        holdSignature,
        holdPayload
      );
    }
    if (debugLog && (activePlayerInfo.playerDisplayRootCount || 0) > 1) {
      const rootConflictPayload = {
        selectedPlayerDisplayRootId: activePlayerInfo.playerDisplayRootId || "",
        playerDisplayRootCount: activePlayerInfo.playerDisplayRootCount || 0,
        activePlayerSource: activePlayerInfo.source,
        activePlayerDisplayIndex: Number.isFinite(activePlayerInfo.displayIndex)
          ? activePlayerInfo.displayIndex
          : null,
        gameStateActivePlayerIndex: Number.isFinite(activePlayerInfo.stateIndex)
          ? activePlayerInfo.stateIndex
          : null,
        playerMappingSource: playerMapping.playerMappingSource,
        resolutionSource: activePlayerResolution.source,
        sourceConfidence: activePlayerResolution.sourceConfidence || "low",
        rootId,
      };
      const rootConflictSignature = [
        rootConflictPayload.rootId,
        rootConflictPayload.selectedPlayerDisplayRootId,
        rootConflictPayload.playerDisplayRootCount,
        rootConflictPayload.activePlayerDisplayIndex,
        rootConflictPayload.gameStateActivePlayerIndex,
        rootConflictPayload.playerMappingSource,
      ].join("|");
      debugWarnOnce(
        debugLog,
        "buildGridSnapshot: multiple-player-display-roots",
        rootConflictSignature,
        rootConflictPayload
      );
    }
    if (
      debugLog &&
      activePlayerInfo.source === "visible-dom" &&
      Number.isFinite(displayMappedPlayerIndex) &&
      Number.isFinite(stateMappedPlayerIndex) &&
      displayMappedPlayerIndex !== stateMappedPlayerIndex
    ) {
      const conflictPayload = {
        activePlayerSource: activePlayerInfo.source,
        resolutionSource: activePlayerResolution.source,
        displayMappedPlayerIndex,
        gameStateMappedPlayerIndex: stateMappedPlayerIndex,
        gameStateActivePlayerIndex: activePlayerInfo.stateIndex,
        resolutionDisplayIndex: activePlayerResolution.displayIndex,
        resolutionMatchIndex: activePlayerResolution.matchIndex,
        activeCandidates: Array.isArray(activePlayerInfo.activeCandidates)
          ? activePlayerInfo.activeCandidates.map((candidate) => ({
              index: candidate.index,
              playerId: candidate.playerId || "",
              nameKey: candidate.nameKey || "",
            }))
          : [],
        playerSlots: playerSlots.map((slot) => ({
          columnIndex: slot.columnIndex,
          displayIndex: slot.displayIndex,
          matchIndex: slot.matchIndex,
          playerId: slot.playerId || "",
          nameKey: slot.nameKey || "",
          source: slot.source || "",
        })),
        playerMappingSource: playerMapping.playerMappingSource,
        playerDisplayRootId: activePlayerInfo.playerDisplayRootId || "",
        playerDisplayRootCount: activePlayerInfo.playerDisplayRootCount || 0,
        rootId,
      };
      const conflictSignature = [
        conflictPayload.rootId,
        conflictPayload.displayMappedPlayerIndex,
        conflictPayload.gameStateMappedPlayerIndex,
        conflictPayload.gameStateActivePlayerIndex,
        conflictPayload.playerMappingSource,
      ].join("|");
      debugWarnOnce(
        debugLog,
        "buildGridSnapshot: board-source-conflict",
        conflictSignature,
        conflictPayload
      );
    }
    if (
      debugLog &&
      ((visiblePlayerCount > 0 &&
        detectedPlayerCount > 0 &&
        visiblePlayerCount !== detectedPlayerCount) ||
        (Number.isFinite(activePlayerInfo.stateIndex) &&
          activePlayerInfo.source !== "game-state" &&
          resolveMappedActivePlayerIndex(
            { stateIndex: activePlayerInfo.stateIndex, index: activePlayerInfo.stateIndex },
            playerSlots,
            playerCount
          ) !== resolvedActivePlayerIndex))
    ) {
      const mismatchPayload = {
        playerSource,
        visiblePlayerCount,
        detectedPlayerCount,
        activePlayerIndex: resolvedActivePlayerIndex,
        activePlayerSource: activePlayerInfo.source,
        gameStateActivePlayerIndex: activePlayerInfo.stateIndex,
        gameStateMappedPlayerIndex: stateMappedPlayerIndex,
        displayMappedPlayerIndex,
        playerMappingSource: playerMapping.playerMappingSource,
        resolutionSource: activePlayerResolution.source,
        resolutionDisplayIndex: activePlayerResolution.displayIndex,
        resolutionMatchIndex: activePlayerResolution.matchIndex,
        visibleActiveCandidates: Array.isArray(activePlayerInfo.activeCandidates)
          ? activePlayerInfo.activeCandidates.length
          : 0,
        activeCandidates: Array.isArray(activePlayerInfo.activeCandidates)
          ? activePlayerInfo.activeCandidates.map((candidate) => ({
              index: candidate.index,
              playerId: candidate.playerId || "",
              nameKey: candidate.nameKey || "",
            }))
          : [],
        playerSlots: playerSlots.map((slot) => ({
          columnIndex: slot.columnIndex,
          displayIndex: slot.displayIndex,
          matchIndex: slot.matchIndex,
          playerId: slot.playerId || "",
          nameKey: slot.nameKey || "",
          source: slot.source || "",
        })),
        sourceConfidence: activePlayerResolution.sourceConfidence || "low",
        rawResolutionSource: activePlayerResolution.rawSource || "",
        stabilityHold: Boolean(activePlayerResolution.stabilityHold),
        stabilityReason: activePlayerResolution.stabilityReason || "",
        rootId,
        playerDisplayRootId: activePlayerInfo.playerDisplayRootId || "",
        playerDisplayRootCount: activePlayerInfo.playerDisplayRootCount || 0,
      };
      const mismatchSignature = [
        mismatchPayload.rootId,
        mismatchPayload.playerSource,
        visiblePlayerCount,
        detectedPlayerCount,
        mismatchPayload.activePlayerSource,
        mismatchPayload.gameStateActivePlayerIndex,
        mismatchPayload.activePlayerIndex,
        mismatchPayload.playerMappingSource,
      ].join("|");
      debugWarnOnce(
        debugLog,
        "buildGridSnapshot: player-source-mismatch",
        mismatchSignature,
        mismatchPayload
      );
    }
    if (debugLog && playerSource === "visible-gap-repair") {
      const repairPayload = {
        detectedPlayerCount,
        expectedPlayerCount,
        visiblePlayerCount,
        playerSource,
        rootId,
      };
      const repairSignature = [
        repairPayload.rootId,
        detectedPlayerCount,
        expectedPlayerCount,
        visiblePlayerCount,
        playerSource,
      ].join("|");
      debugWarnOnce(
        debugLog,
        "buildGridSnapshot: repaired player undercount",
        repairSignature,
        repairPayload
      );
    }
    if (debugLog && activeThrowMarksByLabel.size > 0) {
      debugTrace(debugLog, "buildGridSnapshot: active-throw-preview", {
        activePlayerIndex: resolvedActivePlayerIndex,
        preview: Object.fromEntries(activeThrowMarksByLabel.entries()),
      });
    }
    if (debugLog && turnMarksByLabel.size > 0) {
      debugTrace(debugLog, "buildGridSnapshot: turn-derived-preview", {
        preview: Object.fromEntries(turnMarksByLabel.entries()),
      });
    }

    maybeWarnGameStateMissingOrStale(debugLog, {
      rootId,
      gameStateSnapshot,
      playerMappingSource: playerMapping.playerMappingSource,
    });

    const playerColumnAnchors = collectPlayerColumnAnchorCenters(
      parsedRows.rows,
      playerCount
    );
    if (
      debugLog &&
      Array.isArray(playerColumnAnchors) &&
      playerColumnAnchors.some((value) => Number.isFinite(value))
    ) {
      debugTrace(debugLog, "buildGridSnapshot: player-column-anchors", {
        anchors: playerColumnAnchors,
        playerCount,
      });
    }

    const rows = parsedRows.rows
      .filter((row) => targetSet.has(row.label))
      .map((row) => {
        const rawPlayerCells = mapRowCellsToPlayerSlots(
          row.playerCells,
          playerCount,
          playerColumnAnchors
        );
        const playerCells = rawPlayerCells.slice(0, playerCount);
        const marksByPlayer = [];
        const markReadMeta = [];
        const rowSlotMappingMethod =
          Array.isArray(row?.playerCells) && row.playerCells.length < playerCount
            ? "anchor-remap"
            : "direct";
        for (let index = 0; index < playerCount; index += 1) {
          if (debugLog) {
            const cellCenterX = getElementCenterX(playerCells[index]);
            const readDetail = readMarksWithMeta(playerCells[index], row.label);
            marksByPlayer.push(readDetail.marks);
            markReadMeta.push({
              columnIndex: index,
              source: readDetail.source || "",
              raw: readDetail.raw || "",
              initialMarks: readDetail.marks,
              rowSlotMappingMethod,
              iconCount: Number.isFinite(readDetail.iconCount)
                ? readDetail.iconCount
                : 0,
              hasCell: isElement(playerCells[index]),
              cellCenterX: Number.isFinite(cellCenterX) ? cellCenterX : null,
              cellClass:
                isElement(playerCells[index]) &&
                typeof playerCells[index].getAttribute === "function"
                  ? playerCells[index].getAttribute("class") || ""
                  : "",
            });
          } else {
            marksByPlayer.push(readMarks(playerCells[index], row.label));
          }
        }
        const throwMarks = activeThrowMarksByLabel.get(row.label) || 0;
        const domHasAnyMarks = marksByPlayer.some((mark) => clampMark(mark) > 0);
        const turnMarks = turnMarksByLabel.get(row.label);
        if (Array.isArray(turnMarks) && turnMarks.length) {
          if (!domHasAnyMarks) {
            for (let index = 0; index < playerCount; index += 1) {
              marksByPlayer[index] = Math.max(
                clampMark(marksByPlayer[index]),
                clampMark(turnMarks[index])
              );
            }
          } else if (throwMarks > 0 && resolvedActivePlayerIndex >= 0) {
            const activeTurnMarks = clampMark(turnMarks[resolvedActivePlayerIndex]);
            if (activeTurnMarks > 0) {
              marksByPlayer[resolvedActivePlayerIndex] = Math.max(
                clampMark(marksByPlayer[resolvedActivePlayerIndex]),
                activeTurnMarks
              );
            }
          }
        }
        if (throwMarks > 0 && resolvedActivePlayerIndex >= 0) {
          marksByPlayer[resolvedActivePlayerIndex] = clampMark(
            (marksByPlayer[resolvedActivePlayerIndex] || 0) + throwMarks
          );
        }
        if (markReadMeta.length) {
          markReadMeta.forEach((entry, index) => {
            entry.finalMarks = clampMark(marksByPlayer[index]);
          });
        }
        return {
          label: row.label,
          rowElement: row.rowElement,
          labelCell: row.labelCell || null,
          badgeNode: row.badgeNode || null,
          playerCells,
          marksByPlayer,
          markReadMeta: markReadMeta.length ? markReadMeta : null,
        };
      })
      .sort((first, second) => {
        return targetOrder.indexOf(first.label) - targetOrder.indexOf(second.label);
      });

    if (!rows.length) {
      debugTrace(debugLog, "buildGridSnapshot: no rows after target filter", {
        gameMode: gameModeInfo.normalized,
      });
      return null;
    }

    const rowMap = new Map(rows.map((row) => [row.label, row]));

    return {
      root,
      rows,
      rowMap,
      gameModeInfo,
      targetOrder,
      targetSet,
      playerCount,
      visiblePlayerCount,
      detectedPlayerCount,
      playerSource,
      playerSlots,
      playerMappingSource: playerMapping.playerMappingSource,
      activePlayerIndex: resolvedActivePlayerIndex,
      boardPlayerIndex: resolvedActivePlayerIndex,
      activePlayerResolution: {
        displayIndex: activePlayerResolution.displayIndex,
        matchIndex: activePlayerResolution.matchIndex,
        columnIndex: activePlayerResolution.columnIndex,
        source: activePlayerResolution.source,
        rawSource: activePlayerResolution.rawSource || "",
        sourceConfidence: activePlayerResolution.sourceConfidence || "low",
        stabilityHold: Boolean(activePlayerResolution.stabilityHold),
        stabilityReason: activePlayerResolution.stabilityReason || "",
        stabilityAgeMs: Number.isFinite(activePlayerResolution.stabilityAgeMs)
          ? activePlayerResolution.stabilityAgeMs
          : 0,
        rawDisplayIndex: Number.isFinite(activePlayerResolution.rawDisplayIndex)
          ? activePlayerResolution.rawDisplayIndex
          : null,
        rawMatchIndex: Number.isFinite(activePlayerResolution.rawMatchIndex)
          ? activePlayerResolution.rawMatchIndex
          : null,
        rawIndex: Number.isFinite(activePlayerResolution.rawIndex)
          ? activePlayerResolution.rawIndex
          : null,
        usedVisibleDom: Boolean(activePlayerResolution.usedVisibleDom),
        visibleActiveCandidates: Array.isArray(activePlayerInfo.activeCandidates)
          ? activePlayerInfo.activeCandidates.length
          : 0,
        playerDisplayRootId: activePlayerInfo.playerDisplayRootId || "",
        playerDisplayRootCount: activePlayerInfo.playerDisplayRootCount || 0,
      },
      runtimeSourceHint: getRuntimeSourceHint(),
      modeInfo,
    };
  }

  function evaluatePlayerTargetState(
    marksByPlayer,
    playerIndex,
    options = {}
  ) {
    const resolvedMarks = Array.isArray(marksByPlayer)
      ? marksByPlayer.map((value) => clampMark(value))
      : [];
    const resolvedIndex =
      resolvedMarks.length > 0
        ? Math.max(0, Math.min(playerIndex || 0, resolvedMarks.length - 1))
        : 0;
    const marks = resolvedMarks[resolvedIndex] || 0;
    const opponentMarks = resolvedMarks.filter(
      (_, index) => index !== resolvedIndex
    );
    const dead =
      options.showDeadTargets !== false &&
      resolvedMarks.length > 1 &&
      resolvedMarks.every((mark) => mark >= 3);
    const supportsTacticalHighlights = Boolean(
      options.supportsTacticalHighlights
    );
    const offense =
      supportsTacticalHighlights &&
      marks >= 3 &&
      opponentMarks.some((mark) => mark < 3) &&
      !dead;
    const danger =
      supportsTacticalHighlights &&
      marks < 3 &&
      opponentMarks.some((mark) => mark >= 3) &&
      !dead;
    const pressure = danger && marks <= 1;
    const closed = marks >= 3 && !offense && !dead;

    let presentation = "open";
    if (dead) {
      presentation = "dead";
    } else if (offense) {
      presentation = "offense";
    } else if (pressure) {
      presentation = "pressure";
    } else if (danger) {
      presentation = "danger";
    } else if (closed) {
      presentation = "closed";
    }

    return {
      index: resolvedIndex,
      marks,
      isActivePlayer: resolvedIndex === options.activePlayerIndex,
      presentation,
      offense,
      danger,
      pressure,
      closed,
      dead,
    };
  }

  function computeTargetStates(snapshot, options = {}) {
    const showDeadTargets = options.showDeadTargets !== false;
    const stateMap = new Map();

    if (!snapshot || !Array.isArray(snapshot.rows)) {
      return stateMap;
    }

    snapshot.rows.forEach((row) => {
      const marksByPlayer = row.marksByPlayer
        .slice(0, snapshot.playerCount)
        .map((value) => clampMark(value));
      if (!marksByPlayer.length) {
        return;
      }

      const activePlayerIndex = Math.max(
        0,
        Math.min(
          Number.isFinite(snapshot.boardPlayerIndex)
            ? snapshot.boardPlayerIndex
            : snapshot.activePlayerIndex || 0,
          marksByPlayer.length - 1
        )
      );
      const supportsTacticalHighlights =
        snapshot.modeInfo && snapshot.modeInfo.supportsTacticalHighlights;
      const cellStates = marksByPlayer.map((marks, index) => {
        return evaluatePlayerTargetState(marksByPlayer, index, {
          activePlayerIndex,
          showDeadTargets,
          supportsTacticalHighlights,
        });
      });
      const boardState =
        cellStates[activePlayerIndex] ||
        evaluatePlayerTargetState(marksByPlayer, activePlayerIndex, {
          activePlayerIndex,
          showDeadTargets,
          supportsTacticalHighlights,
        });
      const presentation = boardState.presentation || "open";

      stateMap.set(row.label, {
        label: row.label,
        modeFamily: snapshot.modeInfo ? snapshot.modeInfo.family : "standard",
        rawMode: snapshot.modeInfo ? snapshot.modeInfo.raw : "",
        activePlayerIndex,
        marksByPlayer,
        activeMarks: boardState.marks,
        offense: boardState.offense,
        danger: boardState.danger,
        pressure: boardState.pressure,
        closed: boardState.closed,
        dead: boardState.dead,
        presentation,
        boardPresentation: presentation,
        boardState,
        cellStates,
      });
    });

    return stateMap;
  }

  global.autodartsCricketStateShared = {
    __initialized: true,
    __moduleId: MODULE_ID,
    __apiVersion: API_VERSION,
    __buildSignature: BUILD_SIGNATURE,
    TARGET_ORDER,
    CRICKET_TARGET_ORDER,
    TACTICS_TARGET_ORDER,
    normalizeLabel,
    getTargetOrderByGameMode,
    isVisiblePlayerNode,
    sortElementsByVisualOrder,
    extractPlayerNodeIdentity,
    extractMatchPlayerIdentity,
    getPreferredPlayerNodes,
    getVisiblePlayerCount,
    buildPlayerSlotMapping,
    findGridRoot,
    resolveActivePlayerIndex,
    resolveActivePlayerResolution,
    readCricketMode,
    readCricketGameModeInfo,
    buildGridSnapshot,
    evaluatePlayerTargetState,
    computeTargetStates,
  };
})(typeof window !== "undefined" ? window : globalThis);
