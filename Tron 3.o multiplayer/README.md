# TRON Light Cycles

Static browser implementation of a multiplayer TRON light cycle game based on the specs in [`Mechanics specs`](./Mechanics%20specs/).

The current build uses a shared 180 by 144 cell arena with 1-3 local human riders and 0-3 bots. Human riders get local camera panes, while bots appear only inside the arena view. Trails and crashes remain part of the same global board, and the round continues until only one rider is left.

Sound assets for later gameplay/audio integration live in [`assets/sounds`](./assets/sounds/).

## Run locally

Open [`index.html`](./index.html) directly in a browser, or serve the folder with any static server.

## GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, open `Pages`.
3. Set the source to `Deploy from a branch`.
4. Select the default branch and `/ (root)`.

The game is dependency-free and deploys as a static site.
