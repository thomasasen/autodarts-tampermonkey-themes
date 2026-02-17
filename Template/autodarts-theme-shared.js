(function (global) {
  "use strict";

  // Shared helper for the theme userscripts in Template/.
  // It bundles common CSS and utilities so each theme can stay small.
  // The theme scripts load this file via @require; you do not install it
  // separately in Tampermonkey. Only update the @require URL if you fork.

  // Gemeinsamer Helfer fuer die Theme-Userscripts in Template/.
  // Er buendelt gaengige CSS und Tools, damit jedes Theme vom Umfang klein bleiben kann und das Design durchgaengig bleibt.
  // Die Theme-Skripte laden diese Datei ueber @require; sie muessen sie nicht separat in Tampermonkey installiert werden.
  // Aktualisieren Sie die @require-URL nur, wenn Sie einen Fork erstellen.

  // Gemeinsame Farbwerte fuer die Themes (X01, Shanghai, Bermuda, etc.).
  const commonThemeCss = `
:root{
  --theme-bg: #000000;
  --theme-background: #000000;
  --theme-text-color: #000000;
  --theme-text-highlight-color: #9fdb58;
  --theme-navigation-bg: #434343;
  --theme-navigation-item-color: #666666;
  --theme-player-badge-bg: #9fdb58;
  --theme-player-name-bg: #9fdb58;
  --theme-current-bg: #0c343d;
  --theme-border-color: #434343;
  --theme-alt-bg: #274e13;
}

div.css-gmuwbf,
div.css-tkevr6,
div.css-nfhdnc {
  background-color: var(--theme-background);
}

.chakra-stack.navigation,
div.chakra-stack.navigation.css-19ml6yu,
div.chakra-stack.navigation.css-ege71s {
  background-color: var(--theme-navigation-bg);
}

span.chakra-badge.css-1g1qw76 {
  font-size: 30px;
  background-color: var(--theme-player-name-bg);
}

p.chakra-text.css-0,
div.ad-ext-player.ad-ext-player-active p.chakra-text.css-0 {
  font-size: 30px;
}

div.ad-ext-player.ad-ext-player-active p.chakra-text.ad-ext-player-score {
  font-size: 7em;
}

button.chakra-button.css-d6eevf {
  background-color: var(--theme-navigation-item-color);
}

p.chakra-text.css-1qlemha {
  background-color: var(--theme-current-bg);
  font-size: 30px;
}

span.css-bs3vp6 {
  font-size: 30px;
}

span.css-elma0c {
  background-color: var(--theme-alt-bg);
}

span.css-5nep5l {
  background-color: var(--theme-current-bg);
}

div.css-rrf7rv {
  background-color: var(--theme-alt-bg);
  border-color: var(--theme-border-color);
}

span.chakra-badge.css-1j1ty0z,
span.chakra-badge.css-1c4630i,
span.chakra-badge.css-n2903v {
  font-size: 30px;
}

.correction-bg {
  background-color: #d69d2e !important;
}

.css-rtn29s {
  border: 2px solid rgb(159 219 88);
}

p.chakra-text.ad-ext-player-score.css-18w03sn { color: #9fdb58; }
span.css-3fr5p8 { background-color: #9fdb58; color: #222; }
p.chakra-text.ad-ext-player-score.css-1r7jzhg { color: #9fdb58; }
div.suggestion.css-1dkgpmk { font-size: 6px; background-color: #222; border-color: #434343; }
div.ad-ext-player.ad-ext-player-active.css-1en42kf { border-color: #434343; border-style: solid; }
div.chakra-menu__menu-list.css-yskgbr { background-color: #434343; }
button.chakra-tabs__tab.css-1vm7g5b { color: #9fdb58; }
span.chakra-switch__track.css-v4l15v { background-color: #38761d; }
button.chakra-tabs__tab.css-1pjn7in { color: #9fdb58; }
`;

  // Gemeinsames Grid/Board-Layout.
  const commonLayoutCss = `
/* Main layout: header, footer, then content */
.css-tkevr6 > .chakra-stack{
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  grid-template-rows: max-content max-content 1fr !important; /* footer sits right under header */
  grid-template-areas:
    "header header"
    "footer footer"
    "players board" !important;
  max-width: 100% !important;
}

/* Header layout */
.css-tkevr6 > .chakra-stack > div.css-0:first-child:not(.chakra-wrap){
  position: static !important;
  grid-column-start: 1 !important;
  grid-column-end: 3 !important;
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-area: header !important;
}
.chakra-wrap.css-0,
.css-k008qs{
  grid-column-start: 1 !important;
  grid-column-end: 3 !important;
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-area: header !important;
}

/* Inactive player (X01 selectors) */
.ad-ext-player:not(.ad-ext-player-active):not(.ad-ext-player-winner) > div > p {
  font-size: 3em !important;
  color: gray !important;
}

.ad-ext-player.ad-ext-player-inactive p.chakra-text.ad-ext-player-score,
.ad-ext-player.ad-ext-player-inactive .ad-ext_winner-score-wrapper > p {
  font-size: 3em !important;
  color: gray !important;
}

.ad-ext-player-inactive .chakra-stack.css-37hv00 {
  height: 20px !important;
}

.ad-ext-player.ad-ext-player-inactive.css-1en42kf{
  display: ruby-text !important;
}

.ad-ext-player-inactive .chakra-text.css-11cuipc {
  font-size: x-large !important;
}

/* Player Avatar */
.chakra-avatar{ --avatar-size: 2.5rem; }
/* Bot Avatar */
.css-7lnr9n{ width: 2.5rem; height: 2.5rem; }

/* Player: Layout */
#ad-ext-player-display {
  display:flex;
  flex-direction: column;
  align-items: stretch;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  grid-row-start: 3 !important;
  grid-row-end: 4 !important;
  grid-area: players !important;
  max-height: 80vh;
}

/* Player: Tag */
.css-1k3nd6z{ align-self: stretch; font-size: 36px; }
.css-g0ywsj{ min-width: auto; }
.css-1k3nd6z > span{ justify-content: center; height: 100%; }
.css-3fr5p8 { background-color: var(--theme-player-badge-bg); }
.css-3fr5p8 > p{ font-size: 30px; }

/* Player: Average */
.css-1j0bqop { font-size: 25px; }

/* Footer directly under header */
#ad-ext-turn{
  grid-column-start: 1 !important;
  grid-column-end: 3 !important;
  grid-row-start: 2 !important;
  grid-row-end: 3 !important;
  grid-area: footer !important;
}

/* Toolbar block next to board should live in board row */
.css-17xejub{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 3 !important;
  grid-row-end: 4 !important;
  grid-area: board !important;
}

div.css-y3hfdd{
  display: grid !important;
  grid-template-columns: 1fr auto !important;
  grid-template-rows: 1fr !important;
}
.ad-ext_winner-score-wrapper{
  display: contents !important;
}
div.css-y3hfdd > p,
div.css-y3hfdd > .ad-ext_winner-score-wrapper > p{
  color: var(--theme-text-highlight-color);
  grid-row-start: 1 !important;
  grid-row-end: 3 !important;
  margin-bottom:0 !important;
}
.css-1r7jzhg{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 1 !important;
  grid-row-end: 3 !important;
}
.css-37hv0{
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
}
.css-37hv00{
  grid-row-start: 1 !important;
  grid-row-end: 2 !important;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  display: flex !important;
  flex-wrap: nowrap !important;
}
div.css-y3hfdd > .css-1igwmid{
  grid-row-start: 2 !important;
  grid-row-end: 3 !important;
  grid-column-start: 1 !important;
  grid-column-end: 2 !important;
  padding-left:55px !important;
}

/* Board */
.css-1kejrvi,
.css-14xtjvc{
  grid-column-start: 2 !important;
  grid-column-end: 3 !important;
  grid-row-start: 3 !important;
  grid-row-end: 4 !important;
  grid-area: board !important;
  align-self: start !important;
  height: 100% !important;
  position: relative !important; /* prevent sticky/absolute overlap with footer row */
  margin-top: 0 !important;
}
.css-tqsk66{ padding-bottom: 50px; }
.css-7bjx6y,
.css-1wegtvo{ top: inherit; bottom: 0; }
.css-1emway5 { grid-column: 1 / 3; }
`;

  function getVariantName() {
    const variantEl = document.getElementById("ad-ext-game-variant");
    return variantEl?.textContent?.trim().toLowerCase() || "";
  }

  function isVariantNameActive(variantName, matchMode = "equals") {
    const expectedVariant = String(variantName || "").trim().toLowerCase();
    if (!expectedVariant) {
      return false;
    }

    const currentVariant = getVariantName();
    if (!currentVariant) {
      const gameState = global.autodartsGameStateShared || null;
      if (expectedVariant === "x01" && gameState && typeof gameState.isX01Variant === "function") {
        return gameState.isX01Variant({
          allowMissing: false,
          allowEmpty: false,
          allowNumeric: true,
        });
      }
      if (expectedVariant === "cricket" && gameState && typeof gameState.isCricketVariant === "function") {
        return gameState.isCricketVariant({
          allowMissing: false,
          allowEmpty: false,
        });
      }
      return false;
    }

    const directMatch = matchMode === "includes"
      ? currentVariant.includes(expectedVariant)
      : currentVariant === expectedVariant || currentVariant.startsWith(`${expectedVariant} `);
    if (directMatch) {
      return true;
    }

    if (expectedVariant === "x01") {
      if (/\b\d+01\b/.test(currentVariant)) {
        return true;
      }

      const gameState = global.autodartsGameStateShared || null;
      if (gameState && typeof gameState.isX01Variant === "function") {
        return gameState.isX01Variant({
          allowMissing: false,
          allowEmpty: false,
          allowNumeric: true,
        });
      }
      return false;
    }

    if (expectedVariant === "cricket") {
      if (currentVariant.startsWith("cricket ")) {
        return true;
      }

      const gameState = global.autodartsGameStateShared || null;
      if (gameState && typeof gameState.isCricketVariant === "function") {
        return gameState.isCricketVariant({
          allowMissing: false,
          allowEmpty: false,
        });
      }
      return false;
    }

    return false;
  }

  function joinCss(...parts) {
    return parts.filter(Boolean).join("");
  }

  function createCssBuilder(options = {}) {
    const {
      fallbackThemeCss = "",
      fallbackLayoutCss = "",
      extraCss = "",
    } = options;

    return () => {
      const design = global.autodartsDesign;
      const themeCss = design?.themeCommonCss ?? fallbackThemeCss;
      const layoutCss = design?.layoutCommonCss ?? fallbackLayoutCss;
      return joinCss(themeCss, layoutCss, extraCss);
    };
  }

  const PREVIEW_SPACE_MANAGER_KEY = "__autodartsThemePreviewSpaceManager";

  function getPreviewSpaceManager() {
    if (global[PREVIEW_SPACE_MANAGER_KEY]) {
      return global[PREVIEW_SPACE_MANAGER_KEY];
    }

    const placements = new Map();
    const knownClasses = new Set();

    function syncPreviewSpace() {
      const turnEl = document.getElementById("ad-ext-turn");
      if (!turnEl) {
        return;
      }

      const activeClasses = new Set();
      placements.forEach((entry) => {
        if (!entry || !entry.className) {
          return;
        }
        if (entry.enabled) {
          activeClasses.add(entry.className);
        }
      });

      knownClasses.forEach((className) => {
        turnEl.classList.toggle(className, activeClasses.has(className));
      });
    }

    const manager = {
      set(instanceId, className, enabled) {
        if (!instanceId || !className) {
          return;
        }
        knownClasses.add(className);
        placements.set(instanceId, {
          className,
          enabled: Boolean(enabled),
        });
        syncPreviewSpace();
      },
      remove(instanceId) {
        if (!instanceId) {
          return;
        }
        placements.delete(instanceId);
        syncPreviewSpace();
      },
      sync: syncPreviewSpace,
    };

    global[PREVIEW_SPACE_MANAGER_KEY] = manager;
    return manager;
  }

  function initPreviewPlacement(options = {}) {
    const {
      variantName,
      matchMode = "equals",
      previewHeightPx = 128,
      previewGapPx = 8,
      previewSpaceClass = "ad-ext-turn-preview-space",
    } = options;

    if (!variantName) {
      return;
    }

    let scheduled = false;
    let observedShadowRoot = null;
    let shadowObserver = null;
    const cardOverrides = new WeakMap();
    let lastCards = [];
    const normalizedVariant = variantName.trim().toLowerCase();
    const previewSpaceManager = getPreviewSpaceManager();
    const previewPlacementId = `preview:${normalizedVariant}:${matchMode}:${previewSpaceClass}`;

    function scheduleUpdate() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updatePlacement();
      });
    }

    function isVariantActive() {
      return isVariantNameActive(normalizedVariant, matchMode);
    }

    function observeShadowRoot(root) {
      if (!root || root === observedShadowRoot) return;
      if (shadowObserver) shadowObserver.disconnect();
      observedShadowRoot = root;
      shadowObserver = new MutationObserver(scheduleUpdate);
      shadowObserver.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }

    function rememberCardStyle(card) {
      if (cardOverrides.has(card)) return;
      cardOverrides.set(card, {
        position: card.style.position,
        left: card.style.left,
        top: card.style.top,
        width: card.style.width,
        height: card.style.height,
        margin: card.style.margin,
        pointerEvents: card.style.pointerEvents,
        zIndex: card.style.zIndex,
      });
    }

    function restoreCardStyle(card) {
      const original = cardOverrides.get(card);
      if (!original) return;
      card.style.position = original.position;
      card.style.left = original.left;
      card.style.top = original.top;
      card.style.width = original.width;
      card.style.height = original.height;
      card.style.margin = original.margin;
      card.style.pointerEvents = original.pointerEvents;
      card.style.zIndex = original.zIndex;
    }

    function resetPlacement() {
      for (const card of lastCards) {
        restoreCardStyle(card);
      }
      lastCards = [];
      setPreviewSpace(false);
    }

    function setPreviewSpace(enabled) {
      previewSpaceManager.set(previewPlacementId, previewSpaceClass, enabled);
    }

    function isEffectivelyHidden(node) {
      let current = node;
      while (current) {
        if (current.nodeType === 11) {
          current = current.host || null;
          continue;
        }
        if (current.nodeType !== 1) {
          current = current.parentNode || null;
          continue;
        }
        const style = window.getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden") {
          return true;
        }
        const opacity = parseFloat(style.opacity);
        if (!Number.isNaN(opacity) && opacity === 0) {
          return true;
        }
        current = current.parentNode || null;
      }
      return false;
    }

    function getPreviewCards(root) {
      const images = Array.from(
        root.querySelectorAll("img[src*=\"/images/board.png\"]")
      );
      const cards = [];
      for (const img of images) {
        const wrapper = img.closest("div");
        const card = wrapper?.parentElement;
        if (!wrapper || !card) continue;
        if (window.getComputedStyle(wrapper).position !== "relative") continue;
        if (window.getComputedStyle(card).overflow !== "hidden") continue;
        if (!cards.includes(card)) {
          cards.push(card);
        }
      }
      return cards;
    }

    function positionCard(card, rect) {
      rememberCardStyle(card);
      card.style.position = "fixed";
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.bottom + previewGapPx}px`;
      card.style.width = `${rect.width}px`;
      card.style.height = `${previewHeightPx}px`;
      card.style.margin = "0";
      card.style.pointerEvents = "none";
      card.style.zIndex = "200";
    }

    function updatePlacement() {
      if (!isVariantActive()) {
        resetPlacement();
        return;
      }

      const zoomEl = document.querySelector("autodarts-tools-zoom");
      if (!zoomEl || isEffectivelyHidden(zoomEl)) {
        resetPlacement();
        return;
      }
      const shadowRoot = zoomEl.shadowRoot;
      if (!shadowRoot) {
        resetPlacement();
        return;
      }
      observeShadowRoot(shadowRoot);

      const throwEls = Array.from(
        document.querySelectorAll("#ad-ext-turn .ad-ext-turn-throw")
      );
      if (!throwEls.length) {
        resetPlacement();
        return;
      }

      const cards = getPreviewCards(shadowRoot);
      if (!cards.length) {
        resetPlacement();
        return;
      }
      const hasVisibleCard = cards.some((card) => !isEffectivelyHidden(card));
      if (!hasVisibleCard) {
        resetPlacement();
        return;
      }

      setPreviewSpace(true);
      lastCards = cards;
      const count = Math.min(cards.length, throwEls.length);
      for (let i = 0; i < count; i += 1) {
        positionCard(cards[i], throwEls[i].getBoundingClientRect());
      }
      for (let i = count; i < cards.length; i += 1) {
        positionCard(cards[i], {
          left: -9999,
          top: -9999,
          bottom: -9999,
          width: 0,
        });
      }
    }

    const documentObserver = new MutationObserver(scheduleUpdate);
    documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    scheduleUpdate();
  }
  function attachTheme(options = {}) {
    const { styleId, variantName, buildCss, matchMode = "equals" } = options;
    if (!styleId || !variantName || typeof buildCss !== "function") {
      return;
    }

    let styleTag;
    let scheduled = false;
    const normalizedVariant = variantName.trim().toLowerCase();

    function resolveStyleContainer() {
      return document.head || document.documentElement || null;
    }

    function ensureStyle(css) {
      const container = resolveStyleContainer();
      if (!styleTag) {
        styleTag = document.getElementById(styleId) || null;
      }
      if (!styleTag) {
        if (!container) {
          return;
        }
        styleTag = document.createElement("style");
        styleTag.id = styleId;
        container.appendChild(styleTag);
      } else if (!styleTag.isConnected && container) {
        container.appendChild(styleTag);
      }
      if (document.head && styleTag.parentElement !== document.head) {
        document.head.appendChild(styleTag);
      }
      if (styleTag && styleTag.textContent !== css) {
        styleTag.textContent = css;
      }
    }
    function removeStyle() {
      if (styleTag) {
        styleTag.remove();
      } else {
        const existing = document.getElementById(styleId);
        if (existing) {
          existing.remove();
        }
      }
      styleTag = null;
    }

    function matchesVariant() {
      return isVariantNameActive(normalizedVariant, matchMode);
    }

    function evaluateAndApply() {
      if (matchesVariant()) {
        ensureStyle(buildCss());
      } else {
        removeStyle();
      }
    }

    function scheduleEvaluation() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        evaluateAndApply();
      });
    }

    evaluateAndApply();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData" ||
          mutation.type === "attributes"
        ) {
          if (
            styleTag &&
            (mutation.target === styleTag ||
              mutation.target.parentElement === styleTag)
          ) {
            continue;
          }
          scheduleEvaluation();
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

    let lastUrl = location.href;
    setInterval(() => {
      const currentUrl = location.href;
      if (currentUrl === lastUrl) {
        return;
      }
      lastUrl = currentUrl;
      scheduleEvaluation();
    }, 1000);
  }

  global.autodartsThemeShared = {
    commonThemeCss,
    commonLayoutCss,
    getVariantName,
    isVariantNameActive,
    joinCss,
    createCssBuilder,
    initPreviewPlacement,
    attachTheme,
  };
})(typeof window !== "undefined" ? window : globalThis);
