# Autodarts Tampermonkey Themes & Effekte

Reine Visual-Tampermonkey-Skripte fuer https://play.autodarts.io.
Sie veraendern keine Spiel-Logik, Scores oder Erkennung.

## Funktionen

- Theme-Skripte, die sich je Spielvariante automatisch aktivieren
- Gemeinsamer Layout/Theme-Helper fuer konsistentes Styling
- Optionale Animations-/Effekt-Skripte fuer bessere Lesbarkeit
- MutationObserver-basierte Updates fuer dynamische DOM-Aenderungen

## Inhaltsverzeichnis

- [Installation](#installation)
- [Gemeinsamer Helper](#gemeinsamer-helper)
- [Skripte](#skripte)
- [Screenshots und Animationen](#screenshots-und-animationen)
- [Konfiguration](#konfiguration)
- [Credits und Upstream-Lizenz](#credits-und-upstream-lizenz)
- [Lizenz](#lizenz)
- [Haftungsausschluss](#haftungsausschluss)

## Installation

1. Installiere die Tampermonkey-Erweiterung.
2. Oeffne die Raw-Datei des gewuenschten Skripts im Ordner `Template/` oder `Animation/`.
3. Tampermonkey erkennt das Userscript automatisch.
4. Installiere es und lasse Auto-Updates aktiviert.

### Updates

- Tampermonkey aktualisiert installierte Skripte automatisch, wenn die `@updateURL`/`@downloadURL` erreichbar ist.
- Fuer ein manuelles Update: Skript in Tampermonkey oeffnen und auf "Nach Updates suchen" klicken.
- Wenn du ein lokales Skript nutzt, aktualisiere die Datei und speichere sie erneut in Tampermonkey.

## Gemeinsamer Helper

Die Theme-Skripte laden einen gemeinsamen Helper via `@require`:

```
https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
```

Wenn du das Repo forkst oder lokale Dateien nutzt, passe die `@require`-URL entsprechend an.

## Skripte

Die Design-Templates liegen in `Template/`, die Animationen in `Animation/`.

### Themes

#### Autodarts Theme X01 (`Template/Autodarts Theme X01.user.js`)

- Vollstaendiges Layout- und Farb-Theme fuer X01.
- Dunklere Navigation und hervorgehobener aktiver Spieler.
- Aktiviert sich automatisch bei der Variante X01.

#### Autodarts Theme Shanghai (`Template/Autodarts Theme Shanghai.user.js`)

- Gemeinsames Theme plus Grid-Layout fuer Shanghai.
- Aktiviert sich automatisch bei der Variante Shanghai.
- Nutzt den gemeinsamen Helper fuer konsistente Updates.

#### Autodarts Theme Bermuda (`Template/Autodarts Theme Bermuda.user.js`)

- Gemeinsames Theme plus Grid-Layout fuer Bermuda.
- Aktiviert sich automatisch, wenn die Variante Bermuda enthaelt.
- Nutzt den gemeinsamen Helper fuer konsistente Updates.

#### Autodarts Theme Cricket (`Template/Autodarts Theme Cricket.user.js`)

- Leichtgewichtiges Farb-Theme ohne Grid-Layout-Aenderungen.
- Aktiviert sich automatisch bei der Variante Cricket.

### Animationen und Effekte

#### Autodarts Animate Triple (`Animation/Autodarts Animate Triple.user.js`)

- Hebt Triple-, Double- und Bull-Hits mit animierten Farbverlaeufen hervor.
- Unterschiedliche Farbsets je Hit-Typ fuer schnelle Erkennung.

#### Autodarts Animate Checkout (`Animation/Autodarts Animate Checkout.user.js`)

- Pulsiert den aktiven Score, wenn ein Checkout moeglich ist.
- Nutzt den In-Game-Vorschlagsbereich als Trigger.
- Auf X01-Matches begrenzt.

#### Autodarts Animate Score Delta Slide (`Animation/Autodarts Animate Score Delta Slide.user.js`)

- Animiert Turn-Punkte mit einem kurzen Count-up-Tween.
- Verbessert die Lesbarkeit der Score-Aenderungen waehrend eines Turns.

#### Autodarts Animate Average Trend Arrow (`Animation/Autodarts Animate Average Trend Arrow.user.js`)

- Zeigt einen kleinen Auf/Ab-Pfeil neben AVG, wenn es sich aendert.
- Kurze Bounce-Animation zur Trend-Richtung.

#### Autodarts Animate Turn Start Sweep (`Animation/Autodarts Animate Turn Start Sweep.user.js`)

- Kurzer Licht-Sweep ueber dem Player-Block beim Wechsel des aktiven Spielers.
- Nutzt eine MutationObserver-Erkennung auf die aktive Klasse.

#### Autodarts Animate Size Strokes (`Animation/Autodarts Animate Size Strokes.user.js`)

- Passt Marker-Groesse und Fuellfarbe der Darts auf dem Board an.
- Optionaler Pulse/Glow-Effekt fuer bessere Sichtbarkeit.

## Screenshots und Animationen

Alle Medien liegen in `assets/screenshots/`. PNGs sind statisch, GIFs zeigen Bewegung.

### Themes

| Skript         | Vorschau                                                   |
| -------------- | ---------------------------------------------------------- |
| X01 Theme      | ![Theme X01](assets/screenshots/Theme%20X01.png)           |
| Shanghai Theme | ![Theme Shanghai](assets/screenshots/Theme%20Shanghai.png) |
| Bermuda Theme  | ![Theme Bermuda](assets/screenshots/Theme%20Bermuda.png)   |
| Cricket Theme  | ![Theme Cricket](assets/screenshots/Theme%20Cricket.png)   |

### Animationen und Effekte

| Skript                      | Vorschau                                                                       | Detail/Vorher                                                                      |
| --------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Animate Score Delta Slide   | ![Animate Score Delta Slide](assets/screenshots/Score%20Delta%20Slide.gif)     | ![Score Delta Slide detail](assets/screenshots/Score%20Delta%20Slide%20detail.gif) |
| Animate Average Trend Arrow | ![Animate Average Trend Arrow](assets/screenshots/Average%20Trend%20Arrow.png) | -                                                                                  |
| Animate Size Strokes        | ![Animate Size Strokes](assets/screenshots/Size%20Strokes.gif)                 |                                                                                    |

## Konfiguration

Jedes Skript hat einen kleinen Konfigurationsblock nahe am Dateianfang.

- `Animation/Autodarts Animate Score Delta Slide.user.js`
  - `CONFIG.animationMs` steuert die Tween-Dauer.
  - `CONFIG.scoreSelector` steuert, welche Score-Nodes animiert werden.
- `Animation/Autodarts Animate Size Strokes.user.js`
  - `MARKER_RADIUS`, `MARKER_FILL` und `EFFECT` steuern Groesse, Farbe und Effekt.
- `Animation/Autodarts Animate Average Trend Arrow.user.js`
  - `ANIMATION_MS` steuert die Dauer der Arrow-Bounce-Animation.
- `Animation/Autodarts Animate Turn Start Sweep.user.js`
  - `CONFIG.sweepDurationMs` steuert die Sweep-Dauer.
  - `CONFIG.sweepDelayMs` steuert die Verzoegerung vor dem Sweep.
  - `CONFIG.sweepWidth` und `CONFIG.sweepColor` steuern Breite und Farbe.
- `Animation/Autodarts Animate Checkout.user.js`
  - Selektoren und Highlight-Farbe sind am Dateianfang anpassbar.

## Credits und Upstream-Lizenz

Die Themes basieren auf der inventwo Stylebot-Sammlung:
https://github.com/inventwo/Script-Sammlung/tree/main/CSS

Ich habe diese Stylebot-Themes als Basis genommen, fuer Tampermonkey umgeschrieben
und diverse Anpassungen vorgenommen.

Upstream (inventwo): MIT License. Copyright (c) 2025 jkvarel und skvarel von inventwo.

## Lizenz

MIT License

## Haftungsausschluss

Dieses Projekt ist nicht mit Autodarts verbunden.
Aenderungen an play.autodarts.io koennen Skript-Updates erforderlich machen.
