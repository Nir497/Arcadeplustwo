const CONFIG = {
  cols: 180,
  rows: 144,
  cellSize: 14,
  defaultTickMs: 80,
  resolveMs: 2200,
  botSpaceSampleLimit: 900,
  countdownSteps: ["3", "2", "1", "GO!"],
  startPositions: {
    p1: { x: 36, y: 72, direction: "right" },
    p2: { x: 144, y: 72, direction: "left" },
    p3: { x: 90, y: 24, direction: "down" },
    bot1: { x: 90, y: 120, direction: "up" },
    bot2: { x: 36, y: 24, direction: "right" },
    bot3: { x: 144, y: 120, direction: "left" },
  },
  colors: {
    default: {
      p1Head: "#00FFFF",
      p1Trail: "#006688",
      p2Head: "#FF9900",
      p2Trail: "#884400",
      p3Head: "#FF3CF7",
      p3Trail: "#721A77",
      bot1Head: "#00FF66",
      bot1Trail: "#006B2B",
      bot2Head: "#FFE14D",
      bot2Trail: "#776600",
      bot3Head: "#A86BFF",
      bot3Trail: "#452477",
    },
    colorblind: {
      p1Head: "#33A1FF",
      p1Trail: "#1F4D7A",
      p2Head: "#FFD84D",
      p2Trail: "#7D6300",
      p3Head: "#E66A5C",
      p3Trail: "#713229",
      bot1Head: "#64D97B",
      bot1Trail: "#2E6A39",
      bot2Head: "#F4A261",
      bot2Trail: "#7A4F2F",
      bot3Head: "#B09CFF",
      bot3Trail: "#554C7A",
    },
  },
};

const RIDER_DEFINITIONS = [
  { id: "p1", label: "Player 1", shortLabel: "P1", kind: "human", colorKey: "p1", trailValue: 1, controls: "WASD" },
  { id: "p2", label: "Player 2", shortLabel: "P2", kind: "human", colorKey: "p2", trailValue: 2, controls: "ARROWS" },
  { id: "p3", label: "Player 3", shortLabel: "P3", kind: "human", colorKey: "p3", trailValue: 3, controls: "IJKL" },
  { id: "bot1", label: "Bot 1", shortLabel: "B1", kind: "bot", colorKey: "bot1", trailValue: 4, controls: "BOT" },
  { id: "bot2", label: "Bot 2", shortLabel: "B2", kind: "bot", colorKey: "bot2", trailValue: 5, controls: "BOT" },
  { id: "bot3", label: "Bot 3", shortLabel: "B3", kind: "bot", colorKey: "bot3", trailValue: 6, controls: "BOT" },
];

const TRAIL_COLOR_KEYS = Object.fromEntries(
  RIDER_DEFINITIONS.map((definition) => [definition.trailValue, `${definition.colorKey}Trail`]),
);

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
  KeyI: { player: "p3", direction: "up" },
  KeyJ: { player: "p3", direction: "left" },
  KeyK: { player: "p3", direction: "down" },
  KeyL: { player: "p3", direction: "right" },
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
    this.humanCount = 1;
    this.botCount = 1;
    this.botDifficulty = "easy";
    this.useColorblindPalette = false;
    this.reducedMotion = false;
    this.scores = {};
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
      void this.startQuickSetup();
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
    this.players = this.createPlayers();

    for (const player of this.getPlayers()) {
      this.markCell(player.x, player.y, player.trailValue);
    }

    this.ui.startButton.textContent = this.round === 1 && this.getHighScore() === 0 ? "START" : "RESTART";
    this.ui.startButton.disabled = false;
    this.ui.startButton.classList.remove("is-hidden");
    this.ui.setupSkipButton?.classList.add("is-hidden");
    if (this.ui.screenTitle) {
      this.ui.screenTitle.classList.remove("is-hidden");
    }
    this.setControlsLayout(false);
    this.setStatus("Press START");
    this.showOverlay("PRESS START", "1-3 HUMANS + 0-3 BOTS", true, "neutral");
    this.resetPanels();
    this.updateSelectionSummary();
    this.syncUi();
  }

  createPlayers() {
    const activeDefinitions = this.getActiveRiderDefinitions();
    return Object.fromEntries(activeDefinitions.map((definition) => [
      definition.id,
      this.makePlayer(definition, CONFIG.startPositions[definition.id]),
    ]));
  }

  getActiveRiderDefinitions() {
    const humans = RIDER_DEFINITIONS.filter((definition) => definition.kind === "human").slice(0, this.humanCount);
    const bots = RIDER_DEFINITIONS.filter((definition) => definition.kind === "bot").slice(0, this.botCount);
    return [...humans, ...bots];
  }

  getPlayers() {
    return Object.values(this.players);
  }

  getAlivePlayers() {
    return this.getPlayers().filter((player) => player.alive);
  }

  getHumanPlayers() {
    return this.getPlayers().filter((player) => player.kind === "human");
  }

  getBotPlayers() {
    return this.getPlayers().filter((player) => player.kind === "bot");
  }

  makePlayer(definition, start) {
    return {
      ...definition,
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
    this.players = this.createPlayers();
    for (const player of this.getPlayers()) {
      this.markCell(player.x, player.y, player.trailValue);
    }
    this.state = "SETUP";
    this.submittedScore = false;
    this.elapsedMs = 0;
    for (const player of this.getPlayers()) {
      player.pendingDirection = null;
    }
    this.ui.startButton.disabled = true;
    this.ui.startButton.classList.add("is-hidden");
    this.ui.setupSkipButton?.classList.remove("is-hidden");
    this.ui.screenTitle?.classList.add("is-hidden");
    this.resetPanels();
    this.setStatus("Initializing rider link...");

    const token = ++this.setupToken;
    const introText = "SELECT 1-3 HUMAN RIDERS AND 0-3 BOTS. BOTS ARE FULL COMPETITORS, BUT ONLY HUMAN RIDERS GET CAMERA PANES.";
    this.showOverlay("MATCH SETUP", "CONFIGURE RIDERS", true, "neutral");
    this.clearOverlayStage();
    if (!(await this.typeText(this.ui.overlayBody, introText, token))) {
      return;
    }

    this.renderOverlayActions("setup");
    this.setStatus("Configure riders, then press NEXT.");
    const setupConfirmed = await this.waitForNext(token);
    if (!setupConfirmed) {
      return;
    }

    this.grid = this.createGrid();
    this.players = this.createPlayers();
    for (const player of this.getPlayers()) {
      this.markCell(player.x, player.y, player.trailValue);
    }

    this.showOverlay("CONTROL MAP", "PHASE 02", true, "neutral");
    this.clearOverlayStage();
    this.setControlsLayout(true);
    const controlsText = this.getControlsText();
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

    this.showOverlay("ROUND BRIEFING", "PHASE 03", true, "neutral");
    this.clearOverlayStage();
    this.setControlsLayout(false);
    const infoText = "TRAILS BECOME PERMANENT WALLS ACROSS THE FULL 180 BY 144 GRID. ALL RIDERS MOVE ON THE SAME TICK. THE ROUND CONTINUES UNTIL ONLY ONE RIDER REMAINS.";
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

  async startQuickSetup() {
    if (this.state !== "SETUP") {
      return;
    }

    this.resolveInteraction("mode", null);
    this.resolveInteraction("difficulty", null);
    this.resolveInteraction("next", null);

    const token = ++this.setupToken;
    this.showOverlay("QUICK SETUP", "CONFIGURE ROUND", true, "neutral");
    this.clearOverlayStage();
    this.setControlsLayout(false);
    this.ui.overlayBody.textContent = "SET HUMAN RIDERS, BOT RIDERS, AND BOT ROUTINE. PRESS NEXT TO START THE COUNTDOWN.";
    this.renderOverlayActions("setup");
    this.setStatus("Quick setup ready.");

    const quickSetupConfirmed = await this.waitForNext(token);
    if (!quickSetupConfirmed || token !== this.setupToken || this.state !== "SETUP") {
      return;
    }

    this.grid = this.createGrid();
    this.players = this.createPlayers();
    for (const player of this.getPlayers()) {
      this.markCell(player.x, player.y, player.trailValue);
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

    for (const bot of this.getBotPlayers()) {
      if (bot.alive) {
        bot.pendingDirection = this.getBotMove(bot);
      }
    }

    const nextMoves = {};
    for (const player of this.getPlayers()) {
      if (!player.alive) {
        continue;
      }

      const resolvedDirection = this.resolveDirection(player.direction, player.pendingDirection);
      player.direction = resolvedDirection;
      player.pendingDirection = null;

      const vector = DIRECTIONS[resolvedDirection];
      nextMoves[player.id] = {
        x: player.x + vector.x,
        y: player.y + vector.y,
      };
    }

    const collisions = Object.fromEntries(Object.keys(nextMoves).map((id) => [id, false]));

    for (const [id, move] of Object.entries(nextMoves)) {
      if (this.isCollision(move.x, move.y)) {
        collisions[id] = true;
      }
    }

    const destinationOwners = new Map();
    for (const [id, move] of Object.entries(nextMoves)) {
      const key = `${move.x},${move.y}`;
      if (!destinationOwners.has(key)) {
        destinationOwners.set(key, []);
      }
      destinationOwners.get(key).push(id);
    }

    for (const ids of destinationOwners.values()) {
      if (ids.length > 1) {
        for (const id of ids) {
          collisions[id] = true;
        }
      }
    }

    const movingPlayers = this.getPlayers().filter((player) => player.alive && nextMoves[player.id]);
    for (let index = 0; index < movingPlayers.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < movingPlayers.length; otherIndex += 1) {
        const left = movingPlayers[index];
        const right = movingPlayers[otherIndex];
        const leftNext = nextMoves[left.id];
        const rightNext = nextMoves[right.id];
        if (
          leftNext.x === right.x &&
          leftNext.y === right.y &&
          rightNext.x === left.x &&
          rightNext.y === left.y
        ) {
          collisions[left.id] = true;
          collisions[right.id] = true;
        }
      }
    }

    let crashed = false;
    for (const player of this.getPlayers()) {
      if (!player.alive) {
        continue;
      }

      if (collisions[player.id]) {
        player.alive = false;
        player.crashUntil = performance.now() + CONFIG.resolveMs;
        crashed = true;
        continue;
      }

      const move = nextMoves[player.id];
      player.x = move.x;
      player.y = move.y;
      this.markCell(player.x, player.y, player.trailValue);
    }

    this.render();
    this.syncUi();

    if (crashed) {
      this.playSound("crash");
    }

    if (this.getAlivePlayers().length <= 1) {
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

    const alivePlayers = this.getAlivePlayers();
    const eliminatedPlayers = this.getPlayers().filter((player) => !player.alive);
    const winner = alivePlayers[0] ?? null;
    const headline = winner ? `${winner.label.toUpperCase()} WINS` : "DRAW!";
    const subline = winner ? `${eliminatedPlayers.length} RIDERS ELIMINATED` : "ALL RIDERS CRASHED";
    const detail = winner
      ? `${winner.label} stayed alive. Eliminated: ${eliminatedPlayers.map((player) => player.label).join(", ")}.`
      : "Every remaining rider crashed on the same tick. The final trail layout stays visible until the next round is armed.";
    const status = winner ? `${winner.label} wins the round!` : "Draw!";

    if (winner) {
      this.scores[winner.id] = (this.scores[winner.id] ?? 0) + 1;
    }

    this.setStatus(status);
    const tone = winner?.id === "p1" ? "p1" : winner?.id === "p2" ? "p2" : "neutral";
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
      window.ArcadeHighScores?.promptAndSubmit("tron-3", this.getHighScore())
    );
  }

  getHighScore() {
    return Math.max(0, ...Object.values(this.scores));
  }

  handleKeyDown(event) {
    const mapped = this.humanCount === 1
      ? SINGLE_PLAYER_ARROW_MAP[event.code] ?? KEYMAP[event.code]
      : KEYMAP[event.code];
    if (!mapped) {
      return;
    }

    event.preventDefault();

    if (this.state !== "RUNNING" && this.state !== "COUNTDOWN") {
      return;
    }

    const player = this.players[mapped.player];
    if (!player?.alive || player.kind !== "human") {
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
      if (this.ui.overlayHeadline.textContent === "MATCH SETUP" || this.ui.overlayHeadline.textContent === "QUICK SETUP") {
        this.renderOverlayActions("setup");
      } else {
        this.resolveInteraction("difficulty", value);
      }
    } else if (action === "human-count") {
      this.setHumanCount(Number(value));
      this.renderOverlayActions("setup");
    } else if (action === "bot-count") {
      this.setBotCount(Number(value));
      this.renderOverlayActions("setup");
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
    if (level !== "easy" && level !== "hard") {
      return;
    }

    this.botDifficulty = level;
    this.updateSelectionSummary();
  }

  setHumanCount(count) {
    this.humanCount = this.clamp(Math.floor(count), 1, 3);
    if (this.humanCount + this.botCount < 2) {
      this.botCount = 1;
    }
    this.mode = this.botCount > 0 ? "bot" : "human";
    this.players = this.createPlayers();
    this.grid = this.createGrid();
    for (const player of this.getPlayers()) {
      this.markCell(player.x, player.y, player.trailValue);
    }
    this.updateSelectionSummary();
    this.render();
  }

  setBotCount(count) {
    this.botCount = this.clamp(Math.floor(count), 0, 3);
    if (this.humanCount + this.botCount < 2) {
      this.humanCount = 2;
    }
    this.mode = this.botCount > 0 ? "bot" : "human";
    this.players = this.createPlayers();
    this.grid = this.createGrid();
    for (const player of this.getPlayers()) {
      this.markCell(player.x, player.y, player.trailValue);
    }
    this.updateSelectionSummary();
    this.render();
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
      this.ui.scoreP1.textContent = String(this.scores.p1 ?? 0);
    }
    if (this.ui.scoreP2) {
      this.ui.scoreP2.textContent = String(this.scores.p2 ?? 0);
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
      this.ui.modeSummary.textContent = `${this.humanCount} Human / ${this.botCount} Bot`;
    }
    if (this.ui.difficultySummary) {
      this.ui.difficultySummary.textContent = this.botDifficulty[0].toUpperCase() + this.botDifficulty.slice(1);
    }
    this.ui.difficultySummaryBox?.classList.toggle("is-hidden", this.botCount === 0);
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
            <p class="setup-label">HUMAN RIDERS</p>
            <div class="segment-control count-control onboarding-actions">
              ${[1, 2, 3].map((count) => `
                <button class="segment ${this.humanCount === count ? "is-active" : ""}" type="button" data-action="human-count" data-value="${count}">${count}</button>
              `).join("")}
            </div>
          </div>
          <div class="setup-group">
            <p class="setup-label">BOT RIDERS</p>
            <div class="segment-control count-control onboarding-actions">
              ${[0, 1, 2, 3].map((count) => `
                <button class="segment ${this.botCount === count ? "is-active" : ""}" type="button" data-action="bot-count" data-value="${count}">${count}</button>
              `).join("")}
            </div>
          </div>
          <div class="setup-group ${this.botCount === 0 ? "is-dimmed" : ""}">
            <p class="setup-label">BOT ROUTINE</p>
            <div class="segment-control onboarding-actions">
              <button class="segment ${this.botDifficulty === "easy" ? "is-active" : ""}" type="button" data-action="difficulty" data-value="easy">EASY</button>
              <button class="segment ${this.botDifficulty === "hard" ? "is-active" : ""}" type="button" data-action="difficulty" data-value="hard">HARD</button>
            </div>
          </div>
          <p class="setup-label">${this.humanCount + this.botCount} RIDERS ACTIVE</p>
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
    const palette = this.getPalette();
    const humanCards = this.getHumanPlayers().map((player) => `
      <article class="control-card">
        <h3 style="color: ${palette[`${player.colorKey}Head`]}">${player.label} Input</h3>
        ${this.getKeyboardSvg(player.controls, palette[`${player.colorKey}Head`])}
        <p>${player.label} rides with ${this.getControlCopy(player.controls)}.</p>
      </article>
    `).join("");
    const altInput = this.humanCount === 1
      ? `
        <article class="control-card">
          <h3 class="p1-text">Player 1 Alt Input</h3>
          ${this.getKeyboardSvg("ARROWS", palette.p1Head)}
          <p>Single-player human mode also accepts arrow keys for Player 1.</p>
        </article>
      `
      : "";
    const botCard = this.botCount > 0
      ? `
        <article class="control-card">
          <h3 style="color: ${palette.bot1Head}">Bot Riders</h3>
          ${this.getBotSvg()}
          <p>${this.botCount} bot rider${this.botCount === 1 ? "" : "s"} run ${this.botDifficulty.toUpperCase()} routines with full arena awareness.</p>
        </article>
      `
      : "";

    return `<div class="control-visuals">${humanCards}${altInput}${botCard}</div>`;
  }

  getControlsText() {
    const humanControls = this.getHumanPlayers()
      .map((player) => `${player.label.toUpperCase()}: ${player.controls}`)
      .join(". ");
    const botText = this.botCount > 0
      ? ` ${this.botCount} BOT RIDER${this.botCount === 1 ? "" : "S"} USE ${this.botDifficulty.toUpperCase()} ROUTINES.`
      : "";
    return `${humanControls}.${botText} ONLY HUMAN RIDERS GET CAMERA PANES.`;
  }

  getControlCopy(layout) {
    if (layout === "WASD") {
      return "W, A, S, and D";
    }
    if (layout === "ARROWS") {
      return "the arrow keys";
    }
    return "I, J, K, and L";
  }

  getKeyboardSvg(layout, accent) {
    const keySets = {
      WASD: [
        { x: 82, y: 6, label: "W" },
        { x: 28, y: 48, label: "A" },
        { x: 82, y: 48, label: "S" },
        { x: 136, y: 48, label: "D" },
      ],
      ARROWS: [
        { x: 82, y: 6, label: "↑" },
        { x: 28, y: 48, label: "←" },
        { x: 82, y: 48, label: "↓" },
        { x: 136, y: 48, label: "→" },
      ],
      IJKL: [
        { x: 82, y: 6, label: "I" },
        { x: 28, y: 48, label: "J" },
        { x: 82, y: 48, label: "K" },
        { x: 136, y: 48, label: "L" },
      ],
    };
    const labels = keySets[layout] ?? keySets.WASD;

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

  getBotMove(player) {
    const candidates = this.getSafeMoves(player);

    if (candidates.length === 0) {
      return player.direction;
    }

    if (this.botDifficulty === "easy") {
      return this.chooseEasyBotMove(player, candidates);
    }

    let bestScore = -Infinity;
    let bestDirections = [];

    for (const candidate of candidates) {
      const score = this.evaluateBotMove(player, candidate, {
        survivalWeight: 1,
        mobilityWeight: 0.9,
        pressureWeight: 0.55,
        centerWeight: 0.12,
      });

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
        playerId: player.id,
        direction,
        next: this.previewMove(player, direction),
      }))
      .filter((candidate) => !this.isCollisionOnGrid(grid, candidate.next.x, candidate.next.y));
  }

  chooseEasyBotMove(player, candidates) {
    const straightMove = candidates.find((candidate) => candidate.direction === player.direction);
    if (straightMove && this.countSafeTurns(straightMove.next, straightMove.direction, this.grid) >= 2 && Math.random() < 0.25) {
      return straightMove.direction;
    }

    const scored = candidates.map((candidate) => {
      const mobility = this.countSafeTurns(candidate.next, candidate.direction, this.grid);
      const space = this.floodFillOnGrid(candidate.next.x, candidate.next.y, this.grid, 260);
      const opponentRisk = this.getImmediateOpponentRisk(player, candidate.next);
      const straightBias = candidate.direction === player.direction ? 2 : 0;
      const centerBias = this.computeCenterBias(candidate.next);
      return {
        direction: candidate.direction,
        score: space * 0.22 + mobility * 18 + straightBias + centerBias * 8 - opponentRisk + Math.random() * 8,
      };
    });
    scored.sort((left, right) => right.score - left.score);

    if (Math.random() < 0.18) {
      const pool = scored.slice(0, Math.min(2, scored.length));
      return pool[Math.floor(Math.random() * pool.length)].direction;
    }

    return scored[0].direction;
  }

  getImmediateOpponentRisk(bot, next) {
    let risk = 0;
    for (const opponent of this.getAlivePlayers()) {
      if (opponent.id === bot.id) {
        continue;
      }

      const distance = Math.abs(next.x - opponent.x) + Math.abs(next.y - opponent.y);
      if (distance <= 2) {
        risk += 18;
      }

      const opponentMoves = this.getSafeMoves(opponent);
      if (opponentMoves.some((move) => move.next.x === next.x && move.next.y === next.y)) {
        risk += 80;
      }
    }
    return risk;
  }

  evaluateBotMove(bot, candidate, weights) {
    if (!bot || this.isCollision(candidate.next.x, candidate.next.y)) {
      return -100000;
    }

    const opponents = this.getAlivePlayers().filter((player) => player.id !== bot.id);
    const blockedCells = [candidate.next];
    const botSpace = this.floodFillOnGrid(candidate.next.x, candidate.next.y, this.grid, CONFIG.botSpaceSampleLimit, blockedCells);
    const botMobility = this.countSafeTurns(candidate.next, candidate.direction, this.grid, blockedCells);
    let pressure = 0;
    let immediateRisk = 0;

    for (const opponent of opponents) {
      const opponentMoves = this.getSafeMoves(opponent);
      const opponentNextMoves = opponentMoves.length > 0
        ? opponentMoves.map((move) => move.next)
        : [this.previewMove(opponent, opponent.direction)];
      const distance = Math.abs(candidate.next.x - opponent.x) + Math.abs(candidate.next.y - opponent.y);
      const opponentMobility = this.countSafeTurns(opponent, opponent.direction, this.grid, blockedCells);
      const opponentSpace = this.floodFillOnGrid(opponent.x, opponent.y, this.grid, CONFIG.botSpaceSampleLimit, blockedCells);

      if (opponentNextMoves.some((move) => move.x === candidate.next.x && move.y === candidate.next.y)) {
        immediateRisk += 450;
      }
      if (candidate.next.x === opponent.x && candidate.next.y === opponent.y) {
        immediateRisk += 250;
      }

      pressure += Math.max(0, 32 - distance) * 3;
      pressure += (botSpace - opponentSpace) * 0.08;
      pressure += (botMobility - opponentMobility) * 24;
    }

    return (
      botSpace * weights.survivalWeight +
      botMobility * 120 * weights.mobilityWeight +
      pressure * weights.pressureWeight +
      this.computeCenterBias(candidate.next) * 100 * weights.centerWeight -
      immediateRisk
    );
  }

  cloneGridWithMoves(moves) {
    const grid = this.grid.map((row) => row.slice());
    for (const { player, next } of moves) {
      if (next.y >= 0 && next.y < CONFIG.rows && next.x >= 0 && next.x < CONFIG.cols) {
        grid[next.y][next.x] = player.trailValue;
      }
    }
    return grid;
  }

  isCollisionOnGrid(grid, x, y, blockedCells = []) {
    if (x < 0 || y < 0 || x >= CONFIG.cols || y >= CONFIG.rows) {
      return true;
    }

    for (const cell of blockedCells) {
      if (cell.x === x && cell.y === y) {
        return true;
      }
    }

    return grid[y][x] !== 0;
  }

  floodFillOnGrid(startX, startY, grid, limit = Infinity, blockedCells = []) {
    if (startX < 0 || startY < 0 || startX >= CONFIG.cols || startY >= CONFIG.rows) {
      return 0;
    }

    const seen = new Uint8Array(CONFIG.cols * CONFIG.rows);
    const queue = [{ x: startX, y: startY }];
    let cursor = 0;
    let count = 0;

    while (cursor < queue.length && count < limit) {
      const current = queue[cursor];
      cursor += 1;
      const key = current.y * CONFIG.cols + current.x;

      if (
        seen[key] ||
        ((current.x !== startX || current.y !== startY) && this.isCollisionOnGrid(grid, current.x, current.y, blockedCells))
      ) {
        continue;
      }

      seen[key] = 1;
      count += 1;

      for (const direction of Object.values(DIRECTIONS)) {
        const next = { x: current.x + direction.x, y: current.y + direction.y };
        const nextKey = next.y * CONFIG.cols + next.x;
        if (!seen[nextKey] && !this.isCollisionOnGrid(grid, next.x, next.y, blockedCells)) {
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

  countSafeTurns(position, direction, grid, blockedCells = []) {
    return this.getCandidateDirections(direction)
      .map((candidateDirection) => {
        const vector = DIRECTIONS[candidateDirection];
        return {
          x: position.x + vector.x,
          y: position.y + vector.y,
        };
      })
      .filter((move) => !this.isCollisionOnGrid(grid, move.x, move.y, blockedCells))
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

    for (const viewport of viewports) {
      this.drawViewport(viewport, viewport.focusPlayer, palette, now);
    }
    this.drawSplitChrome(viewports, palette);
  }

  getSplitViewports() {
    const humanPlayers = this.getHumanPlayers();
    if (humanPlayers.length === 0) {
      return [];
    }

    const dividerWidth = 4;
    const totalDividerWidth = dividerWidth * (humanPlayers.length - 1);
    const paneWidth = Math.max(1, (this.viewWidth - totalDividerWidth) / humanPlayers.length);

    return humanPlayers.map((player, index) => this.makeViewport(player, {
      x: index * (paneWidth + dividerWidth),
      y: 0,
      width: paneWidth,
      height: this.viewHeight,
      label: player.label.toUpperCase(),
      side: index === 0 ? "left" : "right",
      dividerWidth,
      focusPlayer: player,
    }));
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
    for (const player of this.getPlayers()) {
      this.drawPlayerInViewport(viewport, player, this.getHeadColor(player, palette), now);
    }
    this.drawViewportReticle(viewport, focusPlayer, this.getHeadColor(focusPlayer, palette));

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
    ctx.beginPath();

    for (let x = startX; x <= endX; x += 1) {
      const px = viewport.x + (x - viewport.cameraX) * CONFIG.cellSize;
      ctx.moveTo(px + 0.5, viewport.y);
      ctx.lineTo(px + 0.5, viewport.y + viewport.height);
    }

    for (let y = startY; y <= endY; y += 1) {
      const py = viewport.y + (y - viewport.cameraY) * CONFIG.cellSize;
      ctx.moveTo(viewport.x, py + 0.5);
      ctx.lineTo(viewport.x + viewport.width, py + 0.5);
    }

    ctx.stroke();

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const cell = this.grid[y][x];

        if (cell > 0) {
          const px = viewport.x + (x - viewport.cameraX) * CONFIG.cellSize;
          const py = viewport.y + (y - viewport.cameraY) * CONFIG.cellSize;
          ctx.fillStyle = this.getTrailColorForCell(cell, palette);
          ctx.fillRect(px + 1, py + 1, CONFIG.cellSize - 2, CONFIG.cellSize - 2);
        }
      }
    }
  }

  getHeadColor(player, palette) {
    return palette[`${player.colorKey}Head`] ?? palette.p1Head;
  }

  getTrailColorForCell(cell, palette) {
    return palette[TRAIL_COLOR_KEYS[cell]] ?? palette.p1Trail;
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
    for (let index = 1; index < viewports.length; index += 1) {
      const dividerX = viewports[index].x - viewports[index].dividerWidth;
      ctx.fillStyle = "#02050a";
      ctx.fillRect(dividerX, 0, viewports[index].dividerWidth, this.viewHeight);
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(dividerX + 1, 0, 1, this.viewHeight);
      ctx.fillStyle = "rgba(0, 255, 255, 0.28)";
      ctx.fillRect(dividerX + 2, 0, 1, this.viewHeight);
    }

    for (const viewport of viewports) {
      this.drawViewportLabel(viewport, this.getHeadColor(viewport.focusPlayer, palette));
    }
  }

  drawViewportLabel(viewport, color) {
    const { ctx } = this;
    const boxWidth = Math.min(140, Math.max(78, viewport.width - 24));
    const boxX = viewport.side === "left" ? viewport.x + 12 : viewport.x + viewport.width - boxWidth - 12;
    const labelX = viewport.side === "left" ? viewport.x + 18 : viewport.x + viewport.width - 18;

    ctx.save();
    ctx.font = `${viewport.width < 150 ? "700 13px" : "700 16px"} 'Pixelify Sans', monospace`;
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
