# Autodarts Tampermonkey Themes & Effekte

> Visuelle Tampermonkey-Skripte für Autodarts: Themes, Animationen und Lesbarkeit - ohne Eingriff in Spiellogik, Scores oder Erkennung.


## 📖 Einführung

Rein visuelle Tampermonkey-Skripte für [play.autodarts.io](https://play.autodarts.io).
Sie verändern keine Spiellogik, Scores oder Erkennung.
Diese Sammlung bündelt Themes, Animationen und Lesbarkeitsverbesserungen für Autodarts.
Viele Skripte aktivieren sich je nach Spielvariante automatisch und lassen sich unabhängig voneinander nutzen.

### ✨ Kurzübersicht

- Theme-Skripte, die sich je nach Spielvariante automatisch aktivieren.
- Gemeinsamer Layout-/Theme-Helfer für konsistentes Styling.
- Gemeinsamer Animations-Helfer für Observer, Variant-Checks und Board-Overlays.
- Optionale Animations- und Effekt-Skripte für bessere Lesbarkeit.
- Skripte reagieren automatisch, wenn sich die Spielansicht dynamisch ändert.
- DartsZoom-Vorschau optional unter den Würfen; Platz wird nur reserviert, wenn die Vorschau sichtbar ist.
- Es gibt genau eine Installationsmethode: **AD xConfig Auto Loader**.

### 🗂️ Ordnerstruktur

- `Template/`: Themes (Layout/Farben) je Spielvariante.
- `Animation/`: Animationen und Effekte.
- `Config/`: zentrale Steuerung (`AD xConfig.user.js`) und Auto-Loader (`AD xConfig Auto Loader.user.js`).
- `Template/autodarts-theme-shared.js`: gemeinsamer Helfer für die Themes (wird per `@require` geladen).
- `Animation/autodarts-animation-shared.js`: gemeinsamer Helfer für Animationen (wird per `@require` geladen).
- `assets/`: Screenshots, GIFs, Sounds und Design-Bilder.

### 🧭 Leseführung

- Erst Tampermonkey installieren, dann den **AD xConfig Auto Loader** installieren.
- Danach AD xConfig öffnen und Module aktivieren.
- Am Ende: Feedback, Testumgebung, Lizenz und Haftungsausschluss.


## 🚀 Schnellstart

1. Tampermonkey installieren (Chrome/Edge/Chromium): [tampermonkey.net](https://www.tampermonkey.net/index.php?browser=chrome)
2. **AD xConfig Auto Loader** installieren (einziger Installationsweg).
3. `https://play.autodarts.io` öffnen oder neu laden.
4. Im Hauptmenü **AD xConfig** öffnen und auf **„🔄 Skripte & Loader-Cache laden“** klicken.
5. Gewünschte Module auf **An** stellen und optional über **⚙ Einstellungen** anpassen.

Kurz gesagt: Installieren, Seite öffnen, fertig. Module und Updates kommen automatisch.


## ⭐ Einzige Installationsmethode: AD xConfig Auto Loader

Die einzige und empfohlene Implementierung ist **`Config/AD xConfig Auto Loader.user.js`**.
Der Loader lädt bei jedem Seitenstart automatisch die neueste `AD xConfig.user.js`, führt sie aus und nutzt bei Netzproblemen die zuletzt erfolgreiche Version aus dem lokalen Cache.

- Datei: `Config/AD xConfig Auto Loader.user.js`

[![Installieren](https://img.shields.io/badge/Installieren-Tampermonkey-2ea44f?style=for-the-badge)](https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/Config/AD%20xConfig%20Auto%20Loader.user.js)


![AD xConfig](assets/AD-xConfig.png)

### Warum diese Methode bevorzugt ist

- **Einfachheit:** Eine zentrale Oberfläche statt vieler einzelner Skript-Konfigurationen.
- **Weniger Pflegeaufwand:** Du musst keine einzelnen Theme-/Animations-Skripte installieren oder pflegen.
- **Live-Ladung aus GitHub:** Die Module werden direkt aus dem Repository geladen (über **„🔄 Skripte & Loader-Cache laden“**).
- **Automatische Aktualität:** Der Auto Loader lädt bei jedem Start die aktuelle AD xConfig-Version.
- **Ausfallsicher:** Bei kurzen Verbindungsproblemen wird die zuletzt erfolgreiche Version aus dem Cache verwendet.
- **Transparenz:** Laufzeitstatus, Versionen, Varianten und konfigurierbare Felder sind direkt sichtbar.

### Key-Features (besonders wichtig)

- **Ein/Aus je Skript:** Jedes Modul kann über **`An`** / **`Aus`** direkt geschaltet werden.
- **Eigene Einstellungen je Skript:** Über **`⚙ Einstellungen`** kannst du modulbezogene Optionen ändern (z. B. Designs, Effekte, Modi).
- **Dauerhaft gespeichert:** Aktivierungen und Einstellungen bleiben erhalten, auch nach Browser-Neustart (siehe Voraussetzungen unten).
- **Direkte Hilfe je Modul:** Über **`📖 Anleitung`** springst du aus der Modulkarte direkt zum passenden Abschnitt in dieser README.

### Installation und Nutzung

1. `AD xConfig Auto Loader.user.js` über den Installationsbutton installieren.
2. `https://play.autodarts.io` öffnen oder neu laden.
3. Im Hauptmenü erscheint der neue Button **AD xConfig**.
4. Im xConfig-Panel auf **„🔄 Skripte & Loader-Cache laden“** klicken.
5. Über die Schalter **An/Aus** die gewünschten Module aktivieren.
6. Optional pro Modul **`⚙ Einstellungen`** öffnen und eigene Konfiguration speichern.
7. Über **`📖 Anleitung`** direkt die zugehörige README-Stelle öffnen.

### Migration (wichtig)

Wenn `Config/AD xConfig.user.js` bereits direkt in Tampermonkey installiert ist, bitte deaktivieren oder deinstallieren.
Nutze nur den **AD xConfig Auto Loader**, damit keine Doppel-Ausführung entsteht.

### Tabs „Themen“ und „Animationen“

- **Themen:** Enthält Layout-/Design-Module (z. B. X01, Shanghai, Bermuda, Cricket, Bull-off).
- **Animationen:** Enthält visuelle Effekte und Hervorhebungen.
- Die Tabs dienen zur strukturierten Modulverwaltung; Aktivierung und Konfiguration erfolgen pro Karte.

### Tags und Badges in den Karten

Je Modulkarte werden Tags/Badges im Originaldesign angezeigt. Typische Bezeichnungen sind:

- `v2.2`
- `Gilt für: X01`
- `Gilt für: alle Modi`
- `Neue Einstellungen`
- `2 Einstellungen`
- `Laufzeit: geladen`
- `Laufzeit: fehlt (Cache)`
- `Laufzeit: blockiert`
- `Laufzeit: Fehler`

So siehst du schnell, was aktiv ist, ob ein Update vorliegt und ob ein Modul korrekt geladen wurde.

### Persistente Einstellungen (auch nach Browser-Neustart)

Einstellungen und Aktivierungen werden dauerhaft gespeichert und bleiben auch nach dem Schließen des Browsers erhalten, **wenn** folgende Voraussetzungen erfüllt sind:

- Du nutzt dasselbe Browser-Profil.
- Tampermonkey und Website-Daten sind nicht so konfiguriert, dass sie beim Schließen automatisch gelöscht werden.
- Du nutzt keinen Modus mit flüchtigem Speicher (z. B. strikter Privat-/Inkognito-Modus ohne Persistenz).

Technisch werden die Werte über Tampermonkey-Storage (bzw. Fallback `localStorage`) persistiert.


## 🧰 Tampermonkey

Tampermonkey ist eine Browser-Erweiterung, mit der du Userscripts auf Webseiten installieren kannst.
Downloadlink (Chrome/Edge/Chromium): [Tampermonkey](https://www.tampermonkey.net/index.php?browser=chrome)

Weiterführende Links:

- [Installation/Deinstallation](https://www.tampermonkey.net/faq.php#Q100)
- [Dashboard, Updates suchen und Skripte bearbeiten (Variablen ändern)](https://www.tampermonkey.net/faq.php#Q101)
- [Skripte installieren (inkl. „View raw“)](https://www.tampermonkey.net/faq.php#Q102)
- [Dokumentation](https://www.tampermonkey.net/documentation.php)

Nach der Installation findest du das Tampermonkey-Icon in der Browser-Toolbar.
Dort kannst du prüfen, ob der **AD xConfig Auto Loader** aktiv ist.
Einstellungen werden danach direkt in AD xConfig vorgenommen, nicht im Skriptcode.


## 📦 Installation

1. Installiere Tampermonkey.
2. Klicke oben auf den Installationsbutton für `Config/AD xConfig Auto Loader.user.js`.
3. Bestätige im Tampermonkey-Dialog mit „Installieren“.
4. Öffne `https://play.autodarts.io`.
5. Öffne im Hauptmenü **AD xConfig**.
6. Klicke auf **„🔄 Skripte & Loader-Cache laden“**.
7. Aktiviere gewünschte Module mit **An** und passe bei Bedarf **⚙ Einstellungen** an.

Troubleshooting:
- Wenn kein Installationsdialog erscheint, ist Tampermonkey nicht installiert oder deaktiviert.
- Wenn AD xConfig nicht sichtbar ist, Seite neu laden und prüfen, ob der Loader in Tampermonkey aktiviert ist.


## 🔄 Updates

- Der **AD xConfig Auto Loader** lädt bei jedem Seitenstart die aktuelle AD xConfig-Version aus GitHub.
- Bei Verbindungsproblemen verwendet der Loader automatisch die zuletzt erfolgreiche Cache-Version.
- In der Praxis reicht die einmalige Installation des Auto Loaders.


## 🧩 Module im Überblick

Die folgenden Modulkapitel sind die Ziele für den Button `📖 Anleitung` in AD xConfig.
Hier bekommst du pro Modul eine vollständige Anwender-Erklärung. Für interne Details (Selektoren, CSS, Low-Level-Variablen) nutze zusätzlich die [Technische Referenz](docs/TECHNIK-REFERENZ.md).

### 🧱 Templates

#### Gemeinsamer Helfer (autodarts-theme-shared.js, kein Userscript)

- Gilt für: `X01`, `Shanghai`, `Bermuda`, `Cricket`, `Bull-off`
- Was das Skript macht: Dieser Shared Helper liefert gemeinsame Layout- und Theme-Funktionen für alle Template-Module. Dadurch verhalten sich Varianten konsistent und Updates lassen sich zentral pflegen.
- xConfig-Einstellungen erklärt: Dieses Helfer-Skript hat keine eigenen xConfig-Felder.
- Screenshots / Varianten: kein eigenes UI-Modul, läuft im Hintergrund.
- Hinweise & Kombinationen: Du installierst den Helper nicht separat; er wird per `@require` von den Template-Skripten geladen.
- Technische Details: [Gemeinsamer Helfer (Theme)](docs/TECHNIK-REFERENZ.md#gemeinsamer-helfer-autodarts-theme-sharedjs-kein-userscript)

#### Template: Autodarts Theme X01

- Gilt für: `X01`
- Was das Skript macht: Das Modul gestaltet die X01-Ansicht neu, damit Scores, Player-Karten und Navigationsbereiche klarer und ruhiger lesbar sind. Es passt dafür Layout, Abstände und visuelle Prioritäten im Spielbild an.

**xConfig-Einstellungen erklärt**

- `xConfig_AVG_ANZEIGE` (`AVG anzeigen`)  
  Optionen: `An`, `Aus`  
  Wirkung: Blendet den AVG-Wert im X01-Theme ein oder aus.  
  Praxis: `An` ist sinnvoll für Training/Statistikfokus, `Aus` wenn du ein aufgeräumtes Minimal-Layout möchtest.  
  Wechselwirkung: Bei `Aus` wird auch der Trendpfeil aus `Autodarts Animate Average Trend Arrow` nicht angezeigt.

**Screenshots / Varianten**

- ![Template X01](assets/template-theme-x01-xConfig.png)
- DartsZoom-Platzierung:
- ![DartsZoom Standard](assets/template-theme-x01-preview-standard-readme.png)
- ![DartsZoom Under Throws](assets/template-theme-x01-preview-under-throws-readme.png)

**Hinweise & Kombinationen**

- Besonders hilfreich in Kombination mit `Autodarts Animate Turn Points Count` und `Autodarts Animate Average Trend Arrow`.
- Wenn du wenig visuelle Bewegung willst, nutze nur Theme + statische Lesbarkeitseffekte.

- Technische Details: [Template: Autodarts Theme X01](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-x01)

#### Template: Autodarts Theme Shanghai

- Gilt für: `Shanghai`
- Was das Skript macht: Das Modul überträgt das konsistente Theme-Konzept auf Shanghai und verbessert Lesefluss und Struktur ohne Eingriff in Spielmechanik.

**xConfig-Einstellungen erklärt**

- `xConfig_AVG_ANZEIGE` (`AVG anzeigen`)  
  Optionen: `An`, `Aus`  
  Wirkung: Blendet den AVG-Wert im Shanghai-Theme ein oder aus.  
  Praxis: `An` für Performance-Überblick, `Aus` für reduziertes UI bei kleinen Displays.

**Screenshots / Varianten**

- ![Template Shanghai](assets/template-theme-shanghai-xConfig.png)

**Hinweise & Kombinationen**

- Nutzt denselben Shared-Theme-Ansatz wie X01, daher ähnliche Optik und Bedienlogik.

- Technische Details: [Template: Autodarts Theme Shanghai](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-shanghai)

#### Template: Autodarts Theme Bermuda

- Gilt für: `Bermuda`
- Was das Skript macht: Liefert ein visuelles Bermuda-Theme mit konsistenten Farben, klarerem Kontrast und harmonisierten Abständen.

**xConfig-Einstellungen erklärt**

- Dieses Modul hat aktuell keine separaten xConfig-Felder.
- Verhalten und Design kommen direkt aus dem Theme-Skript und dem Shared Helper.

**Screenshots / Varianten**

- ![Template Bermuda](assets/template-theme-bermuda-xConfig.png)

**Hinweise & Kombinationen**

- Geeignet als „einmal aktivieren und laufen lassen“-Theme ohne zusätzliche Feineinstellungen.

- Technische Details: [Template: Autodarts Theme Bermuda](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-bermuda)

#### Template: Autodarts Theme Cricket

- Gilt für: `Cricket`
- Was das Skript macht: Passt Cricket farblich und strukturell an, damit Ziele, Spielerbereiche und Statusinformationen schneller erfassbar sind.

**xConfig-Einstellungen erklärt**

- `xConfig_AVG_ANZEIGE` (`AVG anzeigen`)  
  Optionen: `An`, `Aus`  
  Wirkung: Blendet den AVG-Wert im Cricket-Theme ein oder aus.  
  Praxis: `An` für Trainingsfokus, `Aus` wenn du die Board-/Zielinformation visuell priorisieren willst.

**Screenshots / Varianten**

- ![Template Cricket](assets/template-theme-cricket-xConfig.png)

**Hinweise & Kombinationen**

- Besonders sinnvoll mit `Autodarts Animate Cricket Target Highlighter`, da Theme und Overlay sich gut ergänzen.

- Technische Details: [Template: Autodarts Theme Cricket](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-cricket)

#### Template: Autodarts Theme Bull-off

- Gilt für: `Bull-off`
- Was das Skript macht: Bull-off-spezifisches Theme mit bull-fokussierter Farbgebung und stärkerer Trennung wichtiger UI-Bereiche.

**xConfig-Einstellungen erklärt**

- `xConfig_KONTRAST_PRESET` (`Kontrast-Preset`)  
  Optionen: `Sanft`, `Standard`, `Kräftig`  
  Wirkung: Regelt, wie stark Linien, Leuchteffekte und Flächenkontraste dargestellt werden.  
  Praxis: `Sanft` bei empfindlichen Augen/hellen Displays, `Standard` als Allround-Einstellung, `Kräftig` für maximale Sichtbarkeit auf Distanz.

**Screenshots / Varianten**

- ![Template Bull-off](assets/template-theme-bull-off-xConfig.png)

**Hinweise & Kombinationen**

- Bei sehr kontrastreichen Monitorprofilen zuerst mit `Standard` starten und nur bei Bedarf erhöhen.

- Technische Details: [Template: Autodarts Theme Bull-off](docs/TECHNIK-REFERENZ.md#template-autodarts-theme-bull-off)

### 🎬 Animationen

#### Gemeinsamer Helfer (autodarts-animation-shared.js, kein Userscript)

- Gilt für: alle Animationsmodule
- Was das Skript macht: Stellt gemeinsame Funktionen für Beobachtung, Variantenprüfung und robuste Triggererkennung bereit.
- xConfig-Einstellungen erklärt: Dieses Helfer-Skript hat keine eigenen xConfig-Felder.
- Screenshots / Varianten: kein eigenes UI-Modul, läuft im Hintergrund.
- Hinweise & Kombinationen: Du installierst den Helper nicht separat; er wird per `@require` von den Animationsskripten geladen.
- Technische Details: [Gemeinsamer Helfer (Animation)](docs/TECHNIK-REFERENZ.md#gemeinsamer-helfer-autodarts-animation-sharedjs-kein-userscript)

#### Animation: Autodarts Animate Triple Double Bull Hits

- Gilt für: `alle Modi`
- Was das Skript macht: Hebt Trefferarten in der Wurfliste farbig und animiert hervor, damit Triple/Double/Bull sofort auffallen.

**xConfig-Einstellungen erklärt**

- `xConfig_TRIPLE_HERVORHEBEN` (`Triple hervorheben`)  
  Optionen: `An`, `Aus`  
  Wirkung: Triple-Treffer (T1-T20) werden markiert.  
  Praxis: Für Trainingsanalyse meist `An`.

- `xConfig_DOUBLE_HERVORHEBEN` (`Double hervorheben`)  
  Optionen: `An`, `Aus`  
  Wirkung: Double-Treffer (D1-D20) werden markiert.  
  Praxis: Besonders nützlich beim Check-out-Training.

- `xConfig_BULL_HERVORHEBEN` (`Bull hervorheben`)  
  Optionen: `An`, `Aus`  
  Wirkung: Bull-Treffer werden separat hervorgehoben.  
  Praxis: `An`, wenn Bull als taktisches Ziel oft relevant ist.

- `xConfig_AKTUALISIERUNGSMODUS` (`Aktualisierungsmodus`)  
  Optionen: `Nur Live (Observer)`, `Kompatibel (zusätzliches Polling)`  
  Wirkung: Steuert Trigger-Verhalten zwischen minimaler Last und maximaler Robustheit.  
  Praxis: Erst `Nur Live`, bei selten verpassten Updates auf `Kompatibel` wechseln.

**Screenshots / Varianten**

- ![Triple Double Bull Hits](assets/animation-animate-triple-double-bull-hits.gif)

**Hinweise & Kombinationen**

- Kann parallel zu Sound-/Marker-Modulen laufen, da nur die Wurfliste gestylt wird.

- Technische Details: [Animation: Autodarts Animate Triple Double Bull Hits](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-triple-double-bull-hits)

#### Animation: Autodarts Animate Single Bull Sound

- Gilt für: `alle Modi`
- Was das Skript macht: Spielt bei erkannten Single-Bull-Einträgen in der Wurfliste einen Ton ab.

**xConfig-Einstellungen erklärt**

- `xConfig_LAUTSTAERKE` (`Lautstärke`)  
  Optionen: `Leise`, `Mittel`, `Laut`, `Sehr laut`  
  Wirkung: Lautstärke des abgespielten Sounds.  
  Praxis: Bei Streams/Voice-Chat eher `Leise`/`Mittel`, sonst `Laut`.

- `xConfig_WIEDERHOLSPERRE_MS` (`Wiederholsperre`)  
  Optionen: `Kurz`, `Standard`, `Lang`  
  Wirkung: Verhindert Doppeltrigger in kurzer Folge.  
  Praxis: Bei doppelten Sounds den Wert erhöhen.

- `xConfig_FALLBACK_SCAN_MS` (`Fallback-Scan`)  
  Optionen: `Aus`, `Ein (robuster)`  
  Wirkung: Aktiviert zusätzlichen Scan für seltene DOM-Sonderfälle.  
  Praxis: Normalerweise `Aus`; nur bei unzuverlässiger Erkennung aktivieren.

**Screenshots / Varianten**

- Visuelles Primärsignal: keines (Audio-Modul).
- Sound-Datei: [singlebull.mp3](assets/singlebull.mp3)

**Hinweise & Kombinationen**

- Lässt sich sehr gut mit `Autodarts Animate Triple Double Bull Hits` kombinieren (visuell + akustisch).

- Technische Details: [Animation: Autodarts Animate Single Bull Sound](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-single-bull-sound)

#### Animation: Autodarts Animate Checkout Score Pulse

- Gilt für: `X01`
- Was das Skript macht: Hebt den aktiven Score visuell hervor, sobald ein Checkout-Zustand erkannt wird.

**xConfig-Einstellungen erklärt**

- `xConfig_EFFEKT` (`Effekt`)  
  Optionen: `Pulse`, `Glow`, `Scale`, `Blink`  
  Wirkung: Bestimmt die Art der Animation.  
  Praxis: `Pulse`/`Glow` sind meist ruhiger, `Blink` ist am auffälligsten.

- `xConfig_FARBTHEMA` (`Farbthema`)  
  Optionen: `Grün (Standard)`, `Cyan`, `Amber`, `Rot`  
  Wirkung: Farbton für Highlight und Glow.  
  Praxis: `Amber`/`Rot` sind bei heller Umgebung oft besser sichtbar.

- `xConfig_INTENSITAET` (`Intensität`)  
  Optionen: `Dezent`, `Standard`, `Stark`  
  Wirkung: Steuert Stärke des Effekts.  
  Praxis: Für Dauerbetrieb meist `Dezent` oder `Standard`.

- `xConfig_TRIGGER_QUELLE` (`Trigger-Quelle`)  
  Optionen: `Vorschlag zuerst`, `Nur Score`, `Nur Vorschlag`  
  Wirkung: Legt fest, welche Datenquelle den Effekt startet.  
  Praxis: `Vorschlag zuerst` ist im Alltag am robustesten.

**Screenshots / Varianten**

- ![Checkout Score Pulse](assets/animation-checkout-score-pulse.gif)

**Hinweise & Kombinationen**

- Ergänzt sich gut mit `Autodarts Animate Checkout Board Targets`.

- Technische Details: [Animation: Autodarts Animate Checkout Score Pulse](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-checkout-score-pulse)

#### Animation: Autodarts Animate Turn Points Count

- Gilt für: `alle Modi`
- Was das Skript macht: Animiert Punktänderungen bei Turn-Updates, damit Score-Sprünge leichter nachvollziehbar sind.

**xConfig-Einstellungen erklärt**

- `xConfig_ANIMATIONSDAUER_MS` (`Animationsdauer`)  
  Optionen: `Schnell`, `Standard`, `Langsam`  
  Wirkung: Bestimmt die Dauer der Zählanimation.  
  Praxis: `Schnell` für wenig Ablenkung, `Langsam` für bessere Nachverfolgung größerer Sprünge.

**Screenshots / Varianten**

- ![Turn Points Count](assets/animation-turn-points-count-xConfig.gif)
- Detailansicht: ![Turn Points Count Detail](assets/animation-turn-points-count-detail-readme.gif)

**Hinweise & Kombinationen**

- Bei sehr vielen parallelen Effekten ggf. auf `Schnell` stellen, um visuelle Last zu senken.

- Technische Details: [Animation: Autodarts Animate Turn Points Count](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-turn-points-count)

#### Animation: Autodarts Animate Average Trend Arrow

- Gilt für: `alle Modi`
- Was das Skript macht: Zeigt AVG-Trends mit einem kurzen Auf-/Ab-Pfeil direkt an der AVG-Anzeige.

**xConfig-Einstellungen erklärt**

- `xConfig_ANIMATIONSDAUER_MS` (`Animationsdauer`)  
  Optionen: `Schnell`, `Standard`, `Langsam`  
  Wirkung: Dauer der Pfeilanimation.  
  Praxis: `Standard` als guter Mittelweg, `Schnell` bei ruhigem Layout.

- `xConfig_PFEIL_GROESSE` (`Pfeil-Größe`)  
  Optionen: `Klein`, `Standard`, `Groß`  
  Wirkung: Größe des Trendpfeils.  
  Praxis: `Groß` bei größerem Monitorabstand, `Klein` bei kompaktem UI.

**Screenshots / Varianten**

- ![Average Trend Arrow](assets/animation-average-trend-arrow-xConfig.png)

**Hinweise & Kombinationen**

- Wenn im Theme `xConfig_AVG_ANZEIGE = Aus` aktiv ist, erscheint auch dieser Trendpfeil nicht.

- Technische Details: [Animation: Autodarts Animate Average Trend Arrow](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-average-trend-arrow)

#### Animation: Autodarts Animate Turn Start Sweep

- Gilt für: `alle Modi`
- Was das Skript macht: Blendet bei aktivem Spielerwechsel einen kurzen Sweep/Lichtstreifen ein.

**xConfig-Einstellungen erklärt**

- `xConfig_SWEEP_GESCHWINDIGKEIT_MS` (`Sweep-Geschwindigkeit`)  
  Optionen: `Schnell`, `Standard`, `Langsam`  
  Wirkung: Dauer des Sweeps.  
  Praxis: `Schnell` bei dynamischem Spieltempo, `Langsam` für deutliche Orientierung.

- `xConfig_SWEEP_STIL` (`Sweep-Stil`)  
  Optionen: `Dezent`, `Standard`, `Stark`  
  Wirkung: Intensität und Sichtbarkeit des Lichtstreifens.  
  Praxis: `Dezent` für unaufdringliches UI, `Stark` bei größerem Abstand zum Display.

**Screenshots / Varianten**

- ![Turn Start Sweep](assets/animation-turn-start-sweep-xConfig.gif)

**Hinweise & Kombinationen**

- Sehr gut kombinierbar mit `Turn Points Count`, weil beide unterschiedliche Situationen markieren.

- Technische Details: [Animation: Autodarts Animate Turn Start Sweep](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-turn-start-sweep)

#### Animation: Autodarts Animate Remove Darts Notification

- Gilt für: `alle Modi`
- Was das Skript macht: Ersetzt die TakeOut-Notifikation aus „Tools für Autodarts“ durch ein klar erkennbares Bildsignal.

**xConfig-Einstellungen erklärt**

- `xConfig_BILDGROESSE` (`Bildgröße`)  
  Optionen: `Kompakt`, `Standard`, `Groß`  
  Wirkung: Skaliert die Anzeigegröße der Notifikation.  
  Praxis: `Groß` bei Distanz zur Anzeige, `Kompakt` bei kleinen Auflösungen.

- `xConfig_PULSE_ANIMATION` (`Pulse-Animation`)  
  Optionen: `An`, `Aus`  
  Wirkung: Aktiviert/deaktiviert den Puls-Effekt.  
  Praxis: `Aus`, wenn du ein statisches Bild bevorzugst.

- `xConfig_PULSE_STAERKE` (`Pulse-Stärke`)  
  Optionen: `Dezent`, `Standard`, `Stark`  
  Wirkung: Stärke der Skalierung beim Puls.  
  Praxis: `Stark` nur verwenden, wenn du bewusst maximale Auffälligkeit willst.  
  Wechselwirkung: Bei `xConfig_PULSE_ANIMATION = Aus` hat die Pulse-Stärke keinen sichtbaren Effekt.

**Screenshots / Varianten**

- ![Remove Darts Notification](assets/animation-remove-darts-notification-xConfig.png)

**Hinweise & Kombinationen**

- Sinnvoll in Setups, in denen die Originalmeldung zu klein oder zu unauffällig ist.

- Technische Details: [Animation: Autodarts Animate Remove Darts Notification](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-remove-darts-notification)

#### Animation: Autodarts Animate Winner Fireworks

- Gilt für: `alle Modi`
- Was das Skript macht: Zeigt beim Gewinner ein Overlay mit wählbarem Effekt an.

**xConfig-Einstellungen erklärt**

- `xConfig_EFFEKT` (`Effekt`)  
  Optionen: `Firework`, `Confetti`, `Aurora`, `Pulse`  
  Wirkung: Wählt den visuellen Gewinner-Effekt.  
  Praxis: `Confetti`/`Pulse` sind meist ruhiger als `Firework`.

- `xConfig_PERFORMANCE` (`Performance`)  
  Optionen: `Schonend`, `Ausgewogen`, `Intensiv`  
  Wirkung: Regelt Partikeldichte und Renderlast.  
  Praxis: Bei älterer Hardware `Schonend`, sonst `Ausgewogen` als Standard.

**Screenshots / Varianten**

- ![Winner Fireworks Standard](assets/animation-winner-fireworks-xConfig.gif)
- Varianten:
- ![Winner Fireworks Aurora](assets/animation-winner-fireworks-aurora-readme.gif)
- ![Winner Fireworks Confetti](assets/animation-winner-fireworks-confetti-readme.gif)
- ![Winner Fireworks Firework](assets/animation-winner-fireworks-firework-readme.gif)
- ![Winner Fireworks Pulse](assets/animation-winner-fireworks-pulse-readme.gif)

**Hinweise & Kombinationen**

- Wenn das Overlay zu „schwer“ wirkt, zuerst `Performance` auf `Schonend` reduzieren.

- Technische Details: [Animation: Autodarts Animate Winner Fireworks](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-winner-fireworks)

#### Animation: Autodarts Animate Dart Marker Emphasis

- Gilt für: `alle Modi`
- Was das Skript macht: Passt die Board-Marker visuell an und kann sie zusätzlich per Glow/Pulse hervorheben.

**xConfig-Einstellungen erklärt**

- `xConfig_MARKER_GROESSE` (`Marker-Größe`)  
  Optionen: `Klein`, `Standard`, `Groß`  
  Wirkung: Ändert die Markergröße.  
  Praxis: `Groß` für bessere Sichtbarkeit auf Distanz.

- `xConfig_MARKER_FARBE` (`Marker-Farbe`)  
  Optionen: `Blau (Standard)`, `Grün`, `Rot`, `Gelb`, `Weiß`  
  Wirkung: Legt die Markerfarbe fest.  
  Praxis: Wähle eine Farbe mit hohem Kontrast zu deinem Theme.

- `xConfig_EFFEKT` (`Effekt`)  
  Optionen: `Glow`, `Pulse`, `Kein Effekt`  
  Wirkung: Art der Hervorhebung.  
  Praxis: `Glow` ist meist ruhiger als `Pulse`.

- `xConfig_MARKER_OPAZITAET` (`Marker-Sichtbarkeit`)  
  Optionen: `Dezent (65%)`, `Standard (85%)`, `Voll sichtbar (100%)`  
  Wirkung: Steuert die Grundsichtbarkeit.  
  Praxis: Bei überladenem UI auf `Dezent` reduzieren.

- `xConfig_OUTLINE` (`Outline-Farbe`)  
  Optionen: `Aus`, `Weiß`, `Schwarz`  
  Wirkung: Fügt optionalen Rand zur besseren Trennung hinzu.  
  Praxis: Bei hellen Themes oft `Schwarz`, bei dunklen Themes häufig `Weiß`.

**Screenshots / Varianten**

- ![Dart Marker Emphasis](assets/animation-dart-marker-emphasis-xConfig.gif)

**Hinweise & Kombinationen**

- Mit `Autodarts Animate Dart Marker Darts` kombinierbar, aber bei ausgeblendeten Original-Markern nicht sichtbar.

- Technische Details: [Animation: Autodarts Animate Dart Marker Emphasis](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-dart-marker-emphasis)

#### Animation: Autodarts Animate Dart Marker Darts

- Gilt für: `alle Modi`
- Was das Skript macht: Ersetzt runde Treffer-Marker durch Dartbilder und animiert neue Treffer optional als Flug mit Einschlag.

**xConfig-Einstellungen erklärt**

- `xConfig_DART_DESIGN` (`Dart Design`)  
  Optionen: `Autodarts (Standard)`, `Black Blue`, `Black Green`, `Black Red`, `Blue`, `Camouflage`, `Green`, `Pride`, `Red`, `White`, `White Triple`, `Yellow`, `Yellow Skull`  
  Wirkung: Wählt das verwendete Dartbild für Markerersatz.  
  Praxis: Für schnelle Erkennung kontrastreiche Designs wählen (`White`, `Yellow`, `Red`).

- `xConfig_ANIMATE_DARTS` (`Dart Fluganimation`)  
  Optionen: `Aktiv`, `Inaktiv`  
  Wirkung: Schaltet Flug-, Einschlag- und Wobble-Animation ein/aus.  
  Praxis: `Inaktiv` für maximale Ruhe/Performance, `Aktiv` für „echtes Dartgefühl“.

- `xConfig_DART_GROESSE` (`Dart-Größe`)  
  Optionen: `Klein (90%)`, `Standard (100%)`, `Groß (115%)`  
  Wirkung: Skaliert die Dartbilder.  
  Praxis: `Groß` bei Distanz zum Screen, `Klein` bei engem Board-Layout.

- `xConfig_ORIGINAL_MARKER_AUSBLENDEN` (`Original-Marker ausblenden`)  
  Optionen: `An`, `Aus`  
  Wirkung: Blendet runde Originaltreffer aus, sodass nur Dartbilder bleiben.  
  Praxis: `An` für sauberen Dart-Look, `Aus` falls du die Originalpunkte als Fallback sehen willst.  
  Wechselwirkung: Bei `An` sind Emphasis-Marker aus `Autodarts Animate Dart Marker Emphasis` naturgemäß nicht sichtbar.

- `xConfig_FLUGGESCHWINDIGKEIT` (`Fluggeschwindigkeit`)  
  Optionen: `Schnell`, `Standard`, `Cinematic`  
  Wirkung: Bestimmt die Dauer der Dart-Fluganimation.  
  Praxis: `Schnell` für Turnierfluss, `Cinematic` für Show-/Demo-Setups.

**Screenshots / Varianten**

- Hauptansicht: ![Dart Marker Darts](assets/animation-dart-marker-darts-xConfig.png)
- Detailansicht: ![Animate Dart Marker Darts](assets/animation-dart-marker-darts-readme.png)
- Dartdesign-Galerie:

| Design | Vorschau | Design | Vorschau |
| :-- | :-- | :-- | :-- |
| `Dart_autodarts.png` | ![Dart_autodarts](assets/Dart_autodarts.png) | `Dart_blackblue.png` | ![Dart_blackblue](assets/Dart_blackblue.png) |
| `Dart_blackgreen.png` | ![Dart_blackgreen](assets/Dart_blackgreen.png) | `Dart_blackred.png` | ![Dart_blackred](assets/Dart_blackred.png) |
| `Dart_blue.png` | ![Dart_blue](assets/Dart_blue.png) | `Dart_camoflage.png` | ![Dart_camoflage](assets/Dart_camoflage.png) |
| `Dart_green.png` | ![Dart_green](assets/Dart_green.png) | `Dart_pride.png` | ![Dart_pride](assets/Dart_pride.png) |
| `Dart_red.png` | ![Dart_red](assets/Dart_red.png) | `Dart_white.png` | ![Dart_white](assets/Dart_white.png) |
| `Dart_whitetrible.png` | ![Dart_whitetrible](assets/Dart_whitetrible.png) | `Dart_yellow.png` | ![Dart_yellow](assets/Dart_yellow.png) |
| `Dart_yellowscull.png` | ![Dart_yellowscull](assets/Dart_yellowscull.png) |  |  |

**Hinweise & Kombinationen**

- Für klare Trefferanzeige meist: `Original-Marker ausblenden = An`, `Dart-Größe = Standard`, kontraststarkes Design.
- Wenn du parallel Marker-Effekte sehen willst, `Original-Marker ausblenden = Aus` verwenden.

- Technische Details: [Animation: Autodarts Animate Dart Marker Darts](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-dart-marker-darts)

#### Animation: Autodarts Animate Checkout Board Targets

- Gilt für: `X01`
- Was das Skript macht: Markiert empfohlene Checkout-Zielbereiche direkt am Board (inkl. Single/Double/Bull-Logik).

**xConfig-Einstellungen erklärt**

- `xConfig_EFFEKT` (`Effekt`)  
  Optionen: `Pulse`, `Blink`, `Glow`  
  Wirkung: Darstellungsart der Zielanimation.  
  Praxis: `Glow` ist meist am ruhigsten, `Blink` am auffälligsten.

- `xConfig_ZIELUMFANG` (`Zielumfang`)  
  Optionen: `Erstes Ziel`, `Alle Ziele`  
  Wirkung: Markiert nur das erste oder alle Ziele einer Suggestion.  
  Praxis: `Erstes Ziel` für Fokus, `Alle Ziele` zum Lernen von Wegen.

- `xConfig_SINGLE_RING` (`Single-Ring`)  
  Optionen: `Beide Ringe`, `Nur innen`, `Nur außen`  
  Wirkung: Steuert, welcher Single-Ring hervorgehoben wird.  
  Praxis: Für klare Zielvorgabe oft `Nur innen` oder `Nur außen`.

- `xConfig_FARBTHEMA` (`Farbthema`)  
  Optionen: `Violett (Standard)`, `Cyan`, `Amber`  
  Wirkung: Farbpalette für Zielmarkierung.  
  Praxis: Wähle das Thema mit dem besten Kontrast zu deinem Theme.

- `xConfig_KONTUR_INTENSITAET` (`Kontur-Intensität`)  
  Optionen: `Dezent`, `Standard`, `Stark`  
  Wirkung: Stärke der weißen Zielkontur.  
  Praxis: Bei größerem Abstand `Stark`, sonst `Dezent`/`Standard`.

**Screenshots / Varianten**

- ![Checkout Board Targets](assets/animation-checkout-board-targets.gif)

**Hinweise & Kombinationen**

- Kombiniert sich gut mit `Autodarts Animate Checkout Score Pulse` für Board + Score Hinweis.

- Technische Details: [Animation: Autodarts Animate Checkout Board Targets](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-checkout-board-targets)

#### Animation: Autodarts Style Checkout Suggestions

- Gilt für: `X01`
- Was das Skript macht: Formatiert den Checkout-Suggestion-Bereich in klarere, visuell schnell erfassbare Karten-/Label-Stile um.

**xConfig-Einstellungen erklärt**

- `xConfig_STIL` (`Stil`)  
  Optionen: `Badge`, `Ribbon`, `Stripe`, `Ticket`, `Outline`  
  Wirkung: Grunddarstellung des Suggestion-Elements.  
  Praxis: `Stripe`/`Badge` als guter Alltag, `Ticket`/`Ribbon` für deutlichere Akzente.

- `xConfig_LABELTEXT` (`Labeltext`)  
  Optionen: `CHECKOUT`, `FINISH`, `Kein Label`  
  Wirkung: Textlabel über der Suggestion.  
  Praxis: `Kein Label` für minimalistisches Layout.

- `xConfig_FARBTHEMA` (`Farbthema`)  
  Optionen: `Amber (Standard)`, `Cyan`, `Rose`  
  Wirkung: Farbpalette für Akzente und Label.  
  Praxis: Farbe passend zum Theme-Kontrast wählen.

**Screenshots / Varianten**

- ![Style Checkout Suggestions (xConfig)](assets/animation-style-checkout-suggestions-xConfig.png)
- Varianten:
- ![Format Badge](assets/animation-style-checkout-suggestions-format-badge-readme.png)
- ![Format Ribbon](assets/animation-style-checkout-suggestions-format-ribbon-readme.png)
- ![Format Stripe](assets/animation-style-checkout-suggestions-format-stripe-readme.png)
- ![Format Ticket](assets/animation-style-checkout-suggestions-format-ticket-readme.png)
- ![Format Outline](assets/animation-style-checkout-suggestions-format-outline-readme.png)

**Hinweise & Kombinationen**

- Für hohe Lesbarkeit zuerst über `Stil` entscheiden, dann Farbe und Labeltext feinjustieren.

- Technische Details: [Animation: Autodarts Style Checkout Suggestions](docs/TECHNIK-REFERENZ.md#animation-autodarts-style-checkout-suggestions)

#### Animation: Autodarts Animate Cricket Target Highlighter

- Gilt für: `Cricket`
- Was das Skript macht: Visualisiert Board-Ziele im Cricket nach Zustand (z. B. Score/Danger/Dead), damit Entscheidungen schneller fallen.

**xConfig-Einstellungen erklärt**

- `xConfig_DEAD_ZIELE_ANZEIGEN` (`Dead-Ziele anzeigen`)  
  Optionen: `An`, `Aus`  
  Wirkung: Zeigt/versteckt Ziele, die bei allen Spielern bereits geschlossen sind.  
  Praxis: `Aus` für klareren Fokus auf relevante Ziele.

- `xConfig_FARBTHEMA` (`Farbthema`)  
  Optionen: `Standard`, `High Contrast`  
  Wirkung: Farbprofil der Overlay-Hervorhebung.  
  Praxis: `High Contrast` bei schwierigen Lichtverhältnissen.

- `xConfig_INTENSITAET` (`Intensität`)  
  Optionen: `Dezent`, `Standard`, `Stark`  
  Wirkung: Deckkraft/Kontrast der Markierungen.  
  Praxis: `Stark` bei Distanz, `Dezent` wenn das Board optisch ruhig bleiben soll.

**Screenshots / Varianten**

- ![Cricket Target Highlighter](assets/animation-cricket-target-highlighter-xConfig.png)
- Detail: ![Cricket Target Highlighter Detail](assets/animation-cricket-target-highlighter-readme.png)

**Hinweise & Kombinationen**

- Besonders effektiv zusammen mit dem `Template: Autodarts Theme Cricket`.

- Technische Details: [Animation: Autodarts Animate Cricket Target Highlighter](docs/TECHNIK-REFERENZ.md#animation-autodarts-animate-cricket-target-highlighter)

## ❓ FAQ

**Muss ich einzelne Skripte separat installieren?**  
Nein. Installiere nur den `AD xConfig Auto Loader`.

**Kann ich die Module direkt im Code anpassen?**  
Ja, aber empfohlen ist die Konfiguration über AD xConfig (`An/Aus`, `⚙ Einstellungen`).

**Bleiben meine Einstellungen nach einem Browser-Neustart erhalten?**  
Ja, sofern Browser-Profil und Tampermonkey-Daten nicht automatisch gelöscht werden.

**Warum sehe ich ein Modul nicht in Aktion?**  
Prüfe die Spielvariante und ob das Modul dafür freigegeben ist (`X01`, `Cricket`, `Bermuda`, `Shanghai`, `Bull-off` oder `alle Modi`).

**Wo finde ich alle technischen Details?**  
In der [Technischen Referenz](docs/TECHNIK-REFERENZ.md).

## 🐞 Fehler und Feedback

- Fehler bitte über [GitHub Issues](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues) melden.
- Direkt zum Fehlerformular: [Bug melden](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%90%9E-bug-melden.md)
- Feature-Wünsche bitte über [Feature vorschlagen](https://github.com/thomasasen/autodarts-tampermonkey-themes/issues/new?template=%F0%9F%92%A1-feature-vorschlagen.md)
- Fragen und allgemeines Feedback bitte über [GitHub Discussions](https://github.com/thomasasen/autodarts-tampermonkey-themes/discussions)

Bitte gib wenn möglich Browser, Tampermonkey-Version, Skript-Version, Autodarts-Variante und Reproduktionsschritte an.
Unvollständige Fehlermeldungen ohne Versionen oder Reproduktionsschritte können geschlossen werden.


## 🧪 Hinweis zur Nutzung und Testumgebung

Ich mache das primär privat für mich, freue mich aber, wenn andere von der Arbeit profitieren.
Wenn dir die Skripte helfen, empfehle sie gern weiter. Feedback – positiv oder kritisch – ist jederzeit willkommen.

Ich teste in meiner Umgebung mit installierten Autodarts-Tools ([tools-for-autodarts](https://github.com/creazy231/tools-for-autodarts)).
Das kann ggf. Einfluss auf die Funktionen meiner Skripte haben.
Folgende Einstellungen habe ich unter Matches aktiv:

| Einstellung                 | Status |
| :-------------------------- | :----- |
| COLORS                      | Off    |
| AUTO NEXT PLAYER ON TAKEOUT | On     |
| SMALLER SCORES              | On     |
| STREAMING MODE              | Off    |
| LARGER PLAYER NAMES         | On     |
| WINNER ANIMATION            | On     |
| DARTS ZOOM                  | Off    |
| ENHANCED SCORING DISPLAY    | On     |
| TAKEOUT NOTIFICATION        | On     |
| AUTOMATIC NEXT LEG          | On     |
| HIDE MENU IN MATCH          | On     |
| LARGER LEGS/SETS            | Off    |
| LARGER PLAYER MATCH DATA    | On     |
| AUTOMATIC FULLSCREEN        | On     |
| QUICK CORRECTION            | On     |
| INSTANT REPLAY              | Off    |


## 🙏 Danksagung und Upstream-Lizenz

Die Themes basieren auf der [inventwo-Stylebot-Sammlung](https://github.com/inventwo/Script-Sammlung/tree/main/CSS).

Ich habe diese Stylebot-Themes als Basis genommen, für Tampermonkey umgeschrieben
und diverse Anpassungen vorgenommen.

Upstream (inventwo): MIT-Lizenz. Copyright (c) 2025 jkvarel und skvarel von inventwo.


## 📄 Lizenz

[MIT-Lizenz](https://opensource.org/licenses/MIT)


## ⚠️ Haftungsausschluss

Dieses Projekt ist nicht mit Autodarts verbunden.
Änderungen an [play.autodarts.io](https://play.autodarts.io) können Skript-Updates erforderlich machen.



