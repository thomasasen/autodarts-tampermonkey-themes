(function (global) {
  "use strict";

  if (
    global.autodartsCricketStateShared &&
    global.autodartsCricketStateShared.__initialized
  ) {
    return;
  }

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

  function getPlayerDisplayRoot(options = {}) {
    const doc = options.document || document;
    return doc.getElementById(PLAYER_DISPLAY_ID);
  }

  function isVisiblePlayerNode(element) {
    return isLayoutVisible(element);
  }

  function sortElementsByVisualOrder(elements, options = {}) {
    const rowTolerance = Number.isFinite(options.rowTolerance)
      ? options.rowTolerance
      : 8;

    return uniqueElements(elements)
      .filter((element) => isElement(element))
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          index,
          top: Number.isFinite(rect.top) ? rect.top : 0,
          left: Number.isFinite(rect.left) ? rect.left : 0,
          width: Number.isFinite(rect.width) ? rect.width : 0,
          height: Number.isFinite(rect.height) ? rect.height : 0,
        };
      })
      .sort((first, second) => {
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
      return sortElementsByVisualOrder(visibleDirectDisplayPlayers);
    }
    if (visibleDisplayPlayers.length) {
      return sortElementsByVisualOrder(visibleDisplayPlayers);
    }
    if (visibleGlobalPlayers.length) {
      return sortElementsByVisualOrder(visibleGlobalPlayers);
    }
    return sortElementsByVisualOrder(globalPlayers);
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
      if (debugLog) {
        debugLog("findGridRoot: tableSelector", {
          tableSelector,
          found: Boolean(direct),
        });
      }
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
    if (debugLog) {
      debugLog("findGridRoot: result", {
        found: Boolean(cachedGridRoot),
        visible: Boolean(cachedGridRoot && isLayoutVisible(cachedGridRoot)),
      });
    }
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
    const players = getPreferredPlayerNodes(options);
    const visiblePlayerCount = players.filter(isVisiblePlayerNode).length;
    const activeIndices = players.reduce((indices, player, index) => {
      const isVisible = isVisiblePlayerNode(player);
      const isActive =
        player.matches(activePlayerSelector) ||
        (typeof player.querySelector === "function" &&
          player.querySelector(activePlayerSelector));
      if (isVisible && isActive) {
        indices.push(index);
      }
      return indices;
    }, []);

    if (activeIndices.length > 0) {
      return {
        index: activeIndices[0],
        displayIndex: activeIndices[0],
        source: "visible-dom",
        visiblePlayerCount,
        stateIndex:
          gameStateShared && gameStateShared.getActivePlayerIndex
            ? gameStateShared.getActivePlayerIndex()
            : null,
      };
    }

    const fromState = gameStateShared && gameStateShared.getActivePlayerIndex
      ? gameStateShared.getActivePlayerIndex()
      : null;
    if (Number.isFinite(fromState) && fromState >= 0) {
      return {
        index: fromState,
        displayIndex: null,
        source: "game-state",
        visiblePlayerCount,
        stateIndex: fromState,
      };
    }

    const activeIndex = players.findIndex((player) => {
      return (
        player.matches(activePlayerSelector) ||
        (typeof player.querySelector === "function" &&
          player.querySelector(activePlayerSelector))
      );
    });

    return {
      index: activeIndex >= 0 ? activeIndex : 0,
      displayIndex: activeIndex >= 0 ? activeIndex : null,
      source: activeIndex >= 0 ? "dom-fallback" : "default-zero",
      visiblePlayerCount,
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
        debugLog("readCricketMode: unknown mode treated as neutral", {
          raw,
          normalized,
        });
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
      debugLog("readCricketGameModeInfo: inferred tactics from parsed rows", {
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

    const match = text.match(/\b([0-3])\b/);
    return match ? Number(match[1]) : null;
  }

  function readMarkAttributes(element) {
    if (!isElement(element)) {
      return null;
    }

    const keys = [
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

    for (const key of keys) {
      const parsed = parseMarkString(element.getAttribute(key));
      if (parsed !== null) {
        return clampMark(parsed);
      }
    }

    for (const [key, value] of Object.entries(element.dataset || {})) {
      if (!/mark|hit|count|value/i.test(key)) {
        continue;
      }
      const parsed = parseMarkString(value);
      if (parsed !== null) {
        return clampMark(parsed);
      }
    }

    return null;
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

  function readMarks(cell, rowLabel) {
    if (!isElement(cell)) {
      return 0;
    }

    const directAttributeMarks = readMarkAttributes(cell);
    if (directAttributeMarks !== null) {
      return directAttributeMarks;
    }

    const iconNodes = toArray(
      cell.querySelectorAll("img, svg, [aria-label], [title], [alt]")
    ).filter((node) => !isIgnoredDecorationElement(node));

    let bestAttributeMarks = null;
    iconNodes.forEach((iconNode) => {
      const parsed = readMarkAttributes(iconNode);
      if (parsed !== null) {
        bestAttributeMarks =
          bestAttributeMarks === null
            ? parsed
            : Math.max(bestAttributeMarks, parsed);
      }
    });
    if (bestAttributeMarks !== null) {
      return clampMark(bestAttributeMarks);
    }

    if (iconNodes.length > 0) {
      const visualMarks = iconNodes.filter((iconNode) =>
        iconNode.matches("img, svg")
      ).length;
      if (visualMarks > 0) {
        return Math.min(3, visualMarks);
      }
    }

    const textMarks = readMarksFromText(buildCellText(cell, rowLabel));
    if (textMarks !== null) {
      return clampMark(textMarks);
    }

    const nestedAttributeTarget =
      cell.querySelector("[data-marks], [data-mark], [data-hits], [data-hit]") ||
      cell.querySelector("[aria-label], [title], [alt]");
    if (nestedAttributeTarget) {
      const nestedMarks = readMarkAttributes(nestedAttributeTarget);
      if (nestedMarks !== null) {
        return nestedMarks;
      }
    }

    return 0;
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

    cells.forEach((cell) => {
      if (!isElement(cell) || seen.has(cell)) {
        return;
      }
      seen.add(cell);

      if (cell === labelCell || cell.contains(labelNode)) {
        return;
      }
      if (getNodeLabel(cell)) {
        return;
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
        if (getNodeLabel(node)) {
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

        return hasMarkHints(node, label) || rect.width >= 28;
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
      const playerCells = sanitizePlayerCells(
        rowSlice.slice(1),
        labelCell,
        labelCell,
        expectedPlayerCount || rowSpan - 1
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

      const playerCells = sanitizePlayerCells(
        mergeUniqueElements(extracted.playerCells, alignedCells),
        labelNode,
        extracted.labelCell,
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
    const slots = Array.isArray(playerSlots) ? playerSlots : [];
    const displayIndex = Number.isFinite(activePlayerInfo?.displayIndex)
      ? activePlayerInfo.displayIndex
      : null;
    if (displayIndex !== null) {
      const matchedSlot = slots.find((slot) => slot.displayIndex === displayIndex);
      if (matchedSlot && Number.isFinite(matchedSlot.columnIndex)) {
        return matchedSlot.columnIndex;
      }
    }

    const stateIndex = Number.isFinite(activePlayerInfo?.stateIndex)
      ? activePlayerInfo.stateIndex
      : null;
    if (stateIndex !== null) {
      const matchedSlot = slots.find((slot) => slot.matchIndex === stateIndex);
      if (matchedSlot && Number.isFinite(matchedSlot.columnIndex)) {
        return matchedSlot.columnIndex;
      }
    }

    const fallbackIndex = Number.isFinite(activePlayerInfo?.index)
      ? activePlayerInfo.index
      : 0;
    if (playerCount > 0) {
      return Math.max(0, Math.min(fallbackIndex, playerCount - 1));
    }
    return 0;
  }

  function buildGridSnapshot(options = {}) {
    const debugLog =
      typeof options.debugLog === "function" ? options.debugLog : null;
    const root = options.root || findGridRoot(options);
    if (!root) {
      return null;
    }

    const expectedPlayerCount = getExpectedPlayerCount(options);
    const gameStateShared = options.gameStateShared || null;
    const activePlayerInfo = getResolvedActivePlayerInfo(options);
    const visiblePlayerCount = activePlayerInfo.visiblePlayerCount;

    let parsedRows = buildRowsFromLinearGrid(root, expectedPlayerCount);
    if (!parsedRows) {
      parsedRows = buildRowsFromContainers(root, expectedPlayerCount);
    }
    if (!parsedRows || !parsedRows.rows.length) {
      if (debugLog) {
        debugLog("buildGridSnapshot: no rows");
      }
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
      ...options,
      gameStateShared,
      match: readMatchData(gameStateShared),
      activePlayerInfo,
      playerCount,
    });
    const playerSlots = Array.isArray(playerMapping.playerSlots)
      ? playerMapping.playerSlots.slice(0, playerCount)
      : [];
    const resolvedActivePlayerIndex = resolveMappedActivePlayerIndex(
      activePlayerInfo,
      playerSlots,
      playerCount
    );
    const turnMarksByLabel = readTurnMarksByLabel(
      gameStateShared,
      targetSet,
      playerSlots
    );
    const activeThrowMarksByLabel = readActiveThrowMarksByLabel(
      gameStateShared,
      targetSet
    );
    if (
      debugLog &&
      ((visiblePlayerCount > 0 &&
        detectedPlayerCount > 0 &&
        visiblePlayerCount !== detectedPlayerCount) ||
        (Number.isFinite(activePlayerInfo.stateIndex) &&
          activePlayerInfo.source !== "game-state" &&
          activePlayerInfo.stateIndex !== resolvedActivePlayerIndex))
    ) {
      debugLog("buildGridSnapshot: player-source-mismatch", {
        visiblePlayerCount,
        detectedPlayerCount,
        activePlayerIndex: resolvedActivePlayerIndex,
        activePlayerSource: activePlayerInfo.source,
        gameStateActivePlayerIndex: activePlayerInfo.stateIndex,
        playerMappingSource: playerMapping.playerMappingSource,
        playerSlots,
      });
    }
    if (debugLog && playerSource === "visible-gap-repair") {
      debugLog("buildGridSnapshot: repaired player undercount", {
        detectedPlayerCount,
        expectedPlayerCount,
        visiblePlayerCount,
      });
    }
    if (debugLog && activeThrowMarksByLabel.size > 0) {
      debugLog("buildGridSnapshot: active-throw-preview", {
        activePlayerIndex: resolvedActivePlayerIndex,
        preview: Object.fromEntries(activeThrowMarksByLabel.entries()),
      });
    }
    if (debugLog && turnMarksByLabel.size > 0) {
      debugLog("buildGridSnapshot: turn-derived-preview", {
        preview: Object.fromEntries(turnMarksByLabel.entries()),
      });
    }

    const rows = parsedRows.rows
      .filter((row) => targetSet.has(row.label))
      .map((row) => {
        const playerCells = row.playerCells.slice(0, playerCount);
        const marksByPlayer = [];
        for (let index = 0; index < playerCount; index += 1) {
          marksByPlayer.push(readMarks(playerCells[index], row.label));
        }
        const turnMarks = turnMarksByLabel.get(row.label);
        if (Array.isArray(turnMarks) && turnMarks.length) {
          for (let index = 0; index < playerCount; index += 1) {
            marksByPlayer[index] = Math.max(
              clampMark(marksByPlayer[index]),
              clampMark(turnMarks[index])
            );
          }
        } else {
          const throwMarks = activeThrowMarksByLabel.get(row.label) || 0;
          if (throwMarks > 0 && resolvedActivePlayerIndex >= 0) {
            marksByPlayer[resolvedActivePlayerIndex] = clampMark(
              (marksByPlayer[resolvedActivePlayerIndex] || 0) + throwMarks
            );
          }
        }
        return {
          label: row.label,
          rowElement: row.rowElement,
          labelCell: row.labelCell || null,
          badgeNode: row.badgeNode || null,
        playerCells,
        marksByPlayer,
      };
      })
      .sort((first, second) => {
        return targetOrder.indexOf(first.label) - targetOrder.indexOf(second.label);
      });

    if (!rows.length) {
      if (debugLog) {
        debugLog("buildGridSnapshot: no rows after target filter", {
          gameMode: gameModeInfo.normalized,
        });
      }
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
      modeInfo,
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
        Math.min(snapshot.activePlayerIndex || 0, marksByPlayer.length - 1)
      );
      const activeMarks = marksByPlayer[activePlayerIndex] || 0;
      const opponentMarks = marksByPlayer.filter(
        (_, index) => index !== activePlayerIndex
      );
      const anyOpponentOpen = opponentMarks.some((mark) => mark < 3);
      const anyOpponentClosed = opponentMarks.some((mark) => mark >= 3);
      const dead =
        showDeadTargets &&
        marksByPlayer.length > 1 &&
        marksByPlayer.every((mark) => mark >= 3);
      const supportsTacticalHighlights =
        snapshot.modeInfo && snapshot.modeInfo.supportsTacticalHighlights;
      const offense =
        Boolean(supportsTacticalHighlights) &&
        activeMarks >= 3 &&
        anyOpponentOpen &&
        !dead;
      const danger =
        Boolean(supportsTacticalHighlights) &&
        activeMarks < 3 &&
        anyOpponentClosed &&
        !dead;
      const pressure = danger && activeMarks <= 1;
      const closed = activeMarks >= 3 && !offense && !dead;
      const cellStates = marksByPlayer.map((marks, index) => {
        const isActivePlayer = index === activePlayerIndex;
        let cellPresentation = "neutral";
        if (dead) {
          cellPresentation = "dead";
        } else if (isActivePlayer) {
          if (offense) {
            cellPresentation = "offense";
          } else if (pressure) {
            cellPresentation = "pressure";
          } else if (danger) {
            cellPresentation = "danger";
          } else if (closed) {
            cellPresentation = "closed";
          } else {
            cellPresentation = "open";
          }
        }

        return {
          index,
          marks,
          isActivePlayer,
          presentation: cellPresentation,
        };
      });

      let presentation = "open";
      if (dead) {
        presentation = "dead";
      } else if (offense) {
        presentation = "offense";
      } else if (danger) {
        presentation = "danger";
      } else if (closed) {
        presentation = "closed";
      }

      stateMap.set(row.label, {
        label: row.label,
        modeFamily: snapshot.modeInfo ? snapshot.modeInfo.family : "standard",
        rawMode: snapshot.modeInfo ? snapshot.modeInfo.raw : "",
        activePlayerIndex,
        marksByPlayer,
        activeMarks,
        offense,
        danger,
        pressure,
        closed,
        dead,
        presentation,
        cellStates,
      });
    });

    return stateMap;
  }

  global.autodartsCricketStateShared = {
    __initialized: true,
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
    readCricketMode,
    readCricketGameModeInfo,
    buildGridSnapshot,
    computeTargetStates,
  };
})(typeof window !== "undefined" ? window : globalThis);
