const COLS = 10;
const ROWS = 20;
// Keep a hidden spawn buffer above the visible 20-row matrix so pieces can
// enter from off-screen instead of colliding immediately with the top row.
const HIDDEN_ROWS = 2;
const TOTAL_ROWS = ROWS + HIDDEN_ROWS;
const BLOCK = 32;
const SOFT_DROP_INTERVAL = 40;
const MOVE_DELAY = 267;
const MOVE_REPEAT = 100;
const PREVIEW_COUNT = 1;
const SCORE_BY_LINES = [0, 100, 300, 500, 800];
const SOUND_VOLUME = {
  move: 0.22,
  rotate: 0.28,
  softDrop: 0.18,
  lock: 0.28,
  lineClear: 0.36,
  tetrisClear: 0.42,
  levelUp: 0.34,
  pause: 0.3,
  start: 0.38,
  topOut: 0.42,
};
const ROTATION_COUNTS = {
  I: 2,
  O: 1,
  T: 4,
  J: 4,
  L: 4,
  S: 2,
  Z: 2,
};

const COLORS = {
  I: "#00F0FF",
  O: "#FFD700",
  T: "#B052FF",
  J: "#3B5BFF",
  L: "#FF8A1F",
  S: "#00FF41",
  Z: "#FF1744",
};

const SPAWN_X = {
  I: 3,
  O: 4,
  T: 3,
  J: 3,
  L: 3,
  S: 3,
  Z: 3,
};

const SHAPES = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
};

const boardCanvas = document.getElementById("board");
const ctx = boardCanvas.getContext("2d");
boardCanvas.width = COLS * BLOCK;
boardCanvas.height = ROWS * BLOCK;

const scoreNode = document.getElementById("score");
const levelNode = document.getElementById("level");
const linesNode = document.getElementById("lines");
const bestNode = document.getElementById("best-score");
const nextNode = document.getElementById("next-queue");
const overlay = document.getElementById("overlay");
const overlayKicker = document.getElementById("overlay-kicker");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const sound = createSoundManager();

let state = createInitialState();
let lastTime = 0;

initMiniBoards();
attachEvents();
resetGame();
requestAnimationFrame(loop);

function createInitialState() {
  return {
    board: createBoard(),
    active: null,
    queue: [],
    score: 0,
    level: 1,
    lines: 0,
    bestScore: Number(localStorage.getItem("tetris-best-score") || 0),
    dropAccumulator: 0,
    gravityOverride: false,
    gameOver: false,
    submittedScore: false,
    paused: true,
    started: false,
    spawnDelay: 0,
    pendingPiece: null,
    lastSoftDropSound: 0,
    moveState: {
      left: false,
      right: false,
      leftTimer: 0,
      rightTimer: 0,
      leftRepeating: false,
      rightRepeating: false,
    },
  };
}

function createBoard() {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
}

function resetGame() {
  state = createInitialState();
  state.queue = [];
  fillQueue();
  spawnPiece();
  syncHud();
  renderQueue();
  showOverlay("Press Enter", "Tetris", "Classic A-Type from the mechanics doc.");
}

function startGame() {
  if (state.gameOver) {
    submitGameOverScore();
    resetGame();
  }

  sound.unlock();
  state.started = true;
  state.paused = false;
  hideOverlay();
  sound.play("start");
}

function togglePause() {
  if (!state.started || state.gameOver) {
    return;
  }

  sound.unlock();
  state.paused = !state.paused;
  sound.play("pause");

  if (state.paused) {
    showOverlay("Paused", "Run Frozen", "Press P to resume or Enter to restart.");
  } else {
    hideOverlay();
  }
}

function spawnPiece(type = drawFromQueue()) {
  state.active = {
    type,
    x: SPAWN_X[type],
    y: 0,
    rotation: 0,
  };
  state.dropAccumulator = 0;
  state.spawnDelay = 0;
  state.pendingPiece = null;
  fillQueue();
  renderQueue();

  if (collides(state.active)) {
    state.gameOver = true;
    state.paused = true;
    state.started = false;
    updateBestScore();
    sound.play("topOut");
    showOverlay("Top Out", "Game Over", "Press Enter to start a new run.");
  }
}

function submitGameOverScore() {
  if (state.submittedScore) {
    return;
  }

  state.submittedScore = Boolean(window.ArcadeHighScores?.promptAndSubmit("tetris", state.score));
}

function drawFromQueue() {
  fillQueue();
  return state.queue.shift();
}

function fillQueue() {
  while (state.queue.length < PREVIEW_COUNT + 1) {
    const pieces = ["I", "O", "T", "J", "L", "S", "Z"];
    const randomIndex = Math.floor(Math.random() * pieces.length);
    state.queue.push(pieces[randomIndex]);
  }
}

function attachEvents() {
  window.addEventListener("keydown", (event) => {
    if (event.repeat && ["ArrowUp", "KeyZ", "Enter"].includes(event.code)) {
      event.preventDefault();
      return;
    }

    switch (event.code) {
      case "Enter":
        event.preventDefault();
        if (!state.started || state.gameOver) {
          startGame();
        } else {
          resetGame();
          startGame();
        }
        break;
      case "KeyP":
        event.preventDefault();
        togglePause();
        break;
      case "ArrowLeft":
        event.preventDefault();
        pressHorizontal("left");
        break;
      case "ArrowRight":
        event.preventDefault();
        pressHorizontal("right");
        break;
      case "ArrowUp":
      case "KeyX":
        event.preventDefault();
        if (canPlay()) {
          rotate(1);
        }
        break;
      case "KeyZ":
        event.preventDefault();
        if (canPlay()) {
          rotate(-1);
        }
        break;
      case "Space":
        event.preventDefault();
        state.gravityOverride = true;
        break;
      default:
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    switch (event.code) {
      case "ArrowLeft":
        releaseHorizontal("left");
        break;
      case "ArrowRight":
        releaseHorizontal("right");
        break;
      case "Space":
        state.gravityOverride = false;
        break;
      default:
        break;
    }
  });
}

function canPlay() {
  return state.started && !state.paused && !state.gameOver;
}

function pressHorizontal(direction) {
  if (!canPlay()) {
    return;
  }

  const move = state.moveState;
  if (direction === "left") {
    move.left = true;
    move.leftTimer = 0;
    move.leftRepeating = false;
    if (tryMove(-1, 0)) {
      sound.play("move");
    }
  } else {
    move.right = true;
    move.rightTimer = 0;
    move.rightRepeating = false;
    if (tryMove(1, 0)) {
      sound.play("move");
    }
  }
}

function releaseHorizontal(direction) {
  const move = state.moveState;
  if (direction === "left") {
    move.left = false;
    move.leftTimer = 0;
    move.leftRepeating = false;
  } else {
    move.right = false;
    move.rightTimer = 0;
    move.rightRepeating = false;
  }
}

function updateHorizontalRepeat(delta) {
  const { moveState } = state;
  handleRepeatAxis("left", -1, delta, moveState);
  handleRepeatAxis("right", 1, delta, moveState);
}

function handleRepeatAxis(label, deltaX, delta, moveState) {
  if (!moveState[label] || !canPlay()) {
    return;
  }

  const timerKey = `${label}Timer`;
  const repeatKey = `${label}Repeating`;

  moveState[timerKey] += delta;
  if (!moveState[repeatKey]) {
    if (moveState[timerKey] >= MOVE_DELAY) {
      moveState[repeatKey] = true;
      moveState[timerKey] -= MOVE_DELAY;
      if (tryMove(deltaX, 0)) {
        sound.play("move");
      }
    }
    return;
  }

  while (moveState[timerKey] >= MOVE_REPEAT) {
    moveState[timerKey] -= MOVE_REPEAT;
    if (tryMove(deltaX, 0)) {
      sound.play("move");
    }
  }
}

function rotate(direction) {
  const candidate = getRotatedCandidate(direction);
  if (!candidate) {
    return false;
  }

  state.active = candidate;
  sound.play("rotate");
  return true;
}

function getRotatedCandidate(direction) {
  const rotationCount = ROTATION_COUNTS[state.active.type];
  if (rotationCount === 1) {
    return null;
  }

  const normalizedRotation = state.active.rotation % rotationCount;
  const nextRotation = (normalizedRotation + direction + rotationCount) % rotationCount;
  const candidate = {
    ...state.active,
    rotation: nextRotation,
  };
  return collides(candidate) ? null : candidate;
}

function tryMove(dx, dy) {
  const candidate = { ...state.active, x: state.active.x + dx, y: state.active.y + dy };
  if (collides(candidate)) {
    return false;
  }

  state.active = candidate;
  return true;
}

function stepGravity(delta) {
  const interval = state.gravityOverride ? SOFT_DROP_INTERVAL : getGravityInterval();
  state.dropAccumulator += delta;
  state.lastSoftDropSound += delta;

  while (state.dropAccumulator >= interval) {
    state.dropAccumulator -= interval;
    if (!tryMove(0, 1)) {
      lockPiece();
      break;
    }

    if (state.gravityOverride) {
      state.score += 1;
      if (state.lastSoftDropSound >= 70) {
        sound.play("softDrop");
        state.lastSoftDropSound = 0;
      }
    }
  }
}

function lockPiece() {
  const lockedBlocks = getBlocks(state.active);
  const lowestLockedRow = Math.max(...lockedBlocks.map(([, y]) => y));
  const previousLevel = state.level;

  for (const [x, y] of getBlocks(state.active)) {
    if (y >= 0 && y < TOTAL_ROWS) {
      state.board[y][x] = state.active.type;
    }
  }

  const cleared = clearLines();
  if (cleared > 0) {
    state.score += SCORE_BY_LINES[cleared] * state.level;
    state.lines += cleared;
    state.level = Math.floor(state.lines / 10) + 1;
  }

  state.score = Math.min(state.score, 999999);

  updateBestScore();
  syncHud();
  playLockSequence(cleared, previousLevel, state.level);
  queueSpawn(cleared, lowestLockedRow);
}

function queueSpawn(linesCleared, lockedRow) {
  state.active = null;
  state.pendingPiece = drawFromQueue();
  const areFrames = calculateAreFrames(lockedRow);
  const lineDelayFrames = linesCleared > 0 ? 18 : 0;
  state.spawnDelay = ((areFrames + lineDelayFrames) / 60) * 1000;
}

function calculateAreFrames(row) {
  const clamped = Math.max(0, Math.min(ROWS - 1, row));
  return 18 - Math.round((clamped / Math.max(ROWS - 1, 1)) * 8);
}

function clearLines() {
  const keptRows = state.board.filter((row) => row.some((cell) => !cell));
  const cleared = TOTAL_ROWS - keptRows.length;
  while (keptRows.length < TOTAL_ROWS) {
    keptRows.unshift(Array(COLS).fill(null));
  }
  state.board = keptRows;
  return cleared;
}

function collides(piece) {
  return getBlocks(piece).some(([x, y]) => {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) {
      return true;
    }
    if (y < 0) {
      return false;
    }
    return Boolean(state.board[y][x]);
  });
}

function getBlocks(piece) {
  return SHAPES[piece.type][piece.rotation].map(([x, y]) => [piece.x + x, piece.y + y]);
}

function getGravityInterval() {
  const framesPerRow = [
    48, 43, 38, 33, 28, 23, 18, 13, 8, 6,
    5, 5, 5, 4, 4, 4, 3, 3, 3, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 1,
  ];
  const index = Math.min(state.level - 1, framesPerRow.length - 1);
  return (framesPerRow[index] / 60) * 1000;
}

function syncHud() {
  scoreNode.textContent = state.score.toLocaleString();
  levelNode.textContent = state.level;
  linesNode.textContent = state.lines;
  bestNode.textContent = state.bestScore.toLocaleString();
}

function updateBestScore() {
  if (state.score <= state.bestScore) {
    return;
  }

  state.bestScore = state.score;
  localStorage.setItem("tetris-best-score", String(state.bestScore));
  syncHud();
}

function showOverlay(kicker, title, message) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function loop(timestamp) {
  const delta = Math.min(timestamp - lastTime || 0, 50);
  lastTime = timestamp;

  if (canPlay()) {
    updateHorizontalRepeat(delta);
    if (state.active) {
      stepGravity(delta);
    } else if (state.pendingPiece) {
      state.spawnDelay -= delta;
      if (state.spawnDelay <= 0) {
        spawnPiece(state.pendingPiece);
      }
    }
    syncHud();
  }

  render();
  requestAnimationFrame(loop);
}

function render() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  drawGrid();
  drawStack();
  if (state.active) {
    drawGhost();
    drawPiece(state.active, 1);
  }
}

function drawGrid() {
  const gradient = ctx.createLinearGradient(0, 0, 0, boardCanvas.height);
  gradient.addColorStop(0, "#10051d");
  gradient.addColorStop(0.45, "#07101b");
  gradient.addColorStop(1, "#02050c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    ctx.fillStyle = y % 2 === 0 ? "rgba(0, 240, 255, 0.025)" : "rgba(255, 0, 255, 0.018)";
    ctx.fillRect(0, y * BLOCK, boardCanvas.width, BLOCK);
  }

  ctx.strokeStyle = "rgba(0,240,255,0.09)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK + 0.5, 0);
    ctx.lineTo(x * BLOCK + 0.5, boardCanvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK + 0.5);
    ctx.lineTo(boardCanvas.width, y * BLOCK + 0.5);
    ctx.stroke();
  }
}

function drawStack() {
  for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const type = state.board[y][x];
      if (type) {
        drawBlock(x, y - HIDDEN_ROWS, COLORS[type], 1);
      }
    }
  }
}

function drawGhost() {
  const ghost = { ...state.active, y: getGhostY() };
  drawPiece(ghost, 0.3, true);
}

function drawPiece(piece, alpha, isGhost = false) {
  for (const [x, y] of getBlocks(piece)) {
    if (y >= HIDDEN_ROWS) {
      drawBlock(x, y - HIDDEN_ROWS, COLORS[piece.type], alpha, isGhost);
    }
  }
}

function drawBlock(x, y, color, alpha, isGhost = false) {
  const px = x * BLOCK;
  const py = y * BLOCK;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (isGhost) {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 7, py + 7, BLOCK - 14, BLOCK - 14);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(px + 8, py + 8, BLOCK - 16, BLOCK - 16);
    ctx.restore();
    return;
  }

  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillRect(px + 4, py + 4, BLOCK - 8, BLOCK - 8);

  const shine = ctx.createLinearGradient(px, py, px, py + BLOCK);
  shine.addColorStop(0, "rgba(255,255,255,0.26)");
  shine.addColorStop(0.5, "rgba(255,255,255,0.05)");
  shine.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = shine;
  ctx.fillRect(px + 4, py + 4, BLOCK - 8, BLOCK - 8);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(px + 4, py + 4, BLOCK - 8, 2);
  ctx.fillRect(px + 4, py + 4, 2, BLOCK - 8);

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.fillRect(px + 4, py + BLOCK - 6, BLOCK - 8, 2);
  ctx.fillRect(px + BLOCK - 6, py + 4, 2, BLOCK - 8);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 4.5, py + 4.5, BLOCK - 9, BLOCK - 9);

  ctx.restore();
}

function getGhostY() {
  let testY = state.active.y;
  while (!collides({ ...state.active, y: testY + 1 })) {
    testY += 1;
  }
  return testY;
}

function initMiniBoards() {
  renderQueue();
}

function renderQueue() {
  nextNode.innerHTML = "";
  state.queue.slice(0, PREVIEW_COUNT).forEach((type) => {
    const wrapper = document.createElement("div");
    wrapper.className = "queue-item";
    nextNode.appendChild(wrapper);
    renderMiniBoard(wrapper, type);
  });
}

function renderMiniBoard(container, type) {
  container.innerHTML = "";
  const cells = Array.from({ length: 16 }, () => {
    const cell = document.createElement("div");
    cell.className = "cell";
    container.appendChild(cell);
    return cell;
  });

  if (!type) {
    return;
  }

  const coords = SHAPES[type][0];
  for (const [x, y] of coords) {
    const index = y * 4 + x;
    const cell = cells[index];
    if (cell) {
      cell.classList.add("filled");
      cell.style.setProperty("--cell-color", COLORS[type]);
    }
  }
}

function createSoundManager() {
  const files = {
    move: "assets/sound/move.wav",
    rotate: "assets/sound/rotate.wav",
    softDrop: "assets/sound/soft_drop.wav",
    lock: "assets/sound/lock.wav",
    lineClear: "assets/sound/line_clear.wav",
    tetrisClear: "assets/sound/tetris_clear.wav",
    levelUp: "assets/sound/level_up.wav",
    pause: "assets/sound/pause.wav",
    start: "assets/sound/start.wav",
    topOut: "assets/sound/top_out.wav",
  };

  const manager = {
    enabled: typeof Audio !== "undefined",
    unlocked: false,
    pools: {},
    unlock() {
      if (!this.enabled || this.unlocked) {
        return;
      }

      Object.values(this.pools).forEach((pool) => {
        pool.forEach((audio) => {
          const playAttempt = audio.play();
          if (playAttempt && typeof playAttempt.then === "function") {
            playAttempt
              .then(() => {
                audio.pause();
                audio.currentTime = 0;
              })
              .catch(() => {});
          } else {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      });
      this.unlocked = true;
    },
    play(name) {
      if (!this.enabled) {
        return;
      }

      const pool = this.pools[name];
      if (!pool) {
        return;
      }

      const audio = pool.find((item) => item.paused || item.ended) || pool[0];
      if (!audio) {
        return;
      }

      audio.currentTime = 0;
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
    },
  };

  if (!manager.enabled) {
    return manager;
  }

  Object.entries(files).forEach(([name, src]) => {
    const poolSize = name === "move" || name === "softDrop" ? 3 : 2;
    manager.pools[name] = Array.from({ length: poolSize }, () => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = SOUND_VOLUME[name];
      return audio;
    });
  });

  return manager;
}

function playLockSequence(cleared, previousLevel, nextLevel) {
  if (cleared === 0) {
    sound.play("lock");
  } else if (cleared === 4) {
    sound.play("tetrisClear");
  } else {
    sound.play("lineClear");
  }

  if (nextLevel > previousLevel) {
    setTimeout(() => {
      sound.play("levelUp");
    }, 120);
  }
}
