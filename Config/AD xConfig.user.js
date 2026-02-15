// ==UserScript==
// @name         AD xConfig
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0.0
// @description  Adds a central AD xConfig menu with script discovery and configurable xConfig_ settings.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Config/AD%20xConfig.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Config/AD%20xConfig.user.js
// ==/UserScript==

(function () {
  "use strict";

  const MENU_LABEL = "AD xConfig";
  const STORAGE_KEY = "ad-xconfig:config";
  const CONFIG_VERSION = 7;
  const MODULE_CACHE_STORAGE_KEY = "ad-xconfig:module-cache:v1";
  const MODULE_CACHE_VERSION = 1;
  const LOADER_MODE = "xconfig-authoritative";
  const CONFIG_PATH = "/ad-xconfig";
  const REPO_OWNER = "thomasasen";
  const REPO_NAME = "autodarts-tampermonkey-themes";
  const REPO_BASE_URL = "https://github.com/thomasasen/autodarts-tampermonkey-themes";
  const REPO_BRANCH = "main";
  const REPO_README_URL = `${REPO_BASE_URL}/blob/${REPO_BRANCH}/README.md`;
  const REPO_API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
  const REPO_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;

  const STYLE_ID = "ad-xconfig-style";
  const MENU_ITEM_ID = "ad-xconfig-menu-item";
  const PANEL_HOST_ID = "ad-xconfig-panel-host";
  const RUNTIME_GLOBAL_KEY = "__adXConfigRuntime";
  const RUNTIME_EVENT_NAME = "ad-xconfig:changed";
  const RUNTIME_CLEANUP_INTERVAL_MS = 450;
  const SINGLE_BULL_AUDIO_TOKEN = "/assets/singlebull.mp3";
  const THEME_PREVIEW_SPACE_CLASS = "ad-ext-turn-preview-space";
  const THEME_FEATURE_IDS = ["theme-x01", "theme-shanghai", "theme-bermuda", "theme-cricket", "theme-bull-off"];
  const LOADER_STATUS = Object.freeze({
    IDLE: "idle",
    LOADED: "loaded",
    MISSING_CACHE: "missing-cache",
    BLOCKED: "blocked",
    ERROR: "error",
  });

  const TABS = [
    { id: "themes", label: "Themen" },
    { id: "animations", label: "Animationen" },
  ];

  const LEGACY_FEATURE_ID_BY_SOURCE = {
    "Template/Autodarts Theme X01.user.js": "theme-x01",
    "Template/Autodarts Theme Shanghai.user.js": "theme-shanghai",
    "Template/Autodarts Theme Bermuda.user.js": "theme-bermuda",
    "Template/Autodarts Theme Cricket.user.js": "theme-cricket",
    "Template/Autodarts Theme Bull-off.user.js": "theme-bull-off",
    "Animation/Autodarts Animate Turn Points Count.user.js": "a-turn-points",
    "Animation/Autodarts Animate Triple Double Bull Hits.user.js": "a-triple-double-bull",
    "Animation/Autodarts Animate Single Bull Sound.user.js": "a-single-bull",
    "Animation/Autodarts Animate Dart Marker Emphasis.user.js": "a-dart-marker-emphasis",
    "Animation/Autodarts Animate Cricket Target Highlighter.user.js": "a-cricket-target",
    "Animation/Autodarts Animate Checkout Score Pulse.user.js": "a-checkout-pulse",
    "Animation/Autodarts Animate Checkout Board Targets.user.js": "a-checkout-board",
    "Animation/Autodarts Animate Average Trend Arrow.user.js": "a-average-arrow",
    "Animation/Autodarts Animate Dart Marker Darts.user.js": "a-marker-darts",
    "Animation/Autodarts Style Checkout Suggestions.user.js": "a-checkout-style",
    "Animation/Autodarts Animate Winner Fireworks.user.js": "a-winner-fireworks",
    "Animation/Autodarts Animate Turn Start Sweep.user.js": "a-turn-sweep",
    "Animation/Autodarts Animate Remove Darts Notification.user.js": "a-remove-darts",
  };
  const LEGACY_SOURCE_BY_FEATURE_ID = Object.entries(LEGACY_FEATURE_ID_BY_SOURCE).reduce((acc, [source, featureId]) => {
    if (!acc[featureId]) {
      acc[featureId] = source;
    }
    return acc;
  }, {});

  const state = {
    config: null,
    featureRegistry: [],
    activeConfigFeatureId: "",
    panelOpen: false,
    panelHost: null,
    menuButton: null,
    hiddenEls: new Map(),
    contentHidden: false,
    domObserver: null,
    observerRoot: null,
    domSyncQueued: false,
    pollTimer: null,
    noticeTimer: null,
    notice: { type: "", message: "" },
    gitLoad: { loading: false, source: "not-loaded", lastError: "", lastSuccessAt: null, lastSuccessCount: 0, promise: null },
    lastNonConfigRoute: "/lobbies",
    lastRoute: routeKey(),
    runtime: {
      hooksInstalled: false,
      bootstrapLoaded: false,
      bootstrapConfig: null,
      moduleCache: null,
      sourceToFeatureId: new Map(),
      knownFeatureIds: new Set(),
      stackHintEntries: [],
      stackHintCache: new Map(),
      executedFeatures: new Set(),
      executedFiles: new Set(),
      featureRuntimeStatus: {},
      currentFeatureExecution: "",
      observerHandlesByFeature: new Map(),
      intervalHandlesByFeature: new Map(),
      timeoutHandlesByFeature: new Map(),
      cleanupObserver: null,
      cleanupTimer: null,
      cleanupQueued: false,
      animationSharedWrapped: false,
      native: {
        MutationObserver: null,
        setInterval: null,
        clearInterval: null,
        setTimeout: null,
        clearTimeout: null,
        mediaPlay: null,
      },
    },
  };

  function routeKey() {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  function isConfigRoute() {
    return location.pathname === CONFIG_PATH;
  }

  function currentRouteWithQueryAndHash() {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  function toPromise(value) {
    return value && typeof value.then === "function" ? value : Promise.resolve(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getFeatureRegistry() {
    return Array.isArray(state.featureRegistry) ? state.featureRegistry : [];
  }

  function slugifyFeatureId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeSourcePath(pathValue) {
    return String(pathValue || "").replaceAll("\\", "/");
  }

  function normalizeTitle(rawTitle, sourcePath) {
    const fallback = String(sourcePath || "").split("/").pop().replace(/\.user\.js$/i, "");
    const candidate = String(rawTitle || fallback).trim();
    return candidate.replace(/\.user$/i, "").trim();
  }

  function normalizeVariantLabel(rawVariant, category) {
    const variant = String(rawVariant || "").trim().toLowerCase();
    if (variant === "x01") {
      return "X01";
    }
    if (variant === "all") {
      return "Alle Modi";
    }
    if (variant) {
      return variant.charAt(0).toUpperCase() + variant.slice(1);
    }
    return category === "themes" ? "Thema" : "Animation";
  }

  function formatVariantBadgeLabel(rawVariant) {
    const variant = String(rawVariant || "").trim();
    const normalized = variant.toLowerCase();

    if (!variant || normalized === "all" || normalized === "alle" || normalized === "alle modi") {
      return "Gilt für: alle Modi";
    }
    if (normalized === "x01") {
      return "Gilt für: X01";
    }
    return `Gilt für: ${variant}`;
  }

  function normalizeReadmeAnchor(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^a-z0-9-]/g, "");
  }

  function normalizeAssetPath(value) {
    const pathValue = normalizeSourcePath(value || "").replace(/^\/+/, "");
    return pathValue.startsWith("assets/") ? pathValue : "";
  }

  function toRawPath(pathValue) {
    return normalizeSourcePath(pathValue)
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  function safeDecodeUriComponent(value) {
    const text = String(value || "");
    if (!text.includes("%")) {
      return text;
    }

    try {
      return decodeURIComponent(text);
    } catch (_) {
      return text;
    }
  }

  function getFeatureSourcePathById(featureId) {
    if (!featureId) {
      return "";
    }

    const feature = getFeatureById(featureId);
    if (feature && feature.source) {
      return normalizeSourcePath(feature.source);
    }

    const cachedSource = state.runtime.moduleCache?.featureSources?.[featureId];
    if (cachedSource) {
      return normalizeSourcePath(cachedSource);
    }

    if (Object.prototype.hasOwnProperty.call(LEGACY_SOURCE_BY_FEATURE_ID, featureId)) {
      return normalizeSourcePath(LEGACY_SOURCE_BY_FEATURE_ID[featureId]);
    }

    return "";
  }

  function getFeatureTitleById(featureId) {
    const feature = getFeatureById(featureId);
    if (feature && feature.title) {
      return String(feature.title);
    }
    return String(featureId || "Unbekanntes Modul");
  }

  function normalizeStringArray(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    const seen = new Set();
    const normalized = [];
    values.forEach((value) => {
      const text = normalizeSourcePath(String(value || "").trim()).replace(/^\/+/, "");
      if (!text || seen.has(text)) {
        return;
      }
      seen.add(text);
      normalized.push(text);
    });
    return normalized;
  }

  function createEmptyModuleCache() {
    return {
      schemaVersion: MODULE_CACHE_VERSION,
      repo: {
        owner: REPO_OWNER,
        name: REPO_NAME,
        branch: REPO_BRANCH,
      },
      syncedAt: null,
      featureSources: {},
      files: {},
    };
  }

  function normalizeModuleCache(rawCache) {
    if (!rawCache || typeof rawCache !== "object") {
      return null;
    }

    const schemaVersion = Number(rawCache.schemaVersion || 0);
    if (schemaVersion !== MODULE_CACHE_VERSION) {
      return null;
    }

    const filesSource = rawCache.files && typeof rawCache.files === "object" ? rawCache.files : {};
    const featureSourcesSource = rawCache.featureSources && typeof rawCache.featureSources === "object" ? rawCache.featureSources : {};
    const files = {};
    const featureSources = {};

    Object.keys(featureSourcesSource).forEach((featureId) => {
      const sourcePath = normalizeSourcePath(featureSourcesSource[featureId] || "").replace(/^\/+/, "");
      if (!featureId || !sourcePath) {
        return;
      }
      featureSources[featureId] = sourcePath;
    });

    Object.keys(filesSource).forEach((rawPath) => {
      const repoPath = normalizeSourcePath(rawPath).replace(/^\/+/, "");
      if (!repoPath) {
        return;
      }

      const entry = filesSource[rawPath];
      if (!entry || typeof entry !== "object") {
        return;
      }

      const content = typeof entry.content === "string" ? entry.content : "";
      if (!content) {
        return;
      }

      files[repoPath] = {
        sha: typeof entry.sha === "string" ? entry.sha : "",
        content,
        requires: normalizeStringArray(entry.requires),
        blockedRequires: normalizeStringArray(entry.blockedRequires),
        fetchedAt: typeof entry.fetchedAt === "string" ? entry.fetchedAt : null,
      };
    });

    return {
      schemaVersion: MODULE_CACHE_VERSION,
      repo: {
        owner: String(rawCache?.repo?.owner || REPO_OWNER),
        name: String(rawCache?.repo?.name || REPO_NAME),
        branch: String(rawCache?.repo?.branch || REPO_BRANCH),
      },
      syncedAt: typeof rawCache.syncedAt === "string" ? rawCache.syncedAt : null,
      featureSources,
      files,
    };
  }

  function persistModuleCacheToLocalStorage(cacheValue) {
    const normalized = normalizeModuleCache(cacheValue);
    if (!normalized) {
      return false;
    }

    try {
      localStorage.setItem(MODULE_CACHE_STORAGE_KEY, JSON.stringify(normalized));
      return true;
    } catch (error) {
      console.warn("AD xConfig Loader: failed to persist module cache", error);
      return false;
    }
  }

  function bootstrapModuleCacheFromLocalStorage() {
    try {
      const raw = localStorage.getItem(MODULE_CACHE_STORAGE_KEY);
      if (!raw) {
        state.runtime.moduleCache = createEmptyModuleCache();
        return;
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizeModuleCache(parsed);
      state.runtime.moduleCache = normalized || createEmptyModuleCache();
    } catch (error) {
      console.warn("AD xConfig Loader: failed to bootstrap module cache", error);
      state.runtime.moduleCache = createEmptyModuleCache();
    }
  }

  function normalizeStackHintText(value) {
    return normalizeSourcePath(String(value || "")).trim().toLowerCase();
  }

  function addRuntimeFeatureHint(hintMap, featureId, rawHint) {
    if (!(hintMap instanceof Map) || !featureId) {
      return;
    }

    const normalized = normalizeStackHintText(rawHint);
    if (!normalized || normalized.length < 6) {
      return;
    }

    const variants = new Set([normalized]);
    if (normalized.includes(" ")) {
      variants.add(normalized.replaceAll(" ", "%20"));
    }

    const basename = normalized.split("/").pop();
    if (basename) {
      variants.add(basename);
      if (basename.endsWith(".user.js")) {
        variants.add(basename.slice(0, -8));
      }
      if (basename.endsWith(".js")) {
        variants.add(basename.slice(0, -3));
      }
    }

    variants.add(slugifyFeatureId(normalized));

    variants.forEach((variant) => {
      if (!variant || variant.length < 6) {
        return;
      }
      if (!hintMap.has(variant)) {
        hintMap.set(variant, featureId);
      }
    });
  }

  function refreshRuntimeFeatureIndex() {
    const knownFeatureIds = new Set();
    const sourceToFeatureId = new Map();
    const hintMap = new Map();

    Object.entries(LEGACY_FEATURE_ID_BY_SOURCE).forEach(([source, featureId]) => {
      const normalizedSource = normalizeSourcePath(source);
      knownFeatureIds.add(featureId);
      if (normalizedSource) {
        sourceToFeatureId.set(normalizedSource, featureId);
        sourceToFeatureId.set(normalizedSource.toLowerCase(), featureId);
      }
      addRuntimeFeatureHint(hintMap, featureId, normalizedSource);
    });

    getFeatureRegistry().forEach((feature) => {
      if (!feature || !feature.id) {
        return;
      }

      knownFeatureIds.add(feature.id);
      const source = normalizeSourcePath(feature.source || "");
      if (source) {
        sourceToFeatureId.set(source, feature.id);
        sourceToFeatureId.set(source.toLowerCase(), feature.id);
        addRuntimeFeatureHint(hintMap, feature.id, source);
      }

      addRuntimeFeatureHint(hintMap, feature.id, feature.title || "");
      addRuntimeFeatureHint(hintMap, feature.id, feature.id);
    });

    state.runtime.knownFeatureIds = knownFeatureIds;
    state.runtime.sourceToFeatureId = sourceToFeatureId;
    state.runtime.stackHintEntries = Array.from(hintMap.entries())
      .map(([hint, featureId]) => ({ hint, featureId }))
      .sort((left, right) => right.hint.length - left.hint.length);
    state.runtime.stackHintCache.clear();
  }

  function resolveFeatureIdFromReference(rawReference) {
    const reference = String(rawReference || "").trim();
    if (!reference) {
      return "";
    }

    if (state.runtime.knownFeatureIds.has(reference)) {
      return reference;
    }

    const normalizedRef = normalizeSourcePath(reference);
    if (state.runtime.sourceToFeatureId.has(normalizedRef)) {
      return state.runtime.sourceToFeatureId.get(normalizedRef);
    }
    if (state.runtime.sourceToFeatureId.has(normalizedRef.toLowerCase())) {
      return state.runtime.sourceToFeatureId.get(normalizedRef.toLowerCase());
    }

    const decodedRef = normalizeSourcePath(safeDecodeUriComponent(reference));
    if (state.runtime.sourceToFeatureId.has(decodedRef)) {
      return state.runtime.sourceToFeatureId.get(decodedRef);
    }
    if (state.runtime.sourceToFeatureId.has(decodedRef.toLowerCase())) {
      return state.runtime.sourceToFeatureId.get(decodedRef.toLowerCase());
    }

    const basename = normalizedRef.split("/").pop() || "";
    if (basename) {
      const basenameLower = basename.toLowerCase();
      for (const [sourcePath, featureId] of state.runtime.sourceToFeatureId.entries()) {
        const sourceLower = sourcePath.toLowerCase();
        if (sourceLower === basenameLower || sourceLower.endsWith(`/${basenameLower}`)) {
          return featureId;
        }
      }
    }

    const titleMatch = getFeatureRegistry().find((feature) => {
      return feature && typeof feature.title === "string" && feature.title.trim().toLowerCase() === reference.toLowerCase();
    });
    if (titleMatch?.id) {
      return titleMatch.id;
    }

    const slugReference = slugifyFeatureId(reference);
    if (state.runtime.knownFeatureIds.has(slugReference)) {
      return slugReference;
    }

    return "";
  }

  function hydrateRuntimeBootstrapConfig() {
    if (state.runtime.bootstrapLoaded) {
      return;
    }

    state.runtime.bootstrapLoaded = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.runtime.bootstrapConfig = null;
        return;
      }

      const parsed = JSON.parse(raw);
      state.runtime.bootstrapConfig = parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      state.runtime.bootstrapConfig = null;
    }
  }

  function getRuntimeConfigSource() {
    if (state.config && typeof state.config === "object") {
      return state.config;
    }
    return state.runtime.bootstrapConfig;
  }

  function getRuntimeFeatureRecord(featureId) {
    if (!featureId) {
      return null;
    }
    const sourceConfig = getRuntimeConfigSource();
    const features = sourceConfig && typeof sourceConfig === "object" ? sourceConfig.features : null;
    if (!features || typeof features !== "object") {
      return null;
    }
    const record = features[featureId];
    return record && typeof record === "object" ? record : null;
  }

  function isRuntimeFeatureEnabled(featureId) {
    if (!featureId) {
      return true;
    }

    const record = getRuntimeFeatureRecord(featureId);
    if (record && typeof record.enabled === "boolean") {
      return record.enabled;
    }

    if (state.runtime.knownFeatureIds.has(featureId)) {
      return false;
    }

    return true;
  }

  function getLoaderStatus(featureId) {
    if (!featureId) {
      return null;
    }
    const status = state.runtime.featureRuntimeStatus[featureId];
    return status && typeof status === "object" ? status : null;
  }

  function setLoaderStatus(featureId, runtimeState, message) {
    if (!featureId) {
      return;
    }

    state.runtime.featureRuntimeStatus[featureId] = {
      state: String(runtimeState || LOADER_STATUS.IDLE),
      message: String(message || ""),
      updatedAt: new Date().toISOString(),
    };
  }

  function getLoaderBadge(featureId) {
    const status = getLoaderStatus(featureId);
    const statusState = String(status?.state || "");
    if (!statusState || statusState === LOADER_STATUS.IDLE) {
      return null;
    }

    if (statusState === LOADER_STATUS.LOADED) {
      return { cssClass: "xcfg-badge--runtime-ok", label: "Laufzeit: geladen" };
    }
    if (statusState === LOADER_STATUS.MISSING_CACHE) {
      return { cssClass: "xcfg-badge--runtime-missing", label: "Laufzeit: fehlt (Cache)" };
    }
    if (statusState === LOADER_STATUS.BLOCKED) {
      return { cssClass: "xcfg-badge--runtime-blocked", label: "Laufzeit: blockiert" };
    }
    if (statusState === LOADER_STATUS.ERROR) {
      return { cssClass: "xcfg-badge--runtime-error", label: "Laufzeit: Fehler" };
    }
    return { cssClass: "xcfg-badge--runtime-missing", label: `Laufzeit: ${statusState}` };
  }

  function cloneRuntimeValue(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (_) {
        // Fallback below.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function buildRuntimeSnapshot() {
    const sourceConfig = getRuntimeConfigSource();
    const rawFeatures = sourceConfig && typeof sourceConfig === "object" && sourceConfig.features && typeof sourceConfig.features === "object"
      ? sourceConfig.features
      : {};
    const featureIds = new Set([
      ...Object.keys(rawFeatures),
      ...state.runtime.knownFeatureIds,
    ]);

    const features = {};
    featureIds.forEach((featureId) => {
      const rawRecord = rawFeatures[featureId];
      const settings = rawRecord && typeof rawRecord.settings === "object" && rawRecord.settings !== null
        ? rawRecord.settings
        : {};
      features[featureId] = {
        enabled: rawRecord && typeof rawRecord.enabled === "boolean"
          ? rawRecord.enabled
          : isRuntimeFeatureEnabled(featureId),
        settings: cloneRuntimeValue(settings),
      };
    });

    return {
      version: CONFIG_VERSION,
      updatedAt: sourceConfig?.updatedAt || null,
      features,
    };
  }

  function publishRuntimeState(reason) {
    const snapshot = buildRuntimeSnapshot();
    const runtimeApi = {
      loaderMode: LOADER_MODE,
      reason: String(reason || "update"),
      updatedAt: snapshot.updatedAt,
      getSnapshot: () => cloneRuntimeValue(snapshot),
      resolveFeatureId: (featureRef) => resolveFeatureIdFromReference(featureRef),
      isFeatureEnabled: (featureRef) => {
        const resolvedFeatureId = resolveFeatureIdFromReference(featureRef) || String(featureRef || "");
        return isRuntimeFeatureEnabled(resolvedFeatureId);
      },
      getFeatureState: (featureRef) => {
        const resolvedFeatureId = resolveFeatureIdFromReference(featureRef) || String(featureRef || "");
        return cloneRuntimeValue(snapshot.features[resolvedFeatureId] || null);
      },
      getLoaderStatus: (featureRef) => {
        const resolvedFeatureId = resolveFeatureIdFromReference(featureRef) || String(featureRef || "");
        return cloneRuntimeValue(getLoaderStatus(resolvedFeatureId));
      },
      isFeatureLoaded: (featureRef) => {
        const resolvedFeatureId = resolveFeatureIdFromReference(featureRef) || String(featureRef || "");
        return state.runtime.executedFeatures.has(resolvedFeatureId);
      },
      getSetting: (featureRef, settingKey, fallbackValue) => {
        const resolvedFeatureId = resolveFeatureIdFromReference(featureRef) || String(featureRef || "");
        const featureState = snapshot.features[resolvedFeatureId];
        if (!featureState || !featureState.settings || typeof featureState.settings !== "object") {
          return fallbackValue;
        }

        if (Object.prototype.hasOwnProperty.call(featureState.settings, settingKey)) {
          return cloneRuntimeValue(featureState.settings[settingKey]);
        }

        return fallbackValue;
      },
    };

    window[RUNTIME_GLOBAL_KEY] = runtimeApi;

    if (typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent(RUNTIME_EVENT_NAME, {
        detail: {
          reason: runtimeApi.reason,
          snapshot: runtimeApi.getSnapshot(),
        },
      }));
      return;
    }

    const fallbackEvent = document.createEvent("CustomEvent");
    fallbackEvent.initCustomEvent(RUNTIME_EVENT_NAME, false, false, {
      reason: runtimeApi.reason,
      snapshot: runtimeApi.getSnapshot(),
    });
    window.dispatchEvent(fallbackEvent);
  }

  function resolveFeatureIdFromStack(rawStack) {
    const stackText = String(rawStack || "");
    if (!stackText) {
      return "";
    }

    if (state.runtime.stackHintCache.has(stackText)) {
      return state.runtime.stackHintCache.get(stackText);
    }

    const normalized = normalizeStackHintText(stackText);
    const decoded = normalizeStackHintText(safeDecodeUriComponent(stackText));

    let resolvedFeatureId = "";
    for (const entry of state.runtime.stackHintEntries) {
      if (!entry || !entry.hint) {
        continue;
      }
      if (normalized.includes(entry.hint) || decoded.includes(entry.hint)) {
        resolvedFeatureId = entry.featureId;
        break;
      }
    }

    state.runtime.stackHintCache.set(stackText, resolvedFeatureId);
    if (state.runtime.stackHintCache.size > 320) {
      const oldestKey = state.runtime.stackHintCache.keys().next().value;
      if (oldestKey !== undefined) {
        state.runtime.stackHintCache.delete(oldestKey);
      }
    }

    return resolvedFeatureId;
  }

  function resolveFeatureIdFromCurrentStack() {
    try {
      throw new Error("ad-xconfig stack marker");
    } catch (error) {
      const fromStack = resolveFeatureIdFromStack(error && typeof error === "object" ? error.stack : "");
      if (fromStack) {
        return fromStack;
      }
      return String(state.runtime.currentFeatureExecution || "");
    }
  }

  function trackRuntimeHandle(map, featureId, handle) {
    if (!(map instanceof Map) || !featureId || handle === undefined || handle === null) {
      return;
    }

    let handles = map.get(featureId);
    if (!handles) {
      handles = new Set();
      map.set(featureId, handles);
    }
    handles.add(handle);
  }

  function untrackRuntimeHandle(map, handle) {
    if (!(map instanceof Map) || handle === undefined || handle === null) {
      return;
    }

    map.forEach((handles, featureId) => {
      if (!(handles instanceof Set)) {
        return;
      }
      handles.delete(handle);
      if (!handles.size) {
        map.delete(featureId);
      }
    });
  }

  function clearRuntimeHandlesForFeature(featureId) {
    if (!featureId) {
      return;
    }

    const observers = state.runtime.observerHandlesByFeature.get(featureId);
    if (observers instanceof Set) {
      observers.forEach((observer) => {
        try {
          if (observer && typeof observer.disconnect === "function") {
            observer.disconnect();
          }
        } catch (_) {
          // Ignore cleanup errors.
        }
      });
      state.runtime.observerHandlesByFeature.delete(featureId);
    }

    const clearIntervalFn = state.runtime.native.clearInterval || window.clearInterval.bind(window);
    const intervals = state.runtime.intervalHandlesByFeature.get(featureId);
    if (intervals instanceof Set) {
      intervals.forEach((intervalId) => {
        try {
          clearIntervalFn(intervalId);
        } catch (_) {
          // Ignore cleanup errors.
        }
      });
      state.runtime.intervalHandlesByFeature.delete(featureId);
    }

    const clearTimeoutFn = state.runtime.native.clearTimeout || window.clearTimeout.bind(window);
    const timeouts = state.runtime.timeoutHandlesByFeature.get(featureId);
    if (timeouts instanceof Set) {
      timeouts.forEach((timeoutId) => {
        try {
          clearTimeoutFn(timeoutId);
        } catch (_) {
          // Ignore cleanup errors.
        }
      });
      state.runtime.timeoutHandlesByFeature.delete(featureId);
    }
  }

  function removeElementById(elementId) {
    if (!elementId) {
      return;
    }
    const element = document.getElementById(elementId);
    if (element) {
      element.remove();
    }
  }

  function removeElementsBySelector(selector) {
    if (!selector) {
      return;
    }
    document.querySelectorAll(selector).forEach((element) => {
      element.remove();
    });
  }

  function removeClassesFromSelector(selector, classNames) {
    if (!selector || !Array.isArray(classNames) || !classNames.length) {
      return;
    }
    document.querySelectorAll(selector).forEach((element) => {
      element.classList.remove(...classNames);
    });
  }

  function removeStylePropertiesFromSelector(selector, properties) {
    if (!selector || !Array.isArray(properties) || !properties.length) {
      return;
    }
    document.querySelectorAll(selector).forEach((element) => {
      properties.forEach((propertyName) => {
        element.style.removeProperty(propertyName);
      });
    });
  }

  function cleanupFeatureArtifacts(featureId) {
    if (!featureId) {
      return;
    }

    switch (featureId) {
      case "theme-x01":
        removeElementById("autodarts-x01-custom-style");
        break;
      case "theme-shanghai":
        removeElementById("autodarts-shanghai-custom-style");
        break;
      case "theme-bermuda":
        removeElementById("autodarts-bermuda-custom-style");
        break;
      case "theme-cricket":
        removeElementById("autodarts-cricket-custom-style");
        break;
      case "a-average-arrow":
        removeElementsBySelector(".ad-ext-avg-trend-arrow");
        break;
      case "a-checkout-board":
        removeElementById("ad-ext-checkout-targets");
        break;
      case "a-checkout-pulse":
        removeClassesFromSelector(
          ".ad-ext-checkout-possible, .ad-ext-checkout-possible--pulse, .ad-ext-checkout-possible--glow, .ad-ext-checkout-possible--scale, .ad-ext-checkout-possible--blink",
          [
            "ad-ext-checkout-possible",
            "ad-ext-checkout-possible--pulse",
            "ad-ext-checkout-possible--glow",
            "ad-ext-checkout-possible--scale",
            "ad-ext-checkout-possible--blink",
          ],
        );
        break;
      case "a-cricket-target":
        removeElementById("ad-ext-cricket-targets");
        break;
      case "a-dart-marker-emphasis":
        document.querySelectorAll("circle.ad-ext-dart-marker, circle.ad-ext-dart-marker--pulse, circle.ad-ext-dart-marker--glow").forEach((marker) => {
          marker.classList.remove("ad-ext-dart-marker", "ad-ext-dart-marker--pulse", "ad-ext-dart-marker--glow");
          marker.style.removeProperty("fill");
        });
        break;
      case "a-marker-darts":
        removeElementById("ad-ext-dart-image-overlay");
        document.querySelectorAll("circle[data-ad-ext-original-opacity]").forEach((marker) => {
          const originalOpacity = marker.getAttribute("data-ad-ext-original-opacity");
          marker.style.opacity = originalOpacity || "";
          marker.removeAttribute("data-ad-ext-original-opacity");
        });
        break;
      case "a-checkout-style":
        removeClassesFromSelector(
          ".ad-ext-checkout-suggestion, .ad-ext-checkout-suggestion--no-label, .ad-ext-checkout-suggestion--badge, .ad-ext-checkout-suggestion--ribbon, .ad-ext-checkout-suggestion--stripe, .ad-ext-checkout-suggestion--ticket, .ad-ext-checkout-suggestion--outline, .suggestion",
          [
            "ad-ext-checkout-suggestion",
            "ad-ext-checkout-suggestion--no-label",
            "ad-ext-checkout-suggestion--badge",
            "ad-ext-checkout-suggestion--ribbon",
            "ad-ext-checkout-suggestion--stripe",
            "ad-ext-checkout-suggestion--ticket",
            "ad-ext-checkout-suggestion--outline",
          ],
        );
        document.querySelectorAll(".suggestion, .ad-ext-checkout-suggestion").forEach((element) => {
          element.removeAttribute("data-ad-ext-label");
        });
        removeStylePropertiesFromSelector(".suggestion, .ad-ext-checkout-suggestion", [
          "--ad-ext-accent",
          "--ad-ext-accent-soft",
          "--ad-ext-accent-strong",
          "--ad-ext-label-bg",
          "--ad-ext-label-color",
          "--ad-ext-radius",
          "--ad-ext-stripe-opacity",
        ]);
        break;
      case "a-remove-darts":
        removeClassesFromSelector(".ad-ext-takeout-card", ["ad-ext-takeout-card"]);
        removeElementsBySelector("img.ad-ext-takeout-image");
        break;
      case "a-turn-sweep":
        removeClassesFromSelector(".ad-ext-turn-sweep", ["ad-ext-turn-sweep"]);
        break;
      case "a-single-bull":
      case "a-turn-points":
        break;
      case "a-winner-fireworks":
        removeElementById("ad-ext-winner-fireworks");
        break;
      case "a-triple-double-bull":
        removeClassesFromSelector(".ad-ext-turn-throw", [
          "animate-hit",
          "animate-hit-triple",
          "animate-hit-double",
          "animate-hit-bull",
        ]);
        document.querySelectorAll(".ad-ext-turn-throw p.chakra-text").forEach((textNode) => {
          if (textNode.querySelector("span.highlight, span[class*='highlight-']")) {
            textNode.textContent = textNode.textContent || "";
          }
        });
        break;
      default:
        break;
    }
  }

  function cleanupThemePreviewSpace() {
    const hasEnabledTheme = THEME_FEATURE_IDS.some((featureId) => isRuntimeFeatureEnabled(featureId));
    if (hasEnabledTheme) {
      return;
    }

    const turnContainer = document.getElementById("ad-ext-turn");
    if (turnContainer) {
      turnContainer.classList.remove(THEME_PREVIEW_SPACE_CLASS);
    }
  }

  function runRuntimeCleanup() {
    state.runtime.cleanupQueued = false;
    ensureAnimationSharedRuntimeWrappers();

    const disabledFeatureIds = Array.from(state.runtime.knownFeatureIds).filter((featureId) => !isRuntimeFeatureEnabled(featureId));
    disabledFeatureIds.forEach((featureId) => {
      cleanupFeatureArtifacts(featureId);
    });

    cleanupThemePreviewSpace();
  }

  function queueRuntimeCleanup() {
    if (state.runtime.cleanupQueued) {
      return;
    }
    state.runtime.cleanupQueued = true;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(runRuntimeCleanup);
      return;
    }
    setTimeout(runRuntimeCleanup, 0);
  }

  function ensureAnimationSharedRuntimeWrappers() {
    const shared = window.autodartsAnimationShared;
    if (!shared || shared.__adXConfigRuntimeWrapped === true) {
      return;
    }

    if (typeof shared.createRafScheduler === "function") {
      const originalCreateRafScheduler = shared.createRafScheduler.bind(shared);
      shared.createRafScheduler = function wrappedCreateRafScheduler(callback) {
        const featureId = resolveFeatureIdFromCurrentStack();
        const guardedCallback = featureId && typeof callback === "function"
          ? function guardedRafCallback(...args) {
            if (!isRuntimeFeatureEnabled(featureId)) {
              return;
            }
            return callback(...args);
          }
          : callback;
        return originalCreateRafScheduler(guardedCallback);
      };
    }

    if (typeof shared.observeMutations === "function") {
      const originalObserveMutations = shared.observeMutations.bind(shared);
      shared.observeMutations = function wrappedObserveMutations(options) {
        const featureId = resolveFeatureIdFromCurrentStack();
        let finalOptions = options;
        if (featureId && options && typeof options === "object" && typeof options.onChange === "function") {
          const originalOnChange = options.onChange;
          finalOptions = {
            ...options,
            onChange: function guardedOnChange(...args) {
              if (!isRuntimeFeatureEnabled(featureId)) {
                return;
              }
              return originalOnChange(...args);
            },
          };
        }

        const observer = originalObserveMutations(finalOptions);
        if (featureId && observer && typeof observer.disconnect === "function") {
          trackRuntimeHandle(state.runtime.observerHandlesByFeature, featureId, observer);
        }
        return observer;
      };
    }

    shared.__adXConfigRuntimeWrapped = true;
    state.runtime.animationSharedWrapped = true;
  }

  function installMutationObserverHook() {
    if (state.runtime.native.MutationObserver || typeof window.MutationObserver !== "function") {
      return;
    }

    const NativeMutationObserver = window.MutationObserver;
    state.runtime.native.MutationObserver = NativeMutationObserver;

    class RuntimeMutationObserver extends NativeMutationObserver {
      constructor(callback) {
        const featureId = resolveFeatureIdFromCurrentStack();
        const guardedCallback = featureId && typeof callback === "function"
          ? function guardedMutationCallback(...args) {
            if (!isRuntimeFeatureEnabled(featureId)) {
              return;
            }
            return callback(...args);
          }
          : callback;
        super(guardedCallback);

        if (featureId) {
          this.__adXConfigFeatureId = featureId;
          trackRuntimeHandle(state.runtime.observerHandlesByFeature, featureId, this);
        }
      }
    }

    window.MutationObserver = RuntimeMutationObserver;
  }

  function installTimerHooks() {
    if (state.runtime.native.setInterval || typeof window.setInterval !== "function") {
      return;
    }

    const nativeSetInterval = window.setInterval.bind(window);
    const nativeClearInterval = window.clearInterval.bind(window);
    const nativeSetTimeout = window.setTimeout.bind(window);
    const nativeClearTimeout = window.clearTimeout.bind(window);

    state.runtime.native.setInterval = nativeSetInterval;
    state.runtime.native.clearInterval = nativeClearInterval;
    state.runtime.native.setTimeout = nativeSetTimeout;
    state.runtime.native.clearTimeout = nativeClearTimeout;

    window.setInterval = function wrappedSetInterval(handler, timeout, ...args) {
      const featureId = resolveFeatureIdFromCurrentStack();
      const guardedHandler = featureId && typeof handler === "function"
        ? function guardedIntervalHandler(...intervalArgs) {
          if (!isRuntimeFeatureEnabled(featureId)) {
            return;
          }
          return handler(...intervalArgs);
        }
        : handler;

      const intervalId = nativeSetInterval(guardedHandler, timeout, ...args);
      if (featureId) {
        trackRuntimeHandle(state.runtime.intervalHandlesByFeature, featureId, intervalId);
      }
      return intervalId;
    };

    window.clearInterval = function wrappedClearInterval(intervalId) {
      untrackRuntimeHandle(state.runtime.intervalHandlesByFeature, intervalId);
      return nativeClearInterval(intervalId);
    };
  }

  function installMediaPlayHook() {
    if (state.runtime.native.mediaPlay || !window.HTMLMediaElement || !window.HTMLMediaElement.prototype) {
      return;
    }

    const mediaProto = window.HTMLMediaElement.prototype;
    if (typeof mediaProto.play !== "function") {
      return;
    }

    const nativePlay = mediaProto.play;
    state.runtime.native.mediaPlay = nativePlay;
    mediaProto.play = function wrappedMediaPlay(...args) {
      const mediaSource = String(this.currentSrc || this.src || "").toLowerCase();
      if (mediaSource.includes(SINGLE_BULL_AUDIO_TOKEN) && !isRuntimeFeatureEnabled("a-single-bull")) {
        return Promise.resolve();
      }
      return nativePlay.apply(this, args);
    };
  }

  function installRuntimeHooks() {
    if (state.runtime.hooksInstalled) {
      return;
    }
    state.runtime.hooksInstalled = true;
    installMutationObserverHook();
    installTimerHooks();
    installMediaPlayHook();
  }

  function startRuntimeCleanupEngine() {
    if (!state.runtime.cleanupObserver && typeof MutationObserver === "function" && document.documentElement) {
      state.runtime.cleanupObserver = new MutationObserver(() => {
        queueRuntimeCleanup();
      });
      state.runtime.cleanupObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    if (!state.runtime.cleanupTimer) {
      state.runtime.cleanupTimer = window.setInterval(() => {
        ensureAnimationSharedRuntimeWrappers();
        queueRuntimeCleanup();
      }, RUNTIME_CLEANUP_INTERVAL_MS);
    }
  }

  function stopRuntimeCleanupEngine() {
    if (state.runtime.cleanupObserver) {
      state.runtime.cleanupObserver.disconnect();
      state.runtime.cleanupObserver = null;
    }

    if (state.runtime.cleanupTimer) {
      clearInterval(state.runtime.cleanupTimer);
      state.runtime.cleanupTimer = null;
    }
  }

  function initRuntimeLayer() {
    hydrateRuntimeBootstrapConfig();
    if (!state.runtime.moduleCache) {
      state.runtime.moduleCache = createEmptyModuleCache();
    }
    refreshRuntimeFeatureIndex();
    installRuntimeHooks();
    ensureAnimationSharedRuntimeWrappers();
    startRuntimeCleanupEngine();
    publishRuntimeState("runtime-init");
    queueRuntimeCleanup();
  }

  function parseUserscriptMetadataDetailed(content) {
    const sourceText = String(content || "");
    const blockMatch = sourceText.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/i);
    const header = blockMatch ? blockMatch[1] : "";
    const metadata = {};
    const all = {};
    const linePattern = /\/\/\s*@([a-zA-Z0-9:_-]+)\s+([^\n\r]+)/g;
    let lineMatch = linePattern.exec(header);

    while (lineMatch) {
      const key = String(lineMatch[1] || "").toLowerCase();
      const value = String(lineMatch[2] || "").trim();
      if (key && !(key in metadata)) {
        metadata[key] = value;
      }
      if (key) {
        if (!Array.isArray(all[key])) {
          all[key] = [];
        }
        all[key].push(value);
      }
      lineMatch = linePattern.exec(header);
    }

    return { metadata, all };
  }

  function parseUserscriptMetadata(content) {
    return parseUserscriptMetadataDetailed(content).metadata;
  }

  function scalarSettingValueKey(value) {
    if (typeof value === "boolean") {
      return `b:${value ? "1" : "0"}`;
    }

    if (typeof value === "number") {
      return `n:${Number.isFinite(value) ? String(value) : "nan"}`;
    }

    return `s:${String(value)}`;
  }

  function normalizeBooleanSettingValue(value) {
    if (value === true || value === false) {
      return value;
    }

    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "on", "yes", "active", "aktiv"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "off", "no", "inactive", "inaktiv"].includes(normalized)) {
        return false;
      }
    }

    return null;
  }

  function parseConfigLiteral(rawValue) {
    const text = String(rawValue || "").trim();
    if (!text) {
      return "";
    }

    if (/^"(?:\\.|[^"])*"$/.test(text)) {
      try {
        return JSON.parse(text);
      } catch (_) {
        return text.slice(1, -1);
      }
    }

    if (/^'(?:\\.|[^'])*'$/.test(text)) {
      return text
        .slice(1, -1)
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");
    }

    if (text === "true") {
      return true;
    }

    if (text === "false") {
      return false;
    }

    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
      const numberValue = Number(text);
      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }

    return text;
  }

  function normalizeSettingType(rawType) {
    const type = String(rawType || "").trim().toLowerCase();
    if (["toggle", "boolean", "bool", "switch"].includes(type)) {
      return "toggle";
    }
    if (["select", "choice", "enum", "dropdown"].includes(type)) {
      return "select";
    }
    return "";
  }

  function normalizeSettingOptions(rawOptions) {
    if (!Array.isArray(rawOptions)) {
      return [];
    }

    const options = [];
    const seen = new Set();

    rawOptions.forEach((rawOption) => {
      let value;
      let label;

      if (rawOption && typeof rawOption === "object" && !Array.isArray(rawOption) && "value" in rawOption) {
        value = rawOption.value;
        label = String(rawOption.label ?? rawOption.text ?? rawOption.value ?? "").trim();
      } else if (["string", "number", "boolean"].includes(typeof rawOption)) {
        value = rawOption;
        label = String(rawOption);
      } else {
        return;
      }

      if (!["string", "number", "boolean"].includes(typeof value)) {
        return;
      }

      const key = scalarSettingValueKey(value);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      options.push({
        value,
        label: label || String(value),
      });
    });

    return options;
  }

  function findSettingOptionIndexByValue(options, value) {
    if (!Array.isArray(options) || !options.length) {
      return -1;
    }

    const directKey = scalarSettingValueKey(value);
    let fallbackIndex = -1;

    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      if (!option || !("value" in option)) {
        continue;
      }

      const optionValue = option.value;
      if (scalarSettingValueKey(optionValue) === directKey) {
        return index;
      }

      if (fallbackIndex === -1 && String(optionValue) === String(value)) {
        fallbackIndex = index;
      }
    }

    return fallbackIndex;
  }

  function resolveSettingValue(field, rawValue) {
    if (!field || typeof field !== "object") {
      return rawValue;
    }

    if (field.type === "toggle") {
      const parsed = normalizeBooleanSettingValue(rawValue);
      if (parsed !== null) {
        return parsed;
      }
      const fallback = normalizeBooleanSettingValue(field.defaultValue);
      return fallback !== null ? fallback : false;
    }

    if (field.type === "select") {
      const options = Array.isArray(field.options) ? field.options : [];
      const valueIndex = findSettingOptionIndexByValue(options, rawValue);
      if (valueIndex >= 0) {
        return options[valueIndex].value;
      }

      const defaultIndex = findSettingOptionIndexByValue(options, field.defaultValue);
      if (defaultIndex >= 0) {
        return options[defaultIndex].value;
      }

      if (options.length) {
        return options[0].value;
      }
    }

    return field.defaultValue;
  }

  function extractXConfigMetaFromLines(lines, declarationIndex) {
    const lowerBound = Math.max(0, declarationIndex - 8);

    for (let index = declarationIndex - 1; index >= lowerBound; index -= 1) {
      const rawLine = String(lines[index] || "");
      const trimmed = rawLine.trim();
      if (!trimmed) {
        continue;
      }

      const metaMatch = trimmed.match(/^\/\/\s*xConfig:\s*(\{.*\})\s*$/);
      if (metaMatch) {
        try {
          const parsed = JSON.parse(metaMatch[1]);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch (_) {
          return null;
        }
        return null;
      }

      if (!trimmed.startsWith("//")) {
        break;
      }
    }

    return null;
  }

  function parseXConfigFieldsFromSource(content) {
    const sourceText = String(content || "");
    if (!sourceText) {
      return [];
    }

    const lines = sourceText.split(/\r?\n/);
    const fields = [];
    const seenVariables = new Set();

    for (let index = 0; index < lines.length; index += 1) {
      const declarationMatch = lines[index].match(/^\s*const\s+(xConfig_[A-Za-z0-9_]+)\s*=\s*(.+?)\s*;\s*$/);
      if (!declarationMatch) {
        continue;
      }

      const variableName = declarationMatch[1];
      if (seenVariables.has(variableName)) {
        continue;
      }

      seenVariables.add(variableName);

      const meta = extractXConfigMetaFromLines(lines, index);
      if (!meta) {
        continue;
      }

      const type = normalizeSettingType(meta.type || meta.control || meta.kind || meta.input);
      if (!type) {
        continue;
      }

      const settingKey = variableName.slice("xConfig_".length);
      if (!settingKey) {
        continue;
      }

      const declarationDefault = parseConfigLiteral(declarationMatch[2]);
      let options = normalizeSettingOptions(meta.options);

      if (type === "toggle") {
        const booleanOptions = options.filter((option) => typeof option.value === "boolean");
        options = booleanOptions.length === 2
          ? booleanOptions
          : [
            { value: true, label: "Aktiv" },
            { value: false, label: "Inaktiv" },
          ];
      } else if (!options.length) {
        if (["string", "number", "boolean"].includes(typeof declarationDefault)) {
          options = [{
            value: declarationDefault,
            label: String(declarationDefault),
          }];
        } else {
          continue;
        }
      }

      const label = String(meta.label || settingKey.replaceAll("_", " ")).trim() || settingKey;
      const description = String(meta.description || meta.help || "").trim();
      const defaultValue = resolveSettingValue({
        type,
        options,
        defaultValue: declarationDefault,
      }, declarationDefault);

      fields.push({
        key: settingKey,
        variableName,
        type,
        label,
        description,
        options,
        defaultValue,
      });
    }

    return fields;
  }

  function buildRepoContentsApiUrl(repoPath) {
    const normalizedPath = normalizeSourcePath(repoPath || "").replace(/^\/+/, "");
    return `${REPO_API_BASE}/contents/${toRawPath(normalizedPath)}?ref=${encodeURIComponent(REPO_BRANCH)}`;
  }

  function buildRepoRawUrl(repoPath) {
    const normalizedPath = normalizeSourcePath(repoPath || "").replace(/^\/+/, "");
    return `${REPO_RAW_BASE}/${toRawPath(normalizedPath)}`;
  }

  function normalizeRequireRepoPath(rawRequireUrl) {
    const urlText = String(rawRequireUrl || "").trim();
    if (!urlText) {
      return { ok: false, reason: "empty" };
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(urlText);
    } catch (_) {
      return { ok: false, reason: "invalid-url" };
    }

    const host = parsedUrl.hostname.toLowerCase();
    const pathnameParts = parsedUrl.pathname.split("/").filter(Boolean);
    let owner = "";
    let repo = "";
    let branch = "";
    let pathParts = [];

    if (
      host === "github.com"
      && pathnameParts.length >= 7
      && pathnameParts[2] === "raw"
      && pathnameParts[3] === "refs"
      && pathnameParts[4] === "heads"
    ) {
      owner = pathnameParts[0];
      repo = pathnameParts[1];
      branch = pathnameParts[5];
      pathParts = pathnameParts.slice(6);
    } else if (host === "raw.githubusercontent.com" && pathnameParts.length >= 6 && pathnameParts[2] === "refs" && pathnameParts[3] === "heads") {
      owner = pathnameParts[0];
      repo = pathnameParts[1];
      branch = pathnameParts[4];
      pathParts = pathnameParts.slice(5);
    } else if (host === "raw.githubusercontent.com" && pathnameParts.length >= 4) {
      owner = pathnameParts[0];
      repo = pathnameParts[1];
      branch = pathnameParts[2];
      pathParts = pathnameParts.slice(3);
    } else {
      return { ok: false, reason: "unsupported-host-or-pattern", raw: urlText };
    }

    if (owner.toLowerCase() !== REPO_OWNER.toLowerCase() || repo.toLowerCase() !== REPO_NAME.toLowerCase()) {
      return { ok: false, reason: "external-repo-blocked", raw: urlText };
    }

    if (branch !== REPO_BRANCH) {
      return { ok: false, reason: "non-main-branch-blocked", raw: urlText };
    }

    const decodedPath = pathParts
      .map((part) => safeDecodeUriComponent(part))
      .join("/");
    const repoPath = normalizeSourcePath(decodedPath).replace(/^\/+/, "");
    if (!repoPath) {
      return { ok: false, reason: "empty-path", raw: urlText };
    }

    return { ok: true, path: repoPath, raw: urlText };
  }

  function parseScriptRequirePaths(scriptText) {
    const metaDetailed = parseUserscriptMetadataDetailed(scriptText);
    const requireValues = Array.isArray(metaDetailed?.all?.require) ? metaDetailed.all.require : [];
    const requires = [];
    const blockedRequires = [];
    const seen = new Set();

    requireValues.forEach((requireValue) => {
      const normalized = normalizeRequireRepoPath(requireValue);
      if (!normalized.ok) {
        blockedRequires.push(String(requireValue || "").trim());
        return;
      }
      if (!seen.has(normalized.path)) {
        seen.add(normalized.path);
        requires.push(normalized.path);
      }
    });

    return {
      requires,
      blockedRequires,
    };
  }

  function requestText(url) {
    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers: { Accept: "application/vnd.github+json" },
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              resolve(response.responseText || "");
              return;
            }
            reject(new Error(`Request failed with status ${response.status}`));
          },
          onerror: () => reject(new Error("Network request failed")),
          ontimeout: () => reject(new Error("Network request timed out")),
        });
      });
    }

    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
      credentials: "omit",
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response.text();
    });
  }

  async function requestJson(url) {
    const text = await requestText(url);
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error("Invalid JSON response");
    }
  }

  async function fetchRepoFileWithSha(repoPath) {
    const normalizedPath = normalizeSourcePath(repoPath || "").replace(/^\/+/, "");
    if (!normalizedPath) {
      throw new Error("Missing repository path");
    }

    const contentsUrl = buildRepoContentsApiUrl(normalizedPath);
    try {
      const entry = await requestJson(contentsUrl);
      const sha = typeof entry?.sha === "string" ? entry.sha : "";
      const downloadUrl = entry?.download_url || buildRepoRawUrl(normalizedPath);
      const content = await requestText(downloadUrl);
      return { sha, content };
    } catch (_) {
      const content = await requestText(buildRepoRawUrl(normalizedPath));
      return { sha: "", content };
    }
  }

  function normalizeFeatureFromSource(category, entry, scriptText) {
    const metadata = parseUserscriptMetadata(scriptText);
    const settingsSchema = parseXConfigFieldsFromSource(scriptText);
    const source = normalizeSourcePath(entry.path || "");
    const title = normalizeTitle(metadata.name, source);
    const description = metadata["xconfig-description"] || metadata.description || "No description available.";
    const version = metadata.version || "0.0.0";
    const variant = normalizeVariantLabel(metadata["xconfig-variant"], category);
    const readmeAnchor = normalizeReadmeAnchor(metadata["xconfig-readme-anchor"]);
    const backgroundAsset = normalizeAssetPath(metadata["xconfig-background"]);
    const author = String(metadata.author || "").trim();
    const settingsVersion = Number.parseInt(metadata["xconfig-settings-version"] || "1", 10);
    const safeSettingsVersion = Number.isFinite(settingsVersion) && settingsVersion > 0 ? settingsVersion : 1;

    return {
      id: LEGACY_FEATURE_ID_BY_SOURCE[source] || slugifyFeatureId(source),
      category,
      title,
      description,
      variant,
      readmeAnchor,
      backgroundAsset,
      author,
      source,
      version,
      latestVersion: version,
      settingsVersion: safeSettingsVersion,
      latestSettingsVersion: safeSettingsVersion,
      remoteSha: String(entry.sha || ""),
      settingsSchema,
    };
  }

  async function fetchCategoryEntriesFromGit(directoryName) {
    const url = `${REPO_API_BASE}/contents/${encodeURIComponent(directoryName)}?ref=${encodeURIComponent(REPO_BRANCH)}`;
    const json = await requestJson(url);
    if (!Array.isArray(json)) {
      throw new Error(`Unexpected directory response for ${directoryName}`);
    }

    return json.filter((entry) => {
      return entry
        && entry.type === "file"
        && String(entry.name || "").toLowerCase().endsWith(".user.js")
        && String(entry.name || "").toLowerCase() !== "ad xconfig.user.js";
    });
  }

  async function fetchFeatureRegistryFromGit() {
    const [templateEntries, animationEntries] = await Promise.all([
      fetchCategoryEntriesFromGit("Template"),
      fetchCategoryEntriesFromGit("Animation"),
    ]);

    const jobs = [];

    templateEntries.forEach((entry) => {
      jobs.push({ category: "themes", entry });
    });

    animationEntries.forEach((entry) => {
      jobs.push({ category: "animations", entry });
    });

    const moduleCache = createEmptyModuleCache();
    moduleCache.syncedAt = new Date().toISOString();

    const dependencyQueue = [];
    const queuedDependencies = new Set();
    function enqueueDependencyPath(repoPath) {
      const normalizedPath = normalizeSourcePath(repoPath || "").replace(/^\/+/, "");
      if (!normalizedPath || queuedDependencies.has(normalizedPath)) {
        return;
      }
      queuedDependencies.add(normalizedPath);
      dependencyQueue.push(normalizedPath);
    }

    const features = await Promise.all(jobs.map(async (job) => {
      const rawUrl = job.entry.download_url
        || `${REPO_RAW_BASE}/${toRawPath(job.entry.path || "")}`;
      const scriptText = await requestText(rawUrl);
      const feature = normalizeFeatureFromSource(job.category, job.entry, scriptText);
      const sourcePath = normalizeSourcePath(job.entry.path || "").replace(/^\/+/, "");
      if (feature?.id && sourcePath) {
        moduleCache.featureSources[feature.id] = sourcePath;
      }
      const requireInfo = parseScriptRequirePaths(scriptText);
      moduleCache.files[sourcePath] = {
        sha: String(job.entry.sha || ""),
        content: scriptText,
        requires: requireInfo.requires,
        blockedRequires: requireInfo.blockedRequires,
        fetchedAt: moduleCache.syncedAt,
      };
      requireInfo.requires.forEach(enqueueDependencyPath);
      return feature;
    }));

    while (dependencyQueue.length) {
      const dependencyPath = dependencyQueue.shift();
      if (!dependencyPath || moduleCache.files[dependencyPath]) {
        continue;
      }

      try {
        const dependencyFile = await fetchRepoFileWithSha(dependencyPath);
        const requireInfo = parseScriptRequirePaths(dependencyFile.content);
        moduleCache.files[dependencyPath] = {
          sha: String(dependencyFile.sha || ""),
          content: dependencyFile.content,
          requires: requireInfo.requires,
          blockedRequires: requireInfo.blockedRequires,
          fetchedAt: moduleCache.syncedAt,
        };
        requireInfo.requires.forEach(enqueueDependencyPath);
      } catch (error) {
        console.warn(`AD xConfig Loader: failed to cache dependency ${dependencyPath}`, error);
      }
    }

    const sortedFeatures = features
      .filter(Boolean)
      .sort((left, right) => {
        if (left.category !== right.category) {
          return left.category.localeCompare(right.category);
        }
        return left.title.localeCompare(right.title);
      });

    return {
      features: sortedFeatures,
      moduleCache: normalizeModuleCache(moduleCache) || createEmptyModuleCache(),
    };
  }

  function applyModuleCache(moduleCacheValue) {
    const normalized = normalizeModuleCache(moduleCacheValue);
    if (!normalized) {
      return false;
    }

    state.runtime.moduleCache = normalized;
    persistModuleCacheToLocalStorage(normalized);
    return true;
  }

  function getFeatureExecutionTargets() {
    const targets = [];
    const seen = new Set();

    getFeatureRegistry().forEach((feature) => {
      if (!feature?.id) {
        return;
      }
      const sourcePath = normalizeSourcePath(feature.source || "").replace(/^\/+/, "");
      targets.push({
        id: feature.id,
        title: String(feature.title || feature.id),
        sourcePath,
      });
      seen.add(feature.id);
    });

    const runtimeConfig = getRuntimeConfigSource();
    const rawFeatures = runtimeConfig && typeof runtimeConfig === "object" && runtimeConfig.features && typeof runtimeConfig.features === "object"
      ? runtimeConfig.features
      : {};

    Object.keys(rawFeatures).forEach((featureId) => {
      if (seen.has(featureId)) {
        return;
      }
      const sourcePath = getFeatureSourcePathById(featureId);
      targets.push({
        id: featureId,
        title: getFeatureTitleById(featureId),
        sourcePath,
      });
      seen.add(featureId);
    });

    return targets;
  }

  function getModuleCacheFileEntry(repoPath) {
    const normalizedPath = normalizeSourcePath(repoPath || "").replace(/^\/+/, "");
    if (!normalizedPath) {
      return null;
    }
    const files = state.runtime.moduleCache?.files;
    if (!files || typeof files !== "object") {
      return null;
    }
    const entry = files[normalizedPath];
    return entry && typeof entry === "object" ? entry : null;
  }

  function toInlineJsLiteral(value) {
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === "string") {
      return JSON.stringify(value);
    }

    return "";
  }

  function applyFeatureSettingOverridesToCode(code, featureId, sourcePath) {
    const scriptText = String(code || "");
    if (!featureId || !scriptText || !scriptText.includes("xConfig_")) {
      return scriptText;
    }

    const featureRecord = getRuntimeFeatureRecord(featureId);
    const featureSettings = featureRecord && typeof featureRecord.settings === "object"
      ? featureRecord.settings
      : null;
    if (!featureSettings) {
      return scriptText;
    }

    const overrides = new Map();
    Object.keys(featureSettings).forEach((key) => {
      const rawKey = String(key || "").trim();
      if (!rawKey) {
        return;
      }

      const rawValue = featureSettings[rawKey];
      if (!["string", "number", "boolean"].includes(typeof rawValue)) {
        return;
      }
      if (typeof rawValue === "number" && !Number.isFinite(rawValue)) {
        return;
      }

      if (rawKey.startsWith("xConfig_")) {
        overrides.set(rawKey, rawValue);
        const shortKey = rawKey.slice("xConfig_".length);
        if (shortKey) {
          overrides.set(shortKey, rawValue);
        }
      } else {
        overrides.set(rawKey, rawValue);
        overrides.set(`xConfig_${rawKey}`, rawValue);
      }
    });

    if (!overrides.size) {
      return scriptText;
    }

    let appliedCount = 0;
    const patchedText = scriptText.replace(
      /^(\s*const\s+)(xConfig_[A-Za-z0-9_]+)(\s*=\s*)(.+?)(\s*;\s*(?:\/\/.*)?)$/gm,
      (fullMatch, constPrefix, variableName, assignPrefix, _defaultExpr, suffix) => {
        const overrideValue = overrides.has(variableName)
          ? overrides.get(variableName)
          : overrides.get(String(variableName || "").replace(/^xConfig_/, ""));

        const inlineLiteral = toInlineJsLiteral(overrideValue);
        if (!inlineLiteral) {
          return fullMatch;
        }

        appliedCount += 1;
        return `${constPrefix}${variableName}${assignPrefix}${inlineLiteral}${suffix}`;
      },
    );

    if (appliedCount > 0) {
      console.info(`AD xConfig Loader: ${featureId} xConfig-Overrides angewendet (${appliedCount}) [${normalizeSourcePath(sourcePath || "")}]`);
    }

    return patchedText;
  }

  function executeCodeWithSourceUrl(code, sourcePath) {
    const scriptText = String(code || "");
    const normalizedPath = normalizeSourcePath(sourcePath || "unknown-module.js");
    const sourceUrl = `ad-xconfig-loader/${normalizedPath}`;
    const payload = `${scriptText}\n//# sourceURL=${sourceUrl}`;
    // Indirect eval keeps global scope, so userscripts behave as standalone modules.
    (0, eval)(payload);
  }

  function executeModuleFileFromCache(repoPath, featureId, executionStack = new Set()) {
    const normalizedPath = normalizeSourcePath(repoPath || "").replace(/^\/+/, "");
    if (!normalizedPath) {
      return { ok: false, status: LOADER_STATUS.ERROR, message: "Fehlender Modulpfad." };
    }

    if (state.runtime.executedFiles.has(normalizedPath)) {
      return { ok: true, status: LOADER_STATUS.LOADED, message: "Bereits geladen." };
    }

    if (executionStack.has(normalizedPath)) {
      return { ok: false, status: LOADER_STATUS.ERROR, message: `Zyklische Abhaengigkeit erkannt (${normalizedPath}).` };
    }

    const fileEntry = getModuleCacheFileEntry(normalizedPath);
    if (!fileEntry) {
      return { ok: false, status: LOADER_STATUS.MISSING_CACHE, message: `Cache-Eintrag fehlt (${normalizedPath}).` };
    }

    const blockedRequires = normalizeStringArray(fileEntry.blockedRequires);
    if (blockedRequires.length) {
      return {
        ok: false,
        status: LOADER_STATUS.BLOCKED,
        message: `Blockierte @require-Quelle(n): ${blockedRequires.join(", ")}`,
      };
    }

    executionStack.add(normalizedPath);
    const requires = normalizeStringArray(fileEntry.requires);
    for (const requiredPath of requires) {
      const dependencyResult = executeModuleFileFromCache(requiredPath, featureId, executionStack);
      if (!dependencyResult.ok) {
        executionStack.delete(normalizedPath);
        return dependencyResult;
      }
    }

    const previousFeatureExecution = state.runtime.currentFeatureExecution;
    try {
      state.runtime.currentFeatureExecution = featureId;
      const featureSourcePath = normalizeSourcePath(getFeatureSourcePathById(featureId)).replace(/^\/+/, "");
      const isFeatureMainFile = Boolean(featureSourcePath) && featureSourcePath === normalizedPath;
      const scriptContent = isFeatureMainFile
        ? applyFeatureSettingOverridesToCode(fileEntry.content, featureId, normalizedPath)
        : String(fileEntry.content || "");
      executeCodeWithSourceUrl(scriptContent, normalizedPath);
      state.runtime.executedFiles.add(normalizedPath);
      executionStack.delete(normalizedPath);
      return { ok: true, status: LOADER_STATUS.LOADED, message: `Geladen: ${normalizedPath}` };
    } catch (error) {
      executionStack.delete(normalizedPath);
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        status: LOADER_STATUS.ERROR,
        message: `Ausfuehrungsfehler in ${normalizedPath}: ${message}`,
      };
    } finally {
      state.runtime.currentFeatureExecution = previousFeatureExecution;
    }
  }

  function executeEnabledFeaturesFromCache(reason = "runtime") {
    const targets = getFeatureExecutionTargets();
    const cacheFilesCount = Object.keys(state.runtime.moduleCache?.files || {}).length;

    targets.forEach((target) => {
      const featureId = target.id;
      if (!featureId) {
        return;
      }

      if (!isRuntimeFeatureEnabled(featureId)) {
        setLoaderStatus(featureId, LOADER_STATUS.IDLE, "Deaktiviert.");
        return;
      }

      if (state.runtime.executedFeatures.has(featureId)) {
        setLoaderStatus(featureId, LOADER_STATUS.LOADED, "Bereits geladen.");
        return;
      }

      if (!cacheFilesCount) {
        setLoaderStatus(featureId, LOADER_STATUS.MISSING_CACHE, "Kein Loader-Cache vorhanden. Bitte Skripte & Loader-Cache laden.");
        return;
      }

      const sourcePath = normalizeSourcePath(target.sourcePath || "").replace(/^\/+/, "");
      if (!sourcePath) {
        setLoaderStatus(featureId, LOADER_STATUS.MISSING_CACHE, "Kein Skriptpfad für dieses Modul bekannt.");
        return;
      }

      const executionResult = executeModuleFileFromCache(sourcePath, featureId);
      if (executionResult.ok) {
        state.runtime.executedFeatures.add(featureId);
        setLoaderStatus(featureId, LOADER_STATUS.LOADED, executionResult.message);
        console.info(`AD xConfig Loader: ${featureId} geladen (${reason}).`);
        return;
      }

      setLoaderStatus(featureId, executionResult.status || LOADER_STATUS.ERROR, executionResult.message || "Unbekannter Loader-Fehler.");
      console.error(`AD xConfig Loader: ${featureId} konnte nicht geladen werden (${reason}).`, executionResult.message);
    });

    publishRuntimeState(`loader-${reason}`);
    if (state.panelHost && state.panelOpen) {
      renderPanel();
    }
  }

  function getFeatureById(featureId) {
    return getFeatureRegistry().find((feature) => feature.id === featureId) || null;
  }

  function getFeatureSettingsSchema(feature) {
    if (!feature || !Array.isArray(feature.settingsSchema)) {
      return [];
    }
    return feature.settingsSchema.filter((field) => field && typeof field === "object");
  }

  function getFeatureSettingField(featureId, settingKey) {
    const feature = getFeatureById(featureId);
    if (!feature || !settingKey) {
      return null;
    }

    return getFeatureSettingsSchema(feature).find((field) => field.variableName === settingKey) || null;
  }

  function ensureFeatureSettingsDefaults(feature, featureState) {
    if (!featureState || typeof featureState !== "object") {
      return;
    }

    if (!featureState.settings || typeof featureState.settings !== "object") {
      featureState.settings = {};
    }

    getFeatureSettingsSchema(feature).forEach((field) => {
      featureState.settings[field.variableName] = resolveSettingValue(field, featureState.settings[field.variableName]);
    });
  }

  function getFeatureRepoUrl(feature) {
    if (!feature || !feature.source) {
      return REPO_BASE_URL;
    }
    return `${REPO_BASE_URL}/blob/${REPO_BRANCH}/${toRawPath(feature.source)}`;
  }

  function getFeatureReadmeUrl(feature) {
    const anchor = normalizeReadmeAnchor(feature?.readmeAnchor);
    return anchor ? `${REPO_README_URL}#${anchor}` : REPO_README_URL;
  }

  function getFeatureBackgroundUrl(feature) {
    const backgroundAsset = normalizeAssetPath(feature?.backgroundAsset);
    return backgroundAsset ? `${REPO_RAW_BASE}/${toRawPath(backgroundAsset)}` : "";
  }

  function formatDateTime(isoString) {
    if (!isoString) {
      return "never";
    }

    const dateValue = new Date(isoString);
    if (Number.isNaN(dateValue.getTime())) {
      return "never";
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateValue);
    } catch (_) {
      return dateValue.toISOString();
    }
  }

  function asElement(target) {
    if (target instanceof Element) {
      return target;
    }

    if (target && typeof target === "object" && "parentElement" in target) {
      const parent = target.parentElement;
      return parent instanceof Element ? parent : null;
    }

    return null;
  }

  function getFeatureFlags(feature, featureState) {
    const hasSettingsUpdate = Number(feature.latestSettingsVersion || 0) > Number(feature.settingsVersion || 0)
      && Number(featureState.ackSettingsVersion || 0) < Number(feature.latestSettingsVersion || 0);

    return { hasSettingsUpdate };
  }

  function createDefaultConfig() {
    const features = getFeatureRegistry().reduce((acc, feature) => {
      acc[feature.id] = {
        enabled: false,
        settings: {},
        lastSeenSha: "",
        ackVersion: "",
        ackSettingsVersion: 0,
      };
      return acc;
    }, {});

    return {
      version: CONFIG_VERSION,
      updatedAt: null,
      ui: { activeTab: "themes" },
      git: { lastSyncAt: null, connected: false, lastError: "" },
      features,
    };
  }

  function sanitizeConfig(rawConfig) {
    const defaults = createDefaultConfig();
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};

    const activeTab = TABS.some((tab) => tab.id === source?.ui?.activeTab)
      ? source.ui.activeTab
      : defaults.ui.activeTab;

    const mergedFeatures = {
      ...defaults.features,
      ...(source.features && typeof source.features === "object" ? source.features : {}),
    };

    Object.keys(mergedFeatures).forEach((id) => {
      const record = mergedFeatures[id];
      mergedFeatures[id] = {
        enabled: Boolean(record && record.enabled),
        settings: record && typeof record.settings === "object" ? record.settings : {},
        lastSeenSha: typeof record?.lastSeenSha === "string" ? record.lastSeenSha : "",
        ackVersion: typeof record?.ackVersion === "string" ? record.ackVersion : "",
        ackSettingsVersion: Number.isFinite(record?.ackSettingsVersion)
          ? record.ackSettingsVersion
          : 0,
      };
    });

    return {
      version: Number.isFinite(source.version) ? source.version : defaults.version,
      updatedAt: source.updatedAt || null,
      ui: { activeTab },
      git: {
        lastSyncAt: typeof source?.git?.lastSyncAt === "string" ? source.git.lastSyncAt : null,
        connected: source?.git?.connected === true,
        lastError: typeof source?.git?.lastError === "string" ? source.git.lastError : "",
      },
      features: mergedFeatures,
    };
  }

  async function readStore(key, fallbackValue) {
    let gmValue = null;
    let gmLoaded = false;

    try {
      if (typeof GM_getValue === "function") {
        gmLoaded = true;
        gmValue = await toPromise(GM_getValue(key, fallbackValue));
        if (gmValue !== undefined && gmValue !== null) {
          return gmValue;
        }
      }
    } catch (error) {
      console.warn("AD xConfig: GM_getValue failed, fallback to localStorage", error);
    }

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (error) {
      console.warn("AD xConfig: localStorage read failed", error);
    }

    if (gmLoaded && gmValue !== undefined && gmValue !== null) {
      return gmValue;
    }

    return fallbackValue;
  }

  async function writeStore(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        await toPromise(GM_setValue(key, value));
      }
    } catch (error) {
      console.warn("AD xConfig: GM_setValue failed, fallback to localStorage", error);
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("AD xConfig: localStorage write failed", error);
    }
  }

  async function loadConfig() {
    const stored = await readStore(STORAGE_KEY, null);
    let parsed = stored;

    if (typeof stored === "string") {
      try {
        parsed = JSON.parse(stored);
      } catch (error) {
        parsed = null;
      }
    }

    state.config = sanitizeConfig(parsed);
    state.runtime.bootstrapConfig = state.config;
    refreshRuntimeFeatureIndex();
    publishRuntimeState("config-loaded");
    queueRuntimeCleanup();
    executeEnabledFeaturesFromCache("config-change");
    if (!parsed || parsed.version !== CONFIG_VERSION) {
      await saveConfig();
    }
  }

  async function saveConfig() {
    if (!state.config) {
      return;
    }
    state.config.updatedAt = new Date().toISOString();
    await writeStore(STORAGE_KEY, state.config);
    state.runtime.bootstrapConfig = state.config;
    publishRuntimeState("config-saved");
    queueRuntimeCleanup();
  }

  function ensureFeatureStatesForRegistry() {
    if (!state.config || !state.config.features) {
      return;
    }

    getFeatureRegistry().forEach((feature) => {
      const featureState = ensureFeatureState(feature.id);
      ensureFeatureSettingsDefaults(feature, featureState);
    });
  }

  function applyFeatureRegistry(features) {
    if (!Array.isArray(features) || !features.length) {
      return false;
    }

    state.featureRegistry = features;
    ensureFeatureStatesForRegistry();
    refreshRuntimeFeatureIndex();
    publishRuntimeState("feature-registry-updated");
    queueRuntimeCleanup();
    return true;
  }

  function loadFeatureRegistryFromGit(options = {}) {
    const { silent = false } = options;

    if (state.gitLoad.loading && state.gitLoad.promise) {
      return state.gitLoad.promise;
    }

    state.gitLoad.loading = true;
    state.gitLoad.lastError = "";
    renderPanel();

    const job = (async () => {
      try {
        const gitPayload = await fetchFeatureRegistryFromGit();
        const features = Array.isArray(gitPayload?.features) ? gitPayload.features : [];
        const moduleCache = gitPayload?.moduleCache;
        const applied = applyFeatureRegistry(features);
        const cacheApplied = applyModuleCache(moduleCache);

        if (!applied || !cacheApplied) {
          throw new Error("No module data returned from repository");
        }

        state.gitLoad.source = "github-live";
        state.gitLoad.lastError = "";
        state.gitLoad.lastSuccessAt = new Date().toISOString();
        state.gitLoad.lastSuccessCount = features.length;
        console.info(`AD xConfig Loader: Git sync erfolgreich (${features.length} Module, ${Object.keys(state.runtime.moduleCache?.files || {}).length} Cache-Dateien).`);

        executeEnabledFeaturesFromCache("post-sync");

        if (state.config) {
          state.config.git.connected = true;
          state.config.git.lastError = "";
          await saveConfig();
        }

        if (!silent) {
          const cacheCount = Object.keys(state.runtime.moduleCache?.files || {}).length;
          setNotice("success", `${features.length} Module und ${cacheCount} Cache-Dateien geladen.`);
        } else {
          renderPanel();
        }

        return { ok: true, count: features.length, cacheFiles: Object.keys(state.runtime.moduleCache?.files || {}).length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        state.featureRegistry = [];
        state.gitLoad.source = "error";
        state.gitLoad.lastError = message;

        if (state.config) {
          state.config.git.connected = false;
          state.config.git.lastError = message;
          await saveConfig();
        }

        if (!silent) {
          setNotice("error", `GitHub-Laden fehlgeschlagen: ${message}`);
        } else {
          renderPanel();
        }

        return { ok: false, count: 0, error: message };
      } finally {
        state.gitLoad.loading = false;
        state.gitLoad.promise = null;
        renderPanel();
      }
    })();

    state.gitLoad.promise = job;
    return job;
  }

  function setNotice(type, message) {
    state.notice = { type, message };

    if (state.noticeTimer) {
      clearTimeout(state.noticeTimer);
      state.noticeTimer = null;
    }

    state.noticeTimer = window.setTimeout(() => {
      state.notice = { type: "", message: "" };
      renderPanel();
    }, 4000);

    renderPanel();
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${MENU_ITEM_ID} { cursor: pointer; display: flex !important; align-items: center; min-height: 2.5rem; }
#${MENU_ITEM_ID} .xcfg-menu-inner { display: inline-flex; align-items: center; gap: 0.5rem; width: 100%; }
#${MENU_ITEM_ID}[data-active="true"] { background: rgba(32,111,185,0.28) !important; border-color: rgba(255,255,255,0.16) !important; }
#${MENU_ITEM_ID} .xcfg-menu-label { white-space: nowrap; }

#${PANEL_HOST_ID} { display: none; width: 100%; position: relative; z-index: 2147480000; pointer-events: auto; }
#${PANEL_HOST_ID} .xcfg-page { margin: 0 auto; width: 100%; padding: 1rem; color: #fff; font-family: "Open Sans", "Segoe UI", Tahoma, sans-serif; }
#${PANEL_HOST_ID} .xcfg-shell {
  position: relative;
  z-index: 1;
  margin: 0 auto;
  max-width: 1366px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 1rem;
  background-color: rgba(25,32,71,0.95);
  background-image:
    radial-gradient(50% 30% at 86% 0%, rgba(49,51,112,0.89) 0%, rgba(64,52,134,0) 100%),
    radial-gradient(50% 70% at 70% 22%, rgba(38,89,154,0.9) 0%, rgba(64,52,134,0) 100%),
    radial-gradient(50% 70% at -2% 53%, rgba(52,32,95,0.89) 0%, rgba(64,52,134,0) 100%),
    radial-gradient(50% 40% at 66% 59%, rgba(32,111,185,0.87) 7%, rgba(32,111,185,0) 100%);
  box-shadow: 0 8px 30px rgba(0,0,0,0.28);
}
#${PANEL_HOST_ID} .xcfg-shell, #${PANEL_HOST_ID} .xcfg-shell * { pointer-events: auto; }

#${PANEL_HOST_ID} .xcfg-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
#${PANEL_HOST_ID} .xcfg-header-main { display: flex; align-items: center; gap: 0.75rem; }
#${PANEL_HOST_ID} .xcfg-back-btn { width: 2.5rem; min-width: 2.5rem; height: 2.5rem; padding: 0; border-radius: 8px; }
#${PANEL_HOST_ID} .xcfg-title { margin: 0; font-size: 1.65rem; line-height: 1.2; }
#${PANEL_HOST_ID} .xcfg-subtitle { margin: 0.45rem 0 0; font-size: 0.95rem; color: rgba(255,255,255,0.72); }
#${PANEL_HOST_ID} .xcfg-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
#${PANEL_HOST_ID} .xcfg-btn {
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 8px;
  padding: 0.5rem 0.78rem;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}
#${PANEL_HOST_ID} .xcfg-btn:hover { background: rgba(255,255,255,0.16); }
#${PANEL_HOST_ID} .xcfg-btn--danger { border-color: rgba(255,84,84,0.42); background: rgba(255,84,84,0.17); }
#${PANEL_HOST_ID} .xcfg-btn--close { border-color: rgba(32,111,185,0.42); background: rgba(32,111,185,0.25); }
#${PANEL_HOST_ID} .xcfg-btn--square { width: 2.5rem; min-width: 2.5rem; padding: 0; }

#${PANEL_HOST_ID} .xcfg-notice { margin-top: 0.85rem; border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.85rem; border: 1px solid transparent; }
#${PANEL_HOST_ID} .xcfg-notice--success { background: rgba(58,180,122,0.17); border-color: rgba(58,180,122,0.52); }
#${PANEL_HOST_ID} .xcfg-notice--error { background: rgba(255,84,84,0.15); border-color: rgba(255,84,84,0.5); }
#${PANEL_HOST_ID} .xcfg-notice--info { background: rgba(74,178,255,0.18); border-color: rgba(74,178,255,0.5); }
#${PANEL_HOST_ID} .xcfg-conn { margin-top: 0.85rem; border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.84rem; border: 1px solid transparent; }
#${PANEL_HOST_ID} .xcfg-conn--ok { background: rgba(58,180,122,0.17); border-color: rgba(58,180,122,0.52); }
#${PANEL_HOST_ID} .xcfg-conn--warn { background: rgba(255,198,92,0.14); border-color: rgba(255,198,92,0.45); }
#${PANEL_HOST_ID} .xcfg-conn--error { background: rgba(255,84,84,0.15); border-color: rgba(255,84,84,0.5); }
#${PANEL_HOST_ID} .xcfg-tabs { margin-top: 1rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
#${PANEL_HOST_ID} .xcfg-tab {
  border-bottom: 2px solid transparent;
  border-left: 1px solid rgba(255,255,255,0.2);
  border-right: 1px solid rgba(255,255,255,0.2);
  border-top: 1px solid rgba(255,255,255,0.2);
  border-radius: 9px;
  background: rgba(255,255,255,0.12);
  color: #fff;
  padding: 0.8rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
#${PANEL_HOST_ID} .xcfg-tab.is-active { border-bottom-color: rgba(96,165,250,0.95); background: rgba(255,255,255,0.2); }
#${PANEL_HOST_ID} .xcfg-content { margin-top: 1rem; }

#${PANEL_HOST_ID} .xcfg-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
#${PANEL_HOST_ID} .xcfg-card { position: relative; overflow: hidden; min-height: 14rem; border-radius: 11px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.2); padding: 0.9rem; transition: transform .2s ease; }
#${PANEL_HOST_ID} .xcfg-card:hover { transform: translateY(-2px); }
#${PANEL_HOST_ID} .xcfg-card-content { position: relative; z-index: 2; }
#${PANEL_HOST_ID} .xcfg-card-bg { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
#${PANEL_HOST_ID} .xcfg-card-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(15,27,67,0.88) 0%, rgba(15,27,67,0.84) 40%, rgba(15,27,67,0.36) 70%, rgba(15,27,67,0.2) 100%),
    radial-gradient(100% 100% at 90% 10%, rgba(45,108,198,0.35) 0%, rgba(45,108,198,0) 70%);
}
#${PANEL_HOST_ID} .xcfg-card-bg img {
  position: absolute;
  top: 0;
  right: 0;
  width: 72%;
  height: 100%;
  object-fit: cover;
  opacity: 0.5;
  filter: saturate(0.85);
}
#${PANEL_HOST_ID} .xcfg-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.8rem; }
#${PANEL_HOST_ID} .xcfg-card-header > div:first-child { flex: 1 1 auto; min-width: 0; }
#${PANEL_HOST_ID} .xcfg-card-title { margin: 0; font-size: 0.98rem; }
#${PANEL_HOST_ID} .xcfg-card-desc { margin: 0.4rem 0 0; max-width: 65ch; font-size: 0.84rem; line-height: 1.35; color: rgba(255,255,255,0.76); }
#${PANEL_HOST_ID} .xcfg-card-footer { margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
#${PANEL_HOST_ID} .xcfg-source-line { margin-top: 0.45rem; }
#${PANEL_HOST_ID} .xcfg-source { font-size: 0.72rem; color: rgba(255,255,255,0.62); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
#${PANEL_HOST_ID} .xcfg-card-note { margin: 0.65rem 0 0; font-size: 0.76rem; color: rgba(255,255,255,0.58); }
#${PANEL_HOST_ID} .xcfg-badge { border-radius: 999px; padding: 0.2rem 0.55rem; font-size: 0.72rem; line-height: 1; border: 1px solid transparent; }
#${PANEL_HOST_ID} .xcfg-badge--version { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); }
#${PANEL_HOST_ID} .xcfg-badge--settings { border-color: rgba(168,255,122,0.65); background: rgba(168,255,122,0.18); }
#${PANEL_HOST_ID} .xcfg-badge--config { border-color: rgba(148,214,255,0.65); background: rgba(148,214,255,0.2); }
#${PANEL_HOST_ID} .xcfg-badge--variant { border-color: rgba(163,191,250,0.7); background: rgba(163,191,250,0.2); }
#${PANEL_HOST_ID} .xcfg-badge--runtime-ok { border-color: rgba(58,180,122,0.6); background: rgba(58,180,122,0.2); }
#${PANEL_HOST_ID} .xcfg-badge--runtime-missing { border-color: rgba(255,198,92,0.6); background: rgba(255,198,92,0.2); }
#${PANEL_HOST_ID} .xcfg-badge--runtime-blocked { border-color: rgba(255,120,120,0.64); background: rgba(255,120,120,0.2); }
#${PANEL_HOST_ID} .xcfg-badge--runtime-error { border-color: rgba(255,84,84,0.68); background: rgba(255,84,84,0.24); }
#${PANEL_HOST_ID} .xcfg-actions-row { margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
#${PANEL_HOST_ID} .xcfg-mini-btn {
  border: 1px solid rgba(255,255,255,0.24);
  border-radius: 7px;
  padding: 0.35rem 0.55rem;
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.73rem;
  line-height: 1;
  cursor: pointer;
}
#${PANEL_HOST_ID} .xcfg-mini-btn:hover { background: rgba(255,255,255,0.16); }
#${PANEL_HOST_ID} .xcfg-mini-btn--config {
  border-color: rgba(126,216,255,0.92);
  background: rgba(58,148,255,0.34);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 0 0 1px rgba(126,216,255,0.24), 0 2px 10px rgba(58,148,255,0.26);
}
#${PANEL_HOST_ID} .xcfg-mini-btn--config:hover {
  background: rgba(72,170,255,0.48);
}
#${PANEL_HOST_ID} .xcfg-meta-line { margin: 0.5rem 0 0; font-size: 0.75rem; color: rgba(255,255,255,0.64); }
#${PANEL_HOST_ID} .xcfg-onoff {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  width: 5.2rem;
  min-width: 5.2rem;
  max-width: 5.2rem;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(10,14,32,0.45);
}
#${PANEL_HOST_ID} .xcfg-onoff-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.9);
  width: 50%;
  min-width: 2.6rem;
  height: 2.2rem;
  padding: 0 .45rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.86rem;
  line-height: 1;
  white-space: nowrap;
  text-align: center;
  flex: 1 1 50%;
}
#${PANEL_HOST_ID} .xcfg-onoff-btn:hover { background: rgba(255,255,255,0.16); }
#${PANEL_HOST_ID} .xcfg-onoff-btn--on { color: rgba(198,255,220,0.94); }
#${PANEL_HOST_ID} .xcfg-onoff-btn--off { color: rgba(255,216,216,0.94); }
#${PANEL_HOST_ID} .xcfg-onoff-btn--on.is-active { background: rgba(44,170,90,0.44); color: #fff; }
#${PANEL_HOST_ID} .xcfg-onoff-btn--off.is-active { background: rgba(199,63,63,0.42); color: #fff; }

#${PANEL_HOST_ID} .xcfg-empty { border-radius: 10px; border: 1px dashed rgba(255,255,255,0.3); background: rgba(255,255,255,0.03); padding: 1rem; color: rgba(255,255,255,0.75); font-size: 0.88rem; }

#${PANEL_HOST_ID} .xcfg-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background: rgba(5, 11, 29, 0.74);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
#${PANEL_HOST_ID} .xcfg-modal {
  width: min(44rem, 100%);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.22);
  background: linear-gradient(160deg, rgba(15,27,67,0.97) 0%, rgba(25,32,71,0.98) 75%);
  box-shadow: 0 20px 48px rgba(0,0,0,0.45);
  padding: 1rem;
}
#${PANEL_HOST_ID} .xcfg-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.8rem; }
#${PANEL_HOST_ID} .xcfg-modal-title { margin: 0; font-size: 1.05rem; line-height: 1.3; }
#${PANEL_HOST_ID} .xcfg-modal-subtitle { margin: 0.35rem 0 0; color: rgba(255,255,255,0.75); font-size: 0.82rem; }
#${PANEL_HOST_ID} .xcfg-modal-body { margin-top: 0.95rem; display: grid; gap: 0.65rem; }
#${PANEL_HOST_ID} .xcfg-setting-row {
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04);
  padding: 0.75rem;
}
#${PANEL_HOST_ID} .xcfg-setting-label { display: block; font-weight: 700; font-size: 0.86rem; color: rgba(255,255,255,0.96); }
#${PANEL_HOST_ID} .xcfg-setting-desc { margin: 0.32rem 0 0; color: rgba(255,255,255,0.73); font-size: 0.79rem; line-height: 1.35; }
#${PANEL_HOST_ID} .xcfg-setting-input { margin-top: 0.58rem; }
#${PANEL_HOST_ID} .xcfg-setting-select {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.28);
  background: rgba(12,17,36,0.9);
  color: #fff;
  font-size: 0.84rem;
  padding: 0.45rem 0.55rem;
}
#${PANEL_HOST_ID} .xcfg-setting-select:focus { outline: 2px solid rgba(148,214,255,0.55); outline-offset: 1px; }
#${PANEL_HOST_ID} .xcfg-setting-toggle {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.08);
}
#${PANEL_HOST_ID} .xcfg-setting-toggle-btn {
  appearance: none;
  border: none;
  min-width: 4rem;
  padding: 0.45rem 0.65rem;
  background: transparent;
  color: rgba(255,255,255,0.88);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}
#${PANEL_HOST_ID} .xcfg-setting-toggle-btn:hover { background: rgba(255,255,255,0.15); }
#${PANEL_HOST_ID} .xcfg-setting-toggle-btn.is-active { background: rgba(148,214,255,0.3); color: #fff; }

@media (max-width: 1180px) {
  #${PANEL_HOST_ID} .xcfg-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  #${PANEL_HOST_ID} .xcfg-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #${PANEL_HOST_ID} .xcfg-actions { width: 100%; }
  #${PANEL_HOST_ID} .xcfg-card-desc { width: 100%; }
  #${PANEL_HOST_ID} .xcfg-card-bg img { width: 62%; opacity: 0.42; }
  #${PANEL_HOST_ID} .xcfg-modal { width: 100%; padding: 0.85rem; }
  #${PANEL_HOST_ID} .xcfg-setting-toggle { width: 100%; }
  #${PANEL_HOST_ID} .xcfg-setting-toggle-btn { flex: 1 1 50%; min-width: 0; }
}
`;

    (document.head || document.documentElement).appendChild(style);
  }

  function getSidebarElement() {
    const exact = document.querySelector("#root > div > div > .chakra-stack.navigation");
    if (exact) {
      return exact;
    }

    const candidates = Array.from(document.querySelectorAll("#root .chakra-stack"));
    let best = null;
    let bestScore = -1;

    candidates.forEach((candidate) => {
      const text = (candidate.textContent || "").toLowerCase();
      const width = candidate.getBoundingClientRect().width;
      let score = 0;

      if (text.includes("lobb") || text.includes("spiel") || text.includes("board") || text.includes("stat")) {
        score += 8;
      }

      score += candidate.querySelectorAll("a[href]").length * 3;

      if (candidate.classList.contains("navigation")) {
        score += 6;
      }

      if (width > 0 && width < 450) {
        score += 6;
      } else if (width > 650) {
        score -= 8;
      }

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    });

    return best;
  }

  function getContentElement() {
    const exact = document.querySelector("#root > div > div:nth-of-type(2)");
    if (exact) {
      return exact;
    }

    const fallback = document.querySelector("#root main");
    return fallback || null;
  }

  function getMenuIcon() {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M3 6.5A1.5 1.5 0 0 1 4.5 5h10A1.5 1.5 0 0 1 16 6.5v1A1.5 1.5 0 0 1 14.5 9h-10A1.5 1.5 0 0 1 3 7.5zm0 10A1.5 1.5 0 0 1 4.5 15h6A1.5 1.5 0 0 1 12 16.5v1a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3 17.5zM18 4a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0 10a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3\"/></svg>";
  }

  function syncMenuButtonState() {
    const button = state.menuButton || document.getElementById(MENU_ITEM_ID);
    if (!button) {
      return;
    }

    if (isConfigRoute()) {
      button.setAttribute("data-active", "true");
    } else {
      button.removeAttribute("data-active");
    }
  }

  function syncMenuLabelForWidth() {
    const button = state.menuButton || document.getElementById(MENU_ITEM_ID);
    const sidebar = getSidebarElement();

    if (!button || !sidebar) {
      return;
    }

    const label = button.querySelector(".xcfg-menu-label");
    if (!label) {
      return;
    }

    const width = sidebar.getBoundingClientRect().width;
    label.style.display = width < 185 ? "none" : "inline";
  }


  function ensureFeatureState(featureId) {
    if (!state.config.features[featureId]) {
      state.config.features[featureId] = {
        enabled: false,
        settings: {},
        lastSeenSha: "",
        ackVersion: "",
        ackSettingsVersion: 0,
      };
    } else {
      const featureState = state.config.features[featureId];
      if (!featureState.settings || typeof featureState.settings !== "object") {
        featureState.settings = {};
      }
      if (typeof featureState.lastSeenSha !== "string") {
        featureState.lastSeenSha = "";
      }
      if (typeof featureState.ackVersion !== "string") {
        featureState.ackVersion = "";
      }
      if (!Number.isFinite(featureState.ackSettingsVersion)) {
        featureState.ackSettingsVersion = 0;
      }
    }
    return state.config.features[featureId];
  }

  function ensureMenuButton() {
    const sidebar = getSidebarElement();
    if (!sidebar) {
      return;
    }

    const boardsButton = sidebar.querySelector('a[href="/boards"]');

    let item = document.getElementById(MENU_ITEM_ID);

    if (!item) {
      const template = boardsButton || sidebar.querySelector("a[href]") || sidebar.lastElementChild;
      item = template ? template.cloneNode(true) : document.createElement("button");
      item.id = MENU_ITEM_ID;
      item.innerHTML = `<span class="xcfg-menu-inner">${getMenuIcon()}<span class="xcfg-menu-label">${MENU_LABEL}</span></span>`;
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.style.cursor = "pointer";

      if (item.tagName.toLowerCase() === "a") {
        item.removeAttribute("href");
      }

      item.addEventListener("click", (event) => {
        event.preventDefault();
        navigateToConfigRoute();
      });

      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateToConfigRoute();
        }
      });
    }

    if (boardsButton) {
      if (boardsButton.nextElementSibling !== item) {
        boardsButton.insertAdjacentElement("afterend", item);
      }
    } else {
      const profileSection = Array.from(sidebar.children).find((child) => {
        return child !== item && (
          child.querySelector(".chakra-avatar")
          || child.querySelector("img[src]")
          || child.querySelector("button[aria-label='notifications']")
        );
      });

      if (profileSection) {
        if (profileSection.previousElementSibling !== item) {
          sidebar.insertBefore(item, profileSection);
        }
      } else if (item.parentElement !== sidebar) {
        sidebar.appendChild(item);
      }
    }

    state.menuButton = item;
    syncMenuButtonState();
    syncMenuLabelForWidth();
  }

  function attachPanelListeners(host) {
    if (host.dataset.listenersAttached === "true") {
      return;
    }

    host.addEventListener("click", onPanelClick);
    host.addEventListener("change", onPanelChange);
    host.dataset.listenersAttached = "true";
  }

  function ensurePanelHost() {
    const content = getContentElement();
    if (!content) {
      return null;
    }

    let host = document.getElementById(PANEL_HOST_ID);

    const isNewHost = !host;
    if (isNewHost) {
      host = document.createElement("div");
      host.id = PANEL_HOST_ID;
      content.appendChild(host);
    }

    attachPanelListeners(host);
    state.panelHost = host;
    if (isNewHost && state.config) {
      renderPanel();
    }
    return host;
  }

  function hideContentChildren(content, host) {
    Array.from(content.children).forEach((child) => {
      if (child === host) {
        return;
      }

      if (!state.hiddenEls.has(child)) {
        state.hiddenEls.set(child, child.style.display);
      }

      child.style.display = "none";
    });
  }

  function restoreContentChildren() {
    state.hiddenEls.forEach((displayValue, element) => {
      if (element && element.isConnected) {
        element.style.display = displayValue;
      }
    });

    state.hiddenEls.clear();
  }

  function syncPanelVisibility() {
    const content = getContentElement();
    const host = ensurePanelHost();

    if (!content || !host) {
      state.panelOpen = false;
      syncMenuButtonState();
      return;
    }

    if (state.panelOpen) {
      hideContentChildren(content, host);
      state.contentHidden = true;
      host.style.display = "block";
    } else {
      if (state.contentHidden) {
        restoreContentChildren();
        state.contentHidden = false;
      }
      host.style.display = "none";
    }

    syncMenuButtonState();
  }

  function syncRoutePanelState() {
    state.panelOpen = isConfigRoute();
    syncPanelVisibility();
  }

  function navigateToConfigRoute() {
    if (isConfigRoute()) {
      syncRoutePanelState();
      return;
    }

    state.lastNonConfigRoute = currentRouteWithQueryAndHash();
    window.history.pushState({ adxconfig: true }, "", CONFIG_PATH);
    handleRouteChange();
  }

  function navigateToLastNonConfigRoute() {
    const target = state.lastNonConfigRoute && state.lastNonConfigRoute !== CONFIG_PATH
      ? state.lastNonConfigRoute
      : "/lobbies";

    window.history.pushState({}, "", target);
    handleRouteChange();
  }

  function getActiveTab() {
    const active = state.config?.ui?.activeTab;
    return TABS.some((tab) => tab.id === active) ? active : "themes";
  }

  function renderNoticeHtml() {
    if (!state.notice.message) {
      return "";
    }

    const type = ["success", "error", "info"].includes(state.notice.type)
      ? state.notice.type
      : "info";

    return `<div class="xcfg-notice xcfg-notice--${type}">${escapeHtml(state.notice.message)}</div>`;
  }

  function renderGitConnectionHtml() {
    if (state.gitLoad.loading) {
      return "<div class=\"xcfg-conn xcfg-conn--warn\">GitHub-Verbindung wird aufgebaut. Skriptinformationen werden geladen ...</div>";
    }

    if (state.gitLoad.lastError) {
      return `<div class="xcfg-conn xcfg-conn--error">GitHub-Verbindung fehlgeschlagen: ${escapeHtml(state.gitLoad.lastError)}. Bitte auf <b>🔄 Skripte & Loader-Cache laden</b> klicken, sobald die Verbindung wieder verfügbar ist.</div>`;
    }

    const count = Number(state.gitLoad.lastSuccessCount || 0);
    const loadedAt = formatDateTime(state.gitLoad.lastSuccessAt);
    if (count > 0) {
      const cacheCount = Object.keys(state.runtime.moduleCache?.files || {}).length;
      return `<div class="xcfg-conn xcfg-conn--ok">Git verbunden. Daten live aus GitHub geladen: ${count} Skripte, Loader-Cache: ${cacheCount} Dateien (Stand: ${escapeHtml(loadedAt)}).</div>`;
    }

    return "<div class=\"xcfg-conn xcfg-conn--warn\">Noch keine Skriptinformationen geladen. Bitte auf <b>🔄 Skripte & Loader-Cache laden</b> klicken.</div>";
  }

  function getResolvedFeatureSettingValue(featureId, settingKey) {
    const feature = getFeatureById(featureId);
    if (!feature) {
      return undefined;
    }

    const field = getFeatureSettingField(featureId, settingKey);
    if (!field) {
      return undefined;
    }

    const featureState = ensureFeatureState(featureId);
    ensureFeatureSettingsDefaults(feature, featureState);
    return resolveSettingValue(field, featureState.settings?.[settingKey]);
  }

  function getSelectedOptionIndexForField(field, value) {
    if (!field || field.type !== "select") {
      return -1;
    }

    const options = Array.isArray(field.options) ? field.options : [];
    const valueIndex = findSettingOptionIndexByValue(options, value);
    if (valueIndex >= 0) {
      return valueIndex;
    }

    const defaultIndex = findSettingOptionIndexByValue(options, field.defaultValue);
    if (defaultIndex >= 0) {
      return defaultIndex;
    }

    return options.length ? 0 : -1;
  }

  function setFeatureSettingValue(featureId, settingKey, rawValue) {
    if (!featureId || !settingKey || !state.config) {
      return;
    }

    const feature = getFeatureById(featureId);
    const field = getFeatureSettingField(featureId, settingKey);
    if (!feature || !field) {
      return;
    }

    const featureState = ensureFeatureState(featureId);
    ensureFeatureSettingsDefaults(feature, featureState);

    const resolvedNextValue = resolveSettingValue(field, rawValue);
    const resolvedPrevValue = resolveSettingValue(field, featureState.settings?.[settingKey]);
    featureState.settings[settingKey] = resolvedNextValue;
    renderPanel();

    if (scalarSettingValueKey(resolvedPrevValue) === scalarSettingValueKey(resolvedNextValue)) {
      return;
    }

    saveConfig().then(() => {
      // Re-run enabled feature scripts so updated xConfig_* values are applied immediately.
      if (isRuntimeFeatureEnabled(featureId)) {
        clearRuntimeHandlesForFeature(featureId);
        cleanupFeatureArtifacts(featureId);
        state.runtime.executedFeatures.delete(featureId);
        const sourcePath = normalizeSourcePath(getFeatureSourcePathById(featureId)).replace(/^\/+/, "");
        if (sourcePath) {
          state.runtime.executedFiles.delete(sourcePath);
        }
      }
      executeEnabledFeaturesFromCache("config-change");
      queueRuntimeCleanup();
    }).catch((error) => {
      console.error("AD xConfig: failed to store feature setting", error);
      setNotice("error", "Einstellung konnte nicht gespeichert werden.");
    });
  }

  function openFeatureConfig(featureId) {
    const feature = getFeatureById(featureId);
    if (!feature) {
      return;
    }

    const settingsSchema = getFeatureSettingsSchema(feature);
    if (!settingsSchema.length) {
      setNotice("info", `${feature.title}: keine konfigurierbaren Einstellungen verfügbar.`);
      return;
    }

    const featureState = ensureFeatureState(feature.id);
    ensureFeatureSettingsDefaults(feature, featureState);
    state.activeConfigFeatureId = feature.id;
    renderPanel();
  }

  function closeFeatureConfig() {
    if (!state.activeConfigFeatureId) {
      return;
    }
    state.activeConfigFeatureId = "";
    renderPanel();
  }

  function renderSettingFieldHtml(feature, field, rowIndex) {
    const fieldLabel = escapeHtml(field.label || field.key || field.variableName || "Setting");
    const settingKey = escapeHtml(field.variableName || "");
    const featureId = escapeHtml(feature.id);
    const description = String(field.description || "").trim();
    const descriptionHtml = description
      ? `<p class="xcfg-setting-desc">${escapeHtml(description)}</p>`
      : "";

    if (field.type === "toggle") {
      const currentValue = getResolvedFeatureSettingValue(feature.id, field.variableName);
      const isEnabled = normalizeBooleanSettingValue(currentValue) === true;

      const toggleOptions = Array.isArray(field.options)
        ? field.options.filter((option) => typeof option.value === "boolean")
        : [];
      const onLabel = escapeHtml(toggleOptions.find((option) => option.value === true)?.label || "An");
      const offLabel = escapeHtml(toggleOptions.find((option) => option.value === false)?.label || "Aus");
      const onClass = isEnabled ? "is-active" : "";
      const offClass = isEnabled ? "" : "is-active";

      return `
        <div class="xcfg-setting-row">
          <label class="xcfg-setting-label">${fieldLabel}</label>
          ${descriptionHtml}
          <div class="xcfg-setting-input">
            <div class="xcfg-setting-toggle" role="group" aria-label="${fieldLabel}">
              <button type="button" class="xcfg-setting-toggle-btn ${onClass}" data-action="set-setting-toggle" data-feature-id="${featureId}" data-setting-key="${settingKey}" data-setting-value="true">${onLabel}</button>
              <button type="button" class="xcfg-setting-toggle-btn ${offClass}" data-action="set-setting-toggle" data-feature-id="${featureId}" data-setting-key="${settingKey}" data-setting-value="false">${offLabel}</button>
            </div>
          </div>
        </div>
      `;
    }

    if (field.type === "select") {
      const currentValue = getResolvedFeatureSettingValue(feature.id, field.variableName);
      const selectedIndex = getSelectedOptionIndexForField(field, currentValue);
      const selectId = `xcfg-setting-${slugifyFeatureId(feature.id)}-${rowIndex}`;
      const optionsHtml = (Array.isArray(field.options) ? field.options : []).map((option, optionIndex) => {
        const selected = optionIndex === selectedIndex ? " selected" : "";
        const optionLabel = escapeHtml(option.label || String(option.value));
        return `<option value="${optionIndex}"${selected}>${optionLabel}</option>`;
      }).join("");

      return `
        <div class="xcfg-setting-row">
          <label class="xcfg-setting-label" for="${selectId}">${fieldLabel}</label>
          ${descriptionHtml}
          <div class="xcfg-setting-input">
            <select id="${selectId}" class="xcfg-setting-select" data-setting-select="true" data-feature-id="${featureId}" data-setting-key="${settingKey}">
              ${optionsHtml}
            </select>
          </div>
        </div>
      `;
    }

    return "";
  }

  function renderConfigModalHtml() {
    if (!state.activeConfigFeatureId) {
      return "";
    }

    const feature = getFeatureById(state.activeConfigFeatureId);
    if (!feature) {
      state.activeConfigFeatureId = "";
      return "";
    }

    const settingsSchema = getFeatureSettingsSchema(feature);
    if (!settingsSchema.length) {
      state.activeConfigFeatureId = "";
      return "";
    }

    const fieldsHtml = settingsSchema.map((field, index) => renderSettingFieldHtml(feature, field, index)).join("");
    if (!fieldsHtml) {
      return "";
    }

    const titleId = `xcfg-config-title-${slugifyFeatureId(feature.id)}`;
    return `
      <div class="xcfg-modal-backdrop">
        <section class="xcfg-modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          <header class="xcfg-modal-header">
            <div>
              <h3 id="${titleId}" class="xcfg-modal-title">${escapeHtml(feature.title)} - Einstellungen</h3>
              <p class="xcfg-modal-subtitle">Änderungen werden sofort gespeichert.</p>
            </div>
            <button type="button" class="xcfg-btn xcfg-btn--close" data-action="close-config" data-feature-id="${escapeHtml(feature.id)}">✖ Schließen</button>
          </header>
          <div class="xcfg-modal-body">${fieldsHtml}</div>
        </section>
      </div>
    `;
  }

  function renderFeatureCardHtml(feature) {
    const featureState = ensureFeatureState(feature.id);
    ensureFeatureSettingsDefaults(feature, featureState);
    const flags = getFeatureFlags(feature, featureState);
    const backgroundUrl = getFeatureBackgroundUrl(feature);
    const settingsSchema = getFeatureSettingsSchema(feature);
    const hasConfigurableFields = settingsSchema.length > 0;

    const badges = [
      `<span class="xcfg-badge xcfg-badge--version">v${escapeHtml(feature.version)}</span>`,
      `<span class="xcfg-badge xcfg-badge--variant">${escapeHtml(formatVariantBadgeLabel(feature.variant || ""))}</span>`,
    ];

    if (flags.hasSettingsUpdate) {
      badges.push(`<span class="xcfg-badge xcfg-badge--settings">Neue Einstellungen</span>`);
    }

    if (hasConfigurableFields) {
      const settingLabel = settingsSchema.length === 1 ? "Einstellung" : "Einstellungen";
      badges.push(`<span class="xcfg-badge xcfg-badge--config">${settingsSchema.length} ${settingLabel}</span>`);
    }
    const runtimeBadge = getLoaderBadge(feature.id);
    if (runtimeBadge) {
      const runtimeMessage = String(getLoaderStatus(feature.id)?.message || "").trim();
      const titleAttr = runtimeMessage ? ` title="${escapeHtml(runtimeMessage)}"` : "";
      badges.push(`<span class="xcfg-badge ${runtimeBadge.cssClass}"${titleAttr}>${escapeHtml(runtimeBadge.label)}</span>`);
    }
    const configButton = hasConfigurableFields
      ? `<button type="button" class="xcfg-mini-btn xcfg-mini-btn--config" data-action="open-config" data-feature-id="${escapeHtml(feature.id)}">⚙ Einstellungen</button>`
      : "";

    const onClass = featureState.enabled ? "is-active" : "";
    const offClass = featureState.enabled ? "" : "is-active";
    const backgroundHtml = backgroundUrl
      ? `<div class="xcfg-card-bg"><img src="${escapeHtml(backgroundUrl)}" alt="${escapeHtml(feature.title)} preview" loading="lazy" decoding="async"></div>`
      : "";

    return `
      <article class="xcfg-card" data-feature-card="${escapeHtml(feature.id)}">
        <div class="xcfg-card-content">
          <header class="xcfg-card-header">
            <div>
              <h3 class="xcfg-card-title">${escapeHtml(feature.title)}</h3>
              <p class="xcfg-card-desc">${escapeHtml(feature.description || "")}</p>
            </div>
            <div class="xcfg-onoff" title="Aktiviert oder deaktiviert dieses Skript.">
              <button type="button" class="xcfg-onoff-btn xcfg-onoff-btn--on ${onClass}" data-action="set-feature" data-feature-id="${escapeHtml(feature.id)}" data-feature-enabled="true">An</button>
              <button type="button" class="xcfg-onoff-btn xcfg-onoff-btn--off ${offClass}" data-action="set-feature" data-feature-id="${escapeHtml(feature.id)}" data-feature-enabled="false">Aus</button>
            </div>
          </header>
          <div class="xcfg-card-footer">
            ${badges.join("")}
          </div>
          <div class="xcfg-source-line"><span class="xcfg-source">${escapeHtml(feature.source)}</span></div>
          <div class="xcfg-actions-row">
            ${configButton}
            <button type="button" class="xcfg-mini-btn" data-action="open-repo" data-feature-id="${escapeHtml(feature.id)}">📦 Skript</button>
            <button type="button" class="xcfg-mini-btn" data-action="open-readme" data-feature-id="${escapeHtml(feature.id)}">📖 Anleitung</button>
          </div>
          <p class="xcfg-card-note">${hasConfigurableFields ? "Einstellungen werden zentral gespeichert und vom Skript übernommen." : "Dieses Skript stellt aktuell keine xConfig-Felder bereit."}</p>
        </div>
        ${backgroundHtml}
      </article>
    `;
  }

  function renderFeatureGridHtml(tabId) {
    const features = getFeatureRegistry().filter((feature) => feature.category === tabId);

    if (!features.length) {
      if (state.gitLoad.loading) {
        return "<div class=\"xcfg-empty\">Lade Skriptinformationen von GitHub ...</div>";
      }

      if (state.gitLoad.lastError) {
        return `<div class="xcfg-empty">GitHub-Verbindung fehlgeschlagen. Bitte Verbindung prüfen und <b>🔄 Skripte & Loader-Cache laden</b> erneut klicken. Fehler: ${escapeHtml(state.gitLoad.lastError)}</div>`;
      }

      return "<div class=\"xcfg-empty\">Keine Skriptinformationen geladen. Bitte <b>🔄 Skripte & Loader-Cache laden</b> klicken.</div>";
    }

    return `<div class="xcfg-grid">${features.map(renderFeatureCardHtml).join("")}</div>`;
  }

  function handlePanelAction(action, featureId, payload = {}) {
    if (action === "open-config" && featureId) {
      openFeatureConfig(featureId);
      return;
    }

    if (action === "close-config") {
      closeFeatureConfig();
      return;
    }

    if (action === "set-setting-toggle" && featureId && payload.settingKey) {
      const boolValue = normalizeBooleanSettingValue(payload.settingValue);
      if (boolValue !== null) {
        setFeatureSettingValue(featureId, payload.settingKey, boolValue);
      }
      return;
    }

    if (action === "reset") {
      resetConfig().catch((error) => {
        console.error("AD xConfig: reset failed", error);
        setNotice("error", "Zurücksetzen fehlgeschlagen.");
      });
      return;
    }

    if (action === "sync-git") {
      if (state.gitLoad.loading) {
        setNotice("info", "Skriptabgleich läuft bereits.");
        return;
      }

      runGitSyncDummy().catch((error) => {
        console.error("AD xConfig: sync failed", error);
        setNotice("error", "Skriptabgleich fehlgeschlagen.");
      });
      return;
    }

    if (action === "open-repo" && featureId) {
      openFeatureRepo(featureId);
      return;
    }

    if (action === "open-readme" && featureId) {
      openFeatureReadme(featureId);
      return;
    }

    if (action === "set-feature" && featureId) {
      return;
    }

    if (action === "back") {
      navigateToLastNonConfigRoute();
    }
  }

  function handleFeatureToggle(featureId, checked) {
    if (!featureId || !state.config) {
      return;
    }

    const featureState = ensureFeatureState(featureId);
    const enabled = Boolean(checked);
    featureState.enabled = enabled;
    executeEnabledFeaturesFromCache("config-change");
    queueRuntimeCleanup();
    renderPanel();

    saveConfig().catch((error) => {
      console.error("AD xConfig: failed to save feature state", error);
      setNotice("error", "Status konnte nicht gespeichert werden.");
    });
  }

  function bindInteractiveControls() {
    // Event delegation is attached once in attachPanelListeners().
  }

  function renderPanel() {
    if (!state.panelHost || !state.config) {
      return;
    }

    const activeTab = getActiveTab();
    const tabsHtml = TABS.map((tab) => {
      const isActive = tab.id === activeTab ? "is-active" : "";
      return `<button type="button" class="xcfg-tab ${isActive}" data-tab="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>`;
    }).join("");

    const contentHtml = renderFeatureGridHtml(activeTab);
    const modalHtml = renderConfigModalHtml();

    state.panelHost.innerHTML = `
      <div class="xcfg-page">
        <section class="xcfg-shell">
          <header class="xcfg-header">
            <div>
              <div class="xcfg-header-main">
                <button type="button" class="xcfg-btn xcfg-back-btn" data-action="back" aria-label="Zurück">←</button>
                <h1 class="xcfg-title">AD xConfig</h1>
              </div>
              <p class="xcfg-subtitle">Modulverwaltung für Themen und Animationen.</p>
            </div>
            <div class="xcfg-actions">
              <button type="button" class="xcfg-btn" data-action="sync-git">🔄 Skripte & Loader-Cache laden</button>
              <button type="button" class="xcfg-btn xcfg-btn--danger" data-action="reset">↺ Zurücksetzen</button>
            </div>
          </header>
          ${renderGitConnectionHtml()}
          ${renderNoticeHtml()}
          <nav class="xcfg-tabs">${tabsHtml}</nav>
          <div class="xcfg-content">${contentHtml}</div>
          ${modalHtml}
        </section>
      </div>
    `;

    bindInteractiveControls();
  }

  async function setActiveTab(tabId) {
    if (!state.config || !TABS.some((tab) => tab.id === tabId)) {
      return;
    }

    state.config.ui.activeTab = tabId;
    renderPanel();
    try {
      await saveConfig();
    } catch (error) {
      console.error("AD xConfig: failed to persist active tab", error);
      setNotice("error", "Tab-Auswahl konnte nicht gespeichert werden.");
    }
  }

  async function resetConfig() {
    const confirmed = window.confirm("Bist du dir sicher. Damit werden alle Deine Einstellungen auf die Defaultwerte zurückgesetzt und alle Skripte auf \"Aus\" gesetzt.");
    if (!confirmed) {
      return;
    }

    state.config = createDefaultConfig();
    executeEnabledFeaturesFromCache("config-change");
    queueRuntimeCleanup();
    await saveConfig();
    renderPanel();
    setNotice("success", "Konfiguration auf Standardwerte zurückgesetzt.");
  }

  async function runGitSyncDummy() {
    if (!state.config) {
      return;
    }

    const syncResult = await loadFeatureRegistryFromGit({ silent: true });
    const nowIso = new Date().toISOString();
    state.config.git.lastSyncAt = nowIso;

    getFeatureRegistry().forEach((feature) => {
      const featureState = ensureFeatureState(feature.id);
      if (!featureState.lastSeenSha && feature.remoteSha) {
        featureState.lastSeenSha = feature.remoteSha;
      }
    });

    await saveConfig();
    renderPanel();

    if (syncResult.ok) {
      const cacheFiles = Number(syncResult.cacheFiles || 0);
      setNotice("success", `Skripte geladen: ${syncResult.count} Module, ${cacheFiles} Loader-Cache-Dateien.`);
    } else {
      setNotice("error", `Skriptabgleich fehlgeschlagen. Grund: ${syncResult.error}`);
    }
  }

  function openFeatureRepo(featureId) {
    const feature = getFeatureById(featureId);
    if (!feature) {
      return;
    }

    const repoUrl = getFeatureRepoUrl(feature);
    window.open(repoUrl, "_blank", "noopener,noreferrer");
    setNotice("info", `${feature.title}: Skriptquelle im Repository geoeffnet.`);
  }

  function openFeatureReadme(featureId) {
    const feature = getFeatureById(featureId);
    if (!feature) {
      return;
    }

    const readmeUrl = getFeatureReadmeUrl(feature);
    window.open(readmeUrl, "_blank", "noopener,noreferrer");
    setNotice("info", `${feature.title}: Anleitung im README geoeffnet.`);
  }

  function onPanelClick(event) {
    const target = asElement(event.target);
    if (!target) {
      return;
    }

    const actionEl = target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.getAttribute("data-action");
      const featureId = actionEl.getAttribute("data-feature-id");
      const settingKey = actionEl.getAttribute("data-setting-key");
      const settingValue = actionEl.getAttribute("data-setting-value");
      if (action === "set-feature" && featureId) {
        const enabledRaw = actionEl.getAttribute("data-feature-enabled");
        if (enabledRaw === "true" || enabledRaw === "false") {
          handleFeatureToggle(featureId, enabledRaw === "true");
          return;
        }
      }

      if (action) {
        handlePanelAction(action, featureId, { settingKey, settingValue });
      }

      return;
    }

    const tabEl = target.closest("[data-tab]");
    if (tabEl) {
      const tabId = tabEl.getAttribute("data-tab");
      if (tabId) {
        setActiveTab(tabId).catch((error) => {
          console.error("AD xConfig: failed to switch tab", error);
        });
      }
    }
  }

  function onPanelChange(event) {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.getAttribute("data-setting-select") === "true") {
      const featureId = target.getAttribute("data-feature-id");
      const settingKey = target.getAttribute("data-setting-key");
      const optionIndex = Number.parseInt(target.value, 10);
      const field = getFeatureSettingField(featureId, settingKey);

      if (!field || field.type !== "select") {
        return;
      }

      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= field.options.length) {
        return;
      }

      setFeatureSettingValue(featureId, settingKey, field.options[optionIndex].value);
      return;
    }

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const featureId = target.getAttribute("data-feature-id");
    if (!featureId || !state.config) {
      return;
    }

    handleFeatureToggle(featureId, target.checked);
  }

  function queueDomSync() {
    if (state.domSyncQueued) {
      return;
    }

    state.domSyncQueued = true;
    requestAnimationFrame(() => {
      state.domSyncQueued = false;
      ensureMenuButton();
      const host = ensurePanelHost();
      syncMenuLabelForWidth();
      if (host) {
        syncPanelVisibility();
      } else {
        syncMenuButtonState();
      }
    });
  }

  function isManagedNode(node) {
    if (!(node instanceof Node)) {
      return false;
    }

    const element = node instanceof Element ? node : node.parentElement;
    if (!element) {
      return false;
    }

    return Boolean(
      element.closest(`#${PANEL_HOST_ID}`)
      || element.closest(`#${MENU_ITEM_ID}`)
    );
  }

  function hasExternalDomMutation(mutations) {
    return mutations.some((mutation) => {
      if (!isManagedNode(mutation.target)) {
        return true;
      }

      const touchedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return touchedNodes.some((node) => !isManagedNode(node));
    });
  }

  function startDomObserver() {
    const root = document.getElementById("root");
    if (!root) {
      if (state.domObserver) {
        state.domObserver.disconnect();
        state.domObserver = null;
      }
      state.observerRoot = null;
      return;
    }

    if (state.domObserver && state.observerRoot === root && root.isConnected) {
      return;
    }

    if (state.domObserver) {
      state.domObserver.disconnect();
      state.domObserver = null;
    }

    state.observerRoot = root;
    state.domObserver = new MutationObserver((mutations) => {
      if (hasExternalDomMutation(mutations)) {
        if (state.panelOpen) {
          syncPanelVisibility();
          return;
        }
        queueDomSync();
      }
    });

    state.domObserver.observe(root, {
      childList: true,
      subtree: true,
    });
  }

  function handleRouteChange() {
    const currentRoute = routeKey();
    const routeChanged = currentRoute !== state.lastRoute;
    const shouldBeOpen = isConfigRoute();

    if (!routeChanged && state.panelOpen === shouldBeOpen) {
      return;
    }

    state.lastRoute = currentRoute;
    if (!shouldBeOpen) {
      state.lastNonConfigRoute = currentRouteWithQueryAndHash();
      state.activeConfigFeatureId = "";
    }

    syncRoutePanelState();
    queueDomSync();
  }

  function cleanup() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }

    if (state.noticeTimer) {
      clearTimeout(state.noticeTimer);
      state.noticeTimer = null;
    }

    if (state.domObserver) {
      state.domObserver.disconnect();
      state.domObserver = null;
    }

    state.runtime.knownFeatureIds.forEach((featureId) => {
      clearRuntimeHandlesForFeature(featureId);
    });
    stopRuntimeCleanupEngine();

    state.observerRoot = null;

    restoreContentChildren();
    state.contentHidden = false;
  }

  async function init() {
    ensureStyles();
    initRuntimeLayer();
    bootstrapModuleCacheFromLocalStorage();
    executeEnabledFeaturesFromCache("startup");
    await loadConfig();
    ensureFeatureStatesForRegistry();

    if (!isConfigRoute()) {
      state.lastNonConfigRoute = currentRouteWithQueryAndHash();
    }

    queueDomSync();
    syncRoutePanelState();

    loadFeatureRegistryFromGit({ silent: true }).catch((error) => {
      console.error("AD xConfig: initial GitHub load failed", error);
    });

    state.pollTimer = window.setInterval(() => {
      handleRouteChange();
      startDomObserver();
      ensureAnimationSharedRuntimeWrappers();
      queueRuntimeCleanup();

      if (!document.getElementById(MENU_ITEM_ID) || !document.getElementById(PANEL_HOST_ID)) {
        queueDomSync();
      } else {
        syncMenuLabelForWidth();
      }
    }, 1000);

    window.addEventListener("resize", syncMenuLabelForWidth, { passive: true });
    window.addEventListener("pagehide", cleanup, { once: true });
    window.addEventListener("beforeunload", cleanup, { once: true });
  }

  init().catch((error) => {
    console.error("AD xConfig: initialization failed", error);
  });
})();
