// ==UserScript==
// @name         AD xConfig
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      0.7.1
// @description  Adds a central AD xConfig menu button and a dummy settings UI scaffold for future script integration.
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
  const CONFIG_VERSION = 5;
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

  const TABS = [
    { id: "themes", label: "Themes" },
    { id: "animations", label: "Animations" },
  ];

  const LEGACY_FEATURE_ID_BY_SOURCE = {
    "Template/Autodarts Theme X01.user.js": "theme-x01",
    "Template/Autodarts Theme Shanghai.user.js": "theme-shanghai",
    "Template/Autodarts Theme Bermuda.user.js": "theme-bermuda",
    "Template/Autodarts Theme Cricket.user.js": "theme-cricket",
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

  const state = {
    config: null,
    featureRegistry: [],
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
      return "All";
    }
    if (variant) {
      return variant.charAt(0).toUpperCase() + variant.slice(1);
    }
    return category === "themes" ? "Theme" : "Animation";
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

  function parseUserscriptMetadata(content) {
    const sourceText = String(content || "");
    const blockMatch = sourceText.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/i);
    const header = blockMatch ? blockMatch[1] : "";
    const metadata = {};
    const linePattern = /\/\/\s*@([a-zA-Z0-9:_-]+)\s+([^\n\r]+)/g;
    let lineMatch = linePattern.exec(header);

    while (lineMatch) {
      const key = String(lineMatch[1] || "").toLowerCase();
      const value = String(lineMatch[2] || "").trim();
      if (key && !(key in metadata)) {
        metadata[key] = value;
      }
      lineMatch = linePattern.exec(header);
    }

    return metadata;
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

  function normalizeFeatureFromSource(category, entry, scriptText) {
    const metadata = parseUserscriptMetadata(scriptText);
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
      status: "dummy",
      version,
      latestVersion: version,
      settingsVersion: safeSettingsVersion,
      latestSettingsVersion: safeSettingsVersion,
      remoteSha: String(entry.sha || ""),
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

    const features = await Promise.all(jobs.map(async (job) => {
      const rawUrl = job.entry.download_url
        || `${REPO_RAW_BASE}/${toRawPath(job.entry.path || "")}`;
      const scriptText = await requestText(rawUrl);
      return normalizeFeatureFromSource(job.category, job.entry, scriptText);
    }));

    return features
      .filter(Boolean)
      .sort((left, right) => {
        if (left.category !== right.category) {
          return left.category.localeCompare(right.category);
        }
        return left.title.localeCompare(right.title);
      });
  }

  function normalizeVersion(version) {
    return String(version || "0.0.0")
      .split(".")
      .map((segment) => Number.parseInt(segment, 10) || 0);
  }

  function isVersionNewer(left, right) {
    const leftParts = normalizeVersion(left);
    const rightParts = normalizeVersion(right);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = leftParts[index] || 0;
      const rightValue = rightParts[index] || 0;

      if (leftValue > rightValue) {
        return true;
      }
      if (leftValue < rightValue) {
        return false;
      }
    }

    return false;
  }

  function getFeatureById(featureId) {
    return getFeatureRegistry().find((feature) => feature.id === featureId) || null;
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
    const hasVersionUpdate = isVersionNewer(feature.latestVersion, feature.version)
      && featureState.ackVersion !== feature.latestVersion;
    const hasShaUpdate = Boolean(feature.remoteSha)
      && Boolean(featureState.lastSeenSha)
      && feature.remoteSha !== featureState.lastSeenSha;

    const hasUpdate = hasVersionUpdate || hasShaUpdate;

    const hasSettingsUpdate = Number(feature.latestSettingsVersion || 0) > Number(feature.settingsVersion || 0)
      && Number(featureState.ackSettingsVersion || 0) < Number(feature.latestSettingsVersion || 0);

    return { hasUpdate, hasSettingsUpdate };
  }

  function createDefaultConfig() {
    const features = getFeatureRegistry().reduce((acc, feature) => {
      acc[feature.id] = {
        enabled: false,
        settings: {},
        lastCheckedAt: null,
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
        lastCheckedAt: typeof record?.lastCheckedAt === "string" ? record.lastCheckedAt : null,
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
    try {
      if (typeof GM_getValue === "function") {
        return await toPromise(GM_getValue(key, fallbackValue));
      }
    } catch (error) {
      console.warn("AD xConfig: GM_getValue failed, fallback to localStorage", error);
    }

    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch (error) {
      console.warn("AD xConfig: localStorage read failed", error);
      return fallbackValue;
    }
  }

  async function writeStore(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        await toPromise(GM_setValue(key, value));
        return;
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
  }

  function ensureFeatureStatesForRegistry() {
    if (!state.config || !state.config.features) {
      return;
    }

    getFeatureRegistry().forEach((feature) => {
      ensureFeatureState(feature.id);
    });
  }

  function applyFeatureRegistry(features) {
    if (!Array.isArray(features) || !features.length) {
      return false;
    }

    state.featureRegistry = features;
    ensureFeatureStatesForRegistry();
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
        const features = await fetchFeatureRegistryFromGit();
        const applied = applyFeatureRegistry(features);

        if (!applied) {
          throw new Error("No module data returned from repository");
        }

        state.gitLoad.source = "github-live";
        state.gitLoad.lastError = "";
        state.gitLoad.lastSuccessAt = new Date().toISOString();
        state.gitLoad.lastSuccessCount = features.length;

        if (state.config) {
          state.config.git.connected = true;
          state.config.git.lastError = "";
          await saveConfig();
        }

        if (!silent) {
          setNotice("success", `Loaded ${features.length} modules from GitHub.`);
        } else {
          renderPanel();
        }

        return { ok: true, count: features.length };
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
          setNotice("error", `GitHub load failed: ${message}`);
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
#${PANEL_HOST_ID} .xcfg-source { font-size: 0.72rem; color: rgba(255,255,255,0.62); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
#${PANEL_HOST_ID} .xcfg-card-note { margin: 0.65rem 0 0; font-size: 0.76rem; color: rgba(255,255,255,0.58); }
#${PANEL_HOST_ID} .xcfg-badge { border-radius: 999px; padding: 0.2rem 0.55rem; font-size: 0.72rem; line-height: 1; border: 1px solid transparent; }
#${PANEL_HOST_ID} .xcfg-badge--dummy { border-color: rgba(255,198,92,0.5); background: rgba(255,198,92,0.18); }
#${PANEL_HOST_ID} .xcfg-badge--version { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); }
#${PANEL_HOST_ID} .xcfg-badge--update { border-color: rgba(74,178,255,0.65); background: rgba(74,178,255,0.25); }
#${PANEL_HOST_ID} .xcfg-badge--settings { border-color: rgba(168,255,122,0.65); background: rgba(168,255,122,0.18); }
#${PANEL_HOST_ID} .xcfg-badge--git { border-color: rgba(74,178,255,0.65); background: rgba(74,178,255,0.2); }
#${PANEL_HOST_ID} .xcfg-badge--variant { border-color: rgba(163,191,250,0.7); background: rgba(163,191,250,0.2); }
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
#${PANEL_HOST_ID} .xcfg-mini-btn--primary { border-color: rgba(74,178,255,0.52); background: rgba(74,178,255,0.2); }
#${PANEL_HOST_ID} .xcfg-meta-line { margin: 0.5rem 0 0; font-size: 0.75rem; color: rgba(255,255,255,0.64); }
#${PANEL_HOST_ID} .xcfg-onoff {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  width: 6.2rem;
  min-width: 6.2rem;
  max-width: 6.2rem;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(255,255,255,0.14);
}
#${PANEL_HOST_ID} .xcfg-onoff-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.9);
  width: 50%;
  min-width: 3.1rem;
  height: 2.2rem;
  padding: 0 .6rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1;
  white-space: nowrap;
  text-align: center;
  flex: 1 1 50%;
}
#${PANEL_HOST_ID} .xcfg-onoff-btn:hover { background: rgba(255,255,255,0.16); }
#${PANEL_HOST_ID} .xcfg-onoff-btn.is-active { background: rgba(255,255,255,0.22); }

#${PANEL_HOST_ID} .xcfg-empty { border-radius: 10px; border: 1px dashed rgba(255,255,255,0.3); background: rgba(255,255,255,0.03); padding: 1rem; color: rgba(255,255,255,0.75); font-size: 0.88rem; }

@media (max-width: 1180px) {
  #${PANEL_HOST_ID} .xcfg-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  #${PANEL_HOST_ID} .xcfg-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #${PANEL_HOST_ID} .xcfg-actions { width: 100%; }
  #${PANEL_HOST_ID} .xcfg-card-desc { width: 100%; }
  #${PANEL_HOST_ID} .xcfg-card-bg img { width: 62%; opacity: 0.42; }
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
        lastCheckedAt: null,
        lastSeenSha: "",
        ackVersion: "",
        ackSettingsVersion: 0,
      };
    } else {
      const featureState = state.config.features[featureId];
      if (typeof featureState.lastCheckedAt !== "string") {
        featureState.lastCheckedAt = null;
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
      return `<div class="xcfg-conn xcfg-conn--error">GitHub-Verbindung fehlgeschlagen: ${escapeHtml(state.gitLoad.lastError)}. Bitte auf <b>Sync Git</b> klicken, sobald die Verbindung wieder verfügbar ist.</div>`;
    }

    const count = Number(state.gitLoad.lastSuccessCount || 0);
    const loadedAt = formatDateTime(state.gitLoad.lastSuccessAt);
    if (count > 0) {
      return `<div class="xcfg-conn xcfg-conn--ok">Git verbunden. Daten live aus GitHub geladen: ${count} Skripte (Stand: ${escapeHtml(loadedAt)}).</div>`;
    }

    return "<div class=\"xcfg-conn xcfg-conn--warn\">Noch keine Skriptinformationen geladen. Bitte auf <b>Sync Git</b> klicken.</div>";
  }

  function getEnabledFeatureCount() {
    return getFeatureRegistry().reduce((count, feature) => {
      const featureState = state.config.features[feature.id];
      return count + (featureState?.enabled ? 1 : 0);
    }, 0);
  }

  function getUpdateCounters() {
    return getFeatureRegistry().reduce((acc, feature) => {
      const featureState = ensureFeatureState(feature.id);
      const flags = getFeatureFlags(feature, featureState);

      if (flags.hasUpdate) {
        acc.updates += 1;
      }
      if (flags.hasSettingsUpdate) {
        acc.settings += 1;
      }

      return acc;
    }, { updates: 0, settings: 0 });
  }

  function renderFeatureCardHtml(feature) {
    const featureState = ensureFeatureState(feature.id);
    const flags = getFeatureFlags(feature, featureState);
    const hasAttention = flags.hasUpdate || flags.hasSettingsUpdate;
    const lastChecked = formatDateTime(featureState.lastCheckedAt);
    const shortSha = feature.remoteSha ? String(feature.remoteSha).slice(0, 7) : "";
    const authorText = String(feature.author || "").trim();
    const backgroundUrl = getFeatureBackgroundUrl(feature);

    const badges = [
      `<span class="xcfg-badge xcfg-badge--dummy">Dummy</span>`,
      `<span class="xcfg-badge xcfg-badge--version">v${escapeHtml(feature.version)}</span>`,
      `<span class="xcfg-badge xcfg-badge--variant">${escapeHtml(feature.variant || "All")}</span>`,
    ];

    if (shortSha) {
      badges.push(`<span class="xcfg-badge xcfg-badge--git">git ${escapeHtml(shortSha)}</span>`);
    }

    if (flags.hasUpdate) {
      const updateLabel = feature.remoteSha && featureState.lastSeenSha && feature.remoteSha !== featureState.lastSeenSha
        ? "Update available"
        : `Update: v${feature.latestVersion}`;
      badges.push(`<span class="xcfg-badge xcfg-badge--update">${escapeHtml(updateLabel)}</span>`);
    }

    if (flags.hasSettingsUpdate) {
      badges.push(`<span class="xcfg-badge xcfg-badge--settings">New settings</span>`);
    }

    const acknowledgeButton = hasAttention
      ? `<button type="button" class="xcfg-mini-btn" data-action="ack-feature" data-feature-id="${escapeHtml(feature.id)}">Mark read</button>`
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
            <div class="xcfg-onoff" title="Stored only, no runtime hook yet">
              <button type="button" class="xcfg-onoff-btn ${onClass}" data-action="set-feature" data-feature-id="${escapeHtml(feature.id)}" data-feature-enabled="true">On</button>
              <button type="button" class="xcfg-onoff-btn ${offClass}" data-action="set-feature" data-feature-id="${escapeHtml(feature.id)}" data-feature-enabled="false">Off</button>
            </div>
          </header>
          <div class="xcfg-card-footer">
            ${badges.join("")}
            <span class="xcfg-source">${escapeHtml(feature.source)}</span>
          </div>
          <div class="xcfg-actions-row">
            <button type="button" class="xcfg-mini-btn xcfg-mini-btn--primary" data-action="check-feature" data-feature-id="${escapeHtml(feature.id)}">Check update</button>
            <button type="button" class="xcfg-mini-btn" data-action="open-repo" data-feature-id="${escapeHtml(feature.id)}">Open repo</button>
            <button type="button" class="xcfg-mini-btn" data-action="open-readme" data-feature-id="${escapeHtml(feature.id)}">Readme</button>
            ${acknowledgeButton}
          </div>
          ${authorText ? `<p class="xcfg-meta-line">Author: ${escapeHtml(authorText)}</p>` : ""}
          <p class="xcfg-meta-line">Last checked (dummy): ${escapeHtml(lastChecked)}</p>
          <p class="xcfg-card-note">No runtime adapter connected yet. Toggle state is saved for future integration.</p>
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
        return `<div class="xcfg-empty">GitHub-Verbindung fehlgeschlagen. Bitte Verbindung prüfen und <b>Sync Git</b> erneut klicken. Fehler: ${escapeHtml(state.gitLoad.lastError)}</div>`;
      }

      return "<div class=\"xcfg-empty\">Keine Skriptinformationen geladen. Bitte <b>Sync Git</b> klicken.</div>";
    }

    return `<div class="xcfg-grid">${features.map(renderFeatureCardHtml).join("")}</div>`;
  }

  function handlePanelAction(action, featureId) {
    if (action === "close") {
      navigateToLastNonConfigRoute();
      return;
    }

    if (action === "reset") {
      resetConfig().catch((error) => {
        console.error("AD xConfig: reset failed", error);
        setNotice("error", "Reset failed.");
      });
      return;
    }

    if (action === "sync-git") {
      if (state.gitLoad.loading) {
        setNotice("info", "Git sync already running.");
        return;
      }

      runGitSyncDummy().catch((error) => {
        console.error("AD xConfig: sync failed", error);
        setNotice("error", "Git sync failed.");
      });
      return;
    }

    if (action === "check-feature" && featureId) {
      checkFeatureDummy(featureId).catch((error) => {
        console.error("AD xConfig: feature check failed", error);
        setNotice("error", "Dummy feature check failed.");
      });
      return;
    }

    if (action === "ack-feature" && featureId) {
      acknowledgeFeatureChanges(featureId).catch((error) => {
        console.error("AD xConfig: acknowledge failed", error);
        setNotice("error", "Could not mark update as read.");
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
    featureState.enabled = Boolean(checked);
    const feature = getFeatureById(featureId);
    renderPanel();

    saveConfig().then(() => {
      const label = feature?.title || featureId;
      const stateLabel = checked ? "aktiviert" : "deaktiviert";
      setNotice("success", `${label}: ${stateLabel} und persistent gespeichert.`);
    }).catch((error) => {
      console.error("AD xConfig: failed to save feature state", error);
      setNotice("error", "Failed to store feature state.");
    });
  }

  function bindInteractiveControls() {
    if (!state.panelHost) {
      return;
    }

    state.panelHost.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = element.getAttribute("data-action");
        const featureId = element.getAttribute("data-feature-id");
        const enabledRaw = element.getAttribute("data-feature-enabled");
        if (action === "set-feature" && featureId && enabledRaw) {
          handleFeatureToggle(featureId, enabledRaw === "true");
          return;
        }
        if (action) {
          handlePanelAction(action, featureId);
        }
      });
    });

    state.panelHost.querySelectorAll("[data-tab]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const tabId = element.getAttribute("data-tab");
        if (!tabId) {
          return;
        }

        setActiveTab(tabId).catch((error) => {
          console.error("AD xConfig: failed to switch tab", error);
        });
      });
    });

    state.panelHost.querySelectorAll("input[data-feature-id]").forEach((element) => {
      if (!(element instanceof HTMLInputElement)) {
        return;
      }
      element.addEventListener("change", (event) => {
        event.stopPropagation();
        const featureId = element.getAttribute("data-feature-id");
        handleFeatureToggle(featureId, element.checked);
      });
    });
  }

  function renderPanel() {
    if (!state.panelHost || !state.config) {
      return;
    }

    const activeTab = getActiveTab();
    const enabledCount = getEnabledFeatureCount();
    const moduleCount = getFeatureRegistry().length;
    const updateCounters = getUpdateCounters();
    const lastSyncText = formatDateTime(state.config?.git?.lastSyncAt || null);
    const gitStatusText = state.config?.git?.connected ? "connected" : "offline";
    const gitSourceText = state.gitLoad.source || "not-loaded";
    const gitLoadingText = state.gitLoad.loading ? "updating..." : "idle";

    const tabsHtml = TABS.map((tab) => {
      const isActive = tab.id === activeTab ? "is-active" : "";
      return `<button type="button" class="xcfg-tab ${isActive}" data-tab="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>`;
    }).join("");

    const contentHtml = renderFeatureGridHtml(activeTab);

    state.panelHost.innerHTML = `
      <div class="xcfg-page">
        <section class="xcfg-shell">
          <header class="xcfg-header">
            <div>
              <div class="xcfg-header-main">
                <button type="button" class="xcfg-btn xcfg-back-btn" data-action="back" aria-label="Back">←</button>
                <h1 class="xcfg-title">AD xConfig</h1>
              </div>
              <p class="xcfg-subtitle">Module manager for themes and animations. Git: ${escapeHtml(gitStatusText)} (${escapeHtml(gitSourceText)}, ${escapeHtml(gitLoadingText)}). Enabled (dummy): ${enabledCount}/${moduleCount}. Updates: ${updateCounters.updates}. New settings: ${updateCounters.settings}. Last Git sync: ${escapeHtml(lastSyncText)}</p>
            </div>
            <div class="xcfg-actions">
              <button type="button" class="xcfg-btn" data-action="sync-git">Sync Git</button>
              <button type="button" class="xcfg-btn xcfg-btn--danger" data-action="reset">Reset</button>
              <button type="button" class="xcfg-btn xcfg-btn--close" data-action="close">Close</button>
            </div>
          </header>
          ${renderGitConnectionHtml()}
          ${renderNoticeHtml()}
          <nav class="xcfg-tabs">${tabsHtml}</nav>
          <div class="xcfg-content">${contentHtml}</div>
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
      setNotice("error", "Tab selection could not be persisted.");
    }
  }

  async function resetConfig() {
    const confirmed = window.confirm("Reset AD xConfig to defaults?");
    if (!confirmed) {
      return;
    }

    state.config = createDefaultConfig();
    await saveConfig();
    renderPanel();
    setNotice("success", "Configuration reset to defaults.");
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
      featureState.lastCheckedAt = nowIso;
      if (!featureState.lastSeenSha && feature.remoteSha) {
        featureState.lastSeenSha = feature.remoteSha;
      }
    });

    await saveConfig();
    renderPanel();

    if (syncResult.ok) {
      setNotice("success", `Git sync done. Loaded ${syncResult.count} modules from repository.`);
    } else {
      setNotice("error", `Git sync failed. No module data available. Reason: ${syncResult.error}`);
    }
  }

  async function checkFeatureDummy(featureId) {
    await loadFeatureRegistryFromGit({ silent: true });
    const feature = getFeatureById(featureId);
    if (!feature || !state.config) {
      return;
    }

    const nowIso = new Date().toISOString();
    const featureState = ensureFeatureState(feature.id);
    featureState.lastCheckedAt = nowIso;
    if (!featureState.lastSeenSha && feature.remoteSha) {
      featureState.lastSeenSha = feature.remoteSha;
    }
    state.config.git.lastSyncAt = nowIso;

    await saveConfig();
    renderPanel();

    const flags = getFeatureFlags(feature, featureState);
    const detailParts = [];

    if (flags.hasUpdate) {
      if (feature.remoteSha && featureState.lastSeenSha && feature.remoteSha !== featureState.lastSeenSha) {
        detailParts.push("new Git revision detected");
      } else {
        detailParts.push(`update available: v${feature.latestVersion}`);
      }
    }
    if (flags.hasSettingsUpdate) {
      detailParts.push("new settings available");
    }

    const message = detailParts.length
      ? `${feature.title}: ${detailParts.join(", ")}.`
      : `${feature.title}: no new changes found (dummy).`;

    setNotice("info", message);
  }

  async function acknowledgeFeatureChanges(featureId) {
    const feature = getFeatureById(featureId);
    if (!feature || !state.config) {
      return;
    }

    const featureState = ensureFeatureState(feature.id);
    if (feature.remoteSha) {
      featureState.lastSeenSha = feature.remoteSha;
    }
    featureState.ackVersion = feature.latestVersion || "";
    featureState.ackSettingsVersion = Number(feature.latestSettingsVersion || 0);

    await saveConfig();
    renderPanel();
    setNotice("success", `${feature.title}: update markers marked as read.`);
  }

  function openFeatureRepo(featureId) {
    const feature = getFeatureById(featureId);
    if (!feature) {
      return;
    }

    const repoUrl = getFeatureRepoUrl(feature);
    window.open(repoUrl, "_blank", "noopener,noreferrer");
    setNotice("info", `Opened repository path for ${feature.title} (dummy flow).`);
  }

  function openFeatureReadme(featureId) {
    const feature = getFeatureById(featureId);
    if (!feature) {
      return;
    }

    const readmeUrl = getFeatureReadmeUrl(feature);
    window.open(readmeUrl, "_blank", "noopener,noreferrer");
    setNotice("info", `Opened README section for ${feature.title}.`);
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
      if (action === "set-feature" && featureId) {
        const enabledRaw = actionEl.getAttribute("data-feature-enabled");
        if (enabledRaw === "true" || enabledRaw === "false") {
          handleFeatureToggle(featureId, enabledRaw === "true");
          return;
        }
      }

      if (action) {
        handlePanelAction(action, featureId);
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

    state.observerRoot = null;

    restoreContentChildren();
    state.contentHidden = false;
  }

  async function init() {
    ensureStyles();
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
