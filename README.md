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

- Vollständiges Layout- und Farb-Theme für X01.
- Dunklere Navigation und hervorgehobener aktiver Spieler.
- Aktiviert sich automatisch bei der Variante X01.

#### Autodarts Theme Shanghai (`Template/Autodarts Theme Shanghai.user.js`)

- Gemeinsames Theme plus Grid-Layout für Shanghai.
- Aktiviert sich automatisch bei der Variante Shanghai.
- Nutzt den gemeinsamen Helfer für konsistente Updates.

#### Autodarts Theme Bermuda (`Template/Autodarts Theme Bermuda.user.js`)

- Gemeinsames Theme plus Grid-Layout für Bermuda.
- Aktiviert sich automatisch, wenn die Variante Bermuda enthält.
- Nutzt den gemeinsamen Helfer für konsistente Updates.

#### Autodarts Theme Cricket (`Template/Autodarts Theme Cricket.user.js`)

- Leichtgewichtiges Farb-Theme ohne Grid-Layout-Änderungen.
- Aktiviert sich automatisch bei der Variante Cricket.

### Animationen und Effekte

#### Autodarts Animate Triple (`Animation/Autodarts Animate Triple.user.js`)

- Hebt Triple-, Double- und Bull-Hits mit animierten Farbverläufen hervor.
- Unterschiedliche Farbsets je Hit-Typ für schnelle Erkennung.

#### Autodarts Animate Checkout (`Animation/Autodarts Animate Checkout.user.js`)

- Pulsiert den aktiven Score, wenn ein Checkout möglich ist.
- Nutzt den In-Game-Vorschlagsbereich als Trigger.
- Auf X01-Partien begrenzt.

#### Autodarts Animate Score Delta Slide (`Animation/Autodarts Animate Score Delta Slide.user.js`)

- Animiert Turn-Punkte mit einem kurzen Count-up-Tween.
- Verbessert die Lesbarkeit der Score-Änderungen während eines Turns.

#### Autodarts Animate Average Trend Arrow (`Animation/Autodarts Animate Average Trend Arrow.user.js`)

- Zeigt einen kleinen Auf/Ab-Pfeil neben dem AVG, wenn sich dieser ändert.
- Kurze Bounce-Animation zur Trend-Richtung.

#### Autodarts Animate Turn Start Sweep (`Animation/Autodarts Animate Turn Start Sweep.user.js`)

- Kurzer Licht-Sweep über dem Player-Block beim Wechsel des aktiven Spielers.
- Nutzt eine MutationObserver-Erkennung auf die aktive Klasse.
- CSS-Pseudo-Element sorgt für den Sweep ohne Layout-Shift.

#### Autodarts Animate Winner Fireworks (`Animation/Autodarts Animate Winner Fireworks.user.js`)

- Gewinner-Effekt mit Auswahl: Feuerwerk-Ring, Konfetti, Aurora oder Puls.
- Ein Klick blendet das Overlay sofort aus.

#### Autodarts Animate Size Strokes (`Animation/Autodarts Animate Size Strokes.user.js`)

- Passt Marker-Größe und Füllfarbe der Darts auf dem Board an.
- Optionaler Pulse/Glow-Effekt für bessere Sichtbarkeit.

#### Autodarts Animate Checkout Board Blink (`Animation/Autodarts Animate Checkout Board Blink.user.js`)

- Lässt das Checkout-Ziel direkt auf dem Board blinken.
- Unterstützt Single-, Double-, Triple- und Bull-Ziele mit konfigurierbaren Effekten.

#### Autodarts Animate Checkout Suggestion Format (`Animation/Autodarts Animate Checkout Suggestion Format.user.js`)

- Formatiert die Checkout-Vorschläge als klare Empfehlung, damit sie nicht mit geworfenen Feldern verwechselt werden.
- Aktiv nur in X01 (Erkennung über die Spielvariante).
- Bietet mehrere Stil-Varianten wie Badge, Ribbon, Stripe, Ticket oder Outline und ein frei konfigurierbares Label.

#### Autodarts Animate Cricket Target Highlighter (`Animation/Autodarts Animate Cricket Target Highlighter.user.js`)

- Blendet Nicht-Cricket-Felder (1-14) ab und markiert 15-20/Bull je Spielerstatus.
- Erkennt geschlossene, offene und "tote" Ziele sowie Score-/Danger-Situationen.
- Unterstützt 1 bis mehrere Spieler und liest Marks aus Icons/alt-Texten der Tabelle.

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

| Skript                       | Vorschau                                                                       | Detail/Vorher                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Animate Score Delta Slide    | ![Animate Score Delta Slide](assets/screenshots/Score%20Delta%20Slide.gif)     | ![Score Delta Slide detail](assets/screenshots/Score%20Delta%20Slide%20detail.gif) |
| Animate Average Trend Arrow  | ![Animate Average Trend Arrow](assets/screenshots/Average%20Trend%20Arrow.png) | -                                                                                  |
| Animate Checkout Board Blink | ![Animate Checkout Board Blink](assets/screenshots/Checkout%20Board%20Blink.gif) | -                                                                                |
| Animate Turn Start Sweep     | ![Animate Turn Start Sweep](assets/screenshots/Turn%20Start%20Sweep.gif)       | -                                                                                  |
| Animate Size Strokes         | ![Animate Size Strokes](assets/screenshots/Size%20Strokes.gif)                 | -                                                                                  |
| Cricket Target Highlighter   | ![Cricket Target Highlighter](assets/screenshots/Cricket%20Target%20Highlighter.png) | -                                                                              |

#### Checkout Suggestion Format

Das Vollbild zeigt die Ribbon-Variante, die restlichen Bilder sind Detailstreifen der anderen Stile.

| Vollbild (Ribbon) | Varianten (Badge, Stripe, Ticket, Outline) |
| --- | --- |
| ![Checkout Suggestion Format Ribbon](assets/screenshots/Checkout%20Suggestion%20Format%2000%20ribbon.png) | ![Checkout Suggestion Format Badge](assets/screenshots/Checkout%20Suggestion%20Format%2001%20badge.png)<br>![Checkout Suggestion Format Stripe](assets/screenshots/Checkout%20Suggestion%20Format%2002%20stripe.png)<br>![Checkout Suggestion Format Ticket](assets/screenshots/Checkout%20Suggestion%20Format%2003%20ticket.png)<br>![Checkout Suggestion Format Outline](assets/screenshots/Checkout%20Suggestion%20Format%2004%20outline.png) |

## Konfiguration

Jedes Skript hat einen kleinen Konfigurationsblock nahe am Dateianfang.

- `Animation/Autodarts Animate Score Delta Slide.user.js`
  - `CONFIG.animationMs` steuert die Tween-Dauer.
  - `CONFIG.scoreSelector` steuert, welche Score-Nodes animiert werden.
- `Animation/Autodarts Animate Size Strokes.user.js`
  - `MARKER_RADIUS`, `MARKER_FILL` und `EFFECT` steuern Größe, Farbe und Effekt.
- `Animation/Autodarts Animate Average Trend Arrow.user.js`
  - `ANIMATION_MS` steuert die Dauer der Pfeil-Bounce-Animation.
- `Animation/Autodarts Animate Turn Start Sweep.user.js`
  - `CONFIG.sweepDurationMs` steuert die Sweep-Dauer.
  - `CONFIG.sweepDelayMs` steuert die Verzögerung vor dem Sweep.
  - `CONFIG.sweepWidth` und `CONFIG.sweepColor` steuern Breite und Farbe.
- `Animation/Autodarts Animate Winner Fireworks.user.js`
  - `CONFIG.winnerSelector` steuert, wie der Gewinner erkannt wird.
  - `CONFIG.effect` waehlt `ring`, `confetti`, `aurora` oder `pulse`.
  - `CONFIG.rocketIntervalMs`, `CONFIG.maxRockets` und `CONFIG.maxParticles` steuern die Ring-Dichte.
- `Animation/Autodarts Animate Checkout.user.js`
- `Animation/Autodarts Animate Checkout Board Blink.user.js`
  - `CONFIG.effect`, `CONFIG.color`, `CONFIG.highlightTargets`, `CONFIG.singleRing`.
  - Selektoren und Highlight-Farbe sind am Dateianfang anpassbar.
- `Animation/Autodarts Animate Checkout Suggestion Format.user.js`
  - `CONFIG.formatStyle` wählt den Stil (`badge`, `ribbon`, `stripe`, `ticket`, `outline`).
  - `CONFIG.labelText` definiert den sichtbaren Label-Text (leer lassen, um das Badge zu verstecken).
  - `CONFIG.accentColor`, `CONFIG.accentSoftColor`, `CONFIG.accentStrongColor` steuern Akzent- und Hintergrundfarben.
  - `CONFIG.labelBackground`, `CONFIG.labelTextColor`, `CONFIG.borderRadiusPx` passen Badge-Optik und Rundung an.
  - `CONFIG.stripeOpacity` steuert die Streifen-Deckkraft für den Stripe-Style.
- `Animation/Autodarts Animate Cricket Target Highlighter.user.js`
  - `CONFIG.baseColor`, `CONFIG.opacity`, `CONFIG.highlight` steuern Ausblendung und Score/Danger-Farben.
  - `CONFIG.tableSelector` kann gesetzt werden, falls die Cricket-Tabelle anders aufgebaut ist.

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

| Einstellung | Status |
| --- | --- |
| COLORS | <span style="color:#6b7280;">Off</span> |
| AUTO NEXT PLAYER ON TAKEOUT | <span style="color:#16a34a;">On</span> |
| SMALLER SCORES | <span style="color:#16a34a;">On</span> |
| STREAMING MODE | <span style="color:#6b7280;">Off</span> |
| LARGER PLAYER NAMES | <span style="color:#16a34a;">On</span> |
| WINNER ANIMATION | <span style="color:#16a34a;">On</span> |
| DARTS ZOOM | <span style="color:#6b7280;">Off</span> |
| ENHANCED SCORING DISPLAY | <span style="color:#16a34a;">On</span> |
| TAKEOUT NOTIFICATION | <span style="color:#16a34a;">On</span> |
| AUTOMATIC NEXT LEG | <span style="color:#16a34a;">On</span> |
| HIDE MENU IN MATCH | <span style="color:#16a34a;">On</span> |
| LARGER LEGS/SETS | <span style="color:#6b7280;">Off</span> |
| LARGER PLAYER MATCH DATA | <span style="color:#16a34a;">On</span> |
| AUTOMATIC FULLSCREEN | <span style="color:#16a34a;">On</span> |
| QUICK CORRECTION | <span style="color:#16a34a;">On</span> |
| INSTANT REPLAY | <span style="color:#6b7280;">Off</span> |

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
