# Repository Guidelines

## Project Structure & Module Organization
This repository is a small static web game. Keep changes localized and easy to review.

- `index.html`: main page structure, HUD, overlays, and script/style includes.
- `styles.css`: all visual styling, layout, responsive behavior, and menu presentation.
- `game.js`: gameplay loop, input handling, rendering, audio hooks, level logic, and scoring.
- `assets/sounds/`: bundled WAV effects used by the game.
- `Docs/`: source design references (`block_breaker_design.docx`, `block_breaker_gdd.docx`).

There is no build system or module bundler. Treat `index.html`, `styles.css`, and `game.js` as the production source.

## Build, Test, and Development Commands
- `open index.html`
  Opens the game locally in a browser on macOS.
- `python3 -m http.server`
  Starts a simple local server from the repo root if browser security blocks direct file loading.
- `node --check game.js`
  Verifies JavaScript syntax after edits.
- `find assets/sounds -maxdepth 1 -type f | sort`
  Quick check that the sound library is present and named as expected.

## Coding Style & Naming Conventions
Use 2-space indentation in HTML, CSS, and JavaScript. Prefer straightforward, file-local code over abstractions. Match the current style: `camelCase` for variables/functions, uppercase constants like `WIDTH`, and descriptive DOM ids such as `pauseOverlay`.

Keep logic in `game.js` organized by concern: state setup, update functions, rendering, then event binding. Use ASCII unless an existing file already contains a required special character.

## Testing Guidelines
There is no automated test suite yet. For each change:

- Run `node --check game.js`.
- Launch the game and manually verify the affected flow.
- Test both mouse and keyboard input for gameplay changes.
- If UI changes affect mobile layout, resize the browser and verify portrait behavior.

When adding tests later, place them in a top-level `tests/` directory and mirror the source area being covered.

## Commit & Pull Request Guidelines
Current history is minimal (`initial commit (lots of work done beffore)`), so use short, imperative commit messages going forward, for example: `Fix keyboard paddle lock` or `Add bundled sound effects`.

Pull requests should include:

- A short summary of user-visible changes.
- Notes on manual testing performed.
- Screenshots or a short video for UI changes.
- References to any relevant design-doc sections in `Docs/` when behavior changes.
