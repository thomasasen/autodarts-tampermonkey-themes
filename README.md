# Autodarts Tampermonkey Themes & Effects

Visual-only Tampermonkey scripts for https://play.autodarts.io.
They do not change game logic, scores, or detection.

## Features
- Theme scripts that auto-activate by game variant
- Shared layout/theme helper for consistent styling
- Optional animation/effect scripts to improve readability
- MutationObserver-based updates for dynamic DOM changes

## Table of Contents
- [Installation](#installation)
- [Shared Helper](#shared-helper)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [License](#license)
- [Disclaimer](#disclaimer)

## Installation
1. Install the Tampermonkey extension.
2. Open the raw file for the script you want.
3. Tampermonkey detects the userscript automatically.
4. Install and keep auto-updates enabled.

## Shared Helper
The theme scripts load a common helper via `@require`:

```
https://github.com/thomasasen/autodarts-tampermonkey-themes/raw/refs/heads/main/autodarts-theme-shared.js
```

If you fork the repo or use local files, update the `@require` URL accordingly.

## Scripts

### Themes

#### Autodarts Theme X01 (`Autodarts Theme X01.user.js`)
- Full layout + color theme for X01.
- Darker navigation and prominent active player.
- Auto-enables when the variant is X01.

#### Autodarts Theme Shanghai (`Autodarts Theme Shanghai.user.js`)
- Shared theme + grid layout tuned for Shanghai.
- Auto-enables when the variant is Shanghai.
- Uses the shared helper for consistent updates.

#### Autodarts Theme Bermuda (`Autodarts Theme Bermuda.user.js`)
- Shared theme + grid layout tuned for Bermuda.
- Auto-enables when the variant includes Bermuda.
- Uses the shared helper for consistent updates.

#### Autodarts Theme Cricket (`Autodarts Theme Cricket.user.js`)
- Lightweight color theme without grid layout changes.
- Auto-enables when the variant is Cricket.

### Animations and Effects

#### Autodarts Animate Triple (`Autodarts Animate Triple.user.js`)
- Highlights Triple, Double, and Bull hits with animated gradients.
- Distinct color sets per hit type for quick recognition.

#### Autodarts Animate Checkout (`Autodarts Animate Checkout.user.js`)
- Pulses the active score when a checkout is available.
- Uses the in-game suggestion area as the trigger.
- Limited to X01 matches.

#### Autodarts Score Delta Slide (`Autodarts Score Delta Slide.user.js`)
- Animates turn points with a short count-up tween.
- Improves readability of score changes during a turn.

#### Autodarts Average Trend Arrow (`Autodarts Average Trend Arrow.user.js`)
- Shows a small up/down arrow next to AVG when it changes.
- Short bounce animation to indicate trend direction.

#### Autodarts Size Strokes (`Autodarts Size Strokes.user.js`)
- Adjusts dart marker size and fill color on the board.
- Optional pulse/glow effect to make markers easier to spot.

## Configuration
Each script has a small configuration block near the top.

- `Autodarts Score Delta Slide.user.js`
  - `CONFIG.animationMs` controls the tween duration.
  - `CONFIG.scoreSelector` controls which score nodes are animated.
- `Autodarts Size Strokes.user.js`
  - `MARKER_RADIUS`, `MARKER_FILL`, and `EFFECT` control size, color, and effect.
- `Autodarts Average Trend Arrow.user.js`
  - `ANIMATION_MS` controls the arrow bounce duration.
- `Autodarts Animate Checkout.user.js`
  - Selectors and highlight color are adjustable at the top of the file.

## License
MIT License

## Disclaimer
This project is not affiliated with Autodarts.
Changes to play.autodarts.io may require script updates.
