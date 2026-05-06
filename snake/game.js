const TARGET_CELL_SIZE = 32;
const START_LENGTH = 4;
const SCORE_PER_FOOD = 10;
const STORAGE_KEYS = {
  highScore: "snake_arcade_high_score",
  settings: "snake_arcade_settings",
};
const HOME_URL = "../index.html";

const DIFFICULTIES = {
  easy: { label: "Easy", interval: 250 },
  medium: { label: "Medium", interval: 150 },
  hard: { label: "Hard", interval: 80 },
  extreme: { label: "Extreme", interval: 50 },
};

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1, opposite: "ArrowDown" },
  ArrowDown: { x: 0, y: 1, opposite: "ArrowUp" },
  ArrowLeft: { x: -1, y: 0, opposite: "ArrowRight" },
  ArrowRight: { x: 1, y: 0, opposite: "ArrowLeft" },
};

const KEY_ALIASES = {
  w: "ArrowUp",
  W: "ArrowUp",
  s: "ArrowDown",
  S: "ArrowDown",
  a: "ArrowLeft",
  A: "ArrowLeft",
  d: "ArrowRight",
  D: "ArrowRight",
};

const SOUND_FILES = {
  start: "./assets/sounds/start.wav",
  eat: "./assets/sounds/eat.wav",
  turn: "./assets/sounds/turn.wav",
  pause: "./assets/sounds/pause.wav",
  resume: "./assets/sounds/resume.wav",
  gameOver: "./assets/sounds/game_over.wav",
  highScore: "./assets/sounds/high_score.wav",
  menuMove: "./assets/sounds/menu_move.wav",
  confirm: "./assets/sounds/confirm.wav",
};

const state = {
  mode: "menu",
  snake: [],
  food: null,
  direction: "ArrowRight",
  queuedDirection: null,
  score: 0,
  highScore: Number(localStorage.getItem(STORAGE_KEYS.highScore)) || 0,
  speedKey: "easy",
  tickInterval: DIFFICULTIES.easy.interval,
  lastTickAt: 0,
  hasNewHighScore: false,
  runStartingHighScore: 0,
  deathFlash: null,
  settings: loadSettings(),
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const appShell = document.querySelector(".app-shell");
const hudCard = document.querySelector(".hud-card");
const scoreValue = document.getElementById("scoreValue");
const highScoreValue = document.getElementById("highScoreValue");
const menuHighScoreValue = document.getElementById("menuHighScoreValue");
const stateValue = document.getElementById("stateValue");
const finalScoreValue = document.getElementById("finalScoreValue");
const newHighScoreBadge = document.getElementById("newHighScoreBadge");
const pauseButton = document.getElementById("pauseButton");
const menuStartButton = document.getElementById("menuStartButton");
const restartButton = document.getElementById("restartButton");
const mainMenuButton = document.getElementById("mainMenuButton");
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const difficultySelect = document.getElementById("difficultySelect");
const crtToggle = document.getElementById("crtToggle");
const crtOverlay = document.getElementById("crtOverlay");

const overlays = {
  menu: document.getElementById("menuOverlay"),
  paused: document.getElementById("pausedOverlay"),
  gameOver: document.getElementById("gameOverOverlay"),
};

const sounds = createSoundLibrary();

function createSoundLibrary() {
  const library = {};

  Object.entries(SOUND_FILES).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    library[key] = { audio, lastPlayedAt: 0 };
  });

  return {
    unlocked: false,
    library,
  };
}

function unlockAudio() {
  if (sounds.unlocked) {
    return;
  }

  sounds.unlocked = true;
  Object.values(sounds.library).forEach(({ audio }) => {
    audio.load();
  });
}

function playSound(name, minGap = 0) {
  if (!sounds.unlocked || !sounds.library[name]) {
    return;
  }

  const entry = sounds.library[name];
  const now = performance.now();
  if (now - entry.lastPlayedAt < minGap) {
    return;
  }

  entry.lastPlayedAt = now;
  const instance = entry.audio.cloneNode();
  instance.volume = 0.8;
  instance.play().catch(() => {});
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    return {
      difficulty: stored.difficulty in DIFFICULTIES ? stored.difficulty : "easy",
      crtEnabled: stored.crtEnabled ?? true,
    };
  } catch {
    return { difficulty: "easy", crtEnabled: true };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function setOverlay(mode) {
  Object.entries(overlays).forEach(([key, element]) => {
    element.classList.toggle("active", key === mode);
  });
}

function updateHud() {
  scoreValue.textContent = state.score;
  highScoreValue.textContent = state.highScore;
  menuHighScoreValue.textContent = state.highScore;
  stateValue.textContent =
    state.mode === "gameOver"
      ? "Game Over"
      : state.mode.charAt(0).toUpperCase() + state.mode.slice(1);
  pauseButton.textContent = state.mode === "paused" ? "Resume" : "Pause";
}

function syncLayoutState() {
  appShell.dataset.mode = state.mode;
}

function updateSettingsUI() {
  difficultySelect.value = state.settings.difficulty;
  crtToggle.checked = state.settings.crtEnabled;
  crtOverlay.style.display = state.settings.crtEnabled ? "block" : "none";
  settingsButton.setAttribute("aria-expanded", String(!settingsPanel.hidden));
}

function initialSnake() {
  const { cols, rows, blockedCells } = getBoardMetrics();
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);
  let startY = centerY;

  while (blockedCells.has(`${centerX},${startY}`) && startY < rows - 1) {
    startY += 1;
  }

  return Array.from({ length: START_LENGTH }, (_, index) => ({
    x: centerX - index,
    y: startY,
  }));
}

function randomEmptyCell() {
  const { cols, rows, blockedCells } = getBoardMetrics();
  const occupied = new Set(state.snake.map(({ x, y }) => `${x},${y}`));
  const emptyCells = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key) && !blockedCells.has(key)) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length === 0) {
    return null;
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function startGame() {
  state.mode = "playing";
  state.snake = initialSnake();
  state.food = randomEmptyCell();
  state.direction = "ArrowRight";
  state.queuedDirection = null;
  state.score = 0;
  state.hasNewHighScore = false;
  state.runStartingHighScore = state.highScore;
  state.deathFlash = null;
  state.speedKey = state.settings.difficulty;
  state.tickInterval = DIFFICULTIES[state.speedKey].interval;
  state.lastTickAt = performance.now();
  syncLayoutState();
  setOverlay(null);
  updateHud();
  playSound("start", 80);
  draw();
}

function backToMenu() {
  window.location.href = HOME_URL;
}

function togglePause(forceMode) {
  if (state.mode !== "playing" && state.mode !== "paused") {
    return;
  }

  const nextMode = forceMode || (state.mode === "playing" ? "paused" : "playing");
  const previousMode = state.mode;
  state.mode = forceMode || (state.mode === "playing" ? "paused" : "playing");
  syncLayoutState();
  if (state.mode === "paused") {
    setOverlay("paused");
  } else {
    setOverlay(null);
    state.lastTickAt = performance.now();
  }
  updateHud();

  if (previousMode !== nextMode) {
    playSound(state.mode === "paused" ? "pause" : "resume", 80);
  }
}

function endGame(collisionPoint) {
  state.mode = "gameOver";
  state.deathFlash = { ...collisionPoint, startedAt: performance.now() };
  state.hasNewHighScore = state.score > state.runStartingHighScore;
  syncLayoutState();

  if (state.hasNewHighScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
  }

  finalScoreValue.textContent = state.score;
  newHighScoreBadge.classList.toggle("hidden", !state.hasNewHighScore);
  setOverlay("gameOver");
  updateHud();
  playSound("gameOver", 100);
  window.ArcadeHighScores?.promptAndSubmit("snake", state.score);
  if (state.hasNewHighScore) {
    setTimeout(() => playSound("highScore", 100), 180);
  }
}

function advanceTick() {
  const { cols, rows, blockedCells } = getBoardMetrics();
  const requestedDirection = state.queuedDirection;
  if (requestedDirection && requestedDirection !== DIRECTIONS[state.direction].opposite) {
    state.direction = requestedDirection;
  }
  state.queuedDirection = null;

  const heading = DIRECTIONS[state.direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + heading.x, y: head.y + heading.y };

  const eatsFood = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
  const bodyToCheck = eatsFood ? state.snake : state.snake.slice(0, -1);

  const hitsWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= cols ||
    nextHead.y >= rows ||
    blockedCells.has(`${nextHead.x},${nextHead.y}`);
  const hitsSelf = bodyToCheck.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

  if (hitsWall || hitsSelf) {
    endGame({
      x: Math.max(0, Math.min(cols - 1, nextHead.x)),
      y: Math.max(0, Math.min(rows - 1, nextHead.y)),
    });
    return;
  }

  state.snake.unshift(nextHead);

  if (eatsFood) {
    state.score += SCORE_PER_FOOD;
    state.food = randomEmptyCell();
    increaseSpeed();
    playSound("eat", 40);

    if (state.food === null) {
      endGame(nextHead);
      return;
    }
  } else {
    state.snake.pop();
  }

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEYS.highScore, String(state.highScore));
  }

  updateHud();
}

function increaseSpeed() {
  state.tickInterval = Math.max(50, DIFFICULTIES[state.settings.difficulty].interval - state.score * 2);
  if (state.tickInterval <= DIFFICULTIES.extreme.interval) {
    state.speedKey = "extreme";
  } else if (state.tickInterval <= DIFFICULTIES.hard.interval) {
    state.speedKey = "hard";
  } else if (state.tickInterval <= DIFFICULTIES.medium.interval) {
    state.speedKey = "medium";
  } else {
    state.speedKey = "easy";
  }
}

function getBoardMetrics() {
  const width = canvas.width;
  const height = canvas.height;
  const cols = Math.max(12, Math.floor(width / TARGET_CELL_SIZE));
  const rows = Math.max(12, Math.floor(height / TARGET_CELL_SIZE));
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const hudRect = hudCard.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvasRect.width > 0 ? width / canvasRect.width : 1;
  const scaleY = canvasRect.height > 0 ? height / canvasRect.height : 1;
  const hudLeft = Math.max(0, (hudRect.left - canvasRect.left) * scaleX);
  const hudRight = Math.max(0, (hudRect.right - canvasRect.left) * scaleX);
  const hudTop = Math.max(0, (hudRect.top - canvasRect.top) * scaleY);
  const hudBottom = Math.max(0, (hudRect.bottom - canvasRect.top) * scaleY);
  const blockedStartCol = Math.max(0, Math.floor(hudLeft / cellWidth));
  const blockedCols = Math.min(
    cols,
    Math.max(blockedStartCol, Math.ceil(hudRight / cellWidth))
  );
  const blockedStartRow = Math.max(0, Math.floor(hudTop / cellHeight));
  const blockedRows = Math.min(
    rows,
    Math.max(blockedStartRow, Math.ceil(hudBottom / cellHeight))
  );
  const blockedCells = new Set();

  for (let y = blockedStartRow; y < blockedRows; y += 1) {
    for (let x = blockedStartCol; x < blockedCols; x += 1) {
      blockedCells.add(`${x},${y}`);
    }
  }

  return { width, height, cols, rows, cellWidth, cellHeight, blockedCells };
}

function drawBoard() {
  const { width, height, cols, rows, cellWidth, cellHeight, blockedCells } = getBoardMetrics();

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(6, 10, 28, 0.98)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(167, 176, 192, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= cols; i += 1) {
    const offset = i * cellWidth + 0.5;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, height);
    ctx.stroke();
  }

  for (let i = 0; i <= rows; i += 1) {
    const offset = i * cellHeight + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(width, offset);
    ctx.stroke();
  }

  blockedCells.forEach((cell) => {
    const [x, y] = cell.split(",").map(Number);
    ctx.fillStyle = "rgba(8, 12, 30, 0.9)";
    ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
  });

  if (state.food) {
    const fx = state.food.x * cellWidth;
    const fy = state.food.y * cellHeight;
    const pulse = 0.85 + Math.sin(performance.now() / 160) * 0.08;
    ctx.save();
    ctx.translate(fx + cellWidth / 2, fy + cellHeight / 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ff6b35";
    ctx.shadowColor = "rgba(255, 107, 53, 0.7)";
    ctx.shadowBlur = 18;
    ctx.fillRect(-cellWidth * 0.28, -cellHeight * 0.28, cellWidth * 0.56, cellHeight * 0.56);
    ctx.restore();
  }

  state.snake.forEach((segment, index) => {
    const x = segment.x * cellWidth;
    const y = segment.y * cellHeight;
    const glow = Math.max(0.12, 0.38 - index * 0.015);
    const color = index === 0 ? "#8affb0" : `rgba(0, 255, 65, ${0.92 - index * 0.03})`;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = `rgba(0, 255, 65, ${glow})`;
    ctx.shadowBlur = 14;
    ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);

    if (index === 0) {
      ctx.fillStyle = "#0a0e27";
      const eyeSize = Math.max(2, Math.min(cellWidth, cellHeight) * 0.12);
      if (state.direction === "ArrowRight" || state.direction === "ArrowLeft") {
        const frontX =
          state.direction === "ArrowRight" ? x + cellWidth * 0.62 : x + cellWidth * 0.22;
        ctx.fillRect(frontX, y + cellHeight * 0.24, eyeSize, eyeSize);
        ctx.fillRect(frontX, y + cellHeight * 0.62, eyeSize, eyeSize);
      } else {
        const frontY =
          state.direction === "ArrowDown" ? y + cellHeight * 0.62 : y + cellHeight * 0.22;
        ctx.fillRect(x + cellWidth * 0.24, frontY, eyeSize, eyeSize);
        ctx.fillRect(x + cellWidth * 0.62, frontY, eyeSize, eyeSize);
      }
    }
    ctx.restore();
  });

  if (state.deathFlash) {
    const elapsed = performance.now() - state.deathFlash.startedAt;
    if (elapsed < 500) {
      const px = state.deathFlash.x * cellWidth + cellWidth / 2;
      const py = state.deathFlash.y * cellHeight + cellHeight / 2;
      const radius = 8 + elapsed * 0.08;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 16, 240, ${1 - elapsed / 500})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function draw() {
  drawBoard();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function sanitizeEntitiesForHud() {
  const { blockedCells, cols, rows } = getBoardMetrics();

  if (state.food && blockedCells.has(`${state.food.x},${state.food.y}`)) {
    state.food = randomEmptyCell();
  }

  if (state.mode === "playing" || state.mode === "paused") {
    const snakeOverHud = state.snake.some(({ x, y }) => blockedCells.has(`${x},${y}`));
    const snakeOutOfBounds = state.snake.some(({ x, y }) => x < 0 || y < 0 || x >= cols || y >= rows);

    if (snakeOverHud || snakeOutOfBounds) {
      state.snake = initialSnake();
      state.direction = "ArrowRight";
      state.queuedDirection = null;
      state.food = randomEmptyCell();
      state.lastTickAt = performance.now();
    }
  }
}

function loop(timestamp) {
  resizeCanvas();
  if (state.mode === "playing" && timestamp - state.lastTickAt >= state.tickInterval) {
    state.lastTickAt = timestamp;
    advanceTick();
  }

  draw();
  requestAnimationFrame(loop);
}

function normalizeDirectionKey(key) {
  return KEY_ALIASES[key] || key;
}

document.addEventListener("keydown", (event) => {
  unlockAudio();
  const key = normalizeDirectionKey(event.key);

  if ((key === "Enter" || key === " ") && state.mode === "menu") {
    event.preventDefault();
    startGame();
    return;
  }

  if ((key === "Enter" || key === " ") && state.mode === "gameOver") {
    event.preventDefault();
    startGame();
    return;
  }

  if (key.toLowerCase?.() === "p") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (DIRECTIONS[key] && state.mode === "playing") {
    event.preventDefault();
    if (key !== DIRECTIONS[state.direction].opposite) {
      const shouldPlayTurn = key !== state.direction && key !== state.queuedDirection;
      state.queuedDirection = key;
      if (shouldPlayTurn) {
        playSound("turn", 35);
      }
    }
  }
});

function wireUiSound(button, clickHandler, options = {}) {
  const { hoverSound = false, clickSound = "confirm" } = options;
  button.addEventListener("pointerdown", unlockAudio, { passive: true });
  if (hoverSound) {
    button.addEventListener("pointerenter", () => playSound("menuMove", 40));
  }
  button.addEventListener("click", () => {
    if (clickSound) {
      playSound(clickSound, 60);
    }
    clickHandler();
  });
}

wireUiSound(menuStartButton, startGame, { hoverSound: true, clickSound: null });
wireUiSound(restartButton, startGame, { hoverSound: true, clickSound: null });
wireUiSound(mainMenuButton, backToMenu, { hoverSound: true, clickSound: null });
wireUiSound(pauseButton, () => togglePause(), { hoverSound: true, clickSound: null });

settingsButton.addEventListener("click", () => {
  unlockAudio();
  playSound("menuMove", 40);
  settingsPanel.hidden = !settingsPanel.hidden;
  updateSettingsUI();
});

settingsButton.addEventListener("pointerenter", () => playSound("menuMove", 40));
settingsButton.addEventListener("pointerdown", unlockAudio, { passive: true });

difficultySelect.addEventListener("change", (event) => {
  unlockAudio();
  playSound("confirm", 60);
  state.settings.difficulty = event.target.value;
  saveSettings();
  if (state.mode !== "playing" && state.mode !== "paused") {
    state.speedKey = state.settings.difficulty;
    state.tickInterval = DIFFICULTIES[state.speedKey].interval;
    updateHud();
  }
});

crtToggle.addEventListener("change", (event) => {
  unlockAudio();
  playSound("confirm", 60);
  state.settings.crtEnabled = event.target.checked;
  saveSettings();
  updateSettingsUI();
});

window.addEventListener("blur", () => {
  if (state.mode === "playing") {
    togglePause("paused");
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
  sanitizeEntitiesForHud();
});

function init() {
  state.speedKey = state.settings.difficulty;
  state.tickInterval = DIFFICULTIES[state.speedKey].interval;
  syncLayoutState();
  setOverlay("menu");
  updateSettingsUI();
  updateHud();
  resizeCanvas();
  sanitizeEntitiesForHud();
  draw();
  requestAnimationFrame(loop);
}

init();
