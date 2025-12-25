(function (global) {
  "use strict";

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

  function attachTheme(options = {}) {
    const { styleId, variantName, buildCss, matchMode = "equals" } = options;
    if (!styleId || !variantName || typeof buildCss !== "function") {
      return;
    }

    let styleTag;
    let scheduled = false;
    const normalizedVariant = variantName.trim().toLowerCase();

    function ensureStyle(css) {
      if (!styleTag) {
        styleTag =
          document.getElementById(styleId) || document.createElement("style");
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      if (styleTag.textContent !== css) {
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
      const currentVariant = getVariantName();
      return matchMode === "includes"
        ? currentVariant.includes(normalizedVariant)
        : currentVariant === normalizedVariant;
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
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
      }
      scheduleEvaluation();
    }, 1000);
  }

  global.autodartsThemeShared = {
    commonThemeCss,
    commonLayoutCss,
    getVariantName,
    joinCss,
    createCssBuilder,
    attachTheme,
  };
})(typeof window !== "undefined" ? window : globalThis);
