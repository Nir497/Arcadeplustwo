# Repository Guidelines

## Project Structure & Module Organization

This directory contains the TRON 2.0 Big Screen variant as a self-contained static browser game:

- `index.html`: playable TRON Light Cycles page.
- `styles.css`: game UI, overlay, and arena styling.
- `game.js`: setup flow, bot AI, collision logic, high-score submission, and split-screen canvas rendering.
- `README.md`: short project notes and local run instructions.
- `Mechanics specs/`: TRON design and gameplay specification documents.
- `assets/sounds/`: local game audio assets.

Keep this variant self-contained. Use relative paths so it works from the parent arcade launcher, GitHub Pages, and local static servers.

## Gameplay Architecture

The current build uses one shared `180 x 144` cell board with left/right split-screen perspectives. Each human player gets a local camera pane that follows their rider and clamps at board edges. Trails, crashes, and bot movement remain global on the shared board.

Player 1 uses `WASD`; Player 2 uses arrow keys in human mode. Bot mode is still available through the existing setup flow, with Player 2's pane following the bot.

## Build, Test, and Development Commands

This repo is static and does not use a build step.

- `python3 -m http.server`
  Serve this directory locally for browser testing.
- `open index.html`
  Quick local launch on macOS.
- `node --check game.js`
  Syntax-check the TRON game script after edits.
- `git diff --check`
  Check for whitespace errors before commit.

If you add another JS entry file, include an equivalent syntax-check command for it.

## Coding Style & Naming Conventions

Use 2-space indentation in HTML, CSS, and JavaScript. Prefer clear, descriptive names:

- camelCase for JS variables/functions: `startRound`, `renderOverlayActions`
- kebab-case for CSS classes: `overlay-card`, `setup-skip-button`
- lowercase filenames for web assets unless an existing folder already differs

Keep the project dependency-free unless there is a strong reason to add tooling. Favor small, readable functions and direct DOM access over unnecessary abstraction.

## Testing Guidelines

There is no automated test suite yet. Minimum validation for gameplay or UI changes:

- run `node --check game.js`
- run `git diff --check`
- open the game in a browser and test the full interaction flow
- verify quick setup, full setup, overlays, countdown, restart behavior, and result screens
- verify Player 1 `WASD`, Player 2 arrow keys, and single-player arrow-key fallback in bot mode
- verify both split-screen cameras follow their assigned riders, clamp at board edges, and only show local visible board areas
- verify trails persist globally and appear in either camera when the rider reaches them
- test both human-vs-human and human-vs-bot rounds after collision, camera, or bot AI changes

When adding tests later, place them inside this directory and name them after the feature under test, for example `tron-camera.test.js`.

## Commit & Pull Request Guidelines

Use short imperative commit messages such as:

- `Add split-screen camera views`
- `Update Tron board dimensions`

Pull requests should include a concise summary, affected game folder, manual test notes, and screenshots or screen recordings for visible UI changes.

## Documentation & Specs

When gameplay or UI changes, update the matching docs in this directory. Keep `README.md` and the relevant files in `Mechanics specs/` aligned with implementation.
