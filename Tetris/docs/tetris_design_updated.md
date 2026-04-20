# Tetris Design Document

Updated: 2026-04-19

This document supersedes the original `tetris design.pdf` as the working design spec for the implemented game in this folder.

## 1. Product Summary

This build is a single-page browser Tetris with a neon arcade presentation and a largely classic ruleset. The design goal is to make the game feel like an 80s cabinet screen rather than a flat web toy: bright cyan and magenta glow, visible scanlines, high-contrast panel chrome, and luminous pieces that read like they are being drawn on a CRT.

The game is intentionally simple to start and legible at a glance:
- one central playfield
- one-piece next preview
- left-side stats panel
- right-side controls panel
- overlay states for start, pause, and top out

## 2. Visual Direction

### 2.1 Tone

The visual tone is retro-futurist arcade:
- dark navy and violet base
- electric cyan and magenta lighting
- arcade yellow for headings and emphasis
- saturated piece colors with bloom
- subtle screen noise and scanline texture

This direction is based on the color language in the original design PDF, but pushed harder toward an illuminated cabinet display.

### 2.2 Typography

Primary typeface:
- `Pixelify Sans`

Usage:
- title, headings, stats, and UI chrome all use the same pixel-style face
- uppercase labels are used for panels and overlays
- large title uses a chromatic glow treatment to feel screen-printed and arcade-like

### 2.3 Layout

Desktop layout is a three-column frame:
- left: mode and stats
- center: board in a framed cabinet-like bezel
- right: next queue and controls

Mobile layout should keep the same hierarchy but collapse vertically without losing the board-first emphasis.

### 2.4 Board and Piece Rendering

Board treatment:
- dark gradient well
- faint cyan gridlines
- horizontal scan bands
- CRT-style glow and vignette

Piece treatment:
- neon-filled blocks
- bright top-left highlight
- darker lower-right edge
- subtle glass/screen sheen
- glow matching the piece color

Ghost treatment:
- hollow neon outline
- low-opacity inner fill
- clearly readable without competing with the active piece

## 3. Gameplay Presentation

### 3.1 Ruleset Position

The current build follows the mechanics document primarily from the classic side, with one explicit usability exception.

Implemented rules:
- 10x20 visible matrix
- 2 hidden spawn rows
- pure random piece generation
- 1 next piece preview
- no hold
- no hard drop
- no wall kicks
- immediate lock on contact
- classic-style gravity curve
- classic-style level progression
- classic-style scoring

Intentional exception:
- ghost piece is shown, because the current product direction favors readability and the user requested a landing preview

### 3.2 Controls

Current controls:
- move: `Left Arrow`, `Right Arrow`
- soft drop: `Down Arrow`
- rotate clockwise: `Up Arrow` or `X`
- rotate counter-clockwise: `Z`
- pause: `P`
- restart / start: `Enter`

### 3.3 Feedback States

The game should always communicate state changes clearly:
- start overlay before play begins
- pause overlay when the run is frozen
- top-out overlay when the run ends
- HUD updates continuously for score, level, lines, and best score

## 4. Audio Direction

The game includes a local retro synth sound set stored in `assets/sound`.

Design intent:
- short, punchy mono effects
- square/triangle-style arcade timbre
- no orchestral or modern cinematic feel
- sounds should support game rhythm without becoming fatiguing

Current event mapping:
- `start.wav`: run start cue
- `move.wav`: horizontal movement tick
- `rotate.wav`: rotation chirp
- `soft_drop.wav`: accelerated descent pulse
- `lock.wav`: placement thump
- `line_clear.wav`: 1-3 line clear reward
- `tetris_clear.wav`: 4-line clear reward
- `level_up.wav`: level transition fanfare
- `pause.wav`: pause toggle cue
- `top_out.wav`: failure cue

## 5. UX Goals

The design should preserve these qualities:
- fast readability
- high board contrast
- immediate feedback for movement and locking
- a strong sense of cabinet atmosphere
- low UI clutter

The game should feel old-school in pressure, but not visually austere.

## 6. Implementation Notes

Current implementation files:
- `index.html`
- `styles.css`
- `game.js`

Design-specific implementation already present:
- Pixelify Sans loaded from Google Fonts
- neon panel and board styling
- scanline and vignette overlays
- luminous piece rendering on canvas
- one-piece queue rendering
- overlay cards for state changes
- local WAV-based sound playback

## 7. Future Design Extensions

Recommended next visual passes, if desired:
- add animated attract-mode flicker on title load
- add a dedicated sound toggle in the HUD
- add subtle line-clear flash on the board
- add cabinet framing art or side decals
- tune mobile layout to preserve the same arcade feel on narrow screens

## 8. Source of Truth

For mechanics, use:
- `docs/tetris_mechanics.docx`

For the original visual inspiration, use:
- `docs/tetris design.pdf`

For the actual implemented product design, use:
- `docs/tetris_design_updated.md`
