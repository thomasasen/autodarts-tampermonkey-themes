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

![AD xConfig](assets/AD-xConfig.png)

## Warum nur der Auto Loader?

- Eine zentrale Oberfläche statt vieler einzelner Skripte
- Module und Einstellungen an einem Ort
- Updates und Cache-Fallback automatisch
- Kein doppeltes Laden von Skripten

Wichtig: Wenn `Config/AD xConfig.user.js` bereits direkt installiert ist, bitte deaktivieren oder deinstallieren. Nutze nur den Auto Loader.

## Module im Überblick

Hinweis: Der Button `📖 Anleitung` in AD xConfig springt direkt in die passenden Abschnitte dieser README.
Für technische Hintergründe verlinkt jeder Abschnitt in die `docs/TECHNIK-REFERENZ.md`.

### 🧱 Templates

### Gemeinsamer Helfer (autodarts-theme-shared.js, kein Userscript)

- Gilt für: `X01`, `Shanghai`, `Bermuda`, `Cricket`, `Bull-off`
- Was macht es sichtbar? Das ist der gemeinsame Unterbau für die Theme-Module.
- Einstellungen: Keine eigenen Einstellungen.
- Technische Details: [Gemeinsamer Helfer (Theme)](docs/TECHNIK-REFERENZ.md#gemeinsamer-helfer-autodarts-theme-sharedjs-kein-userscript)

---

### Template: Autodarts Theme X01

- Gilt für: `X01`
- Was macht es sichtbar? Klarere Struktur für Scores, Spielerkarten und Navigation.
- Wann sinnvoll? Wenn du ein ruhiges, gut lesbares X01-Layout willst.

**Einstellungen einfach erklärt**

- `AVG anzeigen`: Zeigt den AVG-Wert im Theme an oder blendet ihn aus.

**Technische Details**

- [Template: Autodarts Theme X01](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-x01)

---

### Template: Autodarts Theme Shanghai

- Gilt für: `Shanghai`
- Was macht es sichtbar? Ordnet die Ansicht klarer und verbessert den Lesefluss.
- Wann sinnvoll? Wenn dir in Shanghai ein aufgeräumteres Layout wichtig ist.

**Einstellungen einfach erklärt**

- `AVG anzeigen`: Zeigt den AVG-Wert im Theme an oder blendet ihn aus.

**Technische Details**

- [Template: Autodarts Theme Shanghai](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-shanghai)

---

### Template: Autodarts Theme Bermuda

- Gilt für: `Bermuda`
- Was macht es sichtbar? Bessere Trennung von wichtigen UI-Bereichen.
- Wann sinnvoll? Wenn du Bermuda einfach aktivieren und ohne Feintuning nutzen willst.

**Einstellungen einfach erklärt**

- Keine zusätzlichen Einstellungen.

**Technische Details**

- [Template: Autodarts Theme Bermuda](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-bermuda)

---

### Template: Autodarts Theme Cricket

- Gilt für: `Cricket`
- Was macht es sichtbar? Ruhigere Darstellung mit klaren Kontrasten für Cricket.
- Wann sinnvoll? Als Basis in Cricket, besonders in Kombination mit Cricket-Animationen.

**Einstellungen einfach erklärt**

- `AVG anzeigen`: Zeigt den AVG-Wert im Theme an oder blendet ihn aus.

**Technische Details**

- [Template: Autodarts Theme Cricket](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-cricket)

---

### Template: Autodarts Theme Bull-off

- Gilt für: `Bull-off`
- Was macht es sichtbar? Klarere Score-Darstellung mit bullfokussierter Farbgebung.
- Wann sinnvoll? Wenn Bull-off auf Distanz besser lesbar sein soll.

**Einstellungen einfach erklärt**

- `Kontrast-Preset`: Legt fest, wie dezent oder kräftig Kontraste dargestellt werden.

**Technische Details**

- [Template: Autodarts Theme Bull-off](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-bull-off)

---

### 🎬 Animationen

### Gemeinsamer Helfer (autodarts-animation-shared.js, kein Userscript)

- Gilt für: alle Animationsmodule
- Was macht es sichtbar? Gemeinsame Basis für Trigger, Beobachtung und robuste Anzeige.
- Einstellungen: Keine eigenen Einstellungen.
- Technische Details: [Gemeinsamer Helfer (Animation)](docs/TECHNIK-REFERENZ.md#gemeinsamer-helfer-autodarts-animation-sharedjs-kein-userscript)

---

### Animation: Autodarts Animate Triple Double Bull Hits

- Gilt für: `alle Modi`
- Was macht es sichtbar? Triple-, Double- und Bull-Treffer springen in der Wurfliste sofort ins Auge.
- Wann sinnvoll? Für Trainingsfokus auf Trefferarten.

**Einstellungen einfach erklärt**

- `Triple hervorheben`
- `Double hervorheben`
- `Bull hervorheben`
- `Aktualisierungsmodus`: Mehr Reaktionsgeschwindigkeit oder mehr Kompatibilität.

**Technische Details**

- [Animation: Autodarts Animate Triple Double Bull Hits](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-triple-double-bull-hits)

---

### Animation: Autodarts Animate Single Bull Sound

- Gilt für: `alle Modi`
- Was macht es sichtbar? Kein visuelles Signal, stattdessen ein kurzer Ton bei Single Bull.
- Wann sinnvoll? Wenn du akustisches Feedback möchtest.

**Einstellungen einfach erklärt**

- `Lautstärke`

**Technische Details**

- [Animation: Autodarts Animate Single Bull Sound](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-single-bull-sound)

---

### Animation: Autodarts Animate Checkout Score Pulse

- Gilt für: `X01`
- Was macht es sichtbar? Checkout-fähige Scores werden deutlich hervorgehoben.
- Wann sinnvoll? Wenn du Checkout-Momente schneller erkennen willst.

**Einstellungen einfach erklärt**

- `Effekt`
- `Farbthema`
- `Intensität`
- `Trigger-Quelle`

**Technische Details**

- [Animation: Autodarts Animate Checkout Score Pulse](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-checkout-score-pulse)

---

### Animation: Autodarts Animate Turn Points Count

- Gilt für: `alle Modi`
- Was macht es sichtbar? Punkteänderungen zählen kurz sichtbar hoch oder runter statt hart zu springen.
- Wann sinnvoll? Wenn du Score-Sprünge besser verfolgen willst.

**Einstellungen einfach erklärt**

- `Animationsdauer`

**Technische Details**

- [Animation: Autodarts Animate Turn Points Count](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-turn-points-count)

---

### Animation: Autodarts Animate Average Trend Arrow

- Gilt für: `alle Modi`
- Was macht es sichtbar? Kurzer Pfeil zeigt direkt am AVG die Trendrichtung.
- Wann sinnvoll? Für schnellen Blick auf Auf-/Abwärtstrend.

**Einstellungen einfach erklärt**

- `Animationsdauer`
- `Pfeil-Größe`

**Technische Details**

- [Animation: Autodarts Animate Average Trend Arrow](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-average-trend-arrow)

---

### Animation: Autodarts Animate Turn Start Sweep

- Gilt für: `alle Modi`
- Was macht es sichtbar? Spielerwechsel wird mit einem kurzen Sweep markiert.
- Wann sinnvoll? Für bessere Orientierung bei schnellen Wechseln.

**Einstellungen einfach erklärt**

- `Sweep-Geschwindigkeit`
- `Sweep-Stil`

**Technische Details**

- [Animation: Autodarts Animate Turn Start Sweep](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-turn-start-sweep)

---

### Animation: Autodarts Animate Remove Darts Notification

- Gilt für: `alle Modi`
- Was macht es sichtbar? Der Hinweis zum Darts-Entfernen wird auffälliger dargestellt.
- Wann sinnvoll? Wenn der Standardhinweis zu unauffällig ist.

**Einstellungen einfach erklärt**

- `Bildgröße`
- `Pulse-Animation`
- `Pulse-Stärke`

**Technische Details**

- [Animation: Autodarts Animate Remove Darts Notification](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-remove-darts-notification)

---

### Animation: Autodarts Animate Winner Fireworks

- Gilt für: `alle Modi`
- Was macht es sichtbar? Sieger-Effekt mit verschiedenen Styles, Farben und Intensitäten.
- Wann sinnvoll? Für mehr Event-Feeling bei Leg-/Match-Gewinn.

**Einstellungen einfach erklärt**

- `Style`: Wählt den Ablauf des Effekts.
- `Farbe`: Wählt die Farbpalette.
- `Intensität`: Steuert Dichte und Dynamik.
- `Test-Button`: Zeigt den Effekt sofort als Vorschau mit den aktuellen Einstellungen.
- `Bei Bull-Out aktiv`
- `Klick beendet Effekt`

**Technische Details**

- [Animation: Autodarts Animate Winner Fireworks](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-winner-fireworks)

---

### Animation: Autodarts Animate Dart Marker Emphasis

- Gilt für: `alle Modi`
- Was macht es sichtbar? Marker auf dem Board werden deutlicher und kontrastreicher.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Marker-Größe`
- `Marker-Farbe`
- `Effekt`
- `Marker-Sichtbarkeit`
- `Outline-Farbe`

**Technische Details**

- [Animation: Autodarts Animate Dart Marker Emphasis](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-dart-marker-emphasis)

---

### Animation: Autodarts Animate Dart Marker Darts

- Gilt für: `alle Modi`
- Was macht es sichtbar? Treffer werden als Dart-Bilder statt Standardmarker dargestellt.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Dart Design`
- `Dart Fluganimation`
- `Dart-Größe`
- `Original-Marker ausblenden`
- `Fluggeschwindigkeit`

**Technische Details**

- [Animation: Autodarts Animate Dart Marker Darts](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-dart-marker-darts)

---

### Animation: Autodarts Animate Checkout Board Targets

- Gilt für: `X01`
- Was macht es sichtbar? Mögliche Checkout-Ziele direkt auf dem Board.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Effekt`
- `Zielumfang`
- `Single-Ring`
- `Farbthema`
- `Kontur-Intensität`

**Technische Details**

- [Animation: Autodarts Animate Checkout Board Targets](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-checkout-board-targets)

---

### Animation: Autodarts Animate TV Board Zoom

- Gilt für: `X01`
- Was macht es sichtbar? TV-ähnlicher Zoom auf relevante Zielbereiche vor Dart 3.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Zoom-Stufe`
- `Zoom-Geschwindigkeit`
- `Checkout-Zoom`

**Technische Details**

- [Animation: Autodarts Animate TV Board Zoom](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-tv-board-zoom)

---

### Animation: Autodarts Style Checkout Suggestions

- Gilt für: `X01`
- Was macht es sichtbar? Checkout-Empfehlungen werden klarer und schneller erfassbar dargestellt.
- Wann sinnvoll? Wenn Empfehlungen sofort ins Auge fallen sollen.

**Einstellungen einfach erklärt**

- `Stil`
- `Labeltext`
- `Farbthema`

**Technische Details**

- [Animation: Autodarts Style Checkout Suggestions](docs/TECHNIK-REFERENZ.md#animation-autodarts-style-checkout-suggestions)

---

### Animation: Autodarts Animate Cricket Target Highlighter

- Gilt für: `Cricket`
- Was macht es sichtbar? Zielzustände wie Score/Danger/Dead direkt auf dem Board.
- Wichtig: Funktioniert nur mit dem **virtuellen Dartboard**, nicht mit dem **Live Dartboard**.

**Einstellungen einfach erklärt**

- `Dead-Ziele anzeigen`
- `Farbthema`
- `Intensität`

**Technische Details**

- [Animation: Autodarts Animate Cricket Target Highlighter](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-cricket-target-highlighter)

---

### Animation: Autodarts Animate Cricket Grid FX

- Gilt für: `Cricket`
- Was macht es sichtbar? Zusätzliche Live-Effekte in der Cricket-Matrix für schnellere Orientierung.
- Hinweis: Läuft in Kombination mit dem Cricket-Theme am sinnvollsten.

**Einstellungen einfach erklärt**

- Alle Effekte sind einzeln ein-/ausschaltbar (z. B. `Row Rail Pulse`, `Threat Edge`, `Delta Chips`).
- Starte am besten mit Standardwerten und aktiviere nur, was dir im Spiel wirklich hilft.

**Technische Details**

- [Animation: Autodarts Animate Cricket Grid FX](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-cricket-grid-fx)

---

## FAQ

**Muss ich einzelne Skripte separat installieren?**
Nein. Installiere nur den `AD xConfig Auto Loader`.

**Bleiben meine Einstellungen erhalten?**
Ja, solange Browser-/Tampermonkey-Daten nicht automatisch gelöscht werden.

**Warum sehe ich ein Modul nicht?**
Prüfe, ob das Modul für deine Spielvariante freigegeben ist und ob es in AD xConfig auf `An` steht.

**Wo finde ich technische Details?**
In der [Technischen Referenz](docs/TECHNIK-REFERENZ.md).

## Fehler und Feedback

- Fehler melden: [GitHub Issues](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues)
- Bug-Formular: [Bug melden](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%90%9E-bug-melden.md)
- Feature-Wünsche: [Feature vorschlagen](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%92%A1-feature-vorschlagen.md)
- Diskussionen: [GitHub Discussions](https://github.com/thomasasen/autodarts-tampermonkey-themes/discussions)

## Danksagung

Die Themes basieren auf der [inventwo-Stylebot-Sammlung](https://github.com/inventwo/Script-Sammlung/tree/main/CSS).
Upstream (inventwo): MIT-Lizenz. Copyright (c) 2025 jkvarel und skvarel von inventwo.

## Lizenz

[MIT-Lizenz](https://opensource.org/licenses/MIT)

## Haftungsausschluss

Dieses Projekt ist nicht mit Autodarts verbunden.
Änderungen an [play.autodarts.io](https://play.autodarts.io) können Skript-Updates erforderlich machen.
