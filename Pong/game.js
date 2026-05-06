const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayEyebrow = document.getElementById("overlay-eyebrow");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const controlsText = document.getElementById("controls-text");
const primaryAction = document.getElementById("primary-action");
const modeSelect = document.getElementById("mode-select");
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
const leftControlTitle = document.getElementById("left-control-title");
const leftControlVisual = document.getElementById("left-control-visual");
const leftControlCopy = document.getElementById("left-control-copy");
const rightControlTitle = document.getElementById("right-control-title");
const rightControlVisual = document.getElementById("right-control-visual");
const rightControlCopy = document.getElementById("right-control-copy");
const scoreLeft = document.getElementById("score-left");
const scoreRight = document.getElementById("score-right");
const announcer = document.getElementById("announcer");
const sounds = new window.ArcadeSoundLibrary();

const WIDTH = 680;
const HEIGHT = 400;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 5;
const BALL_SIZE = 10;
const INITIAL_BALL_SPEED_X = 4;
const MAX_BALL_SPEED_X = 12;
const WIN_SCORE = 7;
const DASH_HEIGHT = 14;
const DASH_GAP = 10;
const FLASH_DURATION = 120;
const BOT_MAX_SPEED = 4.2;
const BOT_DEADZONE = 12;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

ctx.imageSmoothingEnabled = false;

const keys = {
  KeyW: false,
  KeyS: false,
  ArrowUp: false,
  ArrowDown: false,
};

const state = {
  mode: "idle",
  playMode: "pvp",
  winner: null,
  lastConceded: "right",
  collisionFlashUntil: 0,
  scorePulseUntil: {
    left: 0,
    right: 0,
  },
  scores: {
    left: 0,
    right: 0,
  },
  paddles: {
    left: {
      x: 30,
      y: (HEIGHT - PADDLE_HEIGHT) / 2,
    },
    right: {
      x: WIDTH - 30 - PADDLE_WIDTH,
      y: (HEIGHT - PADDLE_HEIGHT) / 2,
    },
  },
  ball: {
    x: WIDTH / 2 - BALL_SIZE / 2,
    y: HEIGHT / 2 - BALL_SIZE / 2,
    vx: 0,
    vy: 0,
  },
};

function randomVerticalVelocity() {
  let velocity = 0;

  while (velocity === 0) {
    velocity = Math.floor(Math.random() * 5) - 2;
  }

  return velocity;
}

function announce(message) {
  announcer.textContent = message;
}

function pulseScore(side) {
  if (reducedMotion.matches) {
    return;
  }

  state.scorePulseUntil[side] = performance.now() + 160;
}

function clampPaddles() {
  state.paddles.left.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, state.paddles.left.y));
  state.paddles.right.y = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, state.paddles.right.y));
}

function resetPaddles() {
  state.paddles.left.y = (HEIGHT - PADDLE_HEIGHT) / 2;
  state.paddles.right.y = (HEIGHT - PADDLE_HEIGHT) / 2;
}

function resetBall(directionToward) {
  state.ball.x = WIDTH / 2 - BALL_SIZE / 2;
  state.ball.y = HEIGHT / 2 - BALL_SIZE / 2;
  state.ball.vx = directionToward === "left" ? -INITIAL_BALL_SPEED_X : INITIAL_BALL_SPEED_X;
  state.ball.vy = randomVerticalVelocity();
}

function syncScores() {
  scoreLeft.textContent = String(state.scores.left);
  scoreRight.textContent = String(state.scores.right);
}

function updateModeButtons() {
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.playMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderControlCards() {
  if (state.playMode === "bot") {
    leftControlTitle.textContent = "Bot Opponent";
    leftControlVisual.innerHTML = '<span class="bot-icon" aria-hidden="true"></span>';
    leftControlCopy.textContent = "The left paddle tracks the rally automatically.";
    rightControlTitle.textContent = "Player";
    rightControlVisual.innerHTML = [
      '<span class="keycap keycap-arrow">↑</span>',
      '<span class="keycap keycap-arrow">↓</span>',
    ].join("");
    rightControlCopy.textContent = "Arrow keys control the right paddle.";
    return;
  }

  leftControlTitle.textContent = "Player 1";
  leftControlVisual.innerHTML = ['<span class="keycap">W</span>', '<span class="keycap">S</span>'].join("");
  leftControlCopy.textContent = "Move the left paddle up and down.";
  rightControlTitle.textContent = "Player 2";
  rightControlVisual.innerHTML = [
    '<span class="keycap keycap-arrow">↑</span>',
    '<span class="keycap keycap-arrow">↓</span>',
  ].join("");
  rightControlCopy.textContent = "Arrow keys control the right paddle.";
}

function setPlayMode(mode) {
  state.playMode = mode;
  updateModeButtons();
  renderControlCards();
}

function setOverlay(mode) {
  overlay.classList.remove("hidden", "paused");

  if (mode === "idle") {
    overlayEyebrow.textContent = "Classic Arcade Reimagined";
    overlayTitle.textContent = "PONG";
    overlayText.textContent =
      state.playMode === "bot"
        ? "Challenge the machine. First to 7 wins."
        : "Two-player neon rally. First to 7 wins.";
    controlsText.textContent = "Review the control cards, choose a mode, then start.";
    modeSelect.hidden = false;
    primaryAction.textContent = "Start Match";
    primaryAction.dataset.action = "start";
    primaryAction.focus();
    return;
  }

  if (mode === "paused") {
    overlay.classList.add("paused");
    overlayEyebrow.textContent = "Match Suspended";
    overlayTitle.textContent = "PAUSED";
    overlayText.textContent = "Space resumes play instantly.";
    controlsText.textContent =
      state.playMode === "bot"
        ? "Arrow keys control your paddle. The bot controls the left side."
        : "Controls stay mapped: W / S and Arrow Keys";
    modeSelect.hidden = true;
    primaryAction.textContent = "Resume";
    primaryAction.dataset.action = "resume";
    primaryAction.focus();
    return;
  }

  if (mode === "gameover") {
    overlayEyebrow.textContent = "Match Complete";
    overlayTitle.textContent = `${state.winner} Wins`;
    overlayText.textContent = "Play again resets scores, paddles, and serve.";
    controlsText.textContent = "Enter or click to restart the match";
    modeSelect.hidden = true;
    primaryAction.textContent = "Play Again";
    primaryAction.dataset.action = "restart";
    primaryAction.focus();
  }
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function startMatch() {
  sounds.unlock();
  state.mode = "running";
  state.winner = null;
  state.lastConceded = "right";
  state.scores.left = 0;
  state.scores.right = 0;
  syncScores();
  resetPaddles();
  resetBall("right");
  hideOverlay();
  sounds.playStart();
  announce(
    state.playMode === "bot"
      ? "Match started. You control the right paddle with the arrow keys."
      : "Match started. Player 1 serves toward Player 2."
  );
}

function restartAfterScore(sideThatConceded) {
  state.lastConceded = sideThatConceded;
  resetPaddles();
  resetBall(sideThatConceded);
}

function pauseMatch() {
  if (state.mode !== "running") {
    return;
  }

  sounds.unlock();
  state.mode = "paused";
  setOverlay("paused");
  sounds.playPause();
  announce(state.playMode === "bot" ? "Game paused. You are controlling the right paddle." : "Game paused.");
}

function resumeMatch() {
  if (state.mode !== "paused") {
    return;
  }

  sounds.unlock();
  state.mode = "running";
  hideOverlay();
  sounds.playResume();
  announce("Game resumed.");
}

function finishMatch(winnerSide) {
  state.mode = "gameover";
  if (state.playMode === "bot") {
    state.winner = winnerSide === "left" ? "Bot" : "Player";
  } else {
    state.winner = winnerSide === "left" ? "Player 1" : "Player 2";
  }
  setOverlay("gameover");
  sounds.playWin();
  announce(`${state.winner} wins the match.`);
  window.ArcadeHighScores?.promptAndSubmit("pong", Math.max(state.scores.left, state.scores.right));
}

function scorePoint(side) {
  state.scores[side] += 1;
  syncScores();
  pulseScore(side);
  sounds.playScore();
  let scorer = side === "left" ? "Player 1" : "Player 2";

  if (state.playMode === "bot") {
    scorer = side === "left" ? "Bot" : "Player";
  }

  announce(`${scorer} scores. ${state.scores.left} to ${state.scores.right}.`);

  if (state.scores[side] >= WIN_SCORE) {
    finishMatch(side);
    return;
  }

  restartAfterScore(side === "left" ? "right" : "left");
}

function movePaddles() {
  if (keys.KeyW) {
    state.paddles.left.y -= PADDLE_SPEED;
  }

  if (keys.KeyS) {
    state.paddles.left.y += PADDLE_SPEED;
  }

  if (state.playMode === "bot") {
    const ballCenter = state.ball.y + BALL_SIZE / 2;
    const paddleCenter = state.paddles.left.y + PADDLE_HEIGHT / 2;
    const trackingBias = state.ball.vx < 0 ? 0 : Math.sign(HEIGHT / 2 - paddleCenter) * 24;
    const delta = ballCenter + trackingBias - paddleCenter;

    if (Math.abs(delta) > BOT_DEADZONE) {
      state.paddles.left.y += Math.sign(delta) * BOT_MAX_SPEED;
    }

    if (keys.ArrowUp) {
      state.paddles.right.y -= PADDLE_SPEED;
    }

    if (keys.ArrowDown) {
      state.paddles.right.y += PADDLE_SPEED;
    }
  } else {
    if (keys.ArrowUp) {
      state.paddles.right.y -= PADDLE_SPEED;
    }

    if (keys.ArrowDown) {
      state.paddles.right.y += PADDLE_SPEED;
    }
  }

  clampPaddles();
}

function ballIntersectsPaddle(paddle) {
  return (
    state.ball.x < paddle.x + PADDLE_WIDTH &&
    state.ball.x + BALL_SIZE > paddle.x &&
    state.ball.y < paddle.y + PADDLE_HEIGHT &&
    state.ball.y + BALL_SIZE > paddle.y
  );
}

function bounceOffPaddle(side, paddle) {
  const centerBall = state.ball.y + BALL_SIZE / 2;
  const centerPaddle = paddle.y + PADDLE_HEIGHT / 2;
  const offset = centerBall - centerPaddle;
  const nextSpeed = Math.min(Math.abs(state.ball.vx) * 1.05, MAX_BALL_SPEED_X);

  state.ball.vx = side === "left" ? nextSpeed : -nextSpeed;
  state.ball.vy += offset * 0.1;

  if (side === "left") {
    state.ball.x = paddle.x + PADDLE_WIDTH;
  } else {
    state.ball.x = paddle.x - BALL_SIZE;
  }

  state.collisionFlashUntil = performance.now() + FLASH_DURATION;
  sounds.playPaddleHit();
}

function updateBall() {
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  if (state.ball.y <= 0) {
    state.ball.y = 0;
    state.ball.vy = Math.abs(state.ball.vy);
    sounds.playWallBounce();
  } else if (state.ball.y + BALL_SIZE >= HEIGHT) {
    state.ball.y = HEIGHT - BALL_SIZE;
    state.ball.vy = -Math.abs(state.ball.vy);
    sounds.playWallBounce();
  }

  if (ballIntersectsPaddle(state.paddles.left) && state.ball.vx < 0) {
    bounceOffPaddle("left", state.paddles.left);
  } else if (ballIntersectsPaddle(state.paddles.right) && state.ball.vx > 0) {
    bounceOffPaddle("right", state.paddles.right);
  }

  if (state.ball.x + BALL_SIZE < 0) {
    scorePoint("right");
  } else if (state.ball.x > WIDTH) {
    scorePoint("left");
  }
}

function drawCourt(now) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#111111";
  ctx.strokeRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1);

  ctx.fillStyle = "#ffffff";
  for (let y = 0; y < HEIGHT; y += DASH_HEIGHT + DASH_GAP) {
    ctx.fillRect(WIDTH / 2 - 1, y, 2, DASH_HEIGHT);
  }

  ctx.save();
  ctx.font = "48px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const leftPulse = !reducedMotion.matches && now < state.scorePulseUntil.left;
  const rightPulse = !reducedMotion.matches && now < state.scorePulseUntil.right;

  if (leftPulse) {
    ctx.fillStyle = "#00ff00";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 255, 0, 0.7)";
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 0;
  }
  ctx.fillText(String(state.scores.left), WIDTH * 0.25, 18);

  if (rightPulse) {
    ctx.fillStyle = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0, 255, 255, 0.7)";
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 0;
  }
  ctx.fillText(String(state.scores.right), WIDTH * 0.75, 18);
  ctx.restore();

  const flashActive = !reducedMotion.matches && now < state.collisionFlashUntil;
  const fill = flashActive ? "#ffffff" : "#ffffff";
  const glow = flashActive ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 255, 255, 0.35)";

  if (!reducedMotion.matches) {
    ctx.shadowBlur = 6;
    ctx.shadowColor = glow;
  }

  ctx.fillStyle = fill;
  ctx.fillRect(state.paddles.left.x, state.paddles.left.y, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillRect(state.paddles.right.x, state.paddles.right.y, PADDLE_WIDTH, PADDLE_HEIGHT);

  if (!reducedMotion.matches) {
    ctx.shadowColor = "rgba(0, 255, 0, 0.4)";
  }

  ctx.fillRect(state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);
  ctx.shadowBlur = 0;
}

function frame(now) {
  if (state.mode === "running") {
    movePaddles();
    updateBall();
  }

  drawCourt(now);
  requestAnimationFrame(frame);
}

function togglePause() {
  if (state.mode === "running") {
    pauseMatch();
  } else if (state.mode === "paused") {
    resumeMatch();
  }
}

window.addEventListener("keydown", (event) => {
  sounds.unlock();

  if (event.code in keys) {
    keys[event.code] = true;
    event.preventDefault();
  }

  if (event.code === "Space") {
    event.preventDefault();

    if (state.mode === "idle") {
      startMatch();
      return;
    }

    if (state.mode === "gameover") {
      startMatch();
      return;
    }

    togglePause();
  }

  if (event.code === "Enter" && (state.mode === "idle" || state.mode === "gameover")) {
    event.preventDefault();
    startMatch();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code in keys) {
    keys[event.code] = false;
    event.preventDefault();
  }
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setPlayMode(button.dataset.mode);

    if (state.mode === "idle") {
      setOverlay("idle");
    }
  });
});

primaryAction.addEventListener("click", () => {
  if (primaryAction.dataset.action === "resume") {
    resumeMatch();
    return;
  }

  startMatch();
});

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    state.scorePulseUntil.left = 0;
    state.scorePulseUntil.right = 0;
  }
});

syncScores();
setPlayMode("pvp");
setOverlay("idle");
drawCourt(performance.now());
requestAnimationFrame(frame);
