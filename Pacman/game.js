const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const levelEl = document.getElementById("level");
const livesEl = document.getElementById("lives");
const statusTextEl = document.getElementById("statusText");
const bonusTextEl = document.getElementById("bonusText");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayTextEl = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const scanlineButton = document.getElementById("scanlineButton");
const scanlinesEl = document.getElementById("scanlines");
const effectsFrame = document.getElementById("effectsFrame");
const shakeLayer = document.getElementById("shakeLayer");

const TILE = 8;
const HUD_HEIGHT = 40;
const BOARD_OFFSET_Y = HUD_HEIGHT;
const BOARD_WIDTH = 28;
const BOARD_HEIGHT = 31;
const ENTITY_RADIUS = 3.2;
const PACMAN_START = { x: 13.5, y: 23 };
const GHOST_HOME = { x: 13.5, y: 14 };
const TUNNELS = [{ x: -0.5, y: 14 }, { x: 27.5, y: 14 }];
const MODES = [
  { mode: "chase", duration: 8 },
  { mode: "scatter", duration: 7 },
  { mode: "chase", duration: 20 },
  { mode: "scatter", duration: 5 },
  { mode: "chase", duration: 20 },
  { mode: "scatter", duration: 5 },
  { mode: "chase", duration: Infinity },
];

const FRUIT_VALUES = [100, 300, 500, 500, 700, 700, 1000, 1000];
const GHOST_COLORS = {
  blinky: "#ff0000",
  pinky: "#ffb8ff",
  inky: "#00ffff",
  clyde: "#ffb852",
  frightened: "#1f51ff",
  frightenedFlash: "#f0f0f0",
  eyes: "#aee7ff",
};

const MAZE_TEMPLATE = [
  "############################",
  "#o...........##...........o#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.#####.##.#####.######",
  "     #.#####.##.#####.#     ",
  "     #.##..........##.#     ",
  "######.##.###HH###.##.######",
  "..........#HHHHHH#..........",
  "######.##.#HHHHHH#.##.######",
  "     #.##.########.##.#     ",
  "     #.##..........##.#     ",
  "######.##.########.##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "#.####.#####.##.#####.####.#",
  "#...##................##...#",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#..........................#",
  "#.########################.#",
  "############################",
];

const directions = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const oppositeDirection = {
  left: "right",
  right: "left",
  up: "down",
  down: "up",
};

let highScore = Number(localStorage.getItem("pacman-high-score") || 0);
let animationFrame = 0;
let lastTime = 0;

const state = {
  modeIndex: 0,
  modeTimer: 0,
  running: false,
  started: false,
  paused: true,
  gameOver: false,
  submittedScore: false,
  score: 0,
  level: 1,
  lives: 3,
  dotsEaten: 0,
  extraLifeAwarded: false,
  freezeTimer: 0,
  deathTimer: 0,
  levelTransition: 0,
  fruit: null,
  fruitThresholdsTriggered: [],
  scorePopups: [],
  pelletPulse: 0,
  mazeFlashTimer: 0,
};

let board = [];
let pelletsRemaining = 0;

function cloneBoard() {
  board = MAZE_TEMPLATE.map((row) => row.split(""));
  normalizePelletLayout();
  pelletsRemaining = 0;
  for (const row of board) {
    for (const tile of row) {
      if (tile === "." || tile === "o") {
        pelletsRemaining += 1;
      }
    }
  }
}

function normalizePelletLayout() {
  const regularPellets = [];

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      if (board[y][x] === ".") {
        regularPellets.push({
          x,
          y,
          distanceToCenter: Math.abs(x - 13.5) + Math.abs(y - 15),
        });
      }
    }
  }

  regularPellets.sort((a, b) => a.distanceToCenter - b.distanceToCenter);
  const excess = Math.max(0, regularPellets.length - 240);

  for (let i = 0; i < excess; i += 1) {
    const pellet = regularPellets[i];
    board[pellet.y][pellet.x] = " ";
  }
}

function entityAt(x, y, speed, direction) {
  return {
    x,
    y,
    dir: direction,
    nextDir: direction,
    speed,
    startX: x,
    startY: y,
    stopped: false,
  };
}

const pacman = entityAt(PACMAN_START.x, PACMAN_START.y, 7.6, "left");
const ghosts = [
  {
    ...entityAt(13.5, 11, 7.1, "left"),
    name: "blinky",
    mode: "scatter",
    eaten: false,
    frightenedTimer: 0,
    releaseDelay: 0,
    inHouse: false,
    scatterTarget: { x: 25, y: 0 },
  },
  {
    ...entityAt(13.5, 14, 6.9, "up"),
    name: "pinky",
    mode: "scatter",
    eaten: false,
    frightenedTimer: 0,
    releaseDelay: 2,
    inHouse: true,
    scatterTarget: { x: 2, y: 0 },
  },
  {
    ...entityAt(11.5, 14, 6.8, "up"),
    name: "inky",
    mode: "scatter",
    eaten: false,
    frightenedTimer: 0,
    releaseDelay: 5,
    inHouse: true,
    scatterTarget: { x: 25, y: 30 },
  },
  {
    ...entityAt(15.5, 14, 6.7, "up"),
    name: "clyde",
    mode: "scatter",
    eaten: false,
    frightenedTimer: 0,
    releaseDelay: 8,
    inHouse: true,
    scatterTarget: { x: 2, y: 30 },
  },
];

function resetActors(fullReset = false) {
  pacman.x = pacman.startX;
  pacman.y = pacman.startY;
  pacman.dir = "left";
  pacman.nextDir = "left";
  pacman.stopped = false;

  ghosts[0].x = 13.5;
  ghosts[0].y = 11;
  ghosts[0].dir = "left";
  ghosts[0].releaseDelay = 0;
  ghosts[0].inHouse = false;

  ghosts[1].x = 13.5;
  ghosts[1].y = 14;
  ghosts[1].dir = "up";
  ghosts[1].releaseDelay = 2;
  ghosts[1].inHouse = true;

  ghosts[2].x = 11.5;
  ghosts[2].y = 14;
  ghosts[2].dir = "up";
  ghosts[2].releaseDelay = 5;
  ghosts[2].inHouse = true;

  ghosts[3].x = 15.5;
  ghosts[3].y = 14;
  ghosts[3].dir = "up";
  ghosts[3].releaseDelay = 8;
  ghosts[3].inHouse = true;

  ghosts.forEach((ghost) => {
    ghost.mode = currentGlobalMode();
    ghost.frightenedTimer = 0;
    ghost.eaten = false;
    ghost.nextDir = ghost.dir;
    ghost.stopped = false;
  });

  if (fullReset) {
    state.modeIndex = 0;
    state.modeTimer = 0;
    state.fruit = null;
    state.fruitThresholdsTriggered = [];
    state.scorePopups = [];
  }
}

function currentGlobalMode() {
  return MODES[Math.min(state.modeIndex, MODES.length - 1)].mode;
}

function isWall(x, y) {
  if (y < 0 || y >= BOARD_HEIGHT) return true;
  if (x < 0 || x >= BOARD_WIDTH) return false;
  const tile = board[Math.floor(y)][Math.floor(x)];
  return tile === "#" || tile === "H";
}

function isGhostHouseDoor(x, y) {
  return y === 10 && x >= 12 && x <= 15;
}

function isInGhostHouse(x, y) {
  if (y < 0 || y >= BOARD_HEIGHT || x < 0 || x >= BOARD_WIDTH) return false;
  return board[y][x] === "H";
}

function tileAt(x, y) {
  if (y < 0 || y >= BOARD_HEIGHT || x < 0 || x >= BOARD_WIDTH) return " ";
  return board[y][x];
}

function setDirection(dir) {
  pacman.nextDir = dir;
}

function isWalkableTile(entity, tileX, tileY, dir) {
  if (tileY < 0 || tileY >= BOARD_HEIGHT) return false;
  if (tileX < 0 || tileX >= BOARD_WIDTH) return true;

  if (entity.name && isGhostHouseDoor(tileX, tileY)) {
    if (entity.eaten) return true;
    if (entity.inHouse) return dir === "up";
    return false;
  }

  const tile = board[tileY][tileX];
  if (tile === "#") return false;

  if (tile === "H") {
    return Boolean(entity.name);
  }

  return true;
}

function canMove(entity, dir, distance = 0.51) {
  const vector = directions[dir];
  const nextX = entity.x + vector.x * distance;
  const nextY = entity.y + vector.y * distance;
  return isWalkableTile(entity, Math.round(nextX), Math.round(nextY), dir);
}

function isCentered(entity) {
  return Math.abs(entity.x - Math.round(entity.x)) < 0.1 && Math.abs(entity.y - Math.round(entity.y)) < 0.1;
}

function snapToGrid(entity) {
  entity.x = Math.round(entity.x);
  entity.y = Math.round(entity.y);
}

function isAlignedForTurn(entity, dir) {
  if (dir === "left" || dir === "right") {
    return Math.abs(entity.y - Math.round(entity.y)) < 0.12;
  }
  return Math.abs(entity.x - Math.round(entity.x)) < 0.12;
}

function canTurnNow(entity, dir) {
  if (!isAlignedForTurn(entity, dir)) return false;

  const turnX = dir === "left" || dir === "right" ? entity.x : Math.round(entity.x);
  const turnY = dir === "up" || dir === "down" ? entity.y : Math.round(entity.y);
  const probe = {
    ...entity,
    x: dir === "left" || dir === "right" ? turnX : Math.round(entity.x),
    y: dir === "up" || dir === "down" ? turnY : Math.round(entity.y),
  };

  return canMove(probe, dir, 0.51);
}

function wrapEntity(entity) {
  if (entity.x < -0.6) entity.x = BOARD_WIDTH - 0.4;
  if (entity.x > BOARD_WIDTH - 0.4) entity.x = -0.4;
}

function getSpeedMultiplier(entity) {
  if (!entity.name) return 1;
  if (entity.eaten) return 1.8;
  const inTunnel = Math.round(entity.y) === 14 && (entity.x < 5 || entity.x > 22);
  if (inTunnel) return 0.4;
  if (entity.frightenedTimer > 0) return 0.78;
  return 1;
}

function moveEntity(entity, dt) {
  let remaining = entity.speed * getSpeedMultiplier(entity) * dt;
  entity.stopped = false;

  while (remaining > 0) {
    if (!entity.name && canTurnNow(entity, entity.nextDir)) {
      snapToGrid(entity);
      entity.dir = entity.nextDir;
    } else if (entity.name && isCentered(entity)) {
      snapToGrid(entity);
      chooseGhostDirection(entity);
    }

    if (isCentered(entity)) {
      snapToGrid(entity);
      if (!canMove(entity, entity.dir)) {
        entity.stopped = true;
        break;
      }
    }

    const vector = directions[entity.dir];
    const step = Math.min(remaining, 0.05);
    if (!canMove(entity, entity.dir, 0.35 + step)) {
      if (isCentered(entity)) {
        snapToGrid(entity);
      }
      entity.stopped = true;
      break;
    }

    entity.x += vector.x * step;
    entity.y += vector.y * step;

    if (entity.dir === "left" || entity.dir === "right") {
      entity.y = Math.round(entity.y);
    } else {
      entity.x = Math.round(entity.x);
    }

    remaining -= step;
  }

  wrapEntity(entity);
}

function chooseGhostDirection(ghost) {
  if (ghost.inHouse && ghost.releaseDelay > 0 && Math.abs(ghost.y - 14) < 0.6) {
    ghost.dir = ghost.dir === "up" ? "down" : "up";
    return;
  }

  if (ghost.inHouse && ghost.releaseDelay > 0) {
    ghost.dir = "up";
    return;
  }

  if (ghost.inHouse) {
    if (Math.abs(ghost.x - 13.5) > 0.1) {
      ghost.dir = ghost.x < 13.5 ? "right" : "left";
      return;
    }
    ghost.dir = "up";
    return;
  }

  const candidates = [];
  for (const dir of Object.keys(directions)) {
    if (dir === oppositeDirection[ghost.dir]) continue;
    if (!canMove(ghost, dir)) continue;
    candidates.push(dir);
  }

  if (candidates.length === 0) {
    ghost.dir = oppositeDirection[ghost.dir];
    return;
  }

  if (ghost.frightenedTimer > 0 && !ghost.eaten) {
    ghost.dir = candidates[Math.floor(Math.random() * candidates.length)];
    return;
  }

  const target = getGhostTarget(ghost);
  candidates.sort((a, b) => {
    const aVec = directions[a];
    const bVec = directions[b];
    const aDist = (ghost.x + aVec.x - target.x) ** 2 + (ghost.y + aVec.y - target.y) ** 2;
    const bDist = (ghost.x + bVec.x - target.x) ** 2 + (ghost.y + bVec.y - target.y) ** 2;
    return aDist - bDist;
  });

  ghost.dir = candidates[0];
}

function getGhostTarget(ghost) {
  if (ghost.eaten) return GHOST_HOME;
  if (ghost.mode === "scatter") return ghost.scatterTarget;

  const dir = directions[pacman.dir];
  const pacTarget = { x: pacman.x + dir.x * 4, y: pacman.y + dir.y * 4 };

  switch (ghost.name) {
    case "blinky":
      return { x: pacman.x, y: pacman.y };
    case "pinky":
      return pacTarget;
    case "inky": {
      const blinky = ghosts[0];
      const vectorX = pacTarget.x - blinky.x;
      const vectorY = pacTarget.y - blinky.y;
      return { x: pacTarget.x + vectorX, y: pacTarget.y + vectorY };
    }
    case "clyde": {
      const dist = Math.hypot(ghost.x - pacman.x, ghost.y - pacman.y);
      return dist > 8 ? { x: pacman.x, y: pacman.y } : ghost.scatterTarget;
    }
    default:
      return ghost.scatterTarget;
  }
}

function handlePellets() {
  const tileX = Math.round(pacman.x);
  const tileY = Math.round(pacman.y);
  const tile = tileAt(tileX, tileY);

  if (tile === "." || tile === "o") {
    board[tileY][tileX] = " ";
    pelletsRemaining -= 1;
    state.dotsEaten += 1;
    addScore(tile === "." ? 10 : 50);

    if (tile === "o") {
      triggerPowerMode();
    }

    if (state.dotsEaten === 70 || state.dotsEaten === 170) {
      spawnFruit();
    }

    if (pelletsRemaining === 0) {
      state.levelTransition = 2.2;
      state.running = false;
      state.paused = true;
      statusTextEl.textContent = "Maze clear. Preparing next level.";
      bonusTextEl.textContent = "Maze flash and fade transition active.";
    }
  }
}

function spawnFruit() {
  if (state.fruit) return;
  state.fruit = {
    x: 13.5,
    y: 17,
    value: FRUIT_VALUES[Math.min(state.level - 1, FRUIT_VALUES.length - 1)],
    timer: 10,
  };
  statusTextEl.textContent = "Bonus fruit spawned.";
}

function triggerPowerMode() {
  flashScreen();
  ghosts.forEach((ghost) => {
    if (!ghost.eaten && ghost.releaseDelay <= 0) {
      ghost.frightenedTimer = Math.max(2.4, 6 - (state.level - 1) * 0.4);
      ghost.mode = "frightened";
      ghost.dir = oppositeDirection[ghost.dir];
    }
  });
  state.ghostChain = 0;
  statusTextEl.textContent = "Power pellet active. Ghosts are vulnerable.";
}

function addScore(points) {
  state.score += points;
  if (state.score > highScore) {
    highScore = state.score;
    localStorage.setItem("pacman-high-score", String(highScore));
  }
  if (!state.extraLifeAwarded && state.score >= 10000) {
    state.extraLifeAwarded = true;
    state.lives += 1;
    statusTextEl.textContent = "Extra life awarded at 10,000 points.";
  }
  syncHud();
}

function syncHud() {
  scoreEl.textContent = String(state.score);
  highScoreEl.textContent = String(highScore);
  levelEl.textContent = String(state.level);
  livesEl.textContent = String(state.lives);
}

function collideWithGhost(ghost) {
  if (ghost.eaten) return;

  if (ghost.frightenedTimer > 0) {
    state.freezeTimer = 0.15;
    state.ghostChain = (state.ghostChain || 0) + 1;
    const points = [200, 400, 800, 1600][Math.min(state.ghostChain - 1, 3)];
    addScore(points);
    ghost.eaten = true;
    ghost.frightenedTimer = 0;
    ghost.mode = "eyes";
    shakeScreen();
    state.scorePopups.push({ x: ghost.x, y: ghost.y, value: points, timer: 0.9 });
    statusTextEl.textContent = `Ghost eaten for ${points} points.`;
    return;
  }

  if (state.deathTimer > 0 || state.levelTransition > 0) return;
  state.deathTimer = 1.2;
  state.running = false;
  state.paused = true;
  statusTextEl.textContent = "Pac-Man caught.";
  bonusTextEl.textContent = "Death animation in progress.";
}

function updateGlobalMode(dt) {
  state.modeTimer += dt;
  const current = MODES[Math.min(state.modeIndex, MODES.length - 1)];
  if (state.modeTimer >= current.duration) {
    state.modeIndex = Math.min(state.modeIndex + 1, MODES.length - 1);
    state.modeTimer = 0;
    ghosts.forEach((ghost) => {
      if (!ghost.eaten && ghost.frightenedTimer <= 0) {
        ghost.mode = currentGlobalMode();
        ghost.dir = oppositeDirection[ghost.dir];
      }
    });
  }
}

function update(dt) {
  state.pelletPulse += dt;

  if (state.freezeTimer > 0) {
    state.freezeTimer = Math.max(0, state.freezeTimer - dt);
    updatePopups(dt);
    return;
  }

  if (state.deathTimer > 0) {
    state.deathTimer = Math.max(0, state.deathTimer - dt);
    if (state.deathTimer === 0) {
      state.lives -= 1;
      syncHud();
      if (state.lives <= 0) {
        state.gameOver = true;
        showOverlay("Game Over", "Press Space or Start to play again.");
        statusTextEl.textContent = "Game over.";
        bonusTextEl.textContent = "High score is preserved locally.";
      } else {
        resetActors(true);
        showOverlay("Ready", "Press Space to continue.");
        statusTextEl.textContent = "Life lost. Press Space to continue.";
        bonusTextEl.textContent = "Queued turns remain available as soon as movement resumes.";
      }
    }
    updatePopups(dt);
    return;
  }

  if (state.levelTransition > 0) {
    state.levelTransition = Math.max(0, state.levelTransition - dt);
    state.mazeFlashTimer += dt * 8;
    if (state.levelTransition === 0) {
      state.level += 1;
      cloneBoard();
      resetActors(true);
      state.dotsEaten = 0;
      state.ghostChain = 0;
      state.started = true;
      showOverlay(`Level ${state.level}`, "Press Space to start the next maze.");
      bonusTextEl.textContent = "Fruit still appears at 70 and 170 dots.";
      syncHud();
    }
    updatePopups(dt);
    return;
  }

  if (!state.running) {
    updatePopups(dt);
    return;
  }

  updateGlobalMode(dt);

  moveEntity(pacman, dt);
  handlePellets();

  ghosts.forEach((ghost) => {
    if (ghost.releaseDelay > 0) {
      ghost.releaseDelay = Math.max(0, ghost.releaseDelay - dt);
      if (ghost.releaseDelay === 0 && ghost.inHouse) {
        ghost.dir = "up";
      } else if (ghost.releaseDelay === 0) {
        ghost.dir = "left";
      }
    }

    if (ghost.frightenedTimer > 0) {
      ghost.frightenedTimer = Math.max(0, ghost.frightenedTimer - dt);
      if (ghost.frightenedTimer === 0 && !ghost.eaten) {
        ghost.mode = currentGlobalMode();
      }
    }

    moveEntity(ghost, dt);

    ghost.inHouse = isInGhostHouse(Math.round(ghost.x), Math.round(ghost.y));

    if (ghost.eaten && Math.hypot(ghost.x - GHOST_HOME.x, ghost.y - GHOST_HOME.y) < 0.6) {
      ghost.eaten = false;
      ghost.mode = currentGlobalMode();
      ghost.dir = "up";
      ghost.x = 13.5;
      ghost.y = 14;
      ghost.releaseDelay = 1;
      ghost.inHouse = true;
    }

    if (Math.hypot(ghost.x - pacman.x, ghost.y - pacman.y) < 0.6) {
      collideWithGhost(ghost);
    }
  });

  if (state.fruit) {
    state.fruit.timer -= dt;
    if (Math.hypot(state.fruit.x - pacman.x, state.fruit.y - pacman.y) < 0.7) {
      addScore(state.fruit.value);
      state.scorePopups.push({ x: state.fruit.x, y: state.fruit.y, value: state.fruit.value, timer: 1 });
      statusTextEl.textContent = `Fruit eaten for ${state.fruit.value} points.`;
      state.fruit = null;
    } else if (state.fruit.timer <= 0) {
      state.fruit = null;
    }
  }

  updatePopups(dt);
}

function updatePopups(dt) {
  state.scorePopups = state.scorePopups
    .map((popup) => ({ ...popup, timer: popup.timer - dt, y: popup.y - dt * 1.2 }))
    .filter((popup) => popup.timer > 0);
}

function showOverlay(title, text) {
  overlayEl.classList.add("active");
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;
}

function hideOverlay() {
  overlayEl.classList.remove("active");
}

function flashScreen() {
  effectsFrame.classList.remove("flash");
  void effectsFrame.offsetWidth;
  effectsFrame.classList.add("flash");
}

function shakeScreen() {
  shakeLayer.classList.remove("shake");
  void shakeLayer.offsetWidth;
  shakeLayer.classList.add("shake");
}

function startGame() {
  if (state.gameOver) {
    submitGameOverScore();
    resetGame();
  }
  state.started = true;
  state.paused = false;
  state.running = true;
  hideOverlay();
  statusTextEl.textContent = "Run clean lines and queue early turns.";
  bonusTextEl.textContent = "Power pellets trigger frightened ghosts and a screen flash.";
}

function resetGame() {
  state.modeIndex = 0;
  state.modeTimer = 0;
  state.running = false;
  state.started = false;
  state.paused = true;
  state.gameOver = false;
  state.submittedScore = false;
  state.score = 0;
  state.level = 1;
  state.lives = 3;
  state.dotsEaten = 0;
  state.extraLifeAwarded = false;
  state.freezeTimer = 0;
  state.deathTimer = 0;
  state.levelTransition = 0;
  state.ghostChain = 0;
  cloneBoard();
  resetActors(true);
  syncHud();
  showOverlay("Press Space to Start", "Use arrow keys, WASD, or touch controls to move.");
  statusTextEl.textContent = "Collect every dot and avoid the ghosts.";
  bonusTextEl.textContent = "Bonus fruit appears after 70 and 170 dots eaten.";
}

function submitGameOverScore() {
  if (state.submittedScore) {
    return;
  }

  state.submittedScore = Boolean(window.ArcadeHighScores?.promptAndSubmit("pacman", state.score));
}

function drawBoard() {
  ctx.save();
  if (state.levelTransition > 0) {
    const flash = Math.floor(state.mazeFlashTimer) % 2 === 0;
    ctx.fillStyle = flash ? "#f0f0f0" : "#2121de";
  } else {
    ctx.fillStyle = "#2121de";
  }

  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      const tile = board[y][x];
      const px = x * TILE;
      const py = y * TILE + BOARD_OFFSET_Y;

      if (tile === "#") {
        ctx.fillRect(px, py, TILE, TILE);
      } else if (tile === "." || tile === "o") {
        const pulse = tile === "o" ? 1 + Math.sin(state.pelletPulse * 7) * 0.22 : 1;
        ctx.fillStyle = "#ffb897";
        ctx.beginPath();
        ctx.arc(
          px + TILE / 2,
          py + TILE / 2,
          tile === "o" ? 3.1 * pulse : 1.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.fillStyle = state.levelTransition > 0 ? "#f0f0f0" : "#2121de";
      }
    }
  }

  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);
  ctx.fillStyle = "#f0f0f0";
  ctx.font = "12px 'Pixelify Sans'";
  ctx.fillText("1UP", 8, 12);
  ctx.fillStyle = "#fff000";
  ctx.font = "bold 16px 'Pixelify Sans'";
  ctx.fillText(String(state.score), 8, 28);

  ctx.fillStyle = "#f0f0f0";
  ctx.font = "12px 'Pixelify Sans'";
  ctx.fillText("HIGH SCORE", 78, 12);
  ctx.fillStyle = "#fff000";
  ctx.font = "bold 16px 'Pixelify Sans'";
  ctx.fillText(String(highScore), 88, 28);

  ctx.fillStyle = "#00f0ff";
  ctx.font = "12px 'Pixelify Sans'";
  ctx.fillText(`L${state.level}`, 196, 28);

  for (let i = 0; i < Math.max(0, state.lives - 1); i += 1) {
    drawPacmanShape(12 + i * 14, 278, 5, 0.22, 0);
  }
}

function drawPacmanShape(x, y, radius, mouthOpen, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#ffff00";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(ghost) {
  const px = ghost.x * TILE;
  const py = ghost.y * TILE + BOARD_OFFSET_Y;
  const blink = ghost.frightenedTimer > 0 && ghost.frightenedTimer < 1.5 && Math.floor(state.pelletPulse * 12) % 2 === 0;

  let color = GHOST_COLORS[ghost.name];
  if (ghost.eaten) color = GHOST_COLORS.eyes;
  else if (ghost.frightenedTimer > 0) color = blink ? GHOST_COLORS.frightenedFlash : GHOST_COLORS.frightened;

  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;

  if (!ghost.eaten) {
    ctx.beginPath();
    ctx.moveTo(-ENTITY_RADIUS, ENTITY_RADIUS);
    ctx.lineTo(-ENTITY_RADIUS, 0);
    ctx.arc(0, 0, ENTITY_RADIUS, Math.PI, 0);
    ctx.lineTo(ENTITY_RADIUS, ENTITY_RADIUS);
    ctx.lineTo(ENTITY_RADIUS - 1.2, ENTITY_RADIUS - 1);
    ctx.lineTo(ENTITY_RADIUS - 2.2, ENTITY_RADIUS);
    ctx.lineTo(0, ENTITY_RADIUS - 1);
    ctx.lineTo(-ENTITY_RADIUS + 2.2, ENTITY_RADIUS);
    ctx.lineTo(-ENTITY_RADIUS + 1.2, ENTITY_RADIUS - 1);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-1.4, -0.2, 1.2, 1.6, 0, 0, Math.PI * 2);
  ctx.ellipse(1.4, -0.2, 1.2, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  const look = directions[ghost.dir] || { x: 0, y: 0 };
  ctx.fillStyle = "#00195c";
  ctx.beginPath();
  ctx.arc(-1.4 + look.x * 0.45, -0.2 + look.y * 0.45, 0.5, 0, Math.PI * 2);
  ctx.arc(1.4 + look.x * 0.45, -0.2 + look.y * 0.45, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFruit() {
  if (!state.fruit) return;
  const px = state.fruit.x * TILE;
  const py = state.fruit.y * TILE + BOARD_OFFSET_Y;
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = "#ff3b3b";
  ctx.beginPath();
  ctx.arc(-1.2, 0, 2.2, 0, Math.PI * 2);
  ctx.arc(1.2, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7be26f";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(1.5, -3.5);
  ctx.stroke();
  ctx.restore();
}

function drawPopups() {
  ctx.save();
  ctx.font = "bold 12px 'Pixelify Sans'";
  ctx.textAlign = "center";
  for (const popup of state.scorePopups) {
    const alpha = Math.min(1, popup.timer);
    ctx.fillStyle = `rgba(255, 240, 0, ${alpha})`;
    ctx.fillText(String(popup.value), popup.x * TILE, popup.y * TILE + BOARD_OFFSET_Y);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHud();
  drawBoard();
  drawFruit();

  const mouthOpen = state.deathTimer > 0 ? Math.max(0.04, state.deathTimer / 1.8) : 0.12 + (Math.sin(animationFrame / 7) + 1) * 0.12;
  const angleMap = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  drawPacmanShape(pacman.x * TILE, pacman.y * TILE + BOARD_OFFSET_Y, ENTITY_RADIUS + 0.4, mouthOpen, angleMap[pacman.dir]);

  ghosts.forEach(drawGhost);
  drawPopups();
}

function gameLoop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;
  animationFrame += 1;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function handleKey(event) {
  const keyMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    a: "left",
    d: "right",
    w: "up",
    s: "down",
  };

  if (event.code === "Space") {
    event.preventDefault();
    startGame();
    return;
  }

  const dir = keyMap[event.key];
  if (dir) {
    event.preventDefault();
    setDirection(dir);
  }
}

function initTouchControls() {
  document.querySelectorAll("[data-dir]").forEach((button) => {
    const dir = button.getAttribute("data-dir");
    const handler = (event) => {
      event.preventDefault();
      setDirection(dir);
      if (!state.started || state.paused) startGame();
    };
    button.addEventListener("touchstart", handler, { passive: false });
    button.addEventListener("mousedown", handler);
  });
}

startButton.addEventListener("click", startGame);
scanlineButton.addEventListener("click", () => {
  scanlinesEl.classList.toggle("hidden");
  scanlineButton.textContent = scanlinesEl.classList.contains("hidden") ? "Scanlines Off" : "Scanlines On";
});
document.addEventListener("keydown", handleKey);
initTouchControls();

resetGame();
highScoreEl.textContent = String(highScore);
requestAnimationFrame(gameLoop);
