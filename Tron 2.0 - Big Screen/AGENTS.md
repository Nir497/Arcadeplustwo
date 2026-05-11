# Repository Guidelines

## Project Structure & Module Organization

This repository contains small browser games as separate folders:

- `Tron/`: playable TRON Light Cycles build (`index.html`, `styles.css`, `game.js`) plus specs in `Tron/Mechanics specs/`.
- `Pong/`: design and mechanics documents in `Pong/Docs/`.

Each game should stay self-contained. Keep HTML, CSS, JS, and design docs inside that game’s directory rather than sharing loose files at the repo root.

## Build, Test, and Development Commands

This repo is static and does not use a build step.

- `python3 -m http.server`  
  Serve the repository locally for browser testing.
- `open Tron/index.html`  
  Quick local launch on macOS.
- `node --check Tron/game.js`  
  Syntax-check the TRON game script after edits.

If you add another game, include an equivalent syntax-check command for its JS entry file.

## Coding Style & Naming Conventions

Use 2-space indentation in HTML, CSS, and JavaScript. Prefer clear, descriptive names:

- camelCase for JS variables/functions: `startRound`, `renderOverlayActions`
- kebab-case for CSS classes: `overlay-card`, `setup-skip-button`
- lowercase filenames for web assets unless an existing folder already differs

Keep the project dependency-free unless there is a strong reason to add tooling. Favor small, readable functions and direct DOM access over unnecessary abstraction.

## Testing Guidelines

There is no automated test suite yet. Minimum validation for UI changes:

- run `node --check` on edited JS files
- open the game in a browser and test the full interaction flow
- verify keyboard input, overlays, and restart behavior

When adding tests later, place them inside the relevant game folder and name them after the feature under test, for example `tron-input.test.js`.

## Commit & Pull Request Guidelines

There is no established git history yet, so use short imperative commit messages such as:

- `Add quick setup skip flow`
- `Update Tron design document`

Pull requests should include a concise summary, affected game folder, manual test notes, and screenshots or screen recordings for visible UI changes.

## Documentation & Specs

When gameplay or UI changes, update the matching design/mechanics docs in the same game folder. For TRON, keep `Tron/Mechanics specs/tron_design.docx` and `tron_gdd.docx` aligned with implementation.
