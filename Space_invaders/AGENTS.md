# Repository Guidelines

## Project Structure & Module Organization
This repository is a static browser game. Core runtime code lives in `game.js`, page structure is in `index.html`, and presentation rules are in `styles.css`. Audio assets live under `assets/sounds/`. Design references are stored in `docs/`. There is no build output directory, framework, or package manager in the current setup.

## Build, Test, and Development Commands
Run the game from a local server instead of opening `index.html` directly:

```bash
cd /Users/nirchuk/Downloads/arcadeplustwo/Space_invaders
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Useful checks:

```bash
python3 -m http.server 8000   # serve the game locally
rg "TODO|FIXME" .             # find pending work
```

GitHub Pages is compatible because the project is fully static and uses relative asset paths.

## Coding Style & Naming Conventions
Use 2-space indentation in HTML, CSS, and JavaScript, matching the existing files. Prefer `const` by default and `let` only when reassignment is needed. Use `camelCase` for variables and functions such as `updateCountdown`, and `UPPER_SNAKE_CASE` for constants such as `FIXED_TIMESTEP_MS`. Keep functions focused and place related helpers near the systems that use them.

No formatter or linter is configured in this repository, so preserve the current style manually.

## Testing Guidelines
There is no automated test suite yet. Validate changes in the browser on `http://localhost:8000` and verify:
- title, controls, countdown, pause, and restart flows
- player movement and shot timing
- sound playback after the first key press
- asset loading from `assets/sounds/`

If you add tests later, keep them separate from runtime files and use names that match the feature under test.

## Commit & Pull Request Guidelines
This repository has no commit history yet, so use short imperative commit messages, for example: `Fix audio startup on localhost` or `Tune alien movement timing`.

Pull requests should include:
- a brief summary of the gameplay or code change
- manual test notes
- screenshots or a short recording for visible UI changes
- any asset additions or replacements called out explicitly

## Deployment Notes
Prefer relative paths for all assets so the game works on both localhost and GitHub Pages. Do not rely on `file://` behavior for testing audio or loading resources.
