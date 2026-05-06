# Repository Guidelines

## Project Structure & Module Organization

This repository is a small static browser game. Keep changes localized and easy to trace.

- `index.html`: main document structure and UI overlays.
- `styles.css`: all visual styling, layout, and responsive behavior.
- `game.js`: game loop, input handling, rendering, HUD-safe-zone logic, and audio playback.
- `assets/sounds/`: generated WAV effects plus `manifest.json` and a short `README.md`.
- `docs/`: source design references (`Snake_mechanics.docx`, `snake_design.docx`).

There is no build system or dependency manager. The game runs directly in the browser.

## Build, Test, and Development Commands

- `open index.html`
  Opens the game locally in a browser on macOS.
- `python3 -m http.server`
  Starts a simple local server if browser file access causes issues.
- `node --check game.js`
  Performs a syntax check on the game logic.
- `rg --files`
  Fast way to inspect repository contents when navigating the project.

## Coding Style & Naming Conventions

Use plain HTML, CSS, and vanilla JavaScript. Follow the existing style:

- 2-space indentation in HTML/CSS/JS.
- Prefer `const` and `let`; avoid adding libraries for simple tasks.
- Use descriptive camelCase for variables and functions in JavaScript.
- Use kebab-case for asset filenames, e.g. `game_over.wav`.
- Keep rendering, input, and state updates in clearly separated functions.

When editing, preserve the current retro UI language and avoid broad refactors unless necessary.

## Testing Guidelines

There is no automated test suite yet. Minimum verification for code changes:

- Run `node --check game.js`.
- Open the game in a browser and test the affected flow manually.
- For gameplay changes, verify start, movement, eating, collision, pause/resume, and game-over behavior.
- For audio/UI changes, verify hover/click behavior and browser audio unlock after first interaction.

## Commit & Pull Request Guidelines

Git history is minimal; the existing commit style is short and direct (`initial commit ...`). Follow that pattern with concise imperative messages, for example:

- `fix hud collision blocking`
- `add retro sound integration`

Pull requests should include:

- A short summary of user-visible changes.
- Manual test notes.
- Screenshots or a short recording for visual/UI updates.
- Notes about any new assets added under `assets/`.
