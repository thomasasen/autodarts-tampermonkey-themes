// ==UserScript==
// @name         AD xConfig Auto Loader
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0.0
// @description  Legacy Auto Loader fuer das deprecated Repo autodarts-tampermonkey-themes; laedt AD xConfig weiter mit Cache-Fallback.
// @author       Thomas Asen
// @license      MIT
// @match        *://play.autodarts.io/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @downloadURL  https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Config/AD%20xConfig%20Auto%20Loader.user.js
// @updateURL    https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Config/AD%20xConfig%20Auto%20Loader.user.js
// ==/UserScript==

(function () {
  "use strict";

  const EXEC_GUARD_KEY = "__adXConfigAutoLoaderBootstrapped";
  const RUNTIME_GLOBAL_KEY = "__adXConfigRuntime";
  const CACHE_CODE_KEY = "ad-xconfig:autoload:cache-code:v1";
  const CACHE_META_KEY = "ad-xconfig:autoload:cache-meta:v1";
  const REQUEST_TIMEOUT_MS = 10000;
  const REMOTE_SOURCE_URL = "https://raw.githubusercontent.com/thomasasen/autodarts-tampermonkey-themes/main/Config/AD%20xConfig.user.js";
  const DEPRECATION_BANNER_GLOBAL_KEY = "__adLegacyDeprecationBannerState";
  const DEPRECATION_BANNER_STYLE_ID = "ad-legacy-deprecation-banner-style";
  const DEPRECATION_BANNER_ID = "ad-legacy-deprecation-banner";
  const DEPRECATION_COPY = Object.freeze({
    url: "https://github.com/thomasasen/autodarts-xconfig",
    title: "Dieses Skript ist veraltet (deprecated).",
    body: "Dieses Legacy-Repo wird von mir nicht weiter gepflegt und wurde durch autodarts-xconfig ersetzt.",
    benefits: "autodarts-xconfig bietet ein ueberarbeitetes Programmdesign, einen zentralen Installationspfad, mehr Stabilitaet und laufende Weiterentwicklung.",
    cta: "Zum Nachfolger autodarts-xconfig",
  });

  if (window[EXEC_GUARD_KEY]) {
    return;
  }
  window[EXEC_GUARD_KEY] = true;

  const prefix = "[xConfig][AD xConfig Auto Loader]";

  function debugLog(message, ...args) {
    console.info(`${prefix} ${message}`, ...args);
  }

  function debugWarn(message, ...args) {
    console.warn(`${prefix} ${message}`, ...args);
  }

  function debugError(message, ...args) {
    console.error(`${prefix} ${message}`, ...args);
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

  function getDeprecationBannerState() {
    const existing = window[DEPRECATION_BANNER_GLOBAL_KEY];
    if (existing && typeof existing === "object") {
      existing.payload = DEPRECATION_COPY;
      return existing;
    }

    const next = {
      payload: DEPRECATION_COPY,
      waitingForDom: false,
    };
    window[DEPRECATION_BANNER_GLOBAL_KEY] = next;
    return next;
  }

  function ensureDeprecationBannerStyle() {
    const target = document.head || document.documentElement;
    if (!target) {
      return false;
    }

    const cssText = `
#${DEPRECATION_BANNER_ID} {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(960px, calc(100vw - 1rem));
  z-index: 2147483646;
  pointer-events: none;
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 196, 88, 0.55);
  background: linear-gradient(135deg, rgba(54, 33, 5, 0.96), rgba(90, 45, 8, 0.92));
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.34);
  color: #fff4de;
  pointer-events: auto;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__copy {
  flex: 1 1 26rem;
  min-width: 0;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__title {
  margin: 0 0 0.2rem;
  font-size: 0.96rem;
  font-weight: 800;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__body {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.42;
  color: rgba(255, 244, 222, 0.94);
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 219, 143, 0.72);
  background: rgba(255, 247, 228, 0.14);
  color: #fff7e7;
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}
#${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__link:hover {
  background: rgba(255, 247, 228, 0.22);
}
@media (max-width: 720px) {
  #${DEPRECATION_BANNER_ID} {
    width: calc(100vw - 0.75rem);
    top: 0.5rem;
  }
  #${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__inner {
    padding: 0.72rem 0.82rem;
  }
  #${DEPRECATION_BANNER_ID} .ad-legacy-deprecation-banner__link {
    width: 100%;
  }
}
`;

    const existingStyle = document.getElementById(DEPRECATION_BANNER_STYLE_ID);
    if (existingStyle) {
      if (existingStyle.textContent !== cssText) {
        existingStyle.textContent = cssText;
      }
      if (existingStyle.parentElement !== target) {
        target.appendChild(existingStyle);
      }
      return true;
    }

    const style = document.createElement("style");
    style.id = DEPRECATION_BANNER_STYLE_ID;
    style.textContent = cssText;
    target.appendChild(style);
    return true;
  }

  function ensureDeprecationBanner() {
    const host = document.body || document.documentElement;
    if (!host) {
      return false;
    }

    ensureDeprecationBannerStyle();
    const { payload } = getDeprecationBannerState();
    let banner = document.getElementById(DEPRECATION_BANNER_ID);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = DEPRECATION_BANNER_ID;
      banner.setAttribute("role", "note");
    }

    banner.innerHTML = `
      <div class="ad-legacy-deprecation-banner__inner">
        <div class="ad-legacy-deprecation-banner__copy">
          <p class="ad-legacy-deprecation-banner__title">${escapeHtml(payload.title)}</p>
          <p class="ad-legacy-deprecation-banner__body">${escapeHtml(payload.body)} ${escapeHtml(payload.benefits)}</p>
        </div>
        <a class="ad-legacy-deprecation-banner__link" href="${escapeHtml(payload.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.cta)}</a>
      </div>
    `;

    if (banner.parentElement !== host) {
      host.appendChild(banner);
    }
    return true;
  }

  function scheduleDeprecationBanner() {
    if (ensureDeprecationBanner()) {
      return;
    }

    const state = getDeprecationBannerState();
    if (state.waitingForDom) {
      return;
    }
    state.waitingForDom = true;

    const retry = () => {
      state.waitingForDom = false;
      ensureDeprecationBanner();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", retry, { once: true });
      return;
    }

    window.setTimeout(retry, 0);
  }

  scheduleDeprecationBanner();

  async function readStore(key, fallbackValue) {
    try {
      if (typeof GM_getValue === "function") {
        const value = await toPromise(GM_getValue(key, fallbackValue));
        if (value !== undefined) {
          return value;
        }
      }
    } catch (error) {
      debugWarn(`GM_getValue fehlgeschlagen (${key}), nutze Fallback.`, error);
    }

    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw);
      }
    } catch (_) {
      // Ignore localStorage parsing issues.
    }

    return fallbackValue;
  }

  async function writeStore(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        await toPromise(GM_setValue(key, value));
      }
    } catch (error) {
      debugWarn(`GM_setValue fehlgeschlagen (${key}), nutze Fallback.`, error);
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      // Ignore localStorage write issues.
    }
  }

  function requestText(url) {
    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout: REQUEST_TIMEOUT_MS,
          headers: { Accept: "text/plain" },
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              resolve(String(response.responseText || ""));
              return;
            }
            reject(new Error(`HTTP ${response.status}`));
          },
          onerror: () => reject(new Error("Netzwerkfehler")),
          ontimeout: () => reject(new Error("Zeitüberschreitung")),
        });
      });
    }

    return fetch(url, { cache: "no-store", credentials: "omit" }).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    });
  }

  function extractVersionHint(code) {
    const match = String(code || "").match(/\/\/\s*@version\s+([^\n\r]+)/i);
    return match ? String(match[1] || "").trim() : "";
  }

  function isValidAdXConfigCode(code) {
    const sourceText = String(code || "");
    if (!sourceText) {
      return false;
    }

    const checks = [
      /\/\/\s*==UserScript==/i,
      /\/\/\s*@name\s+AD xConfig\b/i,
      /const\s+STORAGE_KEY\s*=\s*["']ad-xconfig:config["']/,
      /\(function\s*\(\)\s*\{/,
    ];

    return checks.every((pattern) => pattern.test(sourceText));
  }

  function executeCode(code, sourceLabel) {
    const payload = `${String(code || "")}\n//# sourceURL=${sourceLabel}`;
    (0, eval)(payload);
  }

  async function executeWithCacheFallback() {
    if (window[RUNTIME_GLOBAL_KEY]) {
      debugLog("AD xConfig ist bereits aktiv, Ausführung übersprungen.");
      return;
    }

    let remoteCode = "";
    let remoteError = null;

    try {
      remoteCode = await requestText(REMOTE_SOURCE_URL);
      if (!isValidAdXConfigCode(remoteCode)) {
        throw new Error("Remote-Code hat die Validierung nicht bestanden");
      }

      const meta = {
        fetchedAt: new Date().toISOString(),
        sourceUrl: REMOTE_SOURCE_URL,
        versionHint: extractVersionHint(remoteCode),
      };

      await writeStore(CACHE_CODE_KEY, remoteCode);
      await writeStore(CACHE_META_KEY, meta);

      executeCode(remoteCode, "ad-xconfig-auto-loader/remote/AD xConfig.user.js");
      debugLog(`Remote geladen${meta.versionHint ? ` (v${meta.versionHint})` : ""}.`);
      return;
    } catch (error) {
      remoteError = error;
      debugWarn("Remote-Laden fehlgeschlagen, versuche Cache-Fallback.", error);
    }

    const cachedCode = await readStore(CACHE_CODE_KEY, "");
    const cachedMeta = await readStore(CACHE_META_KEY, null);

    if (!isValidAdXConfigCode(cachedCode)) {
      debugError("Kein gültiger Cache verfügbar. Bitte mit aktiver Internetverbindung neu laden.", remoteError);
      return;
    }

    try {
      executeCode(cachedCode, "ad-xconfig-auto-loader/cache/AD xConfig.user.js");
      const cachedVersion = cachedMeta && typeof cachedMeta === "object" ? String(cachedMeta.versionHint || "").trim() : "";
      const cachedAt = cachedMeta && typeof cachedMeta === "object" ? String(cachedMeta.fetchedAt || "").trim() : "";
      const details = [
        cachedVersion ? `v${cachedVersion}` : "",
        cachedAt ? `Stand ${cachedAt}` : "",
      ].filter(Boolean).join(", ");
      debugLog(`Cache-Fallback geladen${details ? ` (${details})` : ""}.`);
    } catch (error) {
      debugError("Ausführung des Cache-Codes fehlgeschlagen.", error);
    }
  }

  executeWithCacheFallback().catch((error) => {
    debugError("Unerwarteter Loader-Fehler.", error);
  });
})();
