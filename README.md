# Autodarts Tampermonkey Themes & Effekte

Reine Visual-Tampermonkey-Skripte für https://play.autodarts.io.
Sie verändern keine Spiellogik, Scores oder Erkennung.

## Funktionen

- Theme-Skripte, die sich je Spielvariante automatisch aktivieren.
- Gemeinsamer Layout-/Theme-Helfer für konsistentes Styling.
- Optionale Animations- und Effekt-Skripte für bessere Lesbarkeit.
- MutationObserver-basierte Updates für dynamische DOM-Änderungen.

## Inhaltsverzeichnis

- [Installation](#installation)
- [Aktualisierungen](#aktualisierungen)
- [Gemeinsamer Helfer](#gemeinsamer-helfer)
- [Skripte](#skripte)
- [Screenshots und Animationen](#screenshots-und-animationen)
- [Konfiguration](#konfiguration)
- [Fehler und Feedback](#fehler-und-feedback)
- [Hinweis zur Nutzung und Testumgebung](#hinweis-zur-nutzung-und-testumgebung)
- [Danksagung und Upstream-Lizenz](#danksagung-und-upstream-lizenz)
- [Lizenz](#lizenz)
- [Haftungsausschluss](#haftungsausschluss)

## Installation

1. Installiere die Tampermonkey-Erweiterung.
2. Öffne die Raw-Datei des gewünschten Skripts im Ordner `Template/` oder `Animation/`.
3. Tampermonkey erkennt das Userscript automatisch.
4. Installiere es und lasse automatische Updates aktiviert.

### Aktualisierungen

- Tampermonkey aktualisiert installierte Skripte automatisch, wenn `@updateURL`/`@downloadURL` erreichbar sind.
- Für ein manuelles Update: Skript in Tampermonkey öffnen und auf "Nach Updates suchen" klicken.
- Wenn du ein lokales Skript nutzt, aktualisiere die Datei und speichere sie erneut in Tampermonkey.

## Gemeinsamer Helfer

Die Theme-Skripte laden einen gemeinsamen Helfer per `@require`:

```
https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
```

Wenn du das Repo forkst oder lokale Dateien nutzt, passe die `@require`-URL entsprechend an.

## Skripte

Die Design-Vorlagen liegen in `Template/`, die Animationen in `Animation/`.

### Themes

#### Autodarts Theme X01 (`Template/Autodarts Theme X01.user.js`)

- Zweck: Vollstaendiges Layout- und Farb-Theme fuer X01 (Board, Player-Karten, Navigation).
- Aktivierung: Variante `x01` (liest `#ad-ext-game-variant` ueber den Shared Helper).
- Aenderungen: setzt CSS-Variablen, Layout-Grid und Schriftgroessen fuer X01.
- Konfiguration: passe `fallbackThemeCss`, `fallbackLayoutCss` oder `navigationOverride` im Script an.

#### Autodarts Theme Shanghai (`Template/Autodarts Theme Shanghai.user.js`)

- Zweck: Gemeinsames Theme plus Grid-Layout fuer Shanghai.
- Aktivierung: Variante `shanghai` (via `#ad-ext-game-variant`).
- Aenderungen: nutzt `commonThemeCss` und `commonLayoutCss` aus `Template/autodarts-theme-shared.js`.
- Konfiguration: Farben/Layout im Shared Helper anpassen.

#### Autodarts Theme Bermuda (`Template/Autodarts Theme Bermuda.user.js`)

- Zweck: Gemeinsames Theme plus Grid-Layout fuer Bermuda.
- Aktivierung: Variante enthaelt `bermuda` (matchMode "includes").
- Aenderungen: nutzt `commonThemeCss` und `commonLayoutCss`.
- Konfiguration: Farben/Layout im Shared Helper anpassen.

#### Autodarts Theme Cricket (`Template/Autodarts Theme Cricket.user.js`)

- Zweck: Leichtgewichtiges Farb-Theme fuer Cricket ohne Grid-Layout-Aenderungen.
- Aktivierung: Variante `cricket`.
- Aenderungen: setzt Farben und kleinere UI-Anpassungen.
- Konfiguration: CSS in `customCss` anpassen.

### Animationen und Effekte

#### Autodarts Animate Triple Double Bull Hits (`Animation/Autodarts Animate Triple Double Bull Hits.user.js`)

- Zweck: hebt Triple/Double/Bull-Treffer in der Wurfliste hervor (Gradient + Highlight).
- Trigger/Erkennung: liest Wurfzeilen via `CONFIG.selectors.throwText`, erkennt `Txx`, `Dxx` oder `BULL`; MutationObserver plus optionales Polling.
- Aenderungen: setzt Klassen auf der Wurfzeile und markiert den Text per `<span>`.
- Konfiguration: `CONFIG.pollIntervalMs`, `CONFIG.selectors`, `CONFIG.hitTypes`, `CONFIG.bull`, `CONFIG.defaultGradientStops`.

#### Autodarts Animate Single Bull Sound (`Animation/Autodarts Animate Single Bull Sound.user.js`)

- Zweck: spielt einen Sound, wenn ein Single Bull (25/BULL) in der Wurfliste erscheint.
- Trigger/Erkennung: beobachtet `.ad-ext-turn-throw` und erkennt 25+BULL im Text/DOM.
- Hinweis: In den "Tools für Autodarts" gibt es keinen zuverlässigen Trigger für "Single Bull" (S25). Es wird in der Dokumentation beschrieben, feuert im Spiel aber nicht. Dieses Skript erkennt Single Bull direkt in der Wurfliste und funktioniert damit.
- Konfiguration: `CONFIG.soundUrl` (URL zur Sounddatei), `CONFIG.volume`, `CONFIG.cooldownMs`, `CONFIG.pollIntervalMs`.

#### Autodarts Animate Checkout Score Pulse (`Animation/Autodarts Animate Checkout Score Pulse.user.js`)

- Zweck: hebt den aktiven Restscore hervor, wenn ein Checkout moeglich ist (X01).
- Trigger/Erkennung: bevorzugt `.suggestion`-Text, faellt auf Score-Logik zurueck; Variante via `#ad-ext-game-variant`.
- Aenderungen: setzt Klassen am Score-Element und animiert per CSS.
- Konfiguration: `EFFECT`, `PULSE_COLOR`, `IMPOSSIBLE_CHECKOUTS`, `SUGGESTION_SELECTOR`, `SCORE_SELECTOR`.

#### Autodarts Animate Turn Points Count (`Animation/Autodarts Animate Turn Points Count.user.js`)

- Zweck: animiert die Turn-Punkte als kurzes Count-up/down.
- Trigger/Erkennung: Textaenderung an `CONFIG.scoreSelector`.
- Aenderungen: schreibt waehrend der Animation Zwischenwerte in die Anzeige.
- Konfiguration: `CONFIG.scoreSelector`, `CONFIG.animationMs`.

#### Autodarts Animate Average Trend Arrow (`Animation/Autodarts Animate Average Trend Arrow.user.js`)

- Zweck: zeigt einen Auf/Ab-Pfeil neben dem AVG bei Aenderung.
- Trigger/Erkennung: beobachtet `AVG_SELECTOR` (AVG-Text).
- Aenderungen: fuegt Pfeil-Span ein und toggelt Klassen/Animation.
- Konfiguration: `AVG_SELECTOR`, `ANIMATION_MS`.

#### Autodarts Animate Turn Start Sweep (`Animation/Autodarts Animate Turn Start Sweep.user.js`)

- Zweck: kurzer Licht-Sweep beim Wechsel des aktiven Spielers.
- Trigger/Erkennung: Klassenwechsel an `.ad-ext-player-active`.
- Aenderungen: fuegt eine Sweep-Klasse am aktiven Player-Block hinzu (Pseudo-Element).
- Konfiguration: `CONFIG.activeSelector`, `CONFIG.sweepDurationMs`, `CONFIG.sweepDelayMs`, `CONFIG.sweepWidth`, `CONFIG.sweepColor`.

#### Autodarts Animate Winner Fireworks (`Animation/Autodarts Animate Winner Fireworks.user.js`)

- Zweck: Overlay-Effekt bei Gewinner (Firework, Confetti, Aurora oder Pulse).
- Trigger/Erkennung: Sichtbarkeit von `CONFIG.winnerSelector`.
- Aenderungen: Fullscreen-Canvas-Overlay, Klick blendet aus.
- Konfiguration: `CONFIG.effect`, `CONFIG.winnerSelector`, `CONFIG.colors` sowie Timing/Particle-Parameter.

#### Autodarts Animate Dart Marker Emphasis (`Animation/Autodarts Animate Dart Marker Emphasis.user.js`)

- Zweck: Dart-Marker am Board groesser/faerben, optional glow/pulse.
- Trigger/Erkennung: SVG-Marker via `MARKER_SELECTOR`.
- Aenderungen: setzt `r`, `fill` und Klassen auf Marker.
- Konfiguration: `MARKER_RADIUS`, `MARKER_FILL`, `EFFECT`, `MARKER_SELECTOR`.

#### Autodarts Animate Checkout Board Targets (`Animation/Autodarts Animate Checkout Board Targets.user.js`)

- Zweck: markiert Checkout-Ziele auf dem Board (blink/pulse/glow).
- Trigger/Erkennung: parst `.suggestion` in X01, Variantencheck via `CONFIG.requireX01`.
- Aenderungen: legt ein Overlay-SVG mit Ziel-Segmenten an.
- Konfiguration: `CONFIG.effect`, `CONFIG.highlightTargets`, `CONFIG.singleRing`, `CONFIG.color`, `CONFIG.strokeColor`, `CONFIG.animationMs`.

#### Autodarts Style Checkout Suggestions (`Animation/Autodarts Style Checkout Suggestions.user.js`)

- Zweck: stylt Checkout-Vorschlaege als Empfehlung (Badge/Ribbon/Stripe/Ticket/Outline).
- Trigger/Erkennung: `.suggestion`, X01.
- Aenderungen: setzt Klassen und CSS-Variablen am Vorschlags-Element.
- Konfiguration: `CONFIG.formatStyle`, `CONFIG.labelText`, `CONFIG.accent*`, `CONFIG.label*`, `CONFIG.borderRadiusPx`, `CONFIG.stripeOpacity`.

#### Autodarts Animate Cricket Target Highlighter (`Animation/Autodarts Animate Cricket Target Highlighter.user.js`)

- Zweck: blendet Nicht-Cricket-Felder aus und markiert 15-20/BULL nach Status.
- Trigger/Erkennung: Variante `cricket`, liest Cricket-Tabelle (Marks via Icons/Attribute/Text).
- Aenderungen: Overlay-SVG mit Statusfarben (open/closed/score/danger/dead).
- Konfiguration: `CONFIG.tableSelector`, `CONFIG.showDeadTargets`, `CONFIG.baseColor`, `CONFIG.opacity`, `CONFIG.highlight`, `CONFIG.ringRatios`, `CONFIG.debug`.

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

| Skript                         | Vorschau                                                                             | Detail/Vorher                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Animate Turn Points Count      | ![Animate Turn Points Count](assets/screenshots/Score%20Delta%20Slide.gif)           | ![Score Delta Slide detail](assets/screenshots/Score%20Delta%20Slide%20detail.gif) |
| Animate Average Trend Arrow    | ![Animate Average Trend Arrow](assets/screenshots/Average%20Trend%20Arrow.png)       | -                                                                                  |
| Animate Checkout Board Targets | ![Animate Checkout Board Targets](assets/screenshots/Checkout%20Board%20Blink.gif)   | -                                                                                  |
| Animate Turn Start Sweep       | ![Animate Turn Start Sweep](assets/screenshots/Turn%20Start%20Sweep.gif)             | -                                                                                  |
| Animate Winner Fireworks       | ![Animate Winner Fireworks](assets/screenshots/Winner%20Fireworks_firework.gif)      | Varianten siehe unten                                                              |
| Animate Dart Marker Emphasis   | ![Animate Dart Marker Emphasis](assets/screenshots/Size%20Strokes.gif)               | -                                                                                  |
| Cricket Target Highlighter     | ![Cricket Target Highlighter](assets/screenshots/Cricket%20Target%20Highlighter.png) | -                                                                                  |

#### Winner Fireworks Varianten

| Aurora                                                                       | Confetti                                                                         | Firework                                                                         | Pulse                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![Winner Fireworks Aurora](assets/screenshots/Winner%20Fireworks_aurora.gif) | ![Winner Fireworks Confetti](assets/screenshots/Winner%20Fireworks_confetti.gif) | ![Winner Fireworks Firework](assets/screenshots/Winner%20Fireworks_firework.gif) | ![Winner Fireworks Pulse](assets/screenshots/Winner%20Fireworks_pulse.gif) |

#### Checkout Suggestion Styles

Das Vollbild zeigt die Ribbon-Variante, die restlichen Bilder sind Detailstreifen der anderen Stile.

| Vollbild (Ribbon)                                                                                         | Varianten (Badge, Stripe, Ticket, Outline)                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![Checkout Suggestion Format Ribbon](assets/screenshots/Checkout%20Suggestion%20Format%2000%20ribbon.png) | ![Checkout Suggestion Format Badge](assets/screenshots/Checkout%20Suggestion%20Format%2001%20badge.png)<br>![Checkout Suggestion Format Stripe](assets/screenshots/Checkout%20Suggestion%20Format%2002%20stripe.png)<br>![Checkout Suggestion Format Ticket](assets/screenshots/Checkout%20Suggestion%20Format%2003%20ticket.png)<br>![Checkout Suggestion Format Outline](assets/screenshots/Checkout%20Suggestion%20Format%2004%20outline.png) |

## Konfiguration

Jedes Skript hat seinen Konfigurationsblock nahe am Dateianfang. Aendere nur die Variablen im jeweiligen Script und lade es in Tampermonkey neu. Die Tabellen erklaeren, was sich bei einer Aenderung auswirkt.

### Template/Autodarts Theme X01.user.js

| Variable             | Standard                     | Wirkung                                                               |
| -------------------- | ---------------------------- | --------------------------------------------------------------------- |
| `STYLE_ID`           | `autodarts-x01-custom-style` | Eindeutige Style-ID; bei Aenderung bleiben alte Styles ggf. bestehen. |
| `VARIANT_NAME`       | `x01`                        | Aktivierung ueber den Varianten-Text in `#ad-ext-game-variant`.       |
| `fallbackThemeCss`   | CSS-Block                    | Fallback-Farben/Typografie, falls der Shared Helper fehlt.            |
| `fallbackLayoutCss`  | CSS-Block                    | Fallback-Layout fuer X01.                                             |
| `navigationOverride` | CSS-Block                    | Erzwingt die dunkle Navigation in X01.                                |

### Template/Autodarts Theme Shanghai.user.js

| Variable            | Standard                          | Wirkung                                                         |
| ------------------- | --------------------------------- | --------------------------------------------------------------- |
| `STYLE_ID`          | `autodarts-shanghai-custom-style` | Eindeutige Style-ID fuer das Theme.                             |
| `VARIANT_NAME`      | `shanghai`                        | Aktivierung ueber den Varianten-Text in `#ad-ext-game-variant`. |
| `fallbackThemeCss`  | `commonThemeCss`                  | Farben aus dem Shared Helper als Fallback.                      |
| `fallbackLayoutCss` | `commonLayoutCss`                 | Layout-Grid aus dem Shared Helper als Fallback.                 |

### Template/Autodarts Theme Bermuda.user.js

| Variable            | Standard                         | Wirkung                                                          |
| ------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `STYLE_ID`          | `autodarts-bermuda-custom-style` | Eindeutige Style-ID fuer das Theme.                              |
| `VARIANT_NAME`      | `bermuda`                        | Aktivierung ueber den Varianten-Text in `#ad-ext-game-variant`.  |
| `matchMode`         | `includes`                       | Aktiviert das Theme, wenn der Varianten-Text `bermuda` enthaelt. |
| `fallbackThemeCss`  | `commonThemeCss`                 | Farben aus dem Shared Helper als Fallback.                       |
| `fallbackLayoutCss` | `commonLayoutCss`                | Layout-Grid aus dem Shared Helper als Fallback.                  |

### Template/Autodarts Theme Cricket.user.js

| Variable       | Standard                         | Wirkung                                                         |
| -------------- | -------------------------------- | --------------------------------------------------------------- |
| `STYLE_ID`     | `autodarts-cricket-custom-style` | Eindeutige Style-ID fuer das Theme.                             |
| `VARIANT_NAME` | `cricket`                        | Aktivierung ueber den Varianten-Text in `#ad-ext-game-variant`. |
| `customCss`    | CSS-Block                        | Farben/Abstaende speziell fuer Cricket.                         |

### Animation/Autodarts Animate Triple Double Bull Hits.user.js

| Variable                      | Standard                           | Wirkung                                             |
| ----------------------------- | ---------------------------------- | --------------------------------------------------- |
| `CONFIG.pollIntervalMs`       | `3000`                             | Zusaetzliches Polling; `0` deaktiviert Polling.     |
| `CONFIG.selectors.throwRow`   | `.ad-ext-turn-throw`               | Zielzeile fuer Klassen und Gradient.                |
| `CONFIG.selectors.throwText`  | `.ad-ext-turn-throw p.chakra-text` | Textquelle fuer Treffererkennung.                   |
| `CONFIG.selectors.textNode`   | `p.chakra-text`                    | Filter fuer MutationObserver-Checks.                |
| `CONFIG.defaultGradientStops` | Farb-Liste                         | Standard-Gradient, wenn Hit-Typ keinen eigenen hat. |
| `CONFIG.hitTypes`             | T/D 1..20                          | Trefferarten inkl. Farben und Gradients.            |
| `CONFIG.bull`                 | `enabled: true`                    | BULL-Handling inkl. Farben/Gradienten.              |

### Animation/Autodarts Animate Single Bull Sound.user.js

| Variable                | Standard | Wirkung                                      |
| ----------------------- | -------- | -------------------------------------------- |
| `CONFIG.soundUrl`       | MP3-URL  | URL zur Sounddatei (z.B. eigener Sound).     |
| `CONFIG.volume`         | `0.9`    | Lautstaerke 0..1.                            |
| `CONFIG.cooldownMs`     | `700`    | Mindestabstand zwischen Plays pro Wurfzeile. |
| `CONFIG.pollIntervalMs` | `0`      | Optionales Polling; `0` deaktiviert Polling. |

### Animation/Autodarts Animate Checkout Score Pulse.user.js

| Variable                | Standard                                      | Wirkung                                    |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| `EFFECT`                | `scale`                                       | Effekt: `pulse`, `glow`, `scale`, `blink`. |
| `PULSE_COLOR`           | `159, 219, 88`                                | RGB-Wert fuer Glow/Pulse (ohne Alpha).     |
| `IMPOSSIBLE_CHECKOUTS`  | `169, 168, 166, 165, 163, 162, 159`           | Scores, die nie checkoutbar sind.          |
| `SUGGESTION_SELECTOR`   | `.suggestion`                                 | Element fuer den Checkout-Vorschlag.       |
| `SCORE_SELECTOR`        | `p.ad-ext-player-score`                       | Fallback-Selector fuer die Score-Anzeige.  |
| `ACTIVE_SCORE_SELECTOR` | `.ad-ext-player-active p.ad-ext-player-score` | Selector fuer den aktiven Score.           |
| `VARIANT_ELEMENT_ID`    | `ad-ext-game-variant`                         | Quelle fuer die Varianten-Erkennung.       |

### Animation/Autodarts Animate Turn Points Count.user.js

| Variable               | Standard               | Wirkung                          |
| ---------------------- | ---------------------- | -------------------------------- |
| `CONFIG.scoreSelector` | `p.ad-ext-turn-points` | Ziel-Element fuer Turn-Punkte.   |
| `CONFIG.animationMs`   | `416`                  | Dauer der Count-Animation in ms. |

### Animation/Autodarts Animate Average Trend Arrow.user.js

| Variable       | Standard                        | Wirkung                             |
| -------------- | ------------------------------- | ----------------------------------- |
| `AVG_SELECTOR` | `p.css-1j0bqop`                 | Element mit dem AVG-Text.           |
| `ANIMATION_MS` | `320`                           | Dauer der Pfeil-Animation in ms.    |
| `STYLE_ID`     | `autodarts-average-trend-style` | Style-ID fuer die Pfeil-CSS-Regeln. |

### Animation/Autodarts Animate Turn Start Sweep.user.js

| Variable                 | Standard                    | Wirkung                                   |
| ------------------------ | --------------------------- | ----------------------------------------- |
| `CONFIG.activeSelector`  | `.ad-ext-player-active`     | Selector fuer den aktiven Spieler.        |
| `CONFIG.sweepClass`      | `ad-ext-turn-sweep`         | Klasse, die die Sweep-Animation ausloest. |
| `CONFIG.sweepDurationMs` | `420`                       | Dauer der Sweep-Animation in ms.          |
| `CONFIG.sweepDelayMs`    | `0`                         | Verzoegerung vor dem Sweep in ms.         |
| `CONFIG.sweepWidth`      | `45%`                       | Breite des Lichtstreifens.                |
| `CONFIG.sweepColor`      | `rgba(255, 255, 255, 0.35)` | Farbe des Sweep-Highlights.               |

### Animation/Autodarts Animate Winner Fireworks.user.js

| Variable                   | Standard                                          | Wirkung                                            |
| -------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `CONFIG.winnerSelector`    | `.ad-ext_winner-animation, .ad-ext-player-winner` | Selector fuer den Gewinner-Block.                  |
| `CONFIG.effect`            | `firework`                                        | Effekt: `firework`, `confetti`, `aurora`, `pulse`. |
| `CONFIG.colors`            | Farb-Liste                                        | Palette fuer Partikel/Glow.                        |
| `CONFIG.rocketIntervalMs`  | `360`                                             | Abstand zwischen Feuerwerks-Raketen.               |
| `CONFIG.maxRockets`        | `7`                                               | Maximale gleichzeitige Raketen.                    |
| `CONFIG.maxParticles`      | `480`                                             | Maximale Partikelanzahl.                           |
| `CONFIG.burstParticlesMin` | `36`                                              | Minimale Partikel pro Explosion.                   |
| `CONFIG.burstParticlesMax` | `60`                                              | Maximale Partikel pro Explosion.                   |
| `CONFIG.rocketSpeedMin`    | `6.6`                                             | Minimale Startgeschwindigkeit der Raketen.         |
| `CONFIG.rocketSpeedMax`    | `9.4`                                             | Maximale Startgeschwindigkeit der Raketen.         |
| `CONFIG.burstSpeedMin`     | `1.6`                                             | Minimale Partikelgeschwindigkeit.                  |
| `CONFIG.burstSpeedMax`     | `4.9`                                             | Maximale Partikelgeschwindigkeit.                  |
| `CONFIG.particleLifeMinMs` | `1000`                                            | Minimale Lebensdauer der Partikel in ms.           |
| `CONFIG.particleLifeMaxMs` | `1700`                                            | Maximale Lebensdauer der Partikel in ms.           |
| `CONFIG.gravity`           | `0.06`                                            | Schwerkraft pro Frame.                             |
| `CONFIG.friction`          | `0.985`                                           | Reibung pro Frame.                                 |
| `CONFIG.confettiCount`     | `150`                                             | Anzahl der Konfetti-Stuecke.                       |
| `CONFIG.auroraBandCount`   | `3`                                               | Anzahl der Aurora-Baender.                         |
| `CONFIG.auroraStarCount`   | `80`                                              | Anzahl der Sterne fuer Aurora.                     |
| `CONFIG.pulseIntervalMs`   | `520`                                             | Abstand zwischen Pulsringen.                       |

### Animation/Autodarts Animate Dart Marker Emphasis.user.js

| Variable          | Standard                                                    | Wirkung                          |
| ----------------- | ----------------------------------------------------------- | -------------------------------- |
| `MARKER_RADIUS`   | `6`                                                         | Radius der Treffer-Marker in px. |
| `MARKER_FILL`     | `rgb(49, 130, 206)`                                         | Fuellfarbe der Marker.           |
| `EFFECT`          | `glow`                                                      | Effekt: `pulse`, `glow`, `none`. |
| `MARKER_SELECTOR` | `circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]` | Selector fuer Board-Marker.      |

### Animation/Autodarts Animate Checkout Board Targets.user.js

| Variable                    | Standard                   | Wirkung                                         |
| --------------------------- | -------------------------- | ----------------------------------------------- |
| `CONFIG.suggestionSelector` | `.suggestion`              | Selector fuer den Checkout-Vorschlag.           |
| `CONFIG.variantElementId`   | `ad-ext-game-variant`      | Quelle fuer die Varianten-Erkennung.            |
| `CONFIG.requireX01`         | `true`                     | Aktiviert nur in X01.                           |
| `CONFIG.highlightTargets`   | `first`                    | Markiert `first` oder `all` Ziele.              |
| `CONFIG.effect`             | `pulse`                    | Effekt: `pulse`, `blink`, `glow`.               |
| `CONFIG.color`              | `rgba(168, 85, 247, 0.85)` | Fuellfarbe der Ziele.                           |
| `CONFIG.strokeColor`        | `rgba(168, 85, 247, 0.95)` | Rahmenfarbe der Ziele.                          |
| `CONFIG.strokeWidthRatio`   | `0.008`                    | Rahmenstaerke relativ zum Board-Radius.         |
| `CONFIG.animationMs`        | `1000`                     | Dauer der Animation in ms.                      |
| `CONFIG.singleRing`         | `both`                     | `inner`, `outer` oder `both` fuer Single-Ringe. |
| `CONFIG.edgePaddingPx`      | `1`                        | Zusatz-Padding fuer die Shapes.                 |
| `CONFIG.ringRatios`         | Objekt                     | Ring-Grenzen als Anteil des Board-Radius.       |

### Animation/Autodarts Style Checkout Suggestions.user.js

| Variable                    | Standard                   | Wirkung                                                 |
| --------------------------- | -------------------------- | ------------------------------------------------------- |
| `CONFIG.suggestionSelector` | `.suggestion`              | Selector fuer den Vorschlags-Block.                     |
| `CONFIG.variantElementId`   | `ad-ext-game-variant`      | Quelle fuer die Varianten-Erkennung.                    |
| `CONFIG.requireX01`         | `true`                     | Aktiviert nur in X01.                                   |
| `CONFIG.formatStyle`        | `ribbon`                   | Stil: `badge`, `ribbon`, `stripe`, `ticket`, `outline`. |
| `CONFIG.labelText`          | `CHECKOUT`                 | Text im Badge/Label (leer = kein Label).                |
| `CONFIG.accentColor`        | `#f59e0b`                  | Akzentfarbe fuer Rahmen/Glow.                           |
| `CONFIG.accentSoftColor`    | `rgba(245, 158, 11, 0.16)` | Weiche Akzentflaeche.                                   |
| `CONFIG.accentStrongColor`  | `rgba(245, 158, 11, 0.6)`  | Starker Akzent fuer Glows.                              |
| `CONFIG.labelBackground`    | `#fcd34d`                  | Hintergrund fuer das Label.                             |
| `CONFIG.labelTextColor`     | `#1f1300`                  | Textfarbe fuer das Label.                               |
| `CONFIG.borderRadiusPx`     | `14`                       | Rundung der Box in px.                                  |
| `CONFIG.stripeOpacity`      | `0.35`                     | Deckkraft der Stripe-Overlay-Flaeche.                   |

### Animation/Autodarts Animate Cricket Target Highlighter.user.js

| Variable                      | Standard                  | Wirkung                                                 |
| ----------------------------- | ------------------------- | ------------------------------------------------------- |
| `CONFIG.variantElementId`     | `ad-ext-game-variant`     | Quelle fuer die Varianten-Erkennung.                    |
| `CONFIG.tableSelector`        | `null`                    | Fixer Selector fuer die Cricket-Tabelle (falls noetig). |
| `CONFIG.playerSelector`       | `.ad-ext-player`          | Selector fuer Player-Karten.                            |
| `CONFIG.activePlayerSelector` | `.ad-ext-player-active`   | Selector fuer den aktiven Player.                       |
| `CONFIG.markElementSelector`  | komplex                   | Selector fuer Marks (Icons/alt/attr).                   |
| `CONFIG.showDeadTargets`      | `true`                    | Zeigt Ziele, die alle geschlossen haben.                |
| `CONFIG.strokeWidthRatio`     | `0.006`                   | Rahmenstaerke relativ zum Board-Radius.                 |
| `CONFIG.edgePaddingPx`        | `0.8`                     | Zusatz-Padding fuer Shapes.                             |
| `CONFIG.baseColor`            | `{ r: 90, g: 90, b: 90 }` | Grundfarbe fuer ausgeblendete Bereiche.                 |
| `CONFIG.opacity.closed`       | `0.8`                     | Deckkraft fuer geschlossene Ziele.                      |
| `CONFIG.opacity.dead`         | `0.98`                    | Deckkraft fuer tote Ziele.                              |
| `CONFIG.opacity.inactive`     | `0.8`                     | Deckkraft fuer inaktive Bereiche.                       |
| `CONFIG.highlight.score`      | RGB/Opacity               | Farbe fuer Score-Ziele (Spieler kann punkten).          |
| `CONFIG.highlight.danger`     | RGB/Opacity               | Farbe fuer Danger-Ziele (Gegner kann punkten).          |
| `CONFIG.ringRatios`           | Objekt                    | Ring-Grenzen als Anteil des Board-Radius.               |
| `CONFIG.debug`                | `true`                    | Aktiviert Debug-Logs in der Konsole.                    |

## Fehler und Feedback

- Fehler bitte über GitHub-Issues melden:
  https://github.com/thomasasen/autodarts-tampermonkey-themes/issues
- Direkt zum Fehlerformular:
  https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%90%9E-bug-melden.md
- Feature-Wünsche bitte über das Feature-Formular:
  https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%92%A1-feature-vorschlagen.md
- Fragen und allgemeines Feedback bitte über GitHub Discussions:
  https://github.com/thomasasen/autodarts-tampermonkey-themes/discussions

Unvollständige Fehlermeldungen ohne Versionen oder Reproduktionsschritte können geschlossen werden.

## Hinweis zur Nutzung und Testumgebung

Ich mache das als Hobby, und jeder ist eingeladen, die Skripte zu verwenden, Fehler zu melden oder Kommentare zu schreiben.

Ich teste in meiner Umgebung mit installierten Autodarts-Tools:
https://github.com/creazy231/tools-for-autodarts

Das kann ggf. Einfluss auf die Funktionen meiner Skripte haben.
Folgende Einstellungen habe ich unter Matches aktiv:

| Einstellung                 | Status                                  |
| --------------------------- | --------------------------------------- |
| COLORS                      | <span style="color:#6b7280;">Off</span> |
| AUTO NEXT PLAYER ON TAKEOUT | <span style="color:#16a34a;">On</span>  |
| SMALLER SCORES              | <span style="color:#16a34a;">On</span>  |
| STREAMING MODE              | <span style="color:#6b7280;">Off</span> |
| LARGER PLAYER NAMES         | <span style="color:#16a34a;">On</span>  |
| WINNER ANIMATION            | <span style="color:#16a34a;">On</span>  |
| DARTS ZOOM                  | <span style="color:#6b7280;">Off</span> |
| ENHANCED SCORING DISPLAY    | <span style="color:#16a34a;">On</span>  |
| TAKEOUT NOTIFICATION        | <span style="color:#16a34a;">On</span>  |
| AUTOMATIC NEXT LEG          | <span style="color:#16a34a;">On</span>  |
| HIDE MENU IN MATCH          | <span style="color:#16a34a;">On</span>  |
| LARGER LEGS/SETS            | <span style="color:#6b7280;">Off</span> |
| LARGER PLAYER MATCH DATA    | <span style="color:#16a34a;">On</span>  |
| AUTOMATIC FULLSCREEN        | <span style="color:#16a34a;">On</span>  |
| QUICK CORRECTION            | <span style="color:#16a34a;">On</span>  |
| INSTANT REPLAY              | <span style="color:#6b7280;">Off</span> |

## Danksagung und Upstream-Lizenz

Die Themes basieren auf der inventwo-Stylebot-Sammlung:
https://github.com/inventwo/Script-Sammlung/tree/main/CSS

Ich habe diese Stylebot-Themes als Basis genommen, für Tampermonkey umgeschrieben
und diverse Anpassungen vorgenommen.

Upstream (inventwo): MIT-Lizenz. Copyright (c) 2025 jkvarel und skvarel von inventwo.

## Lizenz

MIT-Lizenz

## Haftungsausschluss

Dieses Projekt ist nicht mit Autodarts verbunden.
Änderungen an play.autodarts.io können Skript-Updates erforderlich machen.
