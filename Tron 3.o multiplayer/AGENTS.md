# Repository Guidelines

## Project Structure & Module Organization

This repository contains a static TRON Light Cycles browser game:

- `index.html`: playable TRON Light Cycles page.
- `styles.css`: game UI, overlay, and arena styling.
- `game.js`: TRON gameplay, setup flow, bot AI, collision logic, and canvas rendering.
- `Mechanics specs/`: TRON design and gameplay specification documents.
- `assets/sounds/`: local game audio assets.

Keep the game dependency-free and self-contained in this directory. Use relative paths so it works from a local static server and GitHub Pages.

## Build, Test, and Development Commands

This repo is static and does not use a build step.

- `python3 -m http.server`  
  Serve the repository locally for browser testing.
- `open index.html`
  Quick local launch on macOS.
- `node --check game.js`
  Syntax-check the TRON game script after edits.

If you add another JS entry file, include an equivalent syntax-check command for it.

## Coding Style & Naming Conventions

Use 2-space indentation in HTML, CSS, and JavaScript. Prefer clear, descriptive names:

- camelCase for JS variables/functions: `startRound`, `renderOverlayActions`
- kebab-case for CSS classes: `overlay-card`, `setup-skip-button`
- lowercase filenames for web assets unless an existing folder already differs

Keep the project dependency-free unless there is a strong reason to add tooling. Favor small, readable functions and direct DOM access over unnecessary abstraction.

## Testing Guidelines

There is no automated test suite yet. Minimum validation for UI changes:

- run `node --check` on edited JS files
- run `git diff --check`
- open the game in a browser and test the full interaction flow
- verify quick setup, full setup, overlays, countdown, restart behavior, and result screens
- verify keyboard input for Player 1 `WASD`, Player 2 arrow keys, and Player 3 `IJKL`
- test at least `1 human + 1 bot`, `1 human + 3 bots`, `2 humans + 0 bots`, and `3 humans + 3 bots`
- verify bots have no dedicated camera panes, can eliminate each other, and the round continues until one rider remains
- compare Easy and Hard bot routines after bot AI changes

When adding tests later, place them inside the relevant game folder and name them after the feature under test, for example `tron-input.test.js`.

## Commit & Pull Request Guidelines

There is no established git history yet, so use short imperative commit messages such as:

- `Add quick setup skip flow`
- `Update Tron design document`

Pull requests should include a concise summary, affected game folder, manual test notes, and screenshots or screen recordings for visible UI changes.

## Documentation & Specs

When gameplay or UI changes, update the matching design/mechanics docs in `Mechanics specs/`. Keep `tron_design.docx` and `tron_gdd.docx` aligned with implementation.
