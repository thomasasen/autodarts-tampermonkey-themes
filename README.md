# Autodarts Tampermonkey Themes & Effects

Diese Sammlung enthält mehrere **Tampermonkey-Userscripts** für  
👉 https://play.autodarts.io

Der Fokus liegt auf:
- klarer Lesbarkeit
- konsistenter Optik
- automatischer Aktivierung je Spielvariante
- stabiler Funktion auch bei dynamischen DOM-Änderungen

**Alle Skripte sind rein visuell.**  
Sie verändern keine Spielmechanik, keine Scores und keine Erkennung.

---

## Inhalte

### 🎯 Themes (variantenspezifisch)

Die Themes aktivieren sich **automatisch**, abhängig von der aktuell gespielten Variante.

| Variante   | Script |
|-----------|--------|
| X01       | Autodarts Theme X01 |
| Cricket   | Autodarts Theme Cricket |
| Bermuda   | Autodarts Theme Bermuda |
| Shanghai  | Autodarts Theme Shanghai |

**Gemeinsame Eigenschaften**
- große, gut lesbare Scores
- klare Trennung von Spielern, Board und Turn-Info
- automatische Re-Aktivierung bei:
  - DOM-Updates
  - In-App-Navigation
  - Variant-Wechsel

---

### ✨ Effects

#### Animate Triple / Double / Bull
- Visuelle Hervorhebung von Treffern
- Gradient-Glow, Pulse, klare Farbtrennung
- Erkennt:
  - T1–T20
  - D1–D20
  - BULL
- Keine Abhängigkeit von Spielvariante

---

## Installation

### Voraussetzung
- Browser: Chrome, Edge, Firefox
- Extension: **Tampermonkey**

---

### Empfohlene Installation (mit Auto-Updates)

1. Öffne das gewünschte Script **direkt über GitHub (raw)**  
2. Tampermonkey erkennt das Userscript automatisch  
3. Installieren  
4. Fertig

👉 **Updates erfolgen automatisch**, sobald eine neue Version gepusht wird.

---

## Verfügbare Scripts

### X01 Theme
Optimiert für Fokus und Wettkampf:
- aktiver Spieler stark hervorgehoben
- inaktive Spieler bewusst zurückgenommen
- dunkle Navigation

---

### Cricket Theme
Leichtgewichtiges Farbtheme:
- keine Layout-Änderungen
- maximale Stabilität

---

### Bermuda Theme
Volles UI-Layout:
- Grid-Layout
- Spieler links, Board rechts
- Footer direkt unter Header

---

### Shanghai Theme
Analog zu Bermuda, angepasst für Shanghai:
- Grid-Layout
- große Scores
- stabile Re-Evaluation bei DOM-Änderungen


---

### Animate Triple / Double / Bull
Universeller Effekt:
- unabhängig vom Spielmodus
- reagiert live auf neue Würfe


---

## Technische Details

- Aktivierung erfolgt über:
  - `#ad-ext-game-variant`
- DOM-Änderungen werden überwacht via `MutationObserver`
- Zusätzlich periodische URL-Checks zur Absicherung
- Optionaler Reuse von `window.autodartsDesign`, falls vorhanden
- Fallback-CSS ist immer enthalten

---

## Lizenz

MIT License  
© 2025 Thomas Asen

Basierend auf Konzepten und Stil von  
**inventwo / skvarel – Autodarts-Stylebot v1.1.0 (MIT)**

---

## Haftungsausschluss

Dieses Projekt steht in **keiner Verbindung zu Autodarts**.  
Nutzung auf eigenes Risiko. Änderungen an play.autodarts.io können Anpassungen erforderlich machen.


