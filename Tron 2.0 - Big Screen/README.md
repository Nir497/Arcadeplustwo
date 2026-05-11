# TRON Light Cycles

Static browser implementation of a two-player TRON light cycle game based on the specs in [`Mechanics specs`](./Mechanics%20specs/).

The current build uses a shared 180 by 144 cell arena with a left/right split-screen canvas. Each side follows its rider's local perspective while trails and crashes remain part of the same global board.

Sound assets for later gameplay/audio integration live in [`assets/sounds`](./assets/sounds/).

## Run locally

Open [`index.html`](./index.html) directly in a browser, or serve the folder with any static server.

## GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, open `Pages`.
3. Set the source to `Deploy from a branch`.
4. Select the default branch and `/ (root)`.

The game is dependency-free and deploys as a static site.
