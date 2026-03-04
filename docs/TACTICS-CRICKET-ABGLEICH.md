# Tactics/Cricket-Abgleich

Stand: 2026-03-04

## Ziel

Dieses Dokument hält fest, wie `Tactics` in der bestehenden Cricket-Familie umgesetzt wurde, welche fachlichen Regeln dafür maßgeblich sind und welche Prüfungen bereits erfolgt sind.

## Fachliche Grundlage

- Autodarts behandelt `Tactics` technisch als Teil der Cricket-Familie.
- Sichtbar im DOM steht bei Tactics in `#ad-ext-game-variant` der Wert `Tactics`.
- Die Scoring-Modi bleiben identisch zur Cricket-Familie:
  - `Standard`
  - `Cut Throat`
  - `No Score`
- Der Unterschied liegt im aktiven Zielbereich:
  - `Cricket`: `20`, `19`, `18`, `17`, `16`, `15`, `Bull`
  - `Tactics`: `20`, `19`, `18`, `17`, `16`, `15`, `14`, `13`, `12`, `11`, `10`, `Bull`
- Die Mark-Logik bleibt gleich:
  - Single = 1 Mark
  - Double = 2 Marks
  - Triple = 3 Marks
  - 3 Marks = Ziel geschlossen

## Architekturentscheidung

`Tactics` wird nicht über ein eigenes Skript abgebildet. Stattdessen wurde die bestehende Cricket-Logik so verallgemeinert, dass beide Varianten dieselbe gemeinsame Zustandsbasis verwenden.

Gründe:

- keine doppelte Parser-Logik
- keine doppelte Overlay-Logik
- keine zweite Grid-FX-Codebasis
- geringeres Regressionsrisiko zwischen Cricket und Tactics
- eine zentrale Quelle für Zielmenge, Varianten-Erkennung und Zustandsberechnung

## Umgesetzte Änderungen

### 1. Varianten-Erkennung

- `Animation/autodarts-game-state-shared.js`
  - erkennt `Cricket` und `Tactics` als Cricket-Familie
  - trennt jetzt sichtbaren Game-Mode (`getCricketGameMode()`) vom Scoring-Mode (`getCricketMode()`)
  - blendet `Hidden Cricket` nicht versehentlich als normale Cricket-/Tactics-Variante ein
- `Animation/autodarts-animation-shared.js`
  - erweitert die DOM-basierte Varianten-Erkennung ebenfalls auf `Tactics`
- `Template/autodarts-theme-shared.js`
  - aktiviert das Cricket-Theme auch bei sichtbarem `Tactics`

### 2. Shared Cricket-State

- `Animation/autodarts-cricket-state-shared.js`
  - kennt jetzt zwei Zielmengen:
    - `CRICKET_TARGET_ORDER`
    - `TACTICS_TARGET_ORDER`
  - erkennt zusätzlich die Labels `14`, `13`, `12`, `11`, `10`
  - baut Snapshots nicht mehr nur für 7 feste Ziele, sondern für die aktive Variante
  - liefert `gameModeInfo`, `targetOrder` und `targetSet` an die Consumer zurück
  - kann Tactics notfalls sogar aus den vorhandenen Zeilen `14..10` ableiten

### 3. Board-Overlay

- `Animation/Autodarts Animate Cricket Target Highlighter.user.js`
  - arbeitet nicht mehr mit einer lokal fest verdrahteten 7-Ziel-Liste
  - übernimmt den aktiven Zielsatz direkt aus dem Shared Snapshot
  - markiert in Tactics korrekt `20..10` plus `Bull`
  - lässt in Tactics nur noch `1..9` neutral/inaktiv

### 4. Grid FX

- `Animation/Autodarts Animate Cricket Grid FX.user.js`
  - reagiert jetzt ebenfalls auf `Tactics`
  - verarbeitet die Zeilenanzahl dynamisch über den Shared Snapshot
  - setzt Badge-Klassen nur noch auf kleine, dedizierte Label-Nodes
  - schützt große Wrapper- und komplette Label-Zellen davor, versehentlich absolut positioniert zu werden
  - bleibt an dasselbe Cricket-Theme gekoppelt, nutzt aber denselben Family-State wie der Board-Highlighter

### 5. Theme und xConfig

- `Template/Autodarts Theme Cricket.user.js`
  - ist jetzt fachlich ein Cricket-/Tactics-Theme
  - bleibt aus Kompatibilitätsgründen unter dem bestehenden Dateinamen erhalten
- `Config/AD xConfig.user.js`
  - formatiert `@xconfig-variant` sauber auch für kombinierte Angaben wie `cricket / tactics`
- Relevante Module tragen jetzt in den Metadaten `@xconfig-variant      cricket / tactics`

## Geänderte Dateien

- `Animation/autodarts-game-state-shared.js`
- `Animation/autodarts-animation-shared.js`
- `Animation/autodarts-cricket-state-shared.js`
- `Animation/Autodarts Animate Cricket Target Highlighter.user.js`
- `Animation/Autodarts Animate Cricket Grid FX.user.js`
- `Template/autodarts-theme-shared.js`
- `Template/Autodarts Theme Cricket.user.js`
- `Config/AD xConfig.user.js`
- `tests/cricket-state-harness.html`
- `README.md`
- `docs/TECHNIK-REFERENZ.md`

## Qualitätssicherung

### Fachlich geprüft

- Cricket bleibt bei `20..15,BULL`.
- Tactics verwendet `20..10,BULL`.
- `Standard`, `Cut Throat` und `No Score` bleiben für beide Varianten konsistent.
- `offense`, `danger`, `pressure`, `closed` und `dead` bleiben zentral im Shared Helper berechnet.

### Parser-/State-QS

- `10..14` werden jetzt normalisiert und geparst.
- Bull-Aliase (`25`, `Bull`, `Bullseye`) bleiben erhalten.
- Plain-Text-Label-Zellen erzeugen keine künstlichen Badge-Nodes mehr.
- Dedizierte kleine Badge-Nodes bleiben als eigenständige Zielelemente erhalten.
- Die Sortierung bleibt korrekt:
  - Cricket: `20` bis `15`, dann `Bull`
  - Tactics: `20` bis `10`, dann `Bull`
- Dekorierte Label-Zellen stören den Parser weiterhin nicht.

### Consumer-QS

- Board-Overlay und Grid FX lesen denselben Snapshot.
- Es gibt keine zweite Tactics-Sonderlogik in den Consumer-Skripten.
- Beim Wechsel zu Nicht-Cricket-Varianten werden Klassen und Overlays weiterhin bereinigt.

### Test-Harness erweitert

`tests/cricket-state-harness.html` prüft jetzt zusätzlich:

- Tactics mit vollständigem Zielsatz `20..10,BULL`
- `10..14` als gültige Labels
- Tactics in `Standard`
- Tactics in `No Score`
- Solo-Tactics
- dekorierte Labels mit 12 Zeilen
- Badge-Schutz: Plain-Text-Label-Zellen erzeugen kein künstliches Badge
- Badge-Schutz: echte kleine Badge-Nodes bleiben separat erkennbar
- Filterung zurück auf Cricket, wenn der Game-Mode `Cricket` ist
- Fallback-Inferenz auf Tactics aus dem Grid selbst
- Aktivspieler-Priorität: sichtbarer DOM-Aktivstatus im primären Player-Display vor verzögertem Match-State
- Spieleranzahl-Priorität: erkannte Grid-Spaltenzahl vor global gezählten DOM-Spielern
- Grid-Root-Priorität: sichtbares aktuelles Grid vor versteckten, aber noch verbundenen Alt-Grids derselben Seite
- Live-Wurf-Vorschau: laufende `activeThrows` werden sofort auf den aktiven Spieler angerechnet, damit ein frisch geschlossenes Ziel schon während des laufenden Zuges grün wird
- Spielerwechsel-Vorschau: abgeschlossene Würfe aus `match.turns` werden zusätzlich kumulativ eingerechnet, damit nach dem Spielerwechsel dieselben Ziele beim nun aktiven Gegner sofort als roter Defensivzustand erscheinen
- Unterzählungs-Reparatur: wenn das Grid genau eine Spielerspalte zu wenig liefert, darf der Shared Helper diese Lücke gezielt aus dem sichtbaren Player-Display ergänzen, ohne frühere Phantomspieler-Fälle wieder zu öffnen
- Spielerzuordnung: sichtbare Links-nach-Rechts-Reihenfolge plus ID-/Namensabgleich zwischen Player-Display, Grid-Spalten und `match.players`
- Grid-Perspektive: dauerhafte Grid-Farben werden pro echter Spielerzelle gesetzt. Dadurch kann dieselbe Zeile gleichzeitig offensiv grün und defensiv rot sein; `dead` dimmt weiterhin beide Seiten
- Screenshot-Regression: aktiver Spieler `TEST2` ergibt in Tactics korrekt Grün auf `20`, `17`, `15`, Rot auf `16` und `dead` auf gemeinsam geschlossenen Zielen
- Spielerwechsel-Regression: nach einem gegnerischen `T20` erscheint `20` beim nächsten aktiven Spieler sofort als roter Defensivzustand, auch wenn das Grid noch `0/0` zeigt
- Alt-Grid-Regression: ein verstecktes verbundenes Vorher-Grid darf weder Board noch Matrix vom sichtbaren aktuellen Grid abziehen
- Symbol-Parsing: `⊗` wird als `3`, `X`/`✕` als `2` und `/` als `1` erkannt

`tests/cricket-target-highlighter-harness.html` prüft zusätzlich den konkreten Live-Regressionsfall:

- Tactics mit sichtbarem aktivem Spieler links, aber bewusst abweichendem Game-State-Index
- Board-Overlay bleibt dabei grün/offensiv auf `10`
- ein laufender `T20` färbt `20` sofort grün, auch wenn das Grid testweise noch `0/0` zeigt
- wenn `TEST1` ein Ziel bereits geschlossen hat und `TEST2` aktiv ist, erscheint dasselbe Ziel für `TEST2` sofort rot im Board-Overlay, während das Grid parallel TEST1 grün und TEST2 rot zeigt
- `Theme Cricket` und `Cricket Grid FX` bleiben im selben DOM korrekt aktiv
- Die tieferen Fachregeln für Screenshot-Regression, Geisterspieler und Phantom-Spieleranzahl werden in `tests/cricket-state-harness.html` geprüft, weil diese Fälle im Headless-Browser deutlich deterministischer abbildbar sind.

## Offene manuelle Live-Prüfung

Ein Punkt bleibt bewusst als manuelle Laufzeitprüfung offen, weil die offizielle öffentliche Tactics-Dokumentation von Autodarts nicht vollständig verfügbar ist:

- echter Tactics-Match in Autodarts
- Sichtprüfung von `#ad-ext-game-variant`
- Gegenprüfung von `match.variant`, `match.settings.gameMode` und `match.settings.mode`
- Sichtprüfung von Theme, Board-Overlay und Grid FX mit realen 12 Zielzeilen
- Kontrolle, dass Board- und Grid-Farben spätestens nach dem nächsten 300-ms-Zyklus nach jedem Wurf aktualisiert sind
- Desktop und Mobile

## Ergebnis

`Tactics` ist jetzt technisch Teil derselben Cricket-Familie im Repo. Dafür wurde kein separates Skript eingeführt; stattdessen nutzen Theme, Target Highlighter und Grid FX denselben zentralen, variantenabhängigen Shared State.
