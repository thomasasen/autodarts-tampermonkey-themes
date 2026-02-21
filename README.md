# Autodarts Tampermonkey Themes & Effekte

> Rein visuelle Erweiterungen für Autodarts: bessere Lesbarkeit, klarere Hinweise und optionale Effekte. Keine Änderung an Spiellogik, Scores oder Erkennung.

## Für wen ist das?

Diese Sammlung ist für Spieler, die in Autodarts schneller erfassen wollen, was gerade wichtig ist.
Du kannst Module einzeln aktivieren, kombinieren und direkt in **AD xConfig** anpassen.

## Schnellstart (empfohlen)

1. Tampermonkey installieren: [tampermonkey.net](https://www.tampermonkey.net/index.php?browser=chrome)
2. **AD xConfig Auto Loader** installieren: [Installieren](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Config/AD%20xConfig%20Auto%20Loader.user.js)
3. Falls Tampermonkey einen Injection-Hinweis zeigt, Developer Mode aktivieren: [FAQ Q209](https://www.tampermonkey.net/faq.php#Q209)
4. `https://play.autodarts.io` öffnen oder neu laden
5. Im Hauptmenü **AD xConfig** öffnen
6. Auf **„🔄 Skripte & Loader-Cache laden“** klicken, Module aktivieren und bei Bedarf unter **⚙ Einstellungen** anpassen

![Tampermonkey Injection-Hinweis](assets/tempermonkey-injection.png)

![AD xConfig](assets/AD-xConfig.png)

## Warum nur der Auto Loader?

- Eine zentrale Oberfläche statt vieler einzelner Skripte
- Module und Einstellungen an einem Ort
- Updates und Cache-Fallback automatisch
- Kein doppeltes Laden von Skripten

Wichtig: Wenn `Config/AD xConfig.user.js` bereits direkt installiert ist, bitte deaktivieren oder deinstallieren. Nutze nur den Auto Loader.

## Module im Überblick

Hinweis: In AD xConfig gibt es pro Modul die Buttons **📦 Skript**, **📖 README** und **🛠 Technik**.
Die technische Tiefe findest du in der [TECHNIK-REFERENZ](docs/TECHNIK-REFERENZ.md).

### 🧱 Templates

### Gemeinsamer Helfer (autodarts-theme-shared.js, kein Userscript)

- Gilt für: `X01`, `Shanghai`, `Bermuda`, `Cricket`, `Bull-off`
- Was macht es sichtbar? Das ist der gemeinsame Unterbau für die Theme-Module.
- Einstellungen: Keine eigenen Einstellungen.
- Technische Details: [Gemeinsamer Helfer (Theme)](docs/TECHNIK-REFERENZ.md#gemeinsamer-helfer-autodarts-theme-sharedjs-kein-userscript)

---

<a id="template-autodarts-theme-x01"></a>

### Template: Autodarts Theme X01

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Template/Autodarts%20Theme%20X01.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-x01)

- Gilt für: `X01`
- Was macht es sichtbar? Klarere Struktur für Scores, Spielerkarten und Navigation.
- Wann sinnvoll? Wenn du ein ruhiges, gut lesbares X01-Layout willst.

**Einstellungen einfach erklärt**

- `AVG anzeigen`: Zeigt den AVG-Wert im Theme an oder blendet ihn aus.

**Vorschau**

![Template X01 (xConfig)](assets/template-theme-x01-xConfig.png)

DartsZoom-Vorschau:

![DartsZoom Standard](assets/template-theme-x01-preview-standard-readme.png)
![DartsZoom Under Throws](assets/template-theme-x01-preview-under-throws-readme.png)

---

<a id="template-autodarts-theme-shanghai"></a>

### Template: Autodarts Theme Shanghai

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Template/Autodarts%20Theme%20Shanghai.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-shanghai)

- Gilt für: `Shanghai`
- Was macht es sichtbar? Ordnet die Ansicht klarer und verbessert den Lesefluss.
- Wann sinnvoll? Wenn dir in Shanghai ein aufgeräumteres Layout wichtig ist.

**Einstellungen einfach erklärt**

- `AVG anzeigen`: Zeigt den AVG-Wert im Theme an oder blendet ihn aus.

**Vorschau**

![Template Shanghai (xConfig)](assets/template-theme-shanghai-xConfig.png)

---

<a id="template-autodarts-theme-bermuda"></a>

### Template: Autodarts Theme Bermuda

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Template/Autodarts%20Theme%20Bermuda.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-bermuda)

- Gilt für: `Bermuda`
- Was macht es sichtbar? Bessere Trennung von wichtigen UI-Bereichen.
- Wann sinnvoll? Wenn du Bermuda einfach aktivieren und ohne Feintuning nutzen willst.

**Einstellungen einfach erklärt**

- Keine zusätzlichen Einstellungen.

**Vorschau**

![Template Bermuda (xConfig)](assets/template-theme-bermuda-xConfig.png)

---

<a id="template-autodarts-theme-cricket"></a>

### Template: Autodarts Theme Cricket

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Template/Autodarts%20Theme%20Cricket.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-cricket)

- Gilt für: `Cricket`
- Was macht es sichtbar? Ruhigere Darstellung mit klaren Kontrasten für Cricket.
- Wann sinnvoll? Als Basis in Cricket, besonders in Kombination mit Cricket-Animationen.

**Einstellungen einfach erklärt**

- `AVG anzeigen`: Zeigt den AVG-Wert im Theme an oder blendet ihn aus.

**Vorschau**

![Template Cricket (xConfig)](assets/template-theme-cricket-xConfig.png)

---

<a id="template-autodarts-theme-bull-off"></a>

### Template: Autodarts Theme Bull-off

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Template/Autodarts%20Theme%20Bull-off.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-bull-off)

- Gilt für: `Bull-off`
- Was macht es sichtbar? Klarere Score-Darstellung mit bullfokussierter Farbgebung.
- Wann sinnvoll? Wenn Bull-off auf Distanz besser lesbar sein soll.

**Einstellungen einfach erklärt**

- `Kontrast-Preset`: Legt fest, wie dezent oder kräftig Kontraste dargestellt werden.

**Vorschau**

![Template Bull-off (xConfig)](assets/template-theme-bull-off-xConfig.png)

---

### 🎬 Animationen

### Gemeinsamer Helfer (autodarts-animation-shared.js, kein Userscript)

- Gilt für: alle Animationsmodule
- Was macht es sichtbar? Gemeinsame Basis für Trigger, Beobachtung und robuste Anzeige.
- Einstellungen: Keine eigenen Einstellungen.
- Technische Details: [Gemeinsamer Helfer (Animation)](docs/TECHNIK-REFERENZ.md#gemeinsamer-helfer-autodarts-animation-sharedjs-kein-userscript)

---

<a id="animation-autodarts-animate-triple-double-bull-hits"></a>

### Animation: Autodarts Animate Triple Double Bull Hits

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Triple%20Double%20Bull%20Hits.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-triple-double-bull-hits)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Triple-, Double- und Bull-Treffer springen in der Wurfliste sofort ins Auge.
- Wann sinnvoll? Für Trainingsfokus auf Trefferarten.

**Einstellungen einfach erklärt**

- `Triple hervorheben`
- `Double hervorheben`
- `Bull hervorheben`
- `Aktualisierungsmodus`: Mehr Reaktionsgeschwindigkeit oder mehr Kompatibilität.

**Vorschau**

![Triple Double Bull Hits](assets/animation-animate-triple-double-bull-hits.gif)

---

<a id="animation-autodarts-animate-single-bull-sound"></a>

### Animation: Autodarts Animate Single Bull Sound

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-single-bull-sound)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Kein visuelles Signal, stattdessen ein kurzer Ton bei Single Bull.
- Wann sinnvoll? Wenn du akustisches Feedback möchtest.

**Einstellungen einfach erklärt**

- `Lautstärke`

**Audio-Vorschau**

- Sound-Datei: [singlebull.mp3](assets/singlebull.mp3)

---

<a id="animation-autodarts-animate-checkout-score-pulse"></a>

### Animation: Autodarts Animate Checkout Score Pulse

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Checkout%20Score%20Pulse.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-checkout-score-pulse)

- Gilt für: `X01`
- Was macht es sichtbar? Checkout-fähige Scores werden deutlich hervorgehoben.
- Wann sinnvoll? Wenn du Checkout-Momente schneller erkennen willst.

**Einstellungen einfach erklärt**

- `Effekt`
- `Farbthema`
- `Intensität`
- `Trigger-Quelle`

**Vorschau**

![Checkout Score Pulse](assets/animation-checkout-score-pulse.gif)

---

<a id="animation-autodarts-animate-turn-points-count"></a>

### Animation: Autodarts Animate Turn Points Count

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-turn-points-count)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Punkteänderungen zählen kurz sichtbar hoch oder runter statt hart zu springen.
- Wann sinnvoll? Wenn du Score-Sprünge besser verfolgen willst.

**Einstellungen einfach erklärt**

- `Animationsdauer`

**Vorschau**

![Turn Points Count (xConfig)](assets/animation-turn-points-count-xConfig.gif)

Detailansicht:

![Turn Points Count Detail](assets/animation-turn-points-count-detail-readme.gif)

---

<a id="animation-autodarts-animate-average-trend-arrow"></a>

### Animation: Autodarts Animate Average Trend Arrow

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Average%20Trend%20Arrow.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-average-trend-arrow)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Kurzer Pfeil zeigt direkt am AVG die Trendrichtung.
- Wann sinnvoll? Für schnellen Blick auf Auf- oder Abwärtstrend.

**Einstellungen einfach erklärt**

- `Animationsdauer`
- `Pfeil-Größe`

**Vorschau**

![Average Trend Arrow (xConfig)](assets/animation-average-trend-arrow-xConfig.png)

---

<a id="animation-autodarts-animate-turn-start-sweep"></a>

### Animation: Autodarts Animate Turn Start Sweep

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Turn%20Start%20Sweep.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-turn-start-sweep)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Spielerwechsel wird mit einem kurzen Sweep markiert.
- Wann sinnvoll? Für bessere Orientierung bei schnellen Wechseln.

**Einstellungen einfach erklärt**

- `Sweep-Geschwindigkeit`
- `Sweep-Stil`

**Vorschau**

![Turn Start Sweep (xConfig)](assets/animation-turn-start-sweep-xConfig.gif)

---

<a id="animation-autodarts-animate-remove-darts-notification"></a>

### Animation: Autodarts Animate Remove Darts Notification

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Remove%20Darts%20Notification.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-remove-darts-notification)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Der Hinweis zum Darts-Entfernen wird auffälliger dargestellt.
- Wann sinnvoll? Wenn der Standardhinweis zu unauffällig ist.

**Einstellungen einfach erklärt**

- `Bildgröße`
- `Pulse-Animation`
- `Pulse-Stärke`

**Vorschau**

![Remove Darts Notification (xConfig)](assets/animation-remove-darts-notification-xConfig.png)

---

<a id="animation-autodarts-animate-winner-fireworks"></a>

### Animation: Autodarts Animate Winner Fireworks

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-winner-fireworks)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Sieger-Effekt mit verschiedenen Styles, Farben und Intensitäten.
- Wann sinnvoll? Für mehr Event-Feeling bei Leg- oder Matchgewinn.

**Einstellungen einfach erklärt**

- `Style`: Wählt den Ablauf des Effekts.
- `Farbe`: Wählt die Farbpalette.
- `Intensität`: Steuert Dichte und Dynamik.
- `Test-Button`: Zeigt den aktuell gewählten Effekt sofort als Vorschau, auch im geöffneten xConfig-Fenster im Vordergrund.
- `Bei Bull-Out aktiv`
- `Klick beendet Effekt`

**Vorschau**

![Winner Fireworks](assets/animation-animate-winner-fireworks.gif)

Test-Button in AD xConfig:

![xConfig Test-Button](assets/xConfig-testbutton.png)

---

<a id="animation-autodarts-animate-dart-marker-emphasis"></a>

### Animation: Autodarts Animate Dart Marker Emphasis

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Dart%20Marker%20Emphasis.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-dart-marker-emphasis)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Marker auf dem Board werden deutlicher und kontrastreicher.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Marker-Größe`
- `Marker-Farbe`
- `Effekt`
- `Marker-Sichtbarkeit`
- `Outline-Farbe`

**Vorschau**

![Dart Marker Emphasis (xConfig)](assets/animation-dart-marker-emphasis-xConfig.gif)

---

<a id="animation-autodarts-animate-dart-marker-darts"></a>

### Animation: Autodarts Animate Dart Marker Darts

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Dart%20Marker%20Darts.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-dart-marker-darts)

- Gilt für: `alle Modi`
- Was macht es sichtbar? Treffer werden als Dart-Bilder dargestellt; optional mit Fluganimation.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Dart Design`
- `Dart Fluganimation`
- `Dart-Größe`
- `Original-Marker ausblenden`
- `Fluggeschwindigkeit`

**Vorschau**

![Dart Marker Darts (xConfig)](assets/animation-dart-marker-darts-xConfig.png)

Verfügbare Dart-Designs:

| Datei | Vorschau | Datei | Vorschau |
| :-- | :-- | :-- | :-- |
| `Dart_autodarts.png` | ![Dart_autodarts](assets/Dart_autodarts.png) | `Dart_blackblue.png` | ![Dart_blackblue](assets/Dart_blackblue.png) |
| `Dart_blackgreen.png` | ![Dart_blackgreen](assets/Dart_blackgreen.png) | `Dart_blackred.png` | ![Dart_blackred](assets/Dart_blackred.png) |
| `Dart_blue.png` | ![Dart_blue](assets/Dart_blue.png) | `Dart_camoflage.png` | ![Dart_camoflage](assets/Dart_camoflage.png) |
| `Dart_green.png` | ![Dart_green](assets/Dart_green.png) | `Dart_pride.png` | ![Dart_pride](assets/Dart_pride.png) |
| `Dart_red.png` | ![Dart_red](assets/Dart_red.png) | `Dart_white.png` | ![Dart_white](assets/Dart_white.png) |
| `Dart_whitetrible.png` | ![Dart_whitetrible](assets/Dart_whitetrible.png) | `Dart_yellow.png` | ![Dart_yellow](assets/Dart_yellow.png) |
| `Dart_yellowscull.png` | ![Dart_yellowscull](assets/Dart_yellowscull.png) |  |  |

---

<a id="animation-autodarts-animate-checkout-board-targets"></a>

### Animation: Autodarts Animate Checkout Board Targets

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Checkout%20Board%20Targets.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-checkout-board-targets)

- Gilt für: `X01`
- Was macht es sichtbar? Mögliche Checkout-Ziele werden direkt am Board markiert.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Effekt`
- `Zielumfang`
- `Single-Ring`
- `Farbthema`
- `Kontur-Intensität`

**Vorschau**

![Checkout Board Targets](assets/animation-checkout-board-targets.gif)

---

<a id="animation-autodarts-animate-tv-board-zoom"></a>

### Animation: Autodarts Animate TV Board Zoom

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20TV%20Board%20Zoom.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-tv-board-zoom)

- Gilt für: `X01`
- Was macht es sichtbar? TV-ähnlicher Zoom auf relevante Zielbereiche vor dem dritten Dart.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Zoom-Stufe`
- `Zoom-Geschwindigkeit`
- `Checkout-Zoom`

**Vorschau**

![TV Board Zoom](assets/animation-Autodarts-Animate-TV-Board-Zoom.gif)

---

<a id="animation-autodarts-style-checkout-suggestions"></a>

### Animation: Autodarts Style Checkout Suggestions

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Style%20Checkout%20Suggestions.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-style-checkout-suggestions)

- Gilt für: `X01`
- Was macht es sichtbar? Checkout-Empfehlungen werden klarer, auffälliger und leichter lesbar.
- Wann sinnvoll? Wenn du die Suggestion schneller scannen möchtest.

**Einstellungen einfach erklärt**

- `Stil`
- `Labeltext`
- `Farbthema`

**Vorschau**

![Style Checkout Suggestions (xConfig)](assets/animation-style-checkout-suggestions-xConfig.png)

Formatvarianten:

- ![Checkout Suggestion Format Badge](assets/animation-style-checkout-suggestions-format-badge-readme.png)
- ![Checkout Suggestion Format Ribbon](assets/animation-style-checkout-suggestions-format-ribbon-readme.png)
- ![Checkout Suggestion Format Stripe](assets/animation-style-checkout-suggestions-format-stripe-readme.png)
- ![Checkout Suggestion Format Ticket](assets/animation-style-checkout-suggestions-format-ticket-readme.png)
- ![Checkout Suggestion Format Outline](assets/animation-style-checkout-suggestions-format-outline-readme.png)

---

<a id="animation-autodarts-animate-cricket-target-highlighter"></a>

### Animation: Autodarts Animate Cricket Target Highlighter

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-cricket-target-highlighter)

- Gilt für: `Cricket`
- Was macht es sichtbar? Zielzustände im Cricket werden als Overlay am Board sichtbar.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Dead-Ziele anzeigen`
- `Farbthema`
- `Intensität`

**Vorschau**

![Cricket Target Highlighter (xConfig)](assets/animation-cricket-target-highlighter-xConfig.png)

---

<a id="animation-autodarts-animate-cricket-grid-fx"></a>

### Animation: Autodarts Animate Cricket Grid FX

[![📦 Skript](https://img.shields.io/badge/%F0%9F%93%A6%20Skript-%C3%96ffnen-1f6feb?style=for-the-badge)](Animation/Autodarts%20Animate%20Cricket%20Grid%20FX.user.js)
[![🛠 Technik-Referenz](https://img.shields.io/badge/%F0%9F%9B%A0%20Technik-Referenz-0ea5e9?style=for-the-badge)](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-cricket-grid-fx)

- Gilt für: `Cricket`
- Was macht es sichtbar? Zusätzliche Live-Effekte in der Cricket-Matrix für schnellere Orientierung.
- Hinweis: Läuft in Kombination mit dem Cricket-Theme am sinnvollsten.

**Einstellungen einfach erklärt**

- Alle Effekte sind einzeln ein- oder ausschaltbar.
- Starte am besten mit Standardwerten und aktiviere nur, was dir im Spiel wirklich hilft.

**Vorschau**

![Autodarts Animate Cricket Grid FX](assets/Autodarts-Animate-Cricket-Grid-FX.png)

---

## FAQ

**Muss ich einzelne Skripte separat installieren?**

Nein. Empfohlen ist nur der **AD xConfig Auto Loader**.
Danach aktivierst und konfigurierst du alles zentral in AD xConfig.

**Wo finde ich technische Details und interne Variablen?**

In der [Technischen Referenz](docs/TECHNIK-REFERENZ.md).

## Fehler und Feedback

- Fehler melden: [GitHub Issues](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues)
- Bug-Formular: [Bug melden](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%90%9E-bug-melden.md)
- Feature-Wünsche: [Feature vorschlagen](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%92%A1-feature-vorschlagen.md)
- Diskussionen: [GitHub Discussions](https://github.com/thomasasen/autodarts-tampermonkey-themes/discussions)

## Danksagung

Die Themes basieren auf der [inventwo-Stylebot-Sammlung](https://github.com/inventwo/Script-Sammlung/tree/main/CSS).

## Lizenz

[MIT-Lizenz](https://opensource.org/licenses/MIT)

## Haftungsausschluss

Nutzung auf eigene Verantwortung.
Änderungen an [play.autodarts.io](https://play.autodarts.io) können Skript-Updates erforderlich machen.
