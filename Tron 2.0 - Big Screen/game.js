const CONFIG = {
  cols: 180,
  rows: 144,
  cellSize: 14,
  defaultTickMs: 80,
  resolveMs: 2200,
  countdownSteps: ["3", "2", "1", "GO!"],
  startPositions: {
    p1: { x: 45, y: 72, direction: "right" },
    p2: { x: 135, y: 72, direction: "left" },
  },
  colors: {
    default: {
      p1Head: "#00FFFF",
      p1Trail: "#006688",
      p2Head: "#FF9900",
      p2Trail: "#884400",
    },
    colorblind: {
      p1Head: "#33A1FF",
      p1Trail: "#1F4D7A",
      p2Head: "#FFD84D",
      p2Trail: "#7D6300",
    },
  },
};

const DIRECTIONS = {
  up: { x: 0, y: -1, opposite: "down" },
  down: { x: 0, y: 1, opposite: "up" },
  left: { x: -1, y: 0, opposite: "right" },
  right: { x: 1, y: 0, opposite: "left" },
};

const KEYMAP = {
  KeyW: { player: "p1", direction: "up" },
  KeyA: { player: "p1", direction: "left" },
  KeyS: { player: "p1", direction: "down" },
  KeyD: { player: "p1", direction: "right" },
  ArrowUp: { player: "p2", direction: "up" },
  ArrowLeft: { player: "p2", direction: "left" },
  ArrowDown: { player: "p2", direction: "down" },
  ArrowRight: { player: "p2", direction: "right" },
};

const SINGLE_PLAYER_ARROW_MAP = {
  ArrowUp: { player: "p1", direction: "up" },
  ArrowLeft: { player: "p1", direction: "left" },
  ArrowDown: { player: "p1", direction: "down" },
  ArrowRight: { player: "p1", direction: "right" },
};

const SOUND_FILES = {
  menuSelect: "assets/sounds/menu-select.wav",
  countdownBeep: "assets/sounds/countdown-beep.wav",
  roundStart: "assets/sounds/round-start.wav",
  engineLoop: "assets/sounds/engine-loop.wav",
  turnBlip: "assets/sounds/turn-blip.wav",
  crash: "assets/sounds/crash.wav",
  roundWin: "assets/sounds/round-win.wav",
  roundDraw: "assets/sounds/round-draw.wav",
};

class TronGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.pixelRatio = 1;
    this.viewWidth = 0;
    this.viewHeight = 0;

    this.ui = {
      roundCounter: document.getElementById("roundCounter"),
      timerDisplay: document.getElementById("timerDisplay"),
      scoreP1: document.getElementById("scoreP1"),
      scoreP2: document.getElementById("scoreP2"),
      player2Label: document.getElementById("player2Label"),
      statusMessage: document.getElementById("statusMessage"),
      startButton: document.getElementById("startButton"),
      screenTitle: document.getElementById("screenTitle"),
      overlay: document.getElementById("overlay"),
      overlayContent: document.getElementById("overlayContent"),
      overlayHeadline: document.getElementById("overlayHeadline"),
      overlaySubline: document.getElementById("overlaySubline"),
      overlayBody: document.getElementById("overlayBody"),
      overlayVisual: document.getElementById("overlayVisual"),
      overlayActions: document.getElementById("overlayActions"),
      setupSkipButton: document.getElementById("setupSkipButton"),
      modeSummary: document.getElementById("modeSummary"),
      difficultySummaryBox: document.getElementById("difficultySummaryBox"),
      difficultySummary: document.getElementById("difficultySummary"),
      speedSlider: document.getElementById("speedSlider"),
      speedValue: document.getElementById("speedValue"),
      paletteToggle: document.getElementById("paletteToggle"),
      motionToggle: document.getElementById("motionToggle"),
    };

    this.state = "IDLE";
    this.players = {};
    this.grid = this.createGrid();
    this.tickHandle = null;
    this.countdownHandle = null;
    this.resolveHandle = null;
    this.round = 1;
    this.elapsedMs = 0;
    this.tickMs = CONFIG.defaultTickMs;
    this.mode = "human";
    this.botDifficulty = "easy";
    this.useColorblindPalette = false;
    this.reducedMotion = false;
    this.scores = { p1: 0, p2: 0 };
    this.submittedScore = false;
    this.pendingTimeouts = new Set();
    this.modeResolver = null;
    this.difficultyResolver = null;
    this.nextResolver = null;
    this.skipResolver = null;
    this.setupToken = 0;
    this.soundUnlocked = false;
    this.audio = this.createAudioBank();

    this.bindEvents();
    this.resizeCanvas();
    this.resetRound();
    this.render();
    this.syncUi();
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.render();
    });
    this.ui.startButton.addEventListener("click", () => {
      this.unlockAudio();
      this.playSound("menuSelect");
      if (this.state === "GAME_OVER") {
        this.submitGameOverScore();
      }
      void this.startRound();
    });
    this.ui.overlayActions.addEventListener("click", (event) => {
      this.unlockAudio();
      this.handleOverlayAction(event);
    });
    this.ui.setupSkipButton?.addEventListener("click", () => {
      this.unlockAudio();
      this.playSound("menuSelect");
      this.resolveInteraction("mode", "skip");
    });
    this.ui.speedSlider?.addEventListener("input", (event) => this.setTickRate(Number(event.target.value)));
    this.ui.paletteToggle?.addEventListener("click", () => this.togglePalette());
    this.ui.motionToggle?.addEventListener("click", () => this.toggleMotion());
  }

  createGrid() {
    return Array.from({ length: CONFIG.rows }, () => Array(CONFIG.cols).fill(0));
  }

  createAudioBank() {
    const bank = {};
    for (const [key, src] of Object.entries(SOUND_FILES)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      if (key === "engineLoop") {
        audio.loop = true;
        audio.volume = 0.22;
      } else if (key === "crash") {
        audio.volume = 0.5;
      } else {
        audio.volume = 0.4;
      }
      bank[key] = audio;
    }
    return bank;
  }

  resizeCanvas() {
    const bounds = this.canvas.getBoundingClientRect();
    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.viewWidth = Math.max(1, Math.floor(bounds.width));
    this.viewHeight = Math.max(1, Math.floor(bounds.height));

    const pixelWidth = Math.floor(this.viewWidth * this.pixelRatio);
    const pixelHeight = Math.floor(this.viewHeight * this.pixelRatio);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  unlockAudio() {
    if (this.soundUnlocked) {
      return;
    }

    this.soundUnlocked = true;
  }

  playSound(name, { restart = true } = {}) {
    const audio = this.audio[name];
    if (!audio || !this.soundUnlocked) {
      return;
    }

    if (restart) {
      audio.pause();
      audio.currentTime = 0;
    }

    const playAttempt = audio.play();
    if (playAttempt?.catch) {
      playAttempt.catch(() => {});
    }
  }

  stopSound(name) {
    const audio = this.audio[name];
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }

  playResultSound(name, delay = 180) {
    const timeoutId = window.setTimeout(() => {
      this.pendingTimeouts.delete(timeoutId);
      this.playSound(name);
    }, delay);
    this.pendingTimeouts.add(timeoutId);
  }

  resetRound() {
    this.clearTimers();
    this.stopSound("engineLoop");
    this.state = "IDLE";
    this.elapsedMs = 0;
    this.grid = this.createGrid();
    this.players = {
      p1: this.makePlayer("p1", CONFIG.startPositions.p1),
      p2: this.makePlayer("p2", CONFIG.startPositions.p2),
    };

    this.markCell(this.players.p1.x, this.players.p1.y, 1);
    this.markCell(this.players.p2.x, this.players.p2.y, 2);

    this.ui.startButton.textContent = this.round === 1 && this.scores.p1 === 0 && this.scores.p2 === 0 ? "START" : "RESTART";
    this.ui.startButton.disabled = false;
    this.ui.startButton.classList.remove("is-hidden");
    this.ui.setupSkipButton?.classList.add("is-hidden");
    if (this.ui.screenTitle) {
      this.ui.screenTitle.classList.remove("is-hidden");
    }
    this.setControlsLayout(false);
    this.setStatus("Press START");
    this.showOverlay("PRESS START", "WASD VS ARROW KEYS", true, "neutral");
    this.resetPanels();
    this.updateSelectionSummary();
    this.syncUi();
  }

  makePlayer(id, start) {
    return {
      id,
      x: start.x,
      y: start.y,
      direction: start.direction,
      pendingDirection: null,
      alive: true,
      crashUntil: 0,
    };
  }

  async startRound() {
    if (this.state === "RUNNING" || this.state === "COUNTDOWN" || this.state === "SETUP") {
      return;
    }

    this.clearTimers();
    this.grid = this.createGrid();
    this.players = {
      p1: this.makePlayer("p1", CONFIG.startPositions.p1),
      p2: this.makePlayer("p2", CONFIG.startPositions.p2),
    };
    this.markCell(this.players.p1.x, this.players.p1.y, 1);
    this.markCell(this.players.p2.x, this.players.p2.y, 2);
    this.state = "SETUP";
    this.submittedScore = false;
    this.elapsedMs = 0;
    this.players.p1.pendingDirection = null;
    this.players.p2.pendingDirection = null;
    this.ui.startButton.disabled = true;
    this.ui.startButton.classList.add("is-hidden");
    this.ui.setupSkipButton?.classList.remove("is-hidden");
    this.ui.screenTitle?.classList.add("is-hidden");
    this.resetPanels();
    this.setStatus("Initializing rider link...");

    const token = ++this.setupToken;
    const introText = "SECOND RIDER LINK REQUIRED. SELECT HUMAN OR BOT TO CONFIGURE PLAYER 2.";
    this.showOverlay("LINK SETUP", "PHASE 01", true, "neutral");
    this.clearOverlayStage();
    if (!(await this.typeText(this.ui.overlayBody, introText, token))) {
      return;
    }

    this.renderOverlayActions("mode");
    const mode = await this.waitForModeSelection(token);
    if (!mode) {
      return;
    }

    if (mode === "skip") {
      this.showOverlay("QUICK SETUP", "CONFIGURE ROUND", true, "neutral");
      this.clearOverlayStage();
      this.setControlsLayout(false);
      this.ui.overlayBody.textContent = "SET PLAYER 2 MODE, PICK BOT DIFFICULTY IF NEEDED, THEN PRESS NEXT TO START THE COUNTDOWN.";
      this.renderOverlayActions("setup");
      this.setStatus("Configure the round, then press NEXT.");
      const quickSetupConfirmed = await this.waitForNext(token);
      if (!quickSetupConfirmed) {
        return;
      }
      this.clearOverlayStage();
      this.ui.setupSkipButton?.classList.add("is-hidden");
      this.setStatus("Get ready...");
      this.runCountdown();
      return;
    } else {
      if (mode === "bot") {
        this.showOverlay("LINK SETUP", "PHASE 02", true, "neutral");
        this.clearOverlayStage();
        if (!(await this.typeText(this.ui.overlayBody, "BOT LINK CONFIRMED. SELECT A ROUTINE FOR PLAYER 2.", token))) {
          return;
        }
        this.renderOverlayActions("difficulty");
        const difficulty = await this.waitForDifficultySelection(token);
        if (!difficulty) {
          return;
        }
      }

      this.showOverlay("CONTROL MAP", "PHASE 03", true, "neutral");
      this.clearOverlayStage();
      this.setControlsLayout(true);
      const controlsText = this.mode === "bot"
        ? `PLAYER 1 USES WASD OR ARROW KEYS. PLAYER 2 IS ${this.botDifficulty.toUpperCase()} BOT CONTROL. EACH SIDE SHOWS THAT RIDER'S LOCAL CAMERA ON THE SAME MASSIVE GRID.`
        : "PLAYER 1 USES WASD. PLAYER 2 USES ARROW KEYS. EACH SIDE SHOWS THAT RIDER'S LOCAL CAMERA ON THE SAME MASSIVE GRID.";
      if (!(await this.typeText(this.ui.overlayBody, controlsText, token))) {
        return;
      }
      this.ui.overlayVisual.innerHTML = this.getControlsVisualMarkup();
      this.renderOverlayActions("next");
      this.setStatus("Review the controls, then press NEXT.");
      const controlsConfirmed = await this.waitForNext(token);
      if (!controlsConfirmed) {
        return;
      }
    }

    this.showOverlay("ROUND BRIEFING", "PHASE 04", true, "neutral");
    this.clearOverlayStage();
    this.setControlsLayout(false);
    const infoText = this.mode === "bot"
      ? "TRAILS BECOME PERMANENT WALLS ACROSS THE FULL 180 BY 144 GRID. HARD BOT EVALUATES SPACE; EASY BOT CHOOSES RANDOM SAFE TURNS. PRESS NEXT TO ARM THE COUNTDOWN."
      : "TRAILS BECOME PERMANENT WALLS ACROSS THE FULL 180 BY 144 GRID. BOTH RIDERS MOVE ON THE SAME TICK, SO CRASHES CAN END IN A DRAW. PRESS NEXT TO ARM THE COUNTDOWN.";
    if (!(await this.typeText(this.ui.overlayBody, infoText, token))) {
      return;
    }

    this.renderOverlayActions("next");
    this.setStatus("Review the briefing, then press NEXT.");
    const proceed = await this.waitForNext(token);
    if (!proceed) {
      return;
    }

    this.clearOverlayStage();
    this.ui.setupSkipButton?.classList.add("is-hidden");
    this.setStatus("Get ready...");
    this.runCountdown();
  }

  runCountdown() {
    this.state = "COUNTDOWN";
    let index = 0;
    const advance = () => {
      const label = CONFIG.countdownSteps[index];
      this.showOverlay(label, index < 3 ? "SET YOUR OPENING TURN" : "GAME ON!", true, "neutral");
      if (label !== "GO!") {
        this.playSound("countdownBeep");
      }
      index += 1;

      if (index < CONFIG.countdownSteps.length) {
        this.countdownHandle = window.setTimeout(advance, 1000);
        return;
      }

      this.countdownHandle = window.setTimeout(() => {
        this.hideOverlay();
        this.beginTickLoop();
      }, 700);
    };

    advance();
  }

  beginTickLoop() {
    this.state = "RUNNING";
    this.ui.startButton.disabled = true;
    this.setStatus("Game on!");
    this.playSound("roundStart");
    this.playSound("engineLoop");
    this.tickHandle = window.setInterval(() => this.tick(), this.tickMs);
  }

  tick() {
    if (this.state !== "RUNNING") {
      return;
    }

    this.elapsedMs += this.tickMs;

    if (this.mode === "bot" && this.players.p2.alive) {
      this.players.p2.pendingDirection = this.getBotMove();
    }

    const nextMoves = {};
    for (const [key, player] of Object.entries(this.players)) {
      if (!player.alive) {
        continue;
      }

      const resolvedDirection = this.resolveDirection(player.direction, player.pendingDirection);
      player.direction = resolvedDirection;
      player.pendingDirection = null;

      const vector = DIRECTIONS[resolvedDirection];
      nextMoves[key] = {
        x: player.x + vector.x,
        y: player.y + vector.y,
      };
    }

    const collisions = {
      p1: false,
      p2: false,
    };

    for (const [key, move] of Object.entries(nextMoves)) {
      if (this.isCollision(move.x, move.y)) {
        collisions[key] = true;
      }
    }

    if (
      this.players.p1.alive &&
      this.players.p2.alive &&
      nextMoves.p1 &&
      nextMoves.p2 &&
      nextMoves.p1.x === nextMoves.p2.x &&
      nextMoves.p1.y === nextMoves.p2.y
    ) {
      collisions.p1 = true;
      collisions.p2 = true;
    }

    for (const [key, player] of Object.entries(this.players)) {
      if (!player.alive) {
        continue;
      }

      if (collisions[key]) {
        player.alive = false;
        player.crashUntil = performance.now() + CONFIG.resolveMs;
        continue;
      }

      const move = nextMoves[key];
      player.x = move.x;
      player.y = move.y;
      this.markCell(player.x, player.y, key === "p1" ? 1 : 2);
    }

    this.render();
    this.syncUi();

    if (!this.players.p1.alive || !this.players.p2.alive) {
      this.playSound("crash");
      this.resolveRound();
    }
  }

  resolveDirection(current, pending) {
    if (!pending) {
      return current;
    }

    if (DIRECTIONS[current].opposite === pending) {
      return current;
    }

    return pending;
  }

  isCollision(x, y) {
    if (x < 0 || y < 0 || x >= CONFIG.cols || y >= CONFIG.rows) {
      return true;
    }

    return this.grid[y][x] !== 0;
  }

  markCell(x, y, value) {
    if (y >= 0 && y < CONFIG.rows && x >= 0 && x < CONFIG.cols) {
      this.grid[y][x] = value;
    }
  }

  resolveRound() {
    this.clearTimers();
    this.stopSound("engineLoop");
    this.state = "GAME_OVER";

    let headline = "DRAW!";
    let subline = "BOTH RIDERS CRASHED";
    let detail = "Both riders crashed. The final trail layout stays visible until the next round is armed.";
    let status = "Draw!";

    if (this.players.p1.alive && !this.players.p2.alive) {
      this.scores.p1 += 1;
      headline = "PLAYER 1 WINS";
      subline = this.mode === "bot" ? "BOT CRASHED" : "PLAYER 2 CRASHED";
      detail = this.mode === "bot"
        ? "Player 1 stayed alive. Bot crashed into the closed trail network."
        : "Player 1 stayed alive. Player 2 crashed into the closed trail network.";
      status = "Player 1 wins the round!";
    } else if (!this.players.p1.alive && this.players.p2.alive) {
      this.scores.p2 += 1;
      headline = this.mode === "bot" ? "BOT WINS" : "PLAYER 2 WINS";
      subline = "PLAYER 1 CRASHED";
      detail = this.mode === "bot"
        ? "Bot stayed alive. Player 1 crashed into the closed trail network."
        : "Player 2 stayed alive. Player 1 crashed into the closed trail network.";
      status = this.mode === "bot" ? "Bot wins the round!" : "Player 2 wins the round!";
    }

    this.setStatus(status);
    const tone = this.players.p1.alive && !this.players.p2.alive ? "p1" : !this.players.p1.alive && this.players.p2.alive ? "p2" : "neutral";
    this.showOverlay(headline, subline, true, tone, "result");
    this.ui.overlayBody.textContent = detail;
    this.ui.overlayVisual.innerHTML = "";
    this.ui.overlayActions.innerHTML = "";
    this.ui.startButton.textContent = "RESTART";
    this.ui.startButton.disabled = false;
    this.ui.startButton.classList.remove("is-hidden");
    this.playResultSound(headline === "DRAW!" ? "roundDraw" : "roundWin");
    this.syncUi();
    this.render();
  }

  submitGameOverScore() {
    if (this.submittedScore) {
      return;
    }

    this.submittedScore = Boolean(
      window.ArcadeHighScores?.promptAndSubmit("tron-2", Math.max(this.scores.p1, this.scores.p2))
    );
  }

  handleKeyDown(event) {
    const mapped = this.mode === "bot"
      ? SINGLE_PLAYER_ARROW_MAP[event.code] ?? KEYMAP[event.code]
      : KEYMAP[event.code];
    if (!mapped) {
      return;
    }

    event.preventDefault();

    if (this.state !== "RUNNING" && this.state !== "COUNTDOWN") {
      return;
    }

    if (this.mode === "bot" && mapped.player === "p2") {
      return;
    }

    const player = this.players[mapped.player];
    if (!player?.alive) {
      return;
    }

    const currentDirection = player.pendingDirection ?? player.direction;
    if (DIRECTIONS[currentDirection].opposite === mapped.direction || currentDirection === mapped.direction) {
      return;
    }

    player.pendingDirection = mapped.direction;
    this.playSound("turnBlip");
  }

  handleOverlayAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const { action, value } = button.dataset;
    this.playSound("menuSelect");
    if (action === "mode") {
      if (value === "skip") {
        this.resolveInteraction("mode", value);
        return;
      }
      this.setMode(value);
      if (this.ui.overlayHeadline.textContent === "QUICK SETUP") {
        this.renderOverlayActions("setup");
      } else if (this.ui.overlayHeadline.textContent === "LINK SETUP") {
        this.renderOverlayActions("mode");
      } else {
        this.resolveInteraction("mode", value);
      }
    } else if (action === "confirm-mode") {
      this.resolveInteraction("mode", this.mode);
    } else if (action === "difficulty") {
      this.setDifficulty(value);
      if (this.ui.overlayHeadline.textContent === "QUICK SETUP") {
        this.renderOverlayActions("setup");
      } else {
        this.resolveInteraction("difficulty", value);
      }
    } else if (action === "next") {
      this.resolveInteraction("next", true);
    }
  }

  setMode(mode) {
    if (mode !== "human" && mode !== "bot") {
      return;
    }

    if (this.state === "RUNNING" || this.state === "COUNTDOWN") {
      return;
    }

    this.mode = mode;
    if (this.ui.player2Label) {
      this.ui.player2Label.textContent = mode === "bot" ? "Bot" : "Player 2";
    }
    this.updateSelectionSummary();
    if (this.state !== "SETUP") {
      this.setStatus("Press START");
    }
    this.render();
  }

  setDifficulty(level) {
    this.botDifficulty = level;
    this.updateSelectionSummary();
  }

  setTickRate(value) {
    this.tickMs = value;
    if (this.ui.speedValue) {
      this.ui.speedValue.textContent = `${value} ms`;
    }

    if (this.state === "RUNNING") {
      this.clearTimers();
      this.beginTickLoop();
    }
  }

  togglePalette() {
    this.useColorblindPalette = !this.useColorblindPalette;
    if (this.ui.paletteToggle) {
      this.ui.paletteToggle.setAttribute("aria-pressed", String(this.useColorblindPalette));
      this.ui.paletteToggle.textContent = this.useColorblindPalette ? "COLORBLIND ON" : "COLORBLIND OFF";
    }
    this.playSound("menuSelect");
    this.render();
  }

  toggleMotion() {
    this.reducedMotion = !this.reducedMotion;
    document.body.classList.toggle("reduced-motion", this.reducedMotion);
    this.ui.motionToggle?.setAttribute("aria-pressed", String(this.reducedMotion));
    this.playSound("menuSelect");
  }

  showOverlay(headline, subline, visible, tone = "neutral", variant = "default") {
    this.ui.overlayHeadline.textContent = headline;
    this.ui.overlaySubline.textContent = subline;
    this.ui.overlay.classList.remove("overlay-p1", "overlay-p2");
    if (tone === "p1") {
      this.ui.overlay.classList.add("overlay-p1");
    } else if (tone === "p2") {
      this.ui.overlay.classList.add("overlay-p2");
    }
    this.ui.overlay.classList.toggle("overlay-result", variant === "result");
    this.ui.overlay.classList.toggle("is-hidden", !visible);
  }

  hideOverlay() {
    this.ui.overlay.classList.remove("overlay-result");
    this.ui.setupSkipButton?.classList.add("is-hidden");
    this.ui.overlay.classList.add("is-hidden");
  }

  setStatus(message) {
    if (this.ui.statusMessage) {
      this.ui.statusMessage.textContent = message;
    }
  }

  resetPanels() {
    this.clearOverlayStage();
  }

  clearOverlayStage() {
    this.ui.overlayBody.textContent = "";
    this.ui.overlayVisual.innerHTML = "";
    this.ui.overlayActions.innerHTML = "";
  }

  setControlsLayout(enabled) {
    this.ui.overlayContent?.classList.toggle("controls-layout", enabled);
    this.ui.overlayBody?.classList.toggle("controls-copy", enabled);
  }

  syncUi() {
    if (this.ui.roundCounter) {
      this.ui.roundCounter.textContent = String(this.round).padStart(2, "0");
    }
    if (this.ui.timerDisplay) {
      this.ui.timerDisplay.textContent = `${(this.elapsedMs / 1000).toFixed(1).padStart(4, "0")}s`;
    }
    if (this.ui.scoreP1) {
      this.ui.scoreP1.textContent = String(this.scores.p1);
    }
    if (this.ui.scoreP2) {
      this.ui.scoreP2.textContent = String(this.scores.p2);
    }
  }

  clearTimers() {
    window.clearInterval(this.tickHandle);
    window.clearTimeout(this.countdownHandle);
    window.clearTimeout(this.resolveHandle);
    for (const timeoutId of this.pendingTimeouts) {
      window.clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
    this.resolveInteraction("mode", null);
    this.resolveInteraction("difficulty", null);
    this.resolveInteraction("next", null);
    this.resolveInteraction("skip", null);
    this.tickHandle = null;
    this.countdownHandle = null;
    this.resolveHandle = null;
  }

  resolveInteraction(kind, value) {
    if (kind === "mode" && this.modeResolver) {
      const resolve = this.modeResolver;
      this.modeResolver = null;
      resolve(value);
    } else if (kind === "difficulty" && this.difficultyResolver) {
      const resolve = this.difficultyResolver;
      this.difficultyResolver = null;
      resolve(value);
    } else if (kind === "next" && this.nextResolver) {
      const resolve = this.nextResolver;
      this.nextResolver = null;
      resolve(value);
    } else if (kind === "skip" && this.skipResolver) {
      const resolve = this.skipResolver;
      this.skipResolver = null;
      resolve(value);
    }
  }

  wait(ms) {
    return new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingTimeouts.delete(timeoutId);
        resolve();
      }, ms);
      this.pendingTimeouts.add(timeoutId);
    });
  }

  async typeText(element, text, token, speed = 20) {
    element.textContent = "";
    for (let index = 0; index < text.length; index += 1) {
      if (token !== this.setupToken || this.state === "IDLE") {
        return false;
      }

      element.textContent += text[index];
      const delay = /[.!?]/.test(text[index]) ? speed * 6 : text[index] === " " ? speed * 0.5 : speed;
      await this.wait(delay);
    }
    return true;
  }

  waitForModeSelection(token) {
    return new Promise((resolve) => {
      this.modeResolver = (value) => {
        if (token !== this.setupToken) {
          resolve(null);
          return;
        }
        resolve(value);
      };
    });
  }

  waitForDifficultySelection(token) {
    return new Promise((resolve) => {
      this.difficultyResolver = (value) => {
        if (token !== this.setupToken) {
          resolve(null);
          return;
        }
        resolve(value);
      };
    });
  }

  waitForNext(token) {
    return new Promise((resolve) => {
      this.nextResolver = (value) => {
        if (token !== this.setupToken) {
          resolve(null);
          return;
        }
        resolve(value);
      };
    });
  }

  updateSelectionSummary() {
    if (this.ui.modeSummary) {
      this.ui.modeSummary.textContent = this.mode === "bot" ? "Bot" : "Human";
    }
    if (this.ui.difficultySummary) {
      this.ui.difficultySummary.textContent = this.botDifficulty[0].toUpperCase() + this.botDifficulty.slice(1);
    }
    this.ui.difficultySummaryBox?.classList.toggle("is-hidden", this.mode !== "bot");
  }

  renderOverlayActions(kind) {
    if (kind === "mode") {
      this.ui.overlayActions.innerHTML = `
        <div class="setup-actions">
          <div class="segment-control onboarding-actions">
            <button class="segment ${this.mode === "human" ? "is-active" : ""}" type="button" data-action="mode" data-value="human">HUMAN</button>
            <button class="segment ${this.mode === "bot" ? "is-active" : ""}" type="button" data-action="mode" data-value="bot">BOT</button>
          </div>
          <button class="small-button next-button" type="button" data-action="confirm-mode" data-value="true">NEXT</button>
        </div>
      `;
    } else if (kind === "setup") {
      this.ui.overlayActions.innerHTML = `
        <div class="setup-actions">
          <div class="setup-group">
            <p class="setup-label">PLAYER 2 MODE</p>
            <div class="segment-control onboarding-actions">
              <button class="segment ${this.mode === "human" ? "is-active" : ""}" type="button" data-action="mode" data-value="human">HUMAN</button>
              <button class="segment ${this.mode === "bot" ? "is-active" : ""}" type="button" data-action="mode" data-value="bot">BOT</button>
            </div>
          </div>
          <div class="setup-group ${this.mode !== "bot" ? "is-dimmed" : ""}">
            <p class="setup-label">BOT ROUTINE</p>
            <div class="segment-control onboarding-actions">
              <button class="segment ${this.botDifficulty === "easy" ? "is-active" : ""}" type="button" data-action="difficulty" data-value="easy">EASY</button>
              <button class="segment ${this.botDifficulty === "hard" ? "is-active" : ""}" type="button" data-action="difficulty" data-value="hard">HARD</button>
            </div>
          </div>
          <button class="small-button next-button" type="button" data-action="next" data-value="true">NEXT</button>
        </div>
      `;
    } else if (kind === "difficulty") {
      this.ui.overlayActions.innerHTML = `
        <div class="segment-control onboarding-actions">
          <button class="segment ${this.botDifficulty === "easy" ? "is-active" : ""}" type="button" data-action="difficulty" data-value="easy">EASY</button>
          <button class="segment ${this.botDifficulty === "hard" ? "is-active" : ""}" type="button" data-action="difficulty" data-value="hard">HARD</button>
        </div>
      `;
    } else if (kind === "next") {
      this.ui.overlayActions.innerHTML = `
        <button class="small-button next-button" type="button" data-action="next" data-value="true">NEXT</button>
      `;
    }
  }

  getControlsVisualMarkup() {
    return this.mode === "bot"
      ? `
        <div class="control-visuals">
          <article class="control-card">
            <h3 class="p1-text">Player 1 Input</h3>
            ${this.getKeyboardSvg("WASD", "#00FFFF")}
            <p>Drive manually with WASD. Set your turn before each tick lands.</p>
          </article>
          <article class="control-card">
            <h3 class="p1-text">Player 1 Alt Input</h3>
            ${this.getKeyboardSvg("ARROWS", "#00FFFF")}
            <p>Single-player mode also accepts arrow keys for Player 1.</p>
          </article>
          <article class="control-card">
            <h3 class="p2-text">Bot Link</h3>
            ${this.getBotSvg()}
            <p>Player 2 runs in ${this.botDifficulty.toUpperCase()} mode with full arena awareness.</p>
          </article>
        </div>
      `
      : `
        <div class="control-visuals">
          <article class="control-card">
            <h3 class="p1-text">Player 1 Input</h3>
            ${this.getKeyboardSvg("WASD", "#00FFFF")}
            <p>Player 1 rides with W, A, S, and D.</p>
          </article>
          <article class="control-card">
            <h3 class="p2-text">Player 2 Input</h3>
            ${this.getKeyboardSvg("ARROWS", "#FF9900")}
            <p>Player 2 rides with the arrow keys.</p>
          </article>
        </div>
      `;
  }

  getKeyboardSvg(layout, accent) {
    const labels = layout === "WASD"
      ? [
          { x: 82, y: 6, label: "W" },
          { x: 28, y: 48, label: "A" },
          { x: 82, y: 48, label: "S" },
          { x: 136, y: 48, label: "D" },
        ]
      : [
          { x: 82, y: 6, label: "↑" },
          { x: 28, y: 48, label: "←" },
          { x: 82, y: 48, label: "↓" },
          { x: 136, y: 48, label: "→" },
        ];

    const keys = labels
      .map(
        ({ x, y, label }) => `
          <rect x="${x}" y="${y}" width="44" height="34" rx="4" fill="#03070d" stroke="${accent}" stroke-width="2"></rect>
          <text x="${x + 22}" y="${y + 22}" fill="${accent}" text-anchor="middle" font-size="16" font-family="monospace">${label}</text>
        `,
      )
      .join("");

    return `
      <svg viewBox="0 0 210 92" aria-hidden="true">
        <rect x="1" y="1" width="208" height="90" rx="8" fill="#02050a" stroke="rgba(255,255,255,0.12)"></rect>
        ${keys}
      </svg>
    `;
  }

  getBotSvg() {
    return `
      <svg viewBox="0 0 210 92" aria-hidden="true">
        <rect x="1" y="1" width="208" height="90" rx="8" fill="#02050a" stroke="rgba(255,255,255,0.12)"></rect>
        <rect x="67" y="20" width="76" height="46" rx="6" fill="#120a02" stroke="#FF9900" stroke-width="2"></rect>
        <circle cx="90" cy="43" r="6" fill="#FF9900"></circle>
        <circle cx="120" cy="43" r="6" fill="#FF9900"></circle>
        <path d="M74 71 L136 71" stroke="#FF9900" stroke-width="2"></path>
        <path d="M53 28 L67 28 M143 28 L157 28 M53 58 L67 58 M143 58 L157 58" stroke="#FF9900" stroke-width="2"></path>
        <text x="105" y="83" fill="#FF9900" text-anchor="middle" font-size="12" font-family="monospace">AUTO PILOT</text>
      </svg>
    `;
  }

  getPalette() {
    return this.useColorblindPalette ? CONFIG.colors.colorblind : CONFIG.colors.default;
  }

  getBotMove() {
    const player = this.players.p2;
    const candidates = this.getSafeMoves(player);

    if (candidates.length === 0) {
      return player.direction;
    }

    if (this.botDifficulty === "easy") {
      return this.chooseEasyBotMove(candidates);
    }

    let bestScore = -Infinity;
    let bestDirections = [];

    for (const candidate of candidates) {
      const score = this.evaluateHardBotMove(candidate);

      if (score > bestScore) {
        bestScore = score;
        bestDirections = [candidate.direction];
      } else if (score === bestScore) {
        bestDirections.push(candidate.direction);
      }
    }

    return bestDirections[Math.floor(Math.random() * bestDirections.length)];
  }

  getCandidateDirections(currentDirection) {
    const opposite = DIRECTIONS[currentDirection].opposite;
    return Object.keys(DIRECTIONS).filter((direction) => direction !== opposite);
  }

  previewMove(player, direction) {
    const vector = DIRECTIONS[direction];
    return {
      x: player.x + vector.x,
      y: player.y + vector.y,
    };
  }

  getSafeMoves(player, grid = this.grid) {
    return this.getCandidateDirections(player.direction)
      .map((direction) => ({
        direction,
        next: this.previewMove(player, direction),
      }))
      .filter((candidate) => !this.isCollisionOnGrid(grid, candidate.next.x, candidate.next.y));
  }

  chooseEasyBotMove(candidates) {
    const scored = candidates.map((candidate) => ({
      direction: candidate.direction,
      score: this.evaluateEasyBotMove(candidate),
    }));
    scored.sort((left, right) => right.score - left.score);

    if (Math.random() < 0.2) {
      const pool = scored.slice(0, Math.min(2, scored.length));
      return pool[Math.floor(Math.random() * pool.length)].direction;
    }

    return scored[0].direction;
  }

  evaluateEasyBotMove(candidate) {
    const human = this.players.p1;
    const humanResponses = this.getSafeMoves(human);
    const fallbackResponse = {
      direction: human.direction,
      next: this.previewMove(human, human.direction),
    };
    const sample = humanResponses.length > 0
      ? humanResponses[Math.floor(Math.random() * humanResponses.length)]
      : fallbackResponse;

    return this.scoreFutureState(candidate, sample, {
      survivalWeight: 1,
      territoryWeight: 0.45,
      mobilityWeight: 0.4,
      pressureWeight: 0.35,
      centerWeight: 0.08,
    });
  }

  evaluateHardBotMove(candidate) {
    const human = this.players.p1;
    const humanResponses = this.getSafeMoves(human);
    const fallbackResponse = {
      direction: human.direction,
      next: this.previewMove(human, human.direction),
    };
    const responses = humanResponses.length > 0 ? humanResponses : [fallbackResponse];
    let worstCase = Infinity;
    let aggregate = 0;

    for (const response of responses) {
      const score = this.scoreFutureState(candidate, response, {
        survivalWeight: 1,
        territoryWeight: 0.8,
        mobilityWeight: 0.65,
        pressureWeight: 0.75,
        centerWeight: 0.14,
      });
      aggregate += score;
      worstCase = Math.min(worstCase, score);
    }

    return worstCase * 0.85 + (aggregate / responses.length) * 0.15;
  }

  scoreFutureState(botCandidate, humanCandidate, weights) {
    const botCrash = this.isCollision(botCandidate.next.x, botCandidate.next.y);
    const humanCrash = this.isCollision(humanCandidate.next.x, humanCandidate.next.y);
    const headOn = botCandidate.next.x === humanCandidate.next.x && botCandidate.next.y === humanCandidate.next.y;

    if (headOn) {
      return -400;
    }
    if (botCrash && humanCrash) {
      return -250;
    }
    if (botCrash) {
      return -100000;
    }
    if (humanCrash) {
      return 100000;
    }

    const futureGrid = this.cloneGridWithMoves(botCandidate.next, humanCandidate.next);
    const territory = this.computeTerritoryControl(botCandidate.next, humanCandidate.next, futureGrid);
    const botSpace = this.floodFillOnGrid(botCandidate.next.x, botCandidate.next.y, futureGrid);
    const humanSpace = this.floodFillOnGrid(humanCandidate.next.x, humanCandidate.next.y, futureGrid);
    const botMobility = this.countSafeTurns(botCandidate.next, botCandidate.direction, futureGrid);
    const humanMobility = this.countSafeTurns(humanCandidate.next, humanCandidate.direction, futureGrid);
    const pressure = (botSpace - humanSpace) + (botMobility - humanMobility) * 18;
    const centerControl = this.computeCenterBias(botCandidate.next) - this.computeCenterBias(humanCandidate.next);

    return (
      territory * weights.territoryWeight +
      (botSpace - humanSpace) * weights.survivalWeight +
      (botMobility - humanMobility) * 90 * weights.mobilityWeight +
      pressure * weights.pressureWeight +
      centerControl * 100 * weights.centerWeight
    );
  }

  cloneGridWithMoves(botNext, humanNext) {
    const grid = this.grid.map((row) => row.slice());
    grid[humanNext.y][humanNext.x] = 1;
    grid[botNext.y][botNext.x] = 2;
    return grid;
  }

  isCollisionOnGrid(grid, x, y) {
    if (x < 0 || y < 0 || x >= CONFIG.cols || y >= CONFIG.rows) {
      return true;
    }

    return grid[y][x] !== 0;
  }

  floodFillOnGrid(startX, startY, grid) {
    if (startX < 0 || startY < 0 || startX >= CONFIG.cols || startY >= CONFIG.rows) {
      return 0;
    }

    const seen = new Set();
    const queue = [{ x: startX, y: startY }];
    let count = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (
        seen.has(key) ||
        ((current.x !== startX || current.y !== startY) && this.isCollisionOnGrid(grid, current.x, current.y))
      ) {
        continue;
      }

      seen.add(key);
      count += 1;

      for (const direction of Object.values(DIRECTIONS)) {
        const next = { x: current.x + direction.x, y: current.y + direction.y };
        const nextKey = `${next.x},${next.y}`;
        if (!seen.has(nextKey) && !this.isCollisionOnGrid(grid, next.x, next.y)) {
          queue.push(next);
        }
      }
    }

    return count;
  }

  computeTerritoryControl(botStart, humanStart, grid) {
    const queue = [
      { x: botStart.x, y: botStart.y, owner: "bot", distance: 0 },
      { x: humanStart.x, y: humanStart.y, owner: "human", distance: 0 },
    ];
    const visited = new Map();
    let botCount = 0;
    let humanCount = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      const isSeed =
        (current.x === botStart.x && current.y === botStart.y) ||
        (current.x === humanStart.x && current.y === humanStart.y);

      if (!isSeed && this.isCollisionOnGrid(grid, current.x, current.y)) {
        continue;
      }

      if (visited.has(key)) {
        const existing = visited.get(key);
        if (existing.distance === current.distance && existing.owner !== current.owner && existing.owner !== "contested") {
          existing.owner = "contested";
          if (current.owner === "bot") {
            botCount -= 1;
          } else {
            humanCount -= 1;
          }
        }
        continue;
      }

      visited.set(key, { owner: current.owner, distance: current.distance });
      if (current.owner === "bot") {
        botCount += 1;
      } else {
        humanCount += 1;
      }

      for (const direction of Object.values(DIRECTIONS)) {
        const next = {
          x: current.x + direction.x,
          y: current.y + direction.y,
          owner: current.owner,
          distance: current.distance + 1,
        };
        const nextKey = `${next.x},${next.y}`;
        const existing = visited.get(nextKey);
        if (!existing || existing.distance >= next.distance) {
          queue.push(next);
        }
      }
    }

    return botCount - humanCount;
  }

  countSafeTurns(position, direction, grid) {
    return this.getCandidateDirections(direction)
      .map((candidateDirection) => {
        const vector = DIRECTIONS[candidateDirection];
        return {
          x: position.x + vector.x,
          y: position.y + vector.y,
        };
      })
      .filter((move) => !this.isCollisionOnGrid(grid, move.x, move.y))
      .length;
  }

  computeCenterBias(position) {
    const centerX = (CONFIG.cols - 1) / 2;
    const centerY = (CONFIG.rows - 1) / 2;
    const distance = Math.abs(position.x - centerX) + Math.abs(position.y - centerY);
    return -(distance / (CONFIG.cols + CONFIG.rows));
  }

  render() {
    const palette = this.getPalette();
    const { ctx } = this;
    const now = performance.now();
    const viewports = this.getSplitViewports();

    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    this.drawViewport(viewports.p1, this.players.p1, palette, now);
    this.drawViewport(viewports.p2, this.players.p2, palette, now);
    this.drawSplitChrome(viewports, palette);
  }

  getSplitViewports() {
    const dividerWidth = 4;
    const halfWidth = Math.max(1, (this.viewWidth - dividerWidth) / 2);

    return {
      p1: this.makeViewport(this.players.p1, {
        x: 0,
        y: 0,
        width: halfWidth,
        height: this.viewHeight,
        label: "PLAYER 1",
        side: "left",
      }),
      p2: this.makeViewport(this.players.p2, {
        x: halfWidth + dividerWidth,
        y: 0,
        width: halfWidth,
        height: this.viewHeight,
        label: this.mode === "bot" ? "BOT" : "PLAYER 2",
        side: "right",
      }),
    };
  }

  makeViewport(player, rect) {
    const visibleCols = rect.width / CONFIG.cellSize;
    const visibleRows = rect.height / CONFIG.cellSize;
    const maxCameraX = Math.max(0, CONFIG.cols - visibleCols);
    const maxCameraY = Math.max(0, CONFIG.rows - visibleRows);

    return {
      ...rect,
      cameraX: this.clamp(player.x + 0.5 - visibleCols / 2, 0, maxCameraX),
      cameraY: this.clamp(player.y + 0.5 - visibleRows / 2, 0, maxCameraY),
    };
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  drawViewport(viewport, focusPlayer, palette, now) {
    const { ctx } = this;

    ctx.save();
    ctx.beginPath();
    ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
    ctx.clip();

    const gradient = ctx.createLinearGradient(viewport.x, viewport.y, viewport.x, viewport.y + viewport.height);
    gradient.addColorStop(0, "rgba(4, 18, 24, 0.96)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);

    this.drawVisibleGrid(viewport, palette);
    this.drawBoardEdges(viewport);
    this.drawPlayerInViewport(viewport, this.players.p1, palette.p1Head, now);
    this.drawPlayerInViewport(viewport, this.players.p2, palette.p2Head, now);
    this.drawViewportReticle(viewport, focusPlayer, focusPlayer.id === "p1" ? palette.p1Head : palette.p2Head);

    ctx.restore();
  }

  drawVisibleGrid(viewport, palette) {
    const { ctx } = this;
    const startX = Math.max(0, Math.floor(viewport.cameraX));
    const endX = Math.min(CONFIG.cols, Math.ceil(viewport.cameraX + viewport.width / CONFIG.cellSize) + 1);
    const startY = Math.max(0, Math.floor(viewport.cameraY));
    const endY = Math.min(CONFIG.rows, Math.ceil(viewport.cameraY + viewport.height / CONFIG.cellSize) + 1);

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1;

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const px = viewport.x + (x - viewport.cameraX) * CONFIG.cellSize;
        const py = viewport.y + (y - viewport.cameraY) * CONFIG.cellSize;
        const cell = this.grid[y][x];

        ctx.strokeRect(px + 0.5, py + 0.5, CONFIG.cellSize, CONFIG.cellSize);

        if (cell === 1 || cell === 2) {
          ctx.fillStyle = cell === 1 ? palette.p1Trail : palette.p2Trail;
          ctx.fillRect(px + 1, py + 1, CONFIG.cellSize - 2, CONFIG.cellSize - 2);
        }
      }
    }
  }

  drawBoardEdges(viewport) {
    const { ctx } = this;
    const left = viewport.x - viewport.cameraX * CONFIG.cellSize;
    const top = viewport.y - viewport.cameraY * CONFIG.cellSize;
    const width = CONFIG.cols * CONFIG.cellSize;
    const height = CONFIG.rows * CONFIG.cellSize;

    ctx.strokeStyle = "rgba(255, 42, 42, 0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(left + 1.5, top + 1.5, width - 3, height - 3);
  }

  drawPlayerInViewport(viewport, player, color, now) {
    const px = viewport.x + (player.x - viewport.cameraX) * CONFIG.cellSize;
    const py = viewport.y + (player.y - viewport.cameraY) * CONFIG.cellSize;

    if (
      px + CONFIG.cellSize < viewport.x ||
      py + CONFIG.cellSize < viewport.y ||
      px > viewport.x + viewport.width ||
      py > viewport.y + viewport.height
    ) {
      return;
    }

    if (!player.alive && now > player.crashUntil) {
      return;
    }

    if (!player.alive && !this.reducedMotion) {
      const flashOn = Math.floor(now / 80) % 2 === 0;
      if (!flashOn) {
        return;
      }
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(px, py, CONFIG.cellSize, CONFIG.cellSize);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(px + 4, py + 4, 5, 5);
  }

  drawViewportReticle(viewport, player, color) {
    const { ctx } = this;
    const centerX = viewport.x + (player.x - viewport.cameraX + 0.5) * CONFIG.cellSize;
    const centerY = viewport.y + (player.y - viewport.cameraY + 0.5) * CONFIG.cellSize;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(centerX - 14, centerY);
    ctx.lineTo(centerX - 5, centerY);
    ctx.moveTo(centerX + 5, centerY);
    ctx.lineTo(centerX + 14, centerY);
    ctx.moveTo(centerX, centerY - 14);
    ctx.lineTo(centerX, centerY - 5);
    ctx.moveTo(centerX, centerY + 5);
    ctx.lineTo(centerX, centerY + 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawSplitChrome(viewports, palette) {
    const { ctx } = this;
    const dividerX = viewports.p1.width;

    ctx.fillStyle = "#02050a";
    ctx.fillRect(dividerX, 0, 4, this.viewHeight);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(dividerX + 1, 0, 1, this.viewHeight);
    ctx.fillStyle = "rgba(0, 255, 255, 0.28)";
    ctx.fillRect(dividerX + 2, 0, 1, this.viewHeight);

    this.drawViewportLabel(viewports.p1, palette.p1Head);
    this.drawViewportLabel(viewports.p2, palette.p2Head);
  }

  drawViewportLabel(viewport, color) {
    const { ctx } = this;
    const boxWidth = 140;
    const boxX = viewport.side === "left" ? viewport.x + 12 : viewport.x + viewport.width - boxWidth - 12;
    const labelX = viewport.side === "left" ? viewport.x + 18 : viewport.x + viewport.width - 18;

    ctx.save();
    ctx.font = "700 16px 'Pixelify Sans', monospace";
    ctx.textAlign = viewport.side === "left" ? "left" : "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(boxX, 12, boxWidth, 34);
    ctx.strokeStyle = color;
    ctx.strokeRect(boxX + 0.5, 12.5, boxWidth - 1, 33);
    ctx.fillStyle = color;
    ctx.fillText(viewport.label, labelX, 20);
    ctx.restore();
  }
}

window.addEventListener("load", () => {
  new TronGame();
});
