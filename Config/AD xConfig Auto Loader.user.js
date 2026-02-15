// ==UserScript==
// @name         AD xConfig Auto Loader
// @namespace    https://github.com/thomasasen/autodarts-tampermonkey-themes
// @version      1.0.0
// @description  Lädt automatisch die neueste AD xConfig-Version mit Cache-Fallback.
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

  if (window[EXEC_GUARD_KEY]) {
    return;
  }
  window[EXEC_GUARD_KEY] = true;

  const prefix = "AD xConfig Auto Loader:";

  function logInfo(message, ...args) {
    console.info(`${prefix} ${message}`, ...args);
  }

  function logWarn(message, ...args) {
    console.warn(`${prefix} ${message}`, ...args);
  }

  function logError(message, ...args) {
    console.error(`${prefix} ${message}`, ...args);
  }

  function toPromise(value) {
    return value && typeof value.then === "function" ? value : Promise.resolve(value);
  }

  async function readStore(key, fallbackValue) {
    try {
      if (typeof GM_getValue === "function") {
        const value = await toPromise(GM_getValue(key, fallbackValue));
        if (value !== undefined) {
          return value;
        }
      }
    } catch (error) {
      logWarn(`GM_getValue fehlgeschlagen (${key}), nutze Fallback.`, error);
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
      logWarn(`GM_setValue fehlgeschlagen (${key}), nutze Fallback.`, error);
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
      logInfo("AD xConfig ist bereits aktiv, Ausführung übersprungen.");
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
      logInfo(`Remote geladen${meta.versionHint ? ` (v${meta.versionHint})` : ""}.`);
      return;
    } catch (error) {
      remoteError = error;
      logWarn("Remote-Laden fehlgeschlagen, versuche Cache-Fallback.", error);
    }

    const cachedCode = await readStore(CACHE_CODE_KEY, "");
    const cachedMeta = await readStore(CACHE_META_KEY, null);

    if (!isValidAdXConfigCode(cachedCode)) {
      logError("Kein gültiger Cache verfügbar. Bitte mit aktiver Internetverbindung neu laden.", remoteError);
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
      logInfo(`Cache-Fallback geladen${details ? ` (${details})` : ""}.`);
    } catch (error) {
      logError("Ausführung des Cache-Codes fehlgeschlagen.", error);
    }
  }

  executeWithCacheFallback().catch((error) => {
    logError("Unerwarteter Loader-Fehler.", error);
  });
})();
