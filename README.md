# Autodarts Tampermonkey Themes & Effekte

## Einführung
Rein visuelle Tampermonkey-Skripte für https://play.autodarts.io.
Sie verändern keine Spiellogik, Scores oder Erkennung.
Diese Sammlung bringt Themes, Animationen und Lesbarkeitsverbesserungen für Autodarts.
Viele Skripte aktivieren sich je nach Spielvariante automatisch.

Diese README ist so aufgebaut:
- Erst Tampermonkey, Installation und Updates.
- Danach alle Skripte einzeln, jeweils mit Beschreibung, Konfiguration, Beispielen/Screenshots und Hinweisen.
- Am Ende: Feedback, Testumgebung, Lizenz und Haftungsausschluss.

Ordnerstruktur im Repository:
- `Template/`: Themes (Layout/Farben) je Spielvariante.
- `Animation/`: Animationen und Effekte.
- `Template/autodarts-theme-shared.js`: gemeinsamer Helfer für die Themes.
- `assets/`: Screenshots, GIFs, Sounds und Design-Bilder.

Ich mache das primär privat für mich, freue mich aber, wenn andere von der Arbeit profitieren.
Wenn dir die Skripte helfen, empfehle sie gern weiter. Feedback – positiv oder kritisch – ist jederzeit willkommen.

Kurzübersicht:
- Theme-Skripte, die sich je nach Spielvariante automatisch aktivieren.
- Gemeinsamer Layout-/Theme-Helfer für konsistentes Styling.
- Optionale Animations- und Effekt-Skripte für bessere Lesbarkeit.
- Skripte reagieren automatisch, wenn sich die Spielansicht dynamisch ändert.
- DartsZoom-Vorschau optional unter den Würfen; Platz wird nur reserviert, wenn die Vorschau sichtbar ist.

## Inhaltsverzeichnis
- [Einführung](#einführung)
- [Tampermonkey](#tampermonkey)
- [Installation](#installation)
- [Updates](#updates)
- [Skripte](#skripte)
  - [Templates](#templates)
    - [Template: Autodarts Theme X01](#template-autodarts-theme-x01)
    - [Template: Autodarts Theme Shanghai](#template-autodarts-theme-shanghai)
    - [Template: Autodarts Theme Bermuda](#template-autodarts-theme-bermuda)
    - [Template: Autodarts Theme Cricket](#template-autodarts-theme-cricket)
  - [Animationen](#animationen)
    - [Animation: Autodarts Animate Triple Double Bull Hits](#animation-autodarts-animate-triple-double-bull-hits)
    - [Animation: Autodarts Animate Single Bull Sound](#animation-autodarts-animate-single-bull-sound)
    - [Animation: Autodarts Animate Checkout Score Pulse](#animation-autodarts-animate-checkout-score-pulse)
    - [Animation: Autodarts Animate Turn Points Count](#animation-autodarts-animate-turn-points-count)
    - [Animation: Autodarts Animate Average Trend Arrow](#animation-autodarts-animate-average-trend-arrow)
    - [Animation: Autodarts Animate Turn Start Sweep](#animation-autodarts-animate-turn-start-sweep)
    - [Animation: Autodarts Animate Remove Darts Notification](#animation-autodarts-animate-remove-darts-notification)
    - [Animation: Autodarts Animate Winner Fireworks](#animation-autodarts-animate-winner-fireworks)
    - [Animation: Autodarts Animate Dart Marker Emphasis](#animation-autodarts-animate-dart-marker-emphasis)
    - [Animation: Autodarts Animate Dart Marker Darts](#animation-autodarts-animate-dart-marker-darts)
    - [Animation: Autodarts Animate Checkout Board Targets](#animation-autodarts-animate-checkout-board-targets)
    - [Animation: Autodarts Style Checkout Suggestions](#animation-autodarts-style-checkout-suggestions)
    - [Animation: Autodarts Animate Cricket Target Highlighter](#animation-autodarts-animate-cricket-target-highlighter)
- [Fehler und Feedback](#fehler-und-feedback)
- [Hinweis zur Nutzung und Testumgebung](#hinweis-zur-nutzung-und-testumgebung)
- [Danksagung und Upstream-Lizenz](#danksagung-und-upstream-lizenz)
- [Lizenz](#lizenz)
- [Haftungsausschluss](#haftungsausschluss)

## Tampermonkey
Tampermonkey ist eine Browser-Erweiterung, mit der du Userscripts auf Webseiten installieren kannst.
Downloadlink (Chrome/Edge/Chromium): https://www.tampermonkey.net/index.php?browser=chrome

Weiterführende Links:
- Installation/Deinstallation: https://www.tampermonkey.net/faq.php#Q100
- Dashboard, Updates suchen und Skripte bearbeiten (Variablen ändern): https://www.tampermonkey.net/faq.php#Q101
- Skripte installieren (inkl. „View raw“): https://www.tampermonkey.net/faq.php#Q102
- Dokumentation: https://www.tampermonkey.net/documentation.php

Nach der Installation findest du das Tampermonkey-Icon in der Browser-Toolbar.
Dort kannst du die installierten Skripte öffnen, aktivieren/deaktivieren und aktualisieren.
Variablen ändern: Tampermonkey-Icon -> Dashboard -> Skript öffnen -> im Editor die Variablen anpassen -> Speichern. Danach die Autodarts-Seite neu laden.
Hinweis: Wenn du im Skript Variablen änderst, können Updates diese Änderungen überschreiben. Dann musst du sie danach erneut eintragen.

## Installation
1. Wähle unten ein Skript und klicke auf den Button unter dem Skript.
2. Tampermonkey öffnet den Installationsdialog.
3. Klicke auf „Installieren“ und lasse automatische Updates aktiviert.

Hinweis: Der Button führt direkt zur Skriptdatei. Beim Öffnen zeigt Tampermonkey den Installationsdialog.
Wenn kein Dialog erscheint, ist Tampermonkey nicht installiert oder deaktiviert.

## Updates
- Automatisch: Tampermonkey aktualisiert installierte Skripte, wenn `@updateURL`/`@downloadURL` erreichbar sind.
- Manuell: Skript im Tampermonkey-Dashboard öffnen und auf „Nach Updates suchen“ klicken.
- Lokale Datei: Wenn du ein lokales Skript nutzt, aktualisiere die Datei und speichere sie erneut in Tampermonkey.

## Skripte

Hinweis zur Konfiguration: Jedes Skript hat seinen Konfigurationsblock nahe am Dateianfang.
Ändere nur die Variablen im jeweiligen Skript, speichere es in Tampermonkey und lade die Autodarts-Seite neu.
Die Design-Vorlagen liegen in `Template/`, die Animationen in `Animation/`.

Kennzeichnung: Jede Skriptsektion enthält einen Block **Einfache Variablen (Beispiele)**.
Diese Werte kannst du ohne technisches Vorwissen ändern; alle anderen Variablen richten sich an technisch Versierte.
Beispiele zeigen die echten Werte (z.B. `true`/`false`, `"ribbon"`).

Medien-Hinweis: Alle Bilder/GIFs und Sounds liegen in `assets/`. PNGs sind statisch, GIFs zeigen Bewegung.
Kleine Variantenbilder sind klickbar und öffnen das große Bild.

### Templates

Diese Skripte verändern Layout und Farben und aktivieren sich automatisch je Spielvariante.

**Gemeinsamer Helfer (autodarts-theme-shared.js, kein Userscript)**
- Die Template-Skripte laden den Helfer per `@require`, du musst ihn nicht separat installieren.
- URL: https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/autodarts-theme-shared.js
- Wenn du das Repo forkst oder lokale Dateien nutzt, passe die `@require`-URL im Skript an.

Hinweis: Wenn die DartsZoom-Vorschau in den "Tools für Autodarts" deaktiviert ist, wird kein Platz reserviert.

#### Template: Autodarts Theme X01

- Bezeichnung: Autodarts Theme X01
- Datei: `Template/Autodarts Theme X01.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20X01.user.js)

📝 **Beschreibung**
- Zweck: Vollständiges Layout- und Farb-Theme für X01, mit Fokus auf klare Scores, Player-Karten und Navigation.
- Aktivierung: Variante `x01` (liest `#ad-ext-game-variant` über den Shared Helper).
- Änderungen: setzt CSS-Variablen, Grid-Layout und Typografie, passt Größen/Abstände sowie die DartsZoom-Platzierung an.
- Hinweis: rein visuell, keine Änderungen an Spiellogik oder Erkennung.

✅ **Einfache Variablen (Beispiele)**
- `PREVIEW_PLACEMENT = "standard"` oder `"under-throws"`
- `PREVIEW_HEIGHT_PX = 128`
- `PREVIEW_GAP_PX = 8`

⚙️ **Konfiguration (Variablen)**
| Variable              | Standard                         | Wirkung                                                               |
| --------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `STYLE_ID`            | `autodarts-x01-custom-style`     | Eindeutige ID des Style-Tags; bei Änderung bleiben alte Styles bis zum Reload aktiv. |
| `VARIANT_NAME`        | `x01`                            | Name der Spielvariante, bei der das Theme aktiv wird.                 |
| `PREVIEW_PLACEMENT`   | `under-throws`                   | Position der DartsZoom-Vorschau: `standard` (Standardplatz) oder `under-throws` (unter den Würfen). |
| `PREVIEW_HEIGHT_PX`   | `128`                            | Reservierte Höhe der Vorschau in Pixeln; beeinflusst das Layout.      |
| `PREVIEW_GAP_PX`      | `8`                              | Abstand zwischen Wurfbox und Vorschau in Pixeln.                      |
| `PREVIEW_SPACE_CLASS` | `ad-ext-turn-preview-space`      | CSS-Klasse für den reservierten Platz (nützlich für eigenes Styling). |
| `fallbackThemeCss`    | CSS-Block                        | Fallback-Farben und Typografie, falls der Shared Helper nicht lädt.   |
| `fallbackLayoutCss`   | CSS-Block                        | Fallback-Layout/Grid, falls der Shared Helper nicht lädt.             |
| `navigationOverride`  | CSS-Block                        | Erzwingt die dunkle Navigation in X01, auch wenn andere Styles aktiv sind. |

🖼️ **Beispiele/Screenshots**
![Theme X01](assets/Theme%20X01.png)

DartsZoom-Vorschau (PREVIEW_PLACEMENT):
![DartsZoom Standard](assets/DartsZoom_Standard.png)
![DartsZoom Under Throws](assets/DartsZoom_under-throws.png)

ℹ️ **Weitere Hinweise**
- Passe `fallbackThemeCss`, `fallbackLayoutCss` oder `navigationOverride` im Skript an.

---

#### Template: Autodarts Theme Shanghai

- Bezeichnung: Autodarts Theme Shanghai
- Datei: `Template/Autodarts Theme Shanghai.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Shanghai.user.js)

📝 **Beschreibung**
- Zweck: Gemeinsames Theme plus Grid-Layout für Shanghai, damit Board und Spielerinfos sauber ausgerichtet sind.
- Aktivierung: Variante `shanghai` (via `#ad-ext-game-variant`).
- Änderungen: nutzt `commonThemeCss` und `commonLayoutCss` aus `Template/autodarts-theme-shared.js`.
- Hinweis: rein visuell, keine Änderungen an Spiellogik oder Erkennung.

✅ **Einfache Variablen (Beispiele)**
- `PREVIEW_PLACEMENT = "standard"` oder `"under-throws"`
- `PREVIEW_HEIGHT_PX = 128`
- `PREVIEW_GAP_PX = 8`

⚙️ **Konfiguration (Variablen)**
| Variable              | Standard                          | Wirkung                                                         |
| --------------------- | --------------------------------- | --------------------------------------------------------------- |
| `STYLE_ID`            | `autodarts-shanghai-custom-style` | Eindeutige ID des Style-Tags; bei Änderung bleibt altes CSS bis zum Reload aktiv. |
| `VARIANT_NAME`        | `shanghai`                        | Name der Spielvariante, bei der das Theme aktiv wird.           |
| `PREVIEW_PLACEMENT`   | `under-throws`                    | Position der DartsZoom-Vorschau: `standard` oder `under-throws`. |
| `PREVIEW_HEIGHT_PX`   | `128`                             | Reservierte Höhe der Vorschau in Pixeln; beeinflusst das Layout. |
| `PREVIEW_GAP_PX`      | `8`                               | Abstand zwischen Wurfbox und Vorschau in Pixeln.                |
| `PREVIEW_SPACE_CLASS` | `ad-ext-turn-preview-space`       | CSS-Klasse für den reservierten Platz (für eigenes Styling).     |
| `fallbackThemeCss`    | `commonThemeCss`                  | Fallback-Farben und Typografie aus dem Shared Helper.           |
| `fallbackLayoutCss`   | `commonLayoutCss`                 | Fallback-Layout/Grid aus dem Shared Helper.                     |

🖼️ **Beispiele/Screenshots**
![Theme Shanghai](assets/Theme%20Shanghai.png)

ℹ️ **Weitere Hinweise**
- Farben/Layout im Shared Helper anpassen (wirkt auf alle Template-Themes).
---

#### Template: Autodarts Theme Bermuda

- Bezeichnung: Autodarts Theme Bermuda
- Datei: `Template/Autodarts Theme Bermuda.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Bermuda.user.js)

📝 **Beschreibung**
- Zweck: Gemeinsames Theme plus Grid-Layout für Bermuda, mit klarer Trennung von Spieler- und Boardbereich.
- Aktivierung: Variante enthält `bermuda` (matchMode `includes`).
- Änderungen: nutzt `commonThemeCss` und `commonLayoutCss`.
- Hinweis: rein visuell, keine Änderungen an Spiellogik oder Erkennung.

✅ **Einfache Variablen (Beispiele)**
- `PREVIEW_PLACEMENT = "standard"` oder `"under-throws"`
- `PREVIEW_HEIGHT_PX = 128`
- `PREVIEW_GAP_PX = 8`

⚙️ **Konfiguration (Variablen)**
| Variable              | Standard                         | Wirkung                                                          |
| --------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `STYLE_ID`            | `autodarts-bermuda-custom-style` | Eindeutige ID des Style-Tags; bei Änderung bleibt altes CSS bis zum Reload aktiv. |
| `VARIANT_NAME`        | `bermuda`                        | Basisname der Variante, an dem geprüft wird.                    |
| `PREVIEW_PLACEMENT`   | `under-throws`                   | Position der DartsZoom-Vorschau: `standard` oder `under-throws`. |
| `PREVIEW_HEIGHT_PX`   | `128`                            | Reservierte Höhe der Vorschau in Pixeln; beeinflusst das Layout. |
| `PREVIEW_GAP_PX`      | `8`                              | Abstand zwischen Wurfbox und Vorschau in Pixeln.                 |
| `PREVIEW_SPACE_CLASS` | `ad-ext-turn-preview-space`      | CSS-Klasse für den reservierten Platz (für eigenes Styling).     |
| `matchMode`           | `includes`                       | Aktiviert das Theme, wenn der Varianten-Text `bermuda` enthält (z.B. `bermuda-pro`). |
| `fallbackThemeCss`    | `commonThemeCss`                 | Fallback-Farben und Typografie aus dem Shared Helper.           |
| `fallbackLayoutCss`   | `commonLayoutCss`                | Fallback-Layout/Grid aus dem Shared Helper.                     |

🖼️ **Beispiele/Screenshots**
![Theme Bermuda](assets/Theme%20Bermuda.png)

ℹ️ **Weitere Hinweise**
- Farben/Layout im Shared Helper anpassen (wirkt auf alle Template-Themes).

---

#### Template: Autodarts Theme Cricket

- Bezeichnung: Autodarts Theme Cricket
- Datei: `Template/Autodarts Theme Cricket.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Template/Autodarts%20Theme%20Cricket.user.js)

📝 **Beschreibung**
- Zweck: Leichtgewichtiges Farb-Theme für Cricket ohne große Layout-Eingriffe, damit die Spielansicht vertraut bleibt.
- Aktivierung: Variante `cricket`.
- Änderungen: setzt Farben und kleine UI-Anpassungen (z.B. Kontraste und Hervorhebungen).
- Hinweis: rein visuell, keine Änderungen an Spiellogik oder Erkennung.

✅ **Einfache Variablen (Beispiele)**
- `PREVIEW_PLACEMENT = "standard"` oder `"under-throws"`
- `PREVIEW_HEIGHT_PX = 128`
- `PREVIEW_GAP_PX = 8`

⚙️ **Konfiguration (Variablen)**
| Variable              | Standard                         | Wirkung                                                         |
| --------------------- | -------------------------------- | --------------------------------------------------------------- |
| `STYLE_ID`            | `autodarts-cricket-custom-style` | Eindeutige ID des Style-Tags; bei Änderung bleibt altes CSS bis zum Reload aktiv. |
| `VARIANT_NAME`        | `cricket`                        | Name der Spielvariante, bei der das Theme aktiv wird.           |
| `PREVIEW_PLACEMENT`   | `under-throws`                   | Position der DartsZoom-Vorschau: `standard` oder `under-throws`. |
| `PREVIEW_HEIGHT_PX`   | `128`                            | Reservierte Höhe der Vorschau in Pixeln; beeinflusst das Layout. |
| `PREVIEW_GAP_PX`      | `8`                              | Abstand zwischen Wurfbox und Vorschau in Pixeln.                |
| `PREVIEW_SPACE_CLASS` | `ad-ext-turn-preview-space`      | CSS-Klasse für den reservierten Platz (für eigenes Styling).     |
| `customCss`           | CSS-Block                        | Eigene Farben/Abstände speziell für Cricket; direkt anpassbar.  |

🖼️ **Beispiele/Screenshots**
![Theme Cricket](assets/Theme%20Cricket.png)

ℹ️ **Weitere Hinweise**
- CSS in `customCss` anpassen, wenn du Farben oder Abstände ändern möchtest.

---

### Animationen
#### Animation: Autodarts Animate Triple Double Bull Hits

- Bezeichnung: Autodarts Animate Triple Double Bull Hits
- Datei: `Animation/Autodarts Animate Triple Double Bull Hits.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Triple%20Double%20Bull%20Hits.user.js)

📝 **Beschreibung**
- Zweck: hebt Triple/Double/Bull-Treffer in der Wurfliste deutlich hervor (Gradient + Highlight).
- Trigger/Erkennung: liest Wurfzeilen via `CONFIG.selectors.throwText`, erkennt `Txx`, `Dxx` oder `BULL`; MutationObserver plus optionales Polling.
- Änderungen: setzt Klassen auf der Wurfzeile, formatiert den Treffertext per `<span>` und macht wichtige Würfe schneller sichtbar.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.pollIntervalMs = 0` oder `3000`

⚙️ **Konfiguration (Variablen)**
| Variable                      | Standard                           | Wirkung                                             |
| ----------------------------- | ---------------------------------- | --------------------------------------------------- |
| `CONFIG.pollIntervalMs`       | `3000`                             | Zusätzliches Polling in ms; `0` deaktiviert Polling und nutzt nur den Observer. |
| `CONFIG.selectors.throwRow`   | `.ad-ext-turn-throw`               | Element der Wurfzeile, an das Klassen/Gradienten angehängt werden. |
| `CONFIG.selectors.throwText`  | `.ad-ext-turn-throw p.chakra-text` | Element, aus dem der Treffertext gelesen wird.      |
| `CONFIG.selectors.textNode`   | `p.chakra-text`                    | Filter für Textänderungen, damit nur relevante Knoten geprüft werden. |
| `CONFIG.defaultGradientStops` | Farb-Liste                         | Standard-Gradient, wenn ein Treffer-Typ keinen eigenen Verlauf hat. |
| `CONFIG.hitTypes`             | T/D 1..20                          | Definitionen für Trefferarten inkl. Farben und Gradienten. |
| `CONFIG.bull`                 | `enabled: true`                    | BULL-Behandlung inkl. Ein/Aus und Farben/Gradienten. |

🖼️ **Beispiele/Screenshots**
![Animate Checkout Score Pulse](assets/Checkout%20Board%20Blink.gif)

ℹ️ **Weitere Hinweise**
- Optionales Polling kann bei Bedarf deaktiviert werden (`CONFIG.pollIntervalMs = 0`).

---

#### Animation: Autodarts Animate Single Bull Sound

- Bezeichnung: Autodarts Animate Single Bull Sound
- Datei: `Animation/Autodarts Animate Single Bull Sound.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Single%20Bull%20Sound.user.js)

📝 **Beschreibung**
- Zweck: spielt einen Sound, wenn ein Single Bull (25/BULL) in der Wurfliste erscheint.
- Trigger/Erkennung: beobachtet `.ad-ext-turn-throw` und erkennt 25+BULL im Text/DOM.
- Ergebnis: akustisches Feedback für Single Bull, auch wenn die Tools keinen Event liefern.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.soundUrl = "https://example.com/bull.mp3"`
- `CONFIG.volume = 0.9` oder `0.5`
- `CONFIG.cooldownMs = 700` oder `1000`

⚙️ **Konfiguration (Variablen)**
| Variable                | Standard | Wirkung                                      |
| ----------------------- | -------- | -------------------------------------------- |
| `CONFIG.soundUrl`       | MP3-URL  | Direkt-URL zur Sounddatei (MP3/OGG), muss öffentlich erreichbar sein. |
| `CONFIG.volume`         | `0.9`    | Lautstärke von 0..1; `1` ist volle Lautstärke. |
| `CONFIG.cooldownMs`     | `700`    | Mindestabstand zwischen Plays pro Wurfzeile (Schutz vor Mehrfachauslösung). |
| `CONFIG.pollIntervalMs` | `0`      | Optionales Polling in ms; `0` deaktiviert Polling. |

🖼️ **Beispiele/Screenshots**
Sound-Beispiel: [singlebull.mp3](assets/singlebull.mp3)

ℹ️ **Weitere Hinweise**
- In den "Tools für Autodarts" gibt es keinen zuverlässigen Trigger für "Single Bull" (S25); dieses Skript erkennt Single Bull direkt in der Wurfliste.

---

#### Animation: Autodarts Animate Checkout Score Pulse

- Bezeichnung: Autodarts Animate Checkout Score Pulse
- Datei: `Animation/Autodarts Animate Checkout Score Pulse.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Score%20Pulse.user.js)

📝 **Beschreibung**
- Zweck: hebt den aktiven Restscore hervor, wenn ein Checkout möglich ist (X01).
- Trigger/Erkennung: bevorzugt `.suggestion`-Text, fällt auf Score-Logik zurück; Variante via `#ad-ext-game-variant`.
- Änderungen: setzt Klassen am Score-Element und animiert per CSS, damit Checkout-Situationen sofort ins Auge fallen.

✅ **Einfache Variablen (Beispiele)**
- `EFFECT = "pulse"` oder `"glow"` oder `"scale"` oder `"blink"`
- `PULSE_COLOR = "159, 219, 88"`

⚙️ **Konfiguration (Variablen)**
| Variable                | Standard                                      | Wirkung                                    |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| `EFFECT`                | `scale`                                       | Art der Animation: `pulse`, `glow`, `scale` oder `blink`. |
| `PULSE_COLOR`           | `159, 219, 88`                                | RGB-Wert für Glow/Pulse (Alpha wird intern ergänzt). |
| `IMPOSSIBLE_CHECKOUTS`  | `169, 168, 166, 165, 163, 162, 159`           | Scores, die nie checkoutbar sind (verhindert Fehltrigger). |
| `SUGGESTION_SELECTOR`   | `.suggestion`                                 | Selector für den Checkout-Vorschlag (bevorzugte Quelle). |
| `SCORE_SELECTOR`        | `p.ad-ext-player-score`                       | Fallback-Selector für die Score-Anzeige, wenn keine Suggestion da ist. |
| `ACTIVE_SCORE_SELECTOR` | `.ad-ext-player-active p.ad-ext-player-score` | Selector für den aktiven Score, damit der Effekt nur beim aktuellen Spieler greift. |
| `VARIANT_ELEMENT_ID`    | `ad-ext-game-variant`                         | Quelle für die Varianten-Erkennung (zur Begrenzung auf X01). |

🖼️ **Beispiele/Screenshots**
Keine Screenshots vorhanden.

ℹ️ **Weitere Hinweise**
- Funktioniert für X01, da Checkout-Logik genutzt wird.
---

#### Animation: Autodarts Animate Turn Points Count

- Bezeichnung: Autodarts Animate Turn Points Count
- Datei: `Animation/Autodarts Animate Turn Points Count.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Points%20Count.user.js)

📝 **Beschreibung**
- Zweck: animiert die Turn-Punkte als kurzes Count-up/down.
- Trigger/Erkennung: Textänderung an `CONFIG.scoreSelector`.
- Änderungen: schreibt während der Animation Zwischenwerte in die Anzeige, damit der Punktewechsel flüssig wirkt.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.animationMs = 416` oder `600`

⚙️ **Konfiguration (Variablen)**
| Variable               | Standard               | Wirkung                          |
| ---------------------- | ---------------------- | -------------------------------- |
| `CONFIG.scoreSelector` | `p.ad-ext-turn-points` | CSS-Selector für die Turn-Punkte-Anzeige; anpassen, falls Autodarts die Klassen ändert. |
| `CONFIG.animationMs`   | `416`                  | Dauer der Count-Animation in ms; höhere Werte wirken langsamer. |

🖼️ **Beispiele/Screenshots**
![Animate Turn Points Count](assets/Score%20Delta%20Slide.gif)
![Score Delta Slide detail](assets/Score%20Delta%20Slide%20detail.gif)

ℹ️ **Weitere Hinweise**
- Wenn dir der Effekt zu schnell/langsam ist, passe `CONFIG.animationMs` an.

---

#### Animation: Autodarts Animate Average Trend Arrow

- Bezeichnung: Autodarts Animate Average Trend Arrow
- Datei: `Animation/Autodarts Animate Average Trend Arrow.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Average%20Trend%20Arrow.user.js)

📝 **Beschreibung**
- Zweck: zeigt einen Auf/Ab-Pfeil neben dem AVG, sobald sich der Durchschnitt ändert.
- Trigger/Erkennung: beobachtet `AVG_SELECTOR` (AVG-Text).
- Änderungen: fügt einen Pfeil-Span ein, toggelt Klassen/Animation und macht Trendwechsel sichtbar.

✅ **Einfache Variablen (Beispiele)**
- `ANIMATION_MS = 320` oder `500`

⚙️ **Konfiguration (Variablen)**
| Variable       | Standard                        | Wirkung                             |
| -------------- | ------------------------------- | ----------------------------------- |
| `AVG_SELECTOR` | `p.css-1j0bqop`                  | Selector für das AVG-Element; anpassen, wenn Autodarts die Klasse ändert. |
| `ANIMATION_MS` | `320`                           | Dauer der Pfeil-Animation in ms.    |
| `STYLE_ID`     | `autodarts-average-trend-style` | ID für das injizierte CSS, damit keine doppelten Styles entstehen. |

🖼️ **Beispiele/Screenshots**
![Animate Average Trend Arrow](assets/Average%20Trend%20Arrow.png)

ℹ️ **Weitere Hinweise**
- Wenn Autodarts die CSS-Klasse für AVG ändert, passe `AVG_SELECTOR` an.

---

#### Animation: Autodarts Animate Turn Start Sweep

- Bezeichnung: Autodarts Animate Turn Start Sweep
- Datei: `Animation/Autodarts Animate Turn Start Sweep.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Turn%20Start%20Sweep.user.js)

📝 **Beschreibung**
- Zweck: kurzer Licht-Sweep beim Wechsel des aktiven Spielers.
- Trigger/Erkennung: Klassenwechsel an `.ad-ext-player-active`.
- Änderungen: fügt eine Sweep-Klasse am aktiven Player-Block hinzu (Pseudo-Element).

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.sweepDurationMs = 420` oder `700`
- `CONFIG.sweepDelayMs = 0` oder `150`
- `CONFIG.sweepWidth = "45%"`
- `CONFIG.sweepColor = "rgba(255, 255, 255, 0.35)"`

⚙️ **Konfiguration (Variablen)**
| Variable                 | Standard                    | Wirkung                                   |
| ------------------------ | --------------------------- | ----------------------------------------- |
| `CONFIG.activeSelector`  | `.ad-ext-player-active`     | Selector für den aktiven Spieler-Container. |
| `CONFIG.sweepClass`      | `ad-ext-turn-sweep`         | Klasse, die die Sweep-Animation auslöst. |
| `CONFIG.sweepDurationMs` | `420`                       | Dauer der Sweep-Animation in ms; größere Werte wirken langsamer. |
| `CONFIG.sweepDelayMs`    | `0`                         | Verzögerung vor dem Sweep in ms; hilfreich bei schnellen Wechseln. |
| `CONFIG.sweepWidth`      | `45%`                       | Breite des Lichtstreifens relativ zum Block; größer = breiter Sweep. |
| `CONFIG.sweepColor`      | `rgba(255, 255, 255, 0.35)` | Farbe/Transparenz des Sweep-Highlights (CSS rgba).   |

🖼️ **Beispiele/Screenshots**
![Animate Turn Start Sweep](assets/Turn%20Start%20Sweep.gif)

ℹ️ **Weitere Hinweise**
- Für einen subtileren Effekt: Breite/Farbe über `CONFIG.sweepWidth` und `CONFIG.sweepColor` anpassen.
---

#### Animation: Autodarts Animate Remove Darts Notification

- Bezeichnung: Autodarts Animate Remove Darts Notification
- Datei: `Animation/Autodarts Animate Remove Darts Notification.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Remove%20Darts%20Notification.user.js)

📝 **Beschreibung**
- Zweck: ersetzt die "Removing Darts" / "Darts entfernen"-Notification über dem Board durch `TakeOut.png` und lässt sie leicht pulsieren.
- Trigger/Erkennung: findet `.adt-remove` (mit Text-Fallbacks und optionalem Shadow-DOM-Scan).
- Änderungen: entfernt den gelben Hintergrund der Notification und rendert das Bild in größerer Darstellung.
- Hinweis: funktioniert nur, wenn in den Autodarts Tools die Option "Takeout Notification" aktiviert ist.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.imageMaxWidthRem = 30` oder `36`
- `CONFIG.imageMaxWidthVw = 90` oder `95`
- `CONFIG.pulseDurationMs = 1400` oder `1000`
- `CONFIG.pulseScale = 1.04` oder `1.08`

⚙️ **Konfiguration (Variablen)**
| Variable                      | Standard                                                                 | Wirkung                                                        |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `CONFIG.noticeSelector`       | `.adt-remove`                                                            | Selector für die Takeout-Notification.                         |
| `CONFIG.imageUrl`             | `https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/TakeOut.png` | Bildquelle für die Ersetzung. |
| `CONFIG.imageMaxWidthRem`     | `30`                                                                     | Maximale Breite in rem (Desktop).                              |
| `CONFIG.imageMaxWidthVw`      | `90`                                                                     | Maximale Breite in vw (Mobile).                                |
| `CONFIG.pulseDurationMs`      | `1400`                                                                   | Pulsdauer in ms.                                               |
| `CONFIG.pulseScale`           | `1.04`                                                                   | Maximaler Scale beim Puls.                                     |
| `CONFIG.fallbackTexts`        | `["Removing Darts", "Darts entfernen"]`                                 | Text-Fallbacks, falls sich die Klasse ändert.                  |
| `CONFIG.searchShadowRoots`    | `true`                                                                   | Sucht zusätzlich in offenen Shadow Roots.                      |
| `CONFIG.fallbackScanMs`       | `900`                                                                    | Mindestabstand zwischen Text-Scans (Performance).              |

🖼️ **Beispiele/Screenshots**
<img src="assets/TakeOut.png" alt="Remove Darts Notification" width="200px">

ℹ️ **Weitere Hinweise**
- Die Option "Takeout Notification" in den Autodarts Tools muss aktiv sein.

---

#### Animation: Autodarts Animate Winner Fireworks

- Bezeichnung: Autodarts Animate Winner Fireworks
- Datei: `Animation/Autodarts Animate Winner Fireworks.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Winner%20Fireworks.user.js)

📝 **Beschreibung**
- Zweck: Overlay-Effekt bei Gewinner (Firework, Confetti, Aurora oder Pulse).
- Trigger/Erkennung: Sichtbarkeit von `CONFIG.winnerSelector`.
- Änderungen: Fullscreen-Canvas-Overlay, Klick blendet aus; sorgt für einen klaren „Win“-Moment.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.effect = "firework"` oder `"confetti"` oder `"aurora"` oder `"pulse"`
- `CONFIG.rocketIntervalMs = 360` oder `600`
- `CONFIG.maxRockets = 7` oder `4`
- `CONFIG.maxParticles = 480` oder `200`
- `CONFIG.confettiCount = 150` oder `80`

⚙️ **Konfiguration (Variablen)**
| Variable                   | Standard                                          | Wirkung                                            |
| -------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `CONFIG.winnerSelector`    | `.ad-ext_winner-animation, .ad-ext-player-winner` | Selector für den Gewinner-Block; sobald sichtbar, startet der Effekt. |
| `CONFIG.effect`            | `firework`                                        | Effektart: `firework`, `confetti`, `aurora`, `pulse`. |
| `CONFIG.colors`            | Farb-Liste                                        | Farbpalette für Partikel und Glows.                |
| `CONFIG.rocketIntervalMs`  | `360`                                             | Abstand zwischen Feuerwerks-Raketen; kleiner = häufiger. |
| `CONFIG.maxRockets`        | `7`                                               | Maximale gleichzeitige Raketen (Performance-Hebel). |
| `CONFIG.maxParticles`      | `480`                                             | Maximale Partikelanzahl insgesamt (Dichte/Performance). |
| `CONFIG.burstParticlesMin` | `36`                                              | Minimale Partikel pro Explosion.                   |
| `CONFIG.burstParticlesMax` | `60`                                              | Maximale Partikel pro Explosion.                   |
| `CONFIG.rocketSpeedMin`    | `6.6`                                             | Minimale Startgeschwindigkeit der Raketen.         |
| `CONFIG.rocketSpeedMax`    | `9.4`                                             | Maximale Startgeschwindigkeit der Raketen.         |
| `CONFIG.burstSpeedMin`     | `1.6`                                             | Minimale Partikelgeschwindigkeit beim Burst.       |
| `CONFIG.burstSpeedMax`     | `4.9`                                             | Maximale Partikelgeschwindigkeit beim Burst.       |
| `CONFIG.particleLifeMinMs` | `1000`                                            | Minimale Lebensdauer der Partikel in ms.           |
| `CONFIG.particleLifeMaxMs` | `1700`                                            | Maximale Lebensdauer der Partikel in ms.           |
| `CONFIG.gravity`           | `0.06`                                            | Schwerkraft pro Frame; höher = schnelleres Absinken. |
| `CONFIG.friction`          | `0.985`                                           | Reibung pro Frame; kleiner = schnelleres Abbremsen. |
| `CONFIG.confettiCount`     | `150`                                             | Anzahl der Konfetti-Stücke beim Confetti-Effekt.   |
| `CONFIG.auroraBandCount`   | `3`                                               | Anzahl der Aurora-Bänder.                          |
| `CONFIG.auroraStarCount`   | `80`                                              | Anzahl der Sterne für den Aurora-Effekt.           |
| `CONFIG.pulseIntervalMs`   | `520`                                             | Abstand zwischen Pulsringen.                       |

🖼️ **Beispiele/Screenshots**
![Winner Fireworks Firework](assets/Winner%20Fireworks_firework.gif)

Varianten:
| Aurora | Confetti | Firework | Pulse |
| --- | --- | --- | --- |
| <a href="assets/Winner%20Fireworks_aurora.gif"><img src="assets/Winner%20Fireworks_aurora.gif" alt="Winner Fireworks Aurora" width="220"></a> | <a href="assets/Winner%20Fireworks_confetti.gif"><img src="assets/Winner%20Fireworks_confetti.gif" alt="Winner Fireworks Confetti" width="220"></a> | <a href="assets/Winner%20Fireworks_firework.gif"><img src="assets/Winner%20Fireworks_firework.gif" alt="Winner Fireworks Firework" width="220"></a> | <a href="assets/Winner%20Fireworks_pulse.gif"><img src="assets/Winner%20Fireworks_pulse.gif" alt="Winner Fireworks Pulse" width="220"></a> |

ℹ️ **Weitere Hinweise**
- Ein Klick blendet das Overlay aus; falls es zu viel wird, wähle `pulse` oder reduziere Partikelanzahlen.

---

#### Animation: Autodarts Animate Dart Marker Emphasis

- Bezeichnung: Autodarts Animate Dart Marker Emphasis
- Datei: `Animation/Autodarts Animate Dart Marker Emphasis.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Emphasis.user.js)

📝 **Beschreibung**
- Zweck: Dart-Marker am Board größer/farbiger machen, optional mit Glow/Pulse.
- Trigger/Erkennung: SVG-Marker via `MARKER_SELECTOR`.
- Änderungen: setzt `r`, `fill` und Klassen auf Marker, damit Treffer besser zu sehen sind.

✅ **Einfache Variablen (Beispiele)**
- `MARKER_RADIUS = 6` oder `10`
- `MARKER_FILL = "rgb(49, 130, 206)"` oder `"red"`
- `EFFECT = "glow"` oder `"pulse"` oder `"none"`

⚙️ **Konfiguration (Variablen)**
| Variable          | Standard                                                    | Wirkung                          |
| ----------------- | ----------------------------------------------------------- | -------------------------------- |
| `MARKER_RADIUS`   | `6`                                                         | Radius der Treffer-Marker in px; größere Werte wirken auffälliger. |
| `MARKER_FILL`     | `rgb(49, 130, 206)`                                         | Füllfarbe der Marker (CSS-Farbwert). |
| `EFFECT`          | `glow`                                                      | Zusatz-Effekt: `pulse`, `glow`, `none`. |
| `MARKER_SELECTOR` | `circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]` | Selector für Board-Marker; bei SVG-Änderungen anpassen. |

🖼️ **Beispiele/Screenshots**
![Animate Dart Marker Emphasis](assets/Size%20Strokes.gif)

ℹ️ **Weitere Hinweise**
- Wenn Marker nicht erkannt werden, prüfe/aktualisiere `MARKER_SELECTOR`.
---

#### Animation: Autodarts Animate Dart Marker Darts

- Bezeichnung: Autodarts Animate Dart Marker Darts
- Datei: `Animation/Autodarts Animate Dart Marker Darts.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Dart%20Marker%20Darts.user.js)

📝 **Beschreibung**
- Zweck: ersetzt die Trefferpunkte am Board durch ein Dart-PNG, dessen Spitze genau auf dem Treffer sitzt.
- Animation: optionaler Flug mit leichtem Gravity-Bogen und kurzem Einschlag-Wobble.
- Trigger/Erkennung: SVG-Marker via `CONFIG.markerSelector`.
- Änderungen: legt ein SVG-Overlay mit `<image>`-Darts an, optional Rotation zur Boardmitte für bessere Ausrichtung.

✅ **Einfache Variablen (Beispiele)**
- `DART_DESIGN = "Dart_red.png"`
- `ANIMATE_DARTS = true` oder `false`
- `CONFIG.hideMarkers = true` oder `false`
- `CONFIG.animationStyle = "arc"` oder `"linear"`

⚙️ **Konfiguration (Variablen)**
| Variable                  | Standard                                                    | Wirkung                                                     |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| `DART_DESIGN`             | `Dart_autodarts.png`                                        | Dateiname des Dart-Designs (siehe Liste unten).             |
| `DART_BASE_URL`           | `https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/assets/` | Basis-URL für die Dart-Designs (bei Fork/Lokal anpassen). |
| `ANIMATE_DARTS`           | `true`                                                      | Schaltet die Flug-/Impact-Animation global an/aus.          |
| `CONFIG.dartImageUrl`     | `DART_BASE_URL + DART_DESIGN`                               | Komplette PNG-URL; leer = deaktiviert oder eigene URL setzen. |
| `CONFIG.dartLengthRatio`  | `0.416`                                                     | Länge relativ zum Board-Radius; steuert die Größe des Darts. |
| `CONFIG.dartAspectRatio`  | `472 / 198`                                                 | Seitenverhältnis des PNG; falsche Werte verzerren das Bild. |
| `CONFIG.tipOffsetXRatio`  | `0`                                                        | X-Offset der Spitze relativ zur Bildbreite (Ausrichtung).   |
| `CONFIG.tipOffsetYRatio`  | `130 / 198`                                                 | Y-Offset der Spitze relativ zur Bildhöhe (Ausrichtung).     |
| `CONFIG.rotateToCenter`   | `true`                                                     | Darts zur Boardmitte drehen (`true` empfohlen).             |
| `CONFIG.baseAngleDeg`     | `180`                                                      | Grundausrichtung des PNG; je nach Bild anpassen.            |
| `CONFIG.hideMarkers`      | `false`                                                    | Originale Trefferpunkte ausblenden.                         |
| `CONFIG.animateDarts`     | `ANIMATE_DARTS`                                             | Aktiviert die Animation pro Dart.                           |
| `CONFIG.animationStyle`   | `arc`                                                      | Flugstil: `arc` (Gravity-Bogen) oder `linear`.              |
| `CONFIG.flightDurationMs` | `320`                                                      | Flugzeit in Millisekunden.                                  |
| `CONFIG.flightDistanceRatio` | `1.2`                                                   | Start-Entfernung relativ zur Dart-Länge.                    |
| `CONFIG.arcHeightRatio`   | `0.18`                                                     | Höhe des Bogens relativ zur Dart-Länge.                     |
| `CONFIG.flightEasing`     | `cubic-bezier(0.15, 0.7, 0.2, 1)`                           | Timing-Funktion für den Flug.                               |
| `CONFIG.wobbleDurationMs` | `280`                                                      | Dauer des Einschlag-Wobble.                                 |
| `CONFIG.wobbleAngleDeg`   | `4`                                                        | Maximaler Wobble-Winkel in Grad.                            |
| `CONFIG.wobbleEasing`     | `cubic-bezier(0.2, 0.6, 0.2, 1)`                            | Timing-Funktion für den Wobble.                             |
| `CONFIG.blurPx`           | `2`                                                        | Bewegungsunschärfe während des Flugs.                       |
| `CONFIG.scaleFrom`        | `0.94`                                                     | Start-Scale während des Flugs.                              |
| `CONFIG.fadeFrom`         | `0.2`                                                      | Start-Opacity während des Flugs.                            |
| `CONFIG.markerSelector`   | `circle[style*="shadow-2dp"], circle[filter*="shadow-2dp"]` | Selector für Board-Marker; bei SVG-Änderungen anpassen.     |

🖼️ **Beispiele/Screenshots**
![Animate Dart Marker Darts](assets/Dart%20Marker%20Darts.png)

Designs (DART_DESIGN):
| Design | Vorschau | Design | Vorschau |
| --- | --- | --- | --- |
| `Dart_autodarts.png` | <a href="assets/Dart_autodarts.png"><img src="assets/Dart_autodarts.png" alt="Dart_autodarts" width="140"></a> | `Dart_blackblue.png` | <a href="assets/Dart_blackblue.png"><img src="assets/Dart_blackblue.png" alt="Dart_blackblue" width="140"></a> |
| `Dart_blackgreen.png` | <a href="assets/Dart_blackgreen.png"><img src="assets/Dart_blackgreen.png" alt="Dart_blackgreen" width="140"></a> | `Dart_blackred.png` | <a href="assets/Dart_blackred.png"><img src="assets/Dart_blackred.png" alt="Dart_blackred" width="140"></a> |
| `Dart_blue.png` | <a href="assets/Dart_blue.png"><img src="assets/Dart_blue.png" alt="Dart_blue" width="140"></a> | `Dart_camoflage.png` | <a href="assets/Dart_camoflage.png"><img src="assets/Dart_camoflage.png" alt="Dart_camoflage" width="140"></a> |
| `Dart_green.png` | <a href="assets/Dart_green.png"><img src="assets/Dart_green.png" alt="Dart_green" width="140"></a> | `Dart_pride.png` | <a href="assets/Dart_pride.png"><img src="assets/Dart_pride.png" alt="Dart_pride" width="140"></a> |
| `Dart_red.png` | <a href="assets/Dart_red.png"><img src="assets/Dart_red.png" alt="Dart_red" width="140"></a> | `Dart_white.png` | <a href="assets/Dart_white.png"><img src="assets/Dart_white.png" alt="Dart_white" width="140"></a> |
| `Dart_whitetrible.png` | <a href="assets/Dart_whitetrible.png"><img src="assets/Dart_whitetrible.png" alt="Dart_whitetrible" width="140"></a> | `Dart_yellow.png` | <a href="assets/Dart_yellow.png"><img src="assets/Dart_yellow.png" alt="Dart_yellow" width="140"></a> |
| `Dart_yellowscull.png` | <a href="assets/Dart_yellowscull.png"><img src="assets/Dart_yellowscull.png" alt="Dart_yellowscull" width="140"></a> |  |  |

ℹ️ **Weitere Hinweise**
- Wähle dein Dart-Design über `DART_DESIGN` im Skript.
- Animation komplett deaktivieren: `ANIMATE_DARTS = false`.
---

#### Animation: Autodarts Animate Checkout Board Targets

- Bezeichnung: Autodarts Animate Checkout Board Targets
- Datei: `Animation/Autodarts Animate Checkout Board Targets.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Checkout%20Board%20Targets.user.js)

📝 **Beschreibung**
- Zweck: markiert Checkout-Ziele auf dem Board (blink/pulse/glow), damit der nächste Wurf schneller erkannt wird.
- Trigger/Erkennung: parst `.suggestion` in X01, Variantencheck via `CONFIG.requireX01`.
- Änderungen: legt ein Overlay-SVG mit Ziel-Segmenten an und hebt passende Felder hervor.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.requireX01 = true` oder `false`
- `CONFIG.highlightTargets = "first"` oder `"all"`
- `CONFIG.effect = "pulse"` oder `"blink"` oder `"glow"`
- `CONFIG.color = "rgba(168, 85, 247, 0.85)"`
- `CONFIG.strokeColor = "rgba(168, 85, 247, 0.95)"`
- `CONFIG.animationMs = 1000` oder `600`
- `CONFIG.singleRing = "inner"` oder `"outer"` oder `"both"`

⚙️ **Konfiguration (Variablen)**
| Variable                    | Standard                   | Wirkung                                         |
| --------------------------- | -------------------------- | ----------------------------------------------- |
| `CONFIG.suggestionSelector` | `.suggestion`              | Selector für den Checkout-Vorschlag (Textquelle). |
| `CONFIG.variantElementId`   | `ad-ext-game-variant`      | Quelle für die Varianten-Erkennung.            |
| `CONFIG.requireX01`         | `true`                     | Aktiviert nur in X01; `false` nutzt es überall. |
| `CONFIG.highlightTargets`   | `first`                    | Markiert `first` (nur erstes Ziel) oder `all`.  |
| `CONFIG.effect`             | `pulse`                    | Effekt: `pulse`, `blink`, `glow`.               |
| `CONFIG.color`              | `rgba(168, 85, 247, 0.85)` | Füllfarbe der Ziele.                            |
| `CONFIG.strokeColor`        | `rgba(168, 85, 247, 0.95)` | Rahmenfarbe der Ziele.                          |
| `CONFIG.strokeWidthRatio`   | `0.008`                    | Rahmenstärke relativ zum Board-Radius.          |
| `CONFIG.animationMs`        | `1000`                     | Dauer der Animation in ms.                      |
| `CONFIG.singleRing`         | `both`                     | `inner`, `outer` oder `both` für Single-Ringe. |
| `CONFIG.edgePaddingPx`      | `1`                        | Zusatz-Padding für die Shapes (gegen Abschneiden). |
| `CONFIG.ringRatios`         | Objekt                     | Definiert Innen-/Außenradien für Single/Double/Triple/Bull als Anteil des Board-Radius; nur ändern, wenn das Board-SVG abweicht. |

🖼️ **Beispiele/Screenshots**
![Animate Checkout Board Targets](assets/Checkout%20Board%20Blink.gif)

ℹ️ **Weitere Hinweise**
- Setze `CONFIG.highlightTargets` auf `all`, wenn alle Ziele gleichzeitig markiert werden sollen.

---

#### Animation: Autodarts Style Checkout Suggestions

- Bezeichnung: Autodarts Style Checkout Suggestions
- Datei: `Animation/Autodarts Style Checkout Suggestions.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Style%20Checkout%20Suggestions.user.js)

📝 **Beschreibung**
- Zweck: stylt Checkout-Vorschläge als Empfehlung (Badge/Ribbon/Stripe/Ticket/Outline).
- Trigger/Erkennung: `.suggestion`, X01.
- Änderungen: setzt Klassen und CSS-Variablen am Vorschlags-Element, um Hinweise klarer hervorzuheben.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.requireX01 = true` oder `false`
- `CONFIG.formatStyle = "ribbon"` oder `"badge"` oder `"stripe"` oder `"ticket"` oder `"outline"`
- `CONFIG.labelText = "CHECKOUT"` oder `""`
- `CONFIG.accentColor = "#f59e0b"`
- `CONFIG.labelBackground = "#fcd34d"`
- `CONFIG.labelTextColor = "#1f1300"`
- `CONFIG.borderRadiusPx = 14` oder `8`
- `CONFIG.stripeOpacity = 0.35` oder `0.2`

⚙️ **Konfiguration (Variablen)**
| Variable                    | Standard                   | Wirkung                                                 |
| --------------------------- | -------------------------- | ------------------------------------------------------- |
| `CONFIG.suggestionSelector` | `.suggestion`              | Selector für den Vorschlags-Block.                     |
| `CONFIG.variantElementId`   | `ad-ext-game-variant`      | Quelle für die Varianten-Erkennung.                    |
| `CONFIG.requireX01`         | `true`                     | Aktiviert nur in X01; `false` nutzt es überall.         |
| `CONFIG.formatStyle`        | `ribbon`                   | Stil: `badge`, `ribbon`, `stripe`, `ticket`, `outline`. |
| `CONFIG.labelText`          | `CHECKOUT`                 | Text im Badge/Label (leer = kein Label).                |
| `CONFIG.accentColor`        | `#f59e0b`                  | Primäre Akzentfarbe für Rahmen/Glow.                    |
| `CONFIG.accentSoftColor`    | `rgba(245, 158, 11, 0.16)` | Weiche Akzentfläche für Hintergründe.                   |
| `CONFIG.accentStrongColor`  | `rgba(245, 158, 11, 0.6)`  | Starker Akzent für Glows/Highlights.                    |
| `CONFIG.labelBackground`    | `#fcd34d`                  | Hintergrundfarbe für das Label.                         |
| `CONFIG.labelTextColor`     | `#1f1300`                  | Textfarbe für das Label.                                |
| `CONFIG.borderRadiusPx`     | `14`                       | Rundung der Box in px.                                  |
| `CONFIG.stripeOpacity`      | `0.35`                     | Deckkraft der Stripe-Overlay-Fläche.                    |

🖼️ **Beispiele/Screenshots**
Das Vollbild zeigt die Ribbon-Variante, die kleineren Bilder sind Detailstreifen der anderen Stile.

| Vollbild (Ribbon) | Varianten (Badge, Stripe, Ticket, Outline) |
| --- | --- |
| <a href="assets/Checkout%20Suggestion%20Format%2000%20ribbon.png"><img src="assets/Checkout%20Suggestion%20Format%2000%20ribbon.png" alt="Checkout Suggestion Format Ribbon" width="360"></a> | <a href="assets/Checkout%20Suggestion%20Format%2001%20badge.png"><img src="assets/Checkout%20Suggestion%20Format%2001%20badge.png" alt="Checkout Suggestion Format Badge" width="220"></a><br><a href="assets/Checkout%20Suggestion%20Format%2002%20stripe.png"><img src="assets/Checkout%20Suggestion%20Format%2002%20stripe.png" alt="Checkout Suggestion Format Stripe" width="220"></a><br><a href="assets/Checkout%20Suggestion%20Format%2003%20ticket.png"><img src="assets/Checkout%20Suggestion%20Format%2003%20ticket.png" alt="Checkout Suggestion Format Ticket" width="220"></a><br><a href="assets/Checkout%20Suggestion%20Format%2004%20outline.png"><img src="assets/Checkout%20Suggestion%20Format%2004%20outline.png" alt="Checkout Suggestion Format Outline" width="220"></a> |

ℹ️ **Weitere Hinweise**
- Stilwechsel über `CONFIG.formatStyle`.
---

#### Animation: Autodarts Animate Cricket Target Highlighter

- Bezeichnung: Autodarts Animate Cricket Target Highlighter
- Datei: `Animation/Autodarts Animate Cricket Target Highlighter.user.js`
[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Animation/Autodarts%20Animate%20Cricket%20Target%20Highlighter.user.js)

📝 **Beschreibung**
- Zweck: blendet Nicht-Cricket-Felder aus und markiert 15–20/BULL nach Status.
- Trigger/Erkennung: Variante `cricket`, liest Cricket-Tabelle (Marks via Icons/Attribute/Text).
- Änderungen: Overlay-SVG mit Statusfarben (open/closed/score/danger/dead) für bessere Entscheidungen.

✅ **Einfache Variablen (Beispiele)**
- `CONFIG.showDeadTargets = true` oder `false`

⚙️ **Konfiguration (Variablen)**
| Variable                      | Standard                  | Wirkung                                                 |
| ----------------------------- | ------------------------- | ------------------------------------------------------- |
| `CONFIG.variantElementId`     | `ad-ext-game-variant`     | Quelle für die Varianten-Erkennung.                    |
| `CONFIG.tableSelector`        | `null`                    | Optional fixer Selector für die Cricket-Tabelle; `null` = automatische Erkennung, setze ihn wenn die Tabelle nicht gefunden wird. |
| `CONFIG.playerSelector`       | `.ad-ext-player`          | Selector für Player-Karten.                            |
| `CONFIG.activePlayerSelector` | `.ad-ext-player-active`   | Selector für den aktiven Player.                       |
| `CONFIG.markElementSelector`  | komplex                   | Regeln, wie Marks pro Ziel aus Icons/Attributen/Text gelesen werden; bei UI-Änderungen anpassen. |
| `CONFIG.showDeadTargets`      | `true`                    | Zeigt Ziele, die alle geschlossen haben.               |
| `CONFIG.strokeWidthRatio`     | `0.006`                   | Rahmenstärke relativ zum Board-Radius.                 |
| `CONFIG.edgePaddingPx`        | `0.8`                     | Zusatz-Padding für Shapes.                             |
| `CONFIG.baseColor`            | `{ r: 90, g: 90, b: 90 }` | Grundfarbe für ausgeblendete Bereiche.                 |
| `CONFIG.opacity.closed`       | `0.8`                     | Deckkraft für geschlossene Ziele.                      |
| `CONFIG.opacity.dead`         | `0.98`                    | Deckkraft für „dead“-Ziele.                            |
| `CONFIG.opacity.inactive`     | `0.8`                     | Deckkraft für inaktive Bereiche.                       |
| `CONFIG.highlight.score`      | RGB/Opacity               | Farbe für Score-Ziele (Spieler kann punkten).          |
| `CONFIG.highlight.danger`     | RGB/Opacity               | Farbe für Danger-Ziele (Gegner kann punkten).          |
| `CONFIG.ringRatios`           | Objekt                    | Innen-/Außenradien der Ring-Zonen als Anteil des Board-Radius; relevant bei Board-SVG-Änderungen. |
| `CONFIG.debug`                | `true`                    | Aktiviert Debug-Logs in der Konsole.                   |

🖼️ **Beispiele/Screenshots**
![Cricket Target Highlighter](assets/Cricket%20Target%20Highlighter.png)

ℹ️ **Weitere Hinweise**
- Debug-Ausgaben kannst du über `CONFIG.debug` abschalten.

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

[MIT-Lizenz](https://opensource.org/licenses/MIT)

## Haftungsausschluss

Dieses Projekt ist nicht mit Autodarts verbunden.
Änderungen an play.autodarts.io können Skript-Updates erforderlich machen.

