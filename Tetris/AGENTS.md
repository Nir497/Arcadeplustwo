# Repository Guidelines

## Project Structure & Module Organization

This repository is a small static web game.

- `index.html`: app shell and HUD markup
- `styles.css`: all visual styling, layout, and responsive behavior
- `game.js`: gameplay logic, rendering, input handling, and audio wiring
- `assets/sound/`: local `.wav` effects used by the game
- `docs/`: source design and mechanics references, plus the updated working design spec in `docs/tetris_design_updated.md`

Keep changes localized when possible: UI structure in `index.html`, presentation in `styles.css`, and behavior in `game.js`.

## Build, Test, and Development Commands

No build step is required.

- `python3 -m http.server`
  Starts a local server for browser testing.
- `node --check game.js`
  Validates JavaScript syntax without running the game.
- `open index.html`
  Quick local launch on macOS, but prefer a local server when checking assets and browser behavior.

## Coding Style & Naming Conventions

Use plain HTML, CSS, and vanilla JavaScript. Follow the existing style:

- 2-space indentation
- semicolons in JavaScript
- `const`/`let`, not `var`
- descriptive camelCase for functions and variables
- uppercase constants for configuration values such as `ROWS` or `SOUND_VOLUME`

Match existing naming patterns like `renderQueue`, `drawBlock`, and `createSoundManager`. Keep comments short and only where behavior is not obvious.

## Testing Guidelines

There is no formal test suite yet. For every gameplay change:

- run `node --check game.js`
- test in a browser
- verify start, movement, rotation, line clears, pause, top-out, and sound playback

If you add automated tests later, place them in a dedicated `tests/` directory and name files by feature, for example `tests/spawn-state.test.js`.

## Commit & Pull Request Guidelines

This repo currently has no commit history, so use clear imperative commit messages such as:

- `Add line clear sound effects`
- `Fix hidden-row spawn bug`

When a user asks for code or asset changes, commit and push all relevant files after completing and validating every requested task.

Pull requests should include:

- a short summary of user-visible changes
- notes on gameplay or ruleset impact
- screenshots or a short video for UI changes
- the validation steps you ran
