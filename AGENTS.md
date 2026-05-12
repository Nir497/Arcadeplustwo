# Repository Guidelines

- At the end of every task, commit and push relevant files to git.

## Project Structure & Module Organization

This repository is a static multi-game arcade site. The root page is the launcher and shared UI.

- `index.html`: GitHub Pages launcher and high-score page.
- `styles.css`: launcher and high-score page styling.
- `assets/images/`: shared launcher icon assets.
- `assets/js/high-scores.js`: universal browser `localStorage` high-score API.
- `assets/js/home.js`: homepage high-score tabs and rendering.
- `<Game>/index.html`, `<Game>/styles.css`, `<Game>/game.js`: standalone game pages and logic.

There is no app framework, bundler, or backend. Keep the site static and use relative paths so it works from GitHub Pages and local static servers.

## Build, Test, and Development Commands

- `python3 -m http.server`
  Serves the root site locally at `http://localhost:8000`.
- `open index.html`
  Opens the launcher directly on macOS for quick visual checks.
- `node --check assets/js/high-scores.js assets/js/home.js`
  Syntax-checks shared homepage scripts.
- `node --check <Game>/game.js`
  Syntax-checks an individual game after gameplay edits.
- `git diff --check`
  Checks for whitespace errors before commit.

## Coding Style & Naming Conventions

Use plain HTML, CSS, and vanilla JavaScript with 2-space indentation. Prefer `const` by default and `let` only for reassignment. Use `camelCase` for JavaScript functions/variables and kebab-case for shared asset filenames.

Preserve the retro neon/CRT visual language. Avoid adding dependencies or server requirements unless explicitly requested.

## High-Score System

High scores are universal across games in the same browser via `localStorage`, not a server. All games should use `window.ArcadeHighScores` from `assets/js/high-scores.js`.

- Submit scores with `window.ArcadeHighScores.promptAndSubmit(gameId, score)` at game over.
- Read leaderboard rows with `window.ArcadeHighScores.getScores(gameId, limit)`.
- Use stable game ids: `snake`, `pong`, `breaker`, `space-invaders`, `pacman`, `tetris`, `tron`, `tron-2`, `tron-3`.
- Scores are browser-local and origin-scoped; they do not sync across devices or browsers.

## Testing Guidelines

There is no automated test suite. For shared changes:

- Run `node --check` on edited JavaScript files.
- Run `git diff --check`.
- Open the launcher and verify game links, the High Scores button, tabs, empty states, and back navigation.
- For game-over scoring changes, finish a run, enter a name, return to the launcher, and confirm the score appears under the correct tab.

## Commit & Pull Request Guidelines

Use short imperative commit messages, for example `Add universal high scores` or `Fix launcher navigation`.

Pull requests should include a brief user-visible summary, manual test notes, screenshots for visual changes, and callouts for new shared assets or changes to high-score behavior.
