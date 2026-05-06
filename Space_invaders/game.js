const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAY_TOP = 92;
const PLAY_BOTTOM = HEIGHT - 72;
const PLAY_LEFT = 50;
const PLAY_RIGHT = WIDTH - 50;
const GROUND_Y = PLAY_BOTTOM - 14;

const keys = {
  left: false,
  right: false,
  fire: false,
};

const COLORS = {
  text: "#eff7ff",
  muted: "#9ab7d0",
  cyan: "#62e8ff",
  green: "#8cff8c",
  pink: "#ff4fd8",
  red: "#ff6b6b",
  gold: "#ffe27a",
  orange: "#ffb86b",
  grid: "rgba(98, 232, 255, 0.08)",
};

const PLAYER_SHOT_SPEED = 10;
const ENEMY_SHOT_SPEED = 4.2;
const PLAYER_SPEED = 5.2;
const HIT_PAUSE_FRAMES = 6;
const RESPAWN_FRAMES = 84;
const UFO_BASE_FRAMES = 1200;
const FIXED_TIMESTEP_MS = 1000 / 60;
const MAX_FRAME_DELTA_MS = 250;

const PLUNGER_SEQUENCE = [1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8];
const SQUIGGLY_SEQUENCE = [11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10];
const UFO_SCORE_TABLE = [100, 50, 100, 150, 100, 50, 150, 100, 50, 100, 150, 100, 50, 150, 300];
const FONT_DISPLAY = '"Pixelify Sans", sans-serif';
const FONT_UI = '"Pixelify Sans", sans-serif';
const PLAYER_FIRE_COOLDOWN = 8;
const AUDIO_ENABLED = true;
const SOUND_LIBRARY = {
  playerShoot: { src: "assets/sounds/player_shoot.wav", volume: 0.34, maxVoices: 5, minInterval: 40 },
  alienShoot: { src: "assets/sounds/alien_shoot.wav", volume: 0.22, maxVoices: 4, minInterval: 55 },
  alienHit: { src: "assets/sounds/alien_hit.wav", volume: 0.28, maxVoices: 4, minInterval: 45 },
  playerHit: { src: "assets/sounds/player_hit.wav", volume: 0.34, maxVoices: 2, minInterval: 120 },
  shieldHit: { src: "assets/sounds/shield_hit.wav", volume: 0.16, maxVoices: 3, minInterval: 70 },
  ufoLoop: { src: "assets/sounds/ufo_loop.wav", volume: 0.16, loop: true },
  ufoHit: { src: "assets/sounds/ufo_hit.wav", volume: 0.3, maxVoices: 2, minInterval: 120 },
  countdownBeep: { src: "assets/sounds/countdown_beep.wav", volume: 0.24, maxVoices: 2, minInterval: 120 },
  countdownGo: { src: "assets/sounds/countdown_go.wav", volume: 0.3, maxVoices: 2, minInterval: 120 },
  extraLife: { src: "assets/sounds/extra_life.wav", volume: 0.26, maxVoices: 2, minInterval: 150 },
  waveStart: { src: "assets/sounds/wave_start.wav", volume: 0.26, maxVoices: 2, minInterval: 150 },
  gameOver: { src: "assets/sounds/game_over.wav", volume: 0.32, maxVoices: 2, minInterval: 200 },
  pauseToggle: { src: "assets/sounds/pause_toggle.wav", volume: 0.22, maxVoices: 2, minInterval: 80 },
  alienStep1: { src: "assets/sounds/alien_step_1.wav", volume: 0.16, maxVoices: 2, minInterval: 20 },
  alienStep2: { src: "assets/sounds/alien_step_2.wav", volume: 0.16, maxVoices: 2, minInterval: 20 },
  alienStep3: { src: "assets/sounds/alien_step_3.wav", volume: 0.16, maxVoices: 2, minInterval: 20 },
  alienStep4: { src: "assets/sounds/alien_step_4.wav", volume: 0.16, maxVoices: 2, minInterval: 20 },
};
const CONTROLS_TEXT =
  "A / LEFT  MOVE LEFT\n" +
  "D / RIGHT MOVE RIGHT\n" +
  "SPACE     FIRE\n" +
  "P         PAUSE";

const ALIEN_PATTERNS = {
  squid: [
    [
      "001100",
      "111111",
      "011110",
      "111111",
      "101101",
      "010010",
    ],
    [
      "001100",
      "111111",
      "011110",
      "111111",
      "010010",
      "101101",
    ],
  ],
  crab: [
    [
      "011110",
      "110011",
      "111111",
      "011110",
      "101101",
      "100001",
    ],
    [
      "011110",
      "110011",
      "111111",
      "011110",
      "010010",
      "101101",
    ],
  ],
  octopus: [
    [
      "001100",
      "011110",
      "111111",
      "110011",
      "111111",
      "010010",
    ],
    [
      "001100",
      "011110",
      "111111",
      "110011",
      "011110",
      "100001",
    ],
  ],
  ufo: [
    [
      "00111100",
      "11111111",
      "11111111",
      "01111110",
      "00100100",
    ],
  ],
  player: [
    [
      "0011100",
      "0111110",
      "1111111",
      "1111111",
      "0011100",
    ],
  ],
};

const SHIELD_MASK = createShieldMask();
const SHIELD_POSITIONS = [148, 338, 528, 718];
const backdropLayer = createRenderLayer(WIDTH, HEIGHT);
const backdropCtx = backdropLayer.getContext("2d");
backdropCtx.imageSmoothingEnabled = false;
renderBackdropLayer();

function createShieldMask() {
  const mask = [];
  for (let y = 0; y < 18; y += 1) {
    const row = [];
    for (let x = 0; x < 24; x += 1) {
      const leftEdge = x > 1;
      const rightEdge = x < 22;
      const archGap = y > 11 && x > 8 && x < 15;
      const bevel = (y < 2 && (x < 4 || x > 19)) || (y < 1 && (x < 6 || x > 17));
      row.push(leftEdge && rightEdge && !archGap && !bevel);
    }
    mask.push(row);
  }
  return mask;
}

function createInitialState() {
  return {
    mode: "title",
    frame: 0,
    score: 0,
    highScore: 0,
    lives: 3,
    level: 1,
    bonusLifeGiven: false,
    hitPause: 0,
    waveClearTimer: 0,
    respawnTimer: 0,
    shotCounter: 0,
    ufoTimer: 540,
    alienAnimFrame: 0,
    alienStepSoundIndex: 0,
    alienDirection: 1,
    alienMoveAccumulator: 0,
    plungerIndex: 0,
    squigglyIndex: 0,
    controlsChars: 0,
    controlsTimer: 0,
    countdownValue: 3,
    countdownTimer: 0,
    playerFireCooldown: 0,
    waveAlienTotal: 0,
    aliveAlienCount: 0,
    bottomAlienByColumn: [],
    player: {
      x: WIDTH / 2,
      y: PLAY_BOTTOM - 24,
      width: 42,
      height: 24,
      alive: true,
    },
    playerShots: [],
    enemyShots: [],
    ufo: null,
    explosions: [],
    aliens: [],
    shields: [],
  };
}

let state = createInitialState();
let sessionHighScore = 0;
const audio = createAudioManager();

function createAudioManager() {
  if (window.location.protocol === "file:") {
    console.warn("Using HTMLAudio fallback for file:// playback. Run via http://localhost for the smoother Web Audio path.");
    return createHtmlAudioManager();
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const buffers = new Map();
  const loopStates = new Map();
  const lastPlayedAt = new Map();
  const activeVoices = new Map();
  const pendingOneShots = new Map();
  const pendingLoops = new Set();
  let enabled = false;
  let loadingStarted = false;
  let context = null;

  if (!AUDIO_ENABLED) {
    return {
      enable() {},
      play() {},
      startLoop() {},
      stopLoop() {},
      stopAllLoops() {},
    };
  }

  if (!AudioContextClass) {
    return {
      enable() {},
      play() {},
      startLoop() {},
      stopLoop() {},
      stopAllLoops() {},
    };
  }

  function ensureContext() {
    if (!context) {
      context = new AudioContextClass();
    }
    return context;
  }

  function loadArrayBuffer(url) {
    const absoluteUrl = new URL(url, window.location.href).href;
    return fetch(absoluteUrl)
      .then((response) => {
        if (!response.ok && !absoluteUrl.startsWith("file:")) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .catch(
        () =>
          new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open("GET", absoluteUrl, true);
            request.responseType = "arraybuffer";
            request.onload = () => {
              if ((request.status >= 200 && request.status < 300) || absoluteUrl.startsWith("file:")) {
                resolve(request.response);
              } else {
                reject(new Error(`XHR ${request.status}`));
              }
            };
            request.onerror = () => reject(new Error("XHR network error"));
            request.send();
          })
      );
  }

  function playBuffered(name, config, buffer) {
    const audioContext = ensureContext();
    if (audioContext.state !== "running") {
      return false;
    }

    const maxVoices = config.maxVoices || 1;
    const voices = activeVoices.get(name) || [];
    if (voices.length >= maxVoices) {
      const oldestVoice = voices.shift();
      if (oldestVoice) {
        oldestVoice.source.onended = null;
        oldestVoice.source.stop();
      }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = config.volume;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const voice = { source, gainNode };
    registerVoice(name, voice);
    source.onended = () => cleanupVoice(name, voice);
    source.start();
    return true;
  }

  function startBufferedLoop(name, config, buffer) {
    const audioContext = ensureContext();
    if (audioContext.state !== "running" || loopStates.has(name)) {
      return false;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = config.volume;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    loopStates.set(name, { source, gainNode });
    source.onended = () => {
      if (loopStates.get(name)?.source === source) {
        loopStates.delete(name);
      }
    };
    source.start();
    return true;
  }

  function flushPendingSound(name) {
    if (!enabled) {
      return;
    }

    const config = SOUND_LIBRARY[name];
    const buffer = buffers.get(name);
    if (!config || !buffer) {
      return;
    }

    if (config.loop) {
      if (pendingLoops.has(name) && startBufferedLoop(name, config, buffer)) {
        pendingLoops.delete(name);
      }
      return;
    }

    let pendingCount = pendingOneShots.get(name) || 0;
    while (pendingCount > 0) {
      if (!playBuffered(name, config, buffer)) {
        pendingOneShots.set(name, pendingCount);
        return;
      }
      pendingCount -= 1;
    }
    pendingOneShots.delete(name);
  }

  function flushPendingAudio() {
    for (const name of pendingLoops) {
      flushPendingSound(name);
    }
    for (const name of pendingOneShots.keys()) {
      flushPendingSound(name);
    }
  }

  async function loadBuffer(name, config) {
    const audioContext = ensureContext();
    try {
      const arrayBuffer = await loadArrayBuffer(config.src);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      buffers.set(name, audioBuffer);
      flushPendingSound(name);
    } catch (error) {
      console.error(`Failed to load sound "${name}"`, error);
    }
  }

  function primeBuffers() {
    if (loadingStarted) {
      return;
    }
    loadingStarted = true;
    for (const [name, config] of Object.entries(SOUND_LIBRARY)) {
      loadBuffer(name, config);
    }
  }

  function enable() {
    enabled = true;
    primeBuffers();
    ensureContext()
      .resume()
      .then(() => {
        flushPendingAudio();
      })
      .catch(() => {});
  }

  function registerVoice(name, voice) {
    const voices = activeVoices.get(name) || [];
    voices.push(voice);
    activeVoices.set(name, voices);
  }

  function cleanupVoice(name, voice) {
    const voices = activeVoices.get(name);
    if (!voices) {
      return;
    }
    const index = voices.indexOf(voice);
    if (index !== -1) {
      voices.splice(index, 1);
    }
    if (!voices.length) {
      activeVoices.delete(name);
    }
  }

  function play(name) {
    if (!enabled) {
      return;
    }
    const config = SOUND_LIBRARY[name];
    if (!config) {
      return;
    }
    const now = performance.now();
    const minInterval = config.minInterval || 0;
    const lastTime = lastPlayedAt.get(name) || -Infinity;
    if (now - lastTime < minInterval) {
      return;
    }
    lastPlayedAt.set(name, now);
    if (config.loop) {
      startLoop(name);
      return;
    }
    const buffer = buffers.get(name);
    if (!buffer || !playBuffered(name, config, buffer)) {
      const pendingCount = pendingOneShots.get(name) || 0;
      pendingOneShots.set(name, Math.min(pendingCount + 1, config.maxVoices || 1));
      return;
    }
  }

  function startLoop(name) {
    if (!enabled) {
      return;
    }
    const config = SOUND_LIBRARY[name];
    const buffer = buffers.get(name);
    if (!config) {
      return;
    }

    if (!buffer || !startBufferedLoop(name, config, buffer)) {
      pendingLoops.add(name);
    }
  }

  function stopLoop(name) {
    pendingLoops.delete(name);
    const loop = loopStates.get(name);
    if (!loop) {
      return;
    }
    loop.source.onended = null;
    loop.source.stop();
    loopStates.delete(name);
  }

  function stopAllLoops() {
    for (const name of loopStates.keys()) {
      stopLoop(name);
    }
  }

  return {
    enable,
    play,
    startLoop,
    stopLoop,
    stopAllLoops,
  };
}

function createHtmlAudioManager() {
  const soundPools = new Map();
  const loopStates = new Map();
  const lastPlayedAt = new Map();
  let enabled = false;

  if (!AUDIO_ENABLED) {
    return {
      enable() {},
      play() {},
      startLoop() {},
      stopLoop() {},
      stopAllLoops() {},
    };
  }

  for (const [name, config] of Object.entries(SOUND_LIBRARY)) {
    if (config.loop) {
      const element = new Audio(config.src);
      element.preload = "auto";
      element.volume = config.volume;
      element.loop = true;
      loopStates.set(name, element);
      continue;
    }

    const poolSize = config.maxVoices || 1;
    const pool = [];
    for (let i = 0; i < poolSize; i += 1) {
      const element = new Audio(config.src);
      element.preload = "auto";
      element.volume = config.volume;
      pool.push(element);
    }
    soundPools.set(name, pool);
  }

  function enable() {
    if (enabled) {
      return;
    }
    enabled = true;
    for (const pool of soundPools.values()) {
      for (const element of pool) {
        element.load();
      }
    }
    for (const element of loopStates.values()) {
      element.load();
    }
  }

  function play(name) {
    if (!enabled) {
      return;
    }
    const config = SOUND_LIBRARY[name];
    if (!config) {
      return;
    }
    const now = performance.now();
    const minInterval = config.minInterval || 0;
    const lastTime = lastPlayedAt.get(name) || -Infinity;
    if (now - lastTime < minInterval) {
      return;
    }
    lastPlayedAt.set(name, now);
    if (config.loop) {
      startLoop(name);
      return;
    }

    const pool = soundPools.get(name);
    if (!pool || !pool.length) {
      return;
    }

    let voice = pool.find((element) => element.paused || element.ended);
    if (!voice) {
      voice = pool[0];
      voice.pause();
    }
    voice.currentTime = 0;
    voice.play().catch(() => {});
  }

  function startLoop(name) {
    if (!enabled) {
      return;
    }
    const loop = loopStates.get(name);
    if (!loop) {
      return;
    }
    if (!loop.paused) {
      return;
    }
    loop.currentTime = 0;
    loop.play().catch(() => {});
  }

  function stopLoop(name) {
    const loop = loopStates.get(name);
    if (!loop) {
      return;
    }
    loop.pause();
    loop.currentTime = 0;
  }

  function stopAllLoops() {
    for (const name of loopStates.keys()) {
      stopLoop(name);
    }
  }

  return {
    enable,
    play,
    startLoop,
    stopLoop,
    stopAllLoops,
  };
}

function resetGame(mode = "running") {
  audio.stopAllLoops();
  state = createInitialState();
  state.highScore = sessionHighScore;
  state.mode = mode;
  buildWave(true);
}

function startCountdown() {
  state.mode = "countdown";
  state.countdownValue = 3;
  state.countdownTimer = 60;
  audio.stopAllLoops();
  audio.play("countdownBeep");
}

function buildWave(fullReset = false) {
  const startOffsetRows = Math.min(state.level - 1, 8);
  const startX = 130;
  const startY = 138 + startOffsetRows * 16;
  const colSpacing = 54;
  const rowSpacing = 44;
  const rows = ["squid", "crab", "crab", "octopus", "octopus"];
  const columns = state.level === 1 ? 8 : 11;
  const aliens = [];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      aliens.push({
        row,
        col,
        type: rows[row],
        x: startX + col * colSpacing,
        y: startY + row * rowSpacing,
        width: 30,
        height: 24,
        alive: true,
        points: row === 0 ? 30 : row < 3 ? 20 : 10,
      });
    }
  }

  state.aliens = aliens;
  state.waveAlienTotal = aliens.length;
  state.aliveAlienCount = aliens.length;
  state.bottomAlienByColumn = Array.from({ length: columns }, (_, col) => aliens[(rows.length - 1) * columns + col]);
  state.alienDirection = 1;
  state.alienMoveAccumulator = 0;
  state.alienStepSoundIndex = 0;
  state.hitPause = 0;
  state.waveClearTimer = 0;
  state.playerShots = [];
  state.enemyShots = [];
  state.explosions = [];
  state.ufo = null;
  state.ufoTimer = 420 + Math.max(0, 900 - state.level * 48);
  state.plungerIndex = 0;
  state.squigglyIndex = 0;
  if (fullReset) {
    state.player.x = WIDTH / 2;
  }
  state.player.alive = true;
  if (!state.shields.length || fullReset) {
    createShields();
  } else {
    createShields();
  }
}

function createShields() {
  state.shields = SHIELD_POSITIONS.map((x) => {
    const shield = {
      x,
      y: PLAY_BOTTOM - 118,
      pixel: 4,
      cells: SHIELD_MASK.map((row) => row.slice()),
      layer: createRenderLayer(SHIELD_MASK[0].length * 4, SHIELD_MASK.length * 4),
      dirty: true,
    };
    renderShieldLayer(shield);
    return shield;
  });
}

function getAlienBounds() {
  if (!state.aliveAlienCount) {
    return null;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const alien of state.aliens) {
    if (!alien.alive) {
      continue;
    }
    minX = Math.min(minX, alien.x);
    maxX = Math.max(maxX, alien.x + alien.width);
    minY = Math.min(minY, alien.y);
    maxY = Math.max(maxY, alien.y + alien.height);
  }
  return { minX, maxX, minY, maxY };
}

function getAlienStepInterval() {
  const alive = state.aliveAlienCount;
  if (!alive) {
    return 0;
  }
  const levelFactor = Math.max(0.55, 1 - Math.min(state.level - 1, 8) * 0.06);
  const density = alive / Math.max(1, state.waveAlienTotal || 55);
  let interval = 44 * density * density * levelFactor + 2;
  if (alive === 1 && state.alienDirection === 1) {
    interval *= 0.66;
  }
  return Math.max(1, interval);
}

function updateAliens() {
  if (state.hitPause > 0) {
    state.hitPause -= 1;
    return;
  }

  if (!state.aliveAlienCount) {
    if (!state.waveClearTimer) {
      state.waveClearTimer = 70;
    }
    return;
  }

  state.alienMoveAccumulator += 1;
  const stepInterval = getAlienStepInterval();
  if (state.alienMoveAccumulator < stepInterval) {
    return;
  }
  state.alienMoveAccumulator = 0;
  state.alienAnimFrame = (state.alienAnimFrame + 1) % 2;

  const bounds = getAlienBounds();
  const stepX = 10;
  const dropY = 18;
  let hitWall = false;

  if (state.alienDirection === 1 && bounds.maxX + stepX >= PLAY_RIGHT) {
    hitWall = true;
  }
  if (state.alienDirection === -1 && bounds.minX - stepX <= PLAY_LEFT) {
    hitWall = true;
  }

  if (hitWall) {
    for (const alien of state.aliens) {
      if (!alien.alive) {
        continue;
      }
      alien.y += dropY;
    }
    state.alienDirection *= -1;
  } else {
    for (const alien of state.aliens) {
      if (!alien.alive) {
        continue;
      }
      alien.x += stepX * state.alienDirection;
    }
  }

  state.alienStepSoundIndex = (state.alienStepSoundIndex % 4) + 1;
  audio.play(`alienStep${state.alienStepSoundIndex}`);
  erodeShieldsFromAlienContact();
}

function erodeShieldsFromAlienContact() {
  for (const alien of state.aliens) {
    if (!alien.alive) {
      continue;
    }
    for (const shield of state.shields) {
      const sx2 = shield.x + shield.cells[0].length * shield.pixel;
      const sy2 = shield.y + shield.cells.length * shield.pixel;
      if (
        alien.x + alien.width > shield.x &&
        alien.x < sx2 &&
        alien.y + alien.height > shield.y &&
        alien.y < sy2
      ) {
        const impactX = Math.max(shield.x + 8, Math.min(alien.x + alien.width / 2, sx2 - 8));
        erodeShield(shield, impactX, shield.y + 8, 10, 6);
      }
    }
  }
}

function firePlayerShot() {
  if (
    state.mode !== "running" ||
    !state.player.alive ||
    state.waveClearTimer > 0 ||
    state.respawnTimer > 0 ||
    state.playerFireCooldown > 0
  ) {
    return;
  }
  state.shotCounter += 1;
  state.playerShots.push({
    x: state.player.x,
    y: state.player.y - 14,
    width: 4,
    height: 14,
    dy: -PLAYER_SHOT_SPEED,
    from: "player",
  });
  state.playerFireCooldown = PLAYER_FIRE_COOLDOWN;
  audio.play("playerShoot");
}

function spawnEnemyShot(type) {
  if (state.enemyShots.some((shot) => shot.type === type)) {
    return;
  }
  if (!state.aliveAlienCount) {
    return;
  }

  let targetColumn = null;

  if (type === "rolling") {
    let bestCol = null;
    let bestDist = Infinity;
    for (let col = 0; col < state.bottomAlienByColumn.length; col += 1) {
      const alien = getBottomAlienInColumn(col);
      if (!alien) {
        continue;
      }
      const dist = Math.abs(alien.x + alien.width / 2 - state.player.x);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = col;
      }
    }
    targetColumn = bestCol;
  } else if (type === "plunger") {
    targetColumn = findNextLiveColumn(PLUNGER_SEQUENCE, "plungerIndex");
  } else {
    targetColumn = findNextLiveColumn(SQUIGGLY_SEQUENCE, "squigglyIndex");
  }

  if (targetColumn == null) {
    return;
  }
  const source = getBottomAlienInColumn(targetColumn);
  if (!source) {
    return;
  }

  state.enemyShots.push({
    x: source.x + source.width / 2,
    y: source.y + source.height + 2,
    width: 6,
    height: 16,
    dy: ENEMY_SHOT_SPEED + (type === "rolling" ? 0.2 : type === "squiggly" ? 0.45 : 0),
    from: "enemy",
    type,
    wiggle: 0,
  });
  audio.play("alienShoot");
}

function findNextLiveColumn(sequence, key) {
  for (let tries = 0; tries < sequence.length; tries += 1) {
    const index = state[key] % sequence.length;
    const column = sequence[index] - 1;
    state[key] += 1;
    if (getBottomAlienInColumn(column)) {
      return column;
    }
  }
  return null;
}

function getBottomAlienInColumn(column) {
  return state.bottomAlienByColumn[column] || null;
}

function updateEnemyFire() {
  if (!state.aliveAlienCount) {
    return;
  }
  const density = state.aliveAlienCount / Math.max(1, state.waveAlienTotal || 55);
  let spawnBudget = density > 0.8 ? 0.018 : density > 0.45 ? 0.025 : 0.038;
  if (state.level === 1) {
    spawnBudget *= 0.5;
  }

  if (Math.random() < spawnBudget) {
    spawnEnemyShot("rolling");
  }
  if (Math.random() < spawnBudget * 0.85) {
    spawnEnemyShot("plunger");
  }
  if (Math.random() < spawnBudget * 0.8) {
    spawnEnemyShot("squiggly");
  }
}

function updateShots() {
  const activePlayerShots = [];
  for (const shot of state.playerShots) {
    shot.y += shot.dy;
    if (handleShieldImpact(shot)) {
      continue;
    }
    if (handleAlienHit(shot)) {
      continue;
    }
    if (state.ufo && rectsOverlap(getShotRect(shot), getEntityRect(state.ufo))) {
      addScore(getUfoScore());
      spawnExplosion(state.ufo.x + state.ufo.width / 2, state.ufo.y + state.ufo.height / 2, COLORS.pink, 28);
      audio.stopLoop("ufoLoop");
      audio.play("ufoHit");
      state.ufo = null;
      continue;
    }
    if (shot.y < PLAY_TOP) {
      continue;
    }
    activePlayerShots.push(shot);
  }
  state.playerShots = activePlayerShots;

  for (const shot of state.enemyShots) {
    shot.y += shot.dy;
    if (state.level !== 1 && shot.type === "rolling") {
      const delta = state.player.x - shot.x;
      shot.x += Math.max(-1.1, Math.min(1.1, delta * 0.015));
    }
    if (state.level !== 1 && shot.type === "squiggly") {
      shot.wiggle += 0.25;
      shot.x += Math.sin(shot.wiggle) * 1.5;
    }
  }

  resolveShotCollisions();

  const remaining = [];
  for (const shot of state.enemyShots) {
    if (handleShieldImpact(shot)) {
      continue;
    }
    if (state.player.alive && rectsOverlap(getShotRect(shot), getPlayerRect())) {
      destroyPlayer();
      continue;
    }
    if (shot.y > PLAY_BOTTOM + 14) {
      continue;
    }
    remaining.push(shot);
  }
  state.enemyShots = remaining;
}

function resolveShotCollisions() {
  if (!state.playerShots.length) {
    return;
  }

  const playerSurvivors = [];
  const enemyConsumed = new Set();

  for (const playerShot of state.playerShots) {
    const shotRect = getShotRect(playerShot);
    let cancelled = false;
    for (let i = 0; i < state.enemyShots.length; i += 1) {
      if (enemyConsumed.has(i)) {
        continue;
      }
      const enemyShot = state.enemyShots[i];
      if (rectsOverlap(shotRect, getShotRect(enemyShot))) {
        spawnExplosion(enemyShot.x, enemyShot.y, COLORS.cyan, 10);
        enemyConsumed.add(i);
        cancelled = true;
        break;
      }
    }
    if (!cancelled) {
      playerSurvivors.push(playerShot);
    }
  }
  state.playerShots = playerSurvivors;
  state.enemyShots = state.enemyShots.filter((_, index) => !enemyConsumed.has(index));
}

function handleAlienHit(shot) {
  const shotRect = getShotRect(shot);
  for (const alien of state.aliens) {
    if (alien.alive && rectsOverlap(shotRect, getEntityRect(alien))) {
      alien.alive = false;
      state.aliveAlienCount -= 1;
      if (state.bottomAlienByColumn[alien.col] === alien) {
        refreshBottomAlienInColumn(alien.col);
      }
      addScore(alien.points);
      state.hitPause = HIT_PAUSE_FRAMES;
      spawnExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, COLORS.green, 18);
      audio.play("alienHit");
      return true;
    }
  }
  return false;
}

function destroyPlayer() {
  if (!state.player.alive) {
    return;
  }
  state.player.alive = false;
  state.playerShots = [];
  state.lives -= 1;
  state.respawnTimer = RESPAWN_FRAMES;
  spawnExplosion(state.player.x, state.player.y, COLORS.red, 26);
  audio.stopLoop("ufoLoop");
  audio.play("playerHit");
  if (state.lives <= 0) {
    enterGameOver();
  }
}

function updateRespawn() {
  if (state.player.alive || state.mode !== "running") {
    return;
  }
  if (state.lives <= 0) {
    enterGameOver();
    return;
  }
  if (state.respawnTimer > 0) {
    state.respawnTimer -= 1;
    if (state.respawnTimer === 0) {
      state.player.alive = true;
      state.player.x = WIDTH / 2;
    }
  }
}

function updatePlayer() {
  if (!state.player.alive || state.mode !== "running") {
    return;
  }
  if (keys.left) {
    state.player.x -= PLAYER_SPEED;
  }
  if (keys.right) {
    state.player.x += PLAYER_SPEED;
  }
  const half = state.player.width / 2;
  state.player.x = Math.max(PLAY_LEFT + half, Math.min(PLAY_RIGHT - half, state.player.x));
}

function updatePlayerFire() {
  if (state.playerFireCooldown > 0) {
    state.playerFireCooldown -= 1;
  }
  if (keys.fire) {
    firePlayerShot();
  }
}

function updateUfo() {
  if (state.ufo) {
    state.ufo.x += state.ufo.dx;
    if (state.ufo.x > PLAY_RIGHT + 60 || state.ufo.x + state.ufo.width < PLAY_LEFT - 60) {
      audio.stopLoop("ufoLoop");
      state.ufo = null;
      state.ufoTimer = UFO_BASE_FRAMES - Math.min(state.level, 9) * 42;
    }
    return;
  }

  state.ufoTimer -= 1;
  if (state.ufoTimer <= 0) {
    const fromLeft = Math.random() > 0.5;
    state.ufo = {
      x: fromLeft ? PLAY_LEFT - 64 : PLAY_RIGHT + 8,
      y: PLAY_TOP + 8,
      width: 56,
      height: 24,
      dx: fromLeft ? 2.1 : -2.1,
    };
    state.ufoTimer = UFO_BASE_FRAMES - Math.min(state.level, 9) * 38;
    audio.startLoop("ufoLoop");
  }
}

function getUfoScore() {
  const mod = state.shotCounter % 15;
  if (mod === 0 || mod === 14) {
    return 300;
  }
  return UFO_SCORE_TABLE[mod];
}

function addScore(points) {
  state.score += points;
  state.highScore = Math.max(state.highScore, state.score);
  sessionHighScore = Math.max(sessionHighScore, state.highScore);
  if (!state.bonusLifeGiven && state.score >= 1500) {
    state.bonusLifeGiven = true;
    state.lives += 1;
    spawnExplosion(WIDTH / 2, PLAY_TOP + 30, COLORS.gold, 34);
    audio.play("extraLife");
  }
}

function updateWaveFlow() {
  if (state.waveClearTimer > 0) {
    state.waveClearTimer -= 1;
    if (state.waveClearTimer === 0) {
      state.level += 1;
      buildWave(false);
      audio.play("waveStart");
    }
  }
}

function updateExplosions() {
  for (const boom of state.explosions) {
    boom.life -= 1;
    boom.radius *= 0.98;
  }
  state.explosions = state.explosions.filter((boom) => boom.life > 0);
}

function updateControlsScreen() {
  state.controlsTimer += 1;
  if (state.controlsChars < CONTROLS_TEXT.length && state.controlsTimer % 2 === 0) {
    state.controlsChars += 1;
  }
}

function updateCountdown() {
  if (state.countdownTimer > 0) {
    state.countdownTimer -= 1;
    return;
  }
  state.countdownValue -= 1;
  if (state.countdownValue <= 0) {
    state.mode = "running";
    audio.play("countdownGo");
    audio.play("waveStart");
    return;
  }
  state.countdownTimer = 60;
  audio.play("countdownBeep");
}

function spawnExplosion(x, y, color, radius) {
  state.explosions.push({ x, y, color, radius, life: 20 });
}

function checkGameOverConditions() {
  for (const alien of state.aliens) {
    if (!alien.alive) {
      continue;
    }
    if (alien.y + alien.height >= GROUND_Y) {
      enterGameOver();
      return;
    }
  }
}

function enterGameOver() {
  if (state.mode === "gameover") {
    return;
  }
  audio.stopAllLoops();
  audio.play("gameOver");
  state.mode = "gameover";
  window.ArcadeHighScores?.promptAndSubmit("space-invaders", state.score);
}

function handleShieldImpact(shot) {
  for (const shield of state.shields) {
    if (shieldImpact(shield, shot)) {
      return true;
    }
  }
  return false;
}

function shieldImpact(shield, shot) {
  const pixel = shield.pixel;
  const rows = shield.cells.length;
  const cols = shield.cells[0].length;
  const sx = shot.x;
  const sy = shot.from === "player" ? shot.y : shot.y + shot.height;
  const localX = Math.floor((sx - shield.x) / pixel);
  const localY = Math.floor((sy - shield.y) / pixel);

  if (localX < 0 || localY < 0 || localX >= cols || localY >= rows) {
    return false;
  }
  if (!shield.cells[localY][localX]) {
    return false;
  }

  const direction = shot.from === "player" ? -1 : 1;
  erodeShield(shield, sx, sy, shot.from === "player" ? 8 : 10, direction);
  spawnExplosion(sx, sy, COLORS.orange, 10);
  audio.play("shieldHit");
  return true;
}

function erodeShield(shield, x, y, radius, direction) {
  const pixel = shield.pixel;
  const cx = (x - shield.x) / pixel;
  const cy = (y - shield.y) / pixel;
  let changed = false;
  for (let row = 0; row < shield.cells.length; row += 1) {
    for (let col = 0; col < shield.cells[row].length; col += 1) {
      if (!shield.cells[row][col]) {
        continue;
      }
      const dx = col - cx;
      const dy = row - cy;
      const bias = direction * dy;
      if (dx * dx + dy * dy < (radius / pixel) * (radius / pixel) && bias > -2.6) {
        shield.cells[row][col] = false;
        changed = true;
      }
    }
  }
  if (changed) {
    shield.dirty = true;
  }
}

function getShotRect(shot) {
  return {
    x: shot.x - shot.width / 2,
    y: shot.y,
    width: shot.width,
    height: shot.height,
  };
}

function getEntityRect(entity) {
  return {
    x: entity.x,
    y: entity.y,
    width: entity.width,
    height: entity.height,
  };
}

function getPlayerRect() {
  return {
    x: state.player.x - state.player.width / 2,
    y: state.player.y - state.player.height / 2,
    width: state.player.width,
    height: state.player.height,
  };
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update() {
  if (state.mode === "controls") {
    updateControlsScreen();
    updateExplosions();
    return;
  }

  if (state.mode === "countdown") {
    updateCountdown();
    updateExplosions();
    return;
  }

  if (state.mode !== "running") {
    updateExplosions();
    return;
  }

  state.frame += 1;
  updatePlayer();
  updatePlayerFire();
  updateAliens();
  updateEnemyFire();
  updateShots();
  updateUfo();
  updateRespawn();
  updateWaveFlow();
  updateExplosions();
  checkGameOverConditions();
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackdrop();
  if (state.mode === "title" || state.mode === "controls") {
    drawPlayfield();
  } else {
    drawHud();
    drawPlayfield();
    drawShields();
    drawAliens();
    drawUfo();
    drawPlayer();
    drawShots();
    drawExplosions();
  }
  drawOverlay();
}

function drawBackdrop() {
  ctx.drawImage(backdropLayer, 0, 0);
}

function drawHud() {
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 22px ${FONT_UI}`;
  ctx.fillText(`SCORE ${String(state.score).padStart(4, "0")}`, PLAY_LEFT, 38);
  ctx.fillText(`HI ${String(state.highScore).padStart(4, "0")}`, WIDTH / 2 - 56, 38);
  ctx.fillText(`LEVEL ${state.level}`, PLAY_RIGHT - 120, 38);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `16px ${FONT_UI}`;
  ctx.fillText(`LIVES LEFT: ${Math.max(state.lives, 0)}`, PLAY_LEFT, 62);
  ctx.fillText(`SHOT ${state.shotCounter}`, WIDTH / 2 - 46, 62);
  ctx.fillText(`UFO ${getUfoScore()} pts`, PLAY_RIGHT - 118, 62);

  const displayLives = Math.max(state.lives, 0);
  for (let i = 0; i < displayLives; i += 1) {
    drawPattern(ALIEN_PATTERNS.player[0], PLAY_LEFT + 132 + i * 30, 47, 3, COLORS.gold);
  }
}

function drawPlayfield() {
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP);
}

function drawAliens() {
  for (const alien of state.aliens) {
    if (!alien.alive) {
      continue;
    }
    const color = alien.type === "squid" ? COLORS.cyan : alien.type === "crab" ? COLORS.pink : COLORS.green;
    drawPattern(ALIEN_PATTERNS[alien.type][state.alienAnimFrame], alien.x, alien.y, 5, color);
  }
}

function drawUfo() {
  if (!state.ufo) {
    return;
  }
  drawPattern(ALIEN_PATTERNS.ufo[0], state.ufo.x, state.ufo.y, 7, COLORS.red);
}

function drawPlayer() {
  if (!state.player.alive && state.mode === "running") {
    return;
  }
  drawPattern(
    ALIEN_PATTERNS.player[0],
    state.player.x - 14,
    state.player.y - 10,
    4,
    COLORS.gold
  );
}

function drawShots() {
  for (const shot of state.playerShots) {
    drawShot(shot, COLORS.gold);
  }
  for (const shot of state.enemyShots) {
    const color = shot.type === "rolling" ? COLORS.red : shot.type === "plunger" ? COLORS.cyan : COLORS.pink;
    drawShot(shot, color);
  }
}

function drawShot(shot, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(shot.x - shot.width / 2),
    Math.round(shot.y),
    shot.width,
    shot.height
  );
}

function drawShields() {
  for (const shield of state.shields) {
    if (shield.dirty) {
      renderShieldLayer(shield);
    }
    ctx.drawImage(shield.layer, shield.x, shield.y);
  }
}

function drawExplosions() {
  for (const boom of state.explosions) {
    ctx.globalAlpha = boom.life / 20;
    ctx.strokeStyle = boom.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      Math.round(boom.x),
      Math.round(boom.y),
      boom.radius * (1 - boom.life / 30),
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawOverlay() {
  if (state.mode === "title") {
    drawTitleScreen();
    return;
  }

  if (state.mode === "controls") {
    drawControlsScreen();
    return;
  }

  if (state.mode === "countdown") {
    drawCountdownScreen();
    return;
  }

  if (state.mode === "running") {
    if (state.waveClearTimer > 0) {
      drawCenterCard("WAVE CLEARED", `Preparing level ${state.level + 1}`);
    }
    if (!state.player.alive && state.lives > 0) {
      drawCenterCard("CANNON DESTROYED", "Aliens keep moving during respawn");
    }
    return;
  }

  if (state.mode === "paused") {
    drawCenterCard("PAUSED", "Press P to resume");
    return;
  }

  if (state.mode === "gameover") {
    drawCenterCard("GAME OVER", `Final score ${state.score}. Press Enter to restart.`);
  }
}

function drawCenterCard(title, subtitle) {
  ctx.fillStyle = "rgba(3, 7, 16, 0.82)";
  ctx.fillRect(190, 250, WIDTH - 380, 170);
  ctx.strokeStyle = "rgba(98, 232, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(190, 250, WIDTH - 380, 170);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 38px ${FONT_DISPLAY}`;
  ctx.fillText(title, WIDTH / 2, 320);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `20px ${FONT_UI}`;
  ctx.fillText(subtitle, WIDTH / 2, 362);
  ctx.textAlign = "left";
}

function drawTitleScreen() {
  ctx.fillStyle = "rgba(2, 5, 11, 0.6)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawPattern(ALIEN_PATTERNS.squid[0], 176, 144, 12, COLORS.cyan);
  drawPattern(ALIEN_PATTERNS.crab[0], 396, 124, 14, COLORS.pink);
  drawPattern(ALIEN_PATTERNS.octopus[0], 652, 150, 13, COLORS.green);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.pink;
  ctx.font = `700 76px ${FONT_DISPLAY}`;
  ctx.fillText("SPACE INVADERS", WIDTH / 2, 282);

  ctx.fillStyle = "rgba(5, 12, 24, 0.86)";
  ctx.fillRect(182, 418, WIDTH - 364, 132);
  ctx.strokeStyle = "rgba(98, 232, 255, 0.34)";
  ctx.lineWidth = 2;
  ctx.strokeRect(182, 418, WIDTH - 364, 132);

  ctx.fillStyle = COLORS.gold;
  ctx.font = `700 40px ${FONT_DISPLAY}`;
  ctx.fillText("Press Enter", WIDTH / 2, 470);

  ctx.fillStyle = COLORS.text;
  ctx.font = `24px ${FONT_UI}`;
  ctx.fillText("to view controls", WIDTH / 2, 512);
  ctx.textAlign = "left";
}

function drawControlsScreen() {
  ctx.fillStyle = "rgba(2, 5, 11, 0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(4, 11, 22, 0.92)";
  ctx.fillRect(106, 86, WIDTH - 212, HEIGHT - 172);
  ctx.strokeStyle = "rgba(98, 232, 255, 0.36)";
  ctx.lineWidth = 2;
  ctx.strokeRect(106, 86, WIDTH - 212, HEIGHT - 172);

  ctx.fillStyle = COLORS.cyan;
  ctx.font = `700 24px ${FONT_DISPLAY}`;
  ctx.fillText("Controls", 142, 126);

  ctx.fillStyle = COLORS.pink;
  ctx.font = `700 44px ${FONT_DISPLAY}`;
  ctx.fillText("Pilot Input", 142, 186);

  drawBriefingArt("controls");

  ctx.fillStyle = COLORS.text;
  ctx.font = `26px ${FONT_UI}`;
  drawTypewriterText(CONTROLS_TEXT.slice(0, state.controlsChars), 142, 254, 400, 34);

  const done = state.controlsChars >= CONTROLS_TEXT.length;
  ctx.fillStyle = done ? COLORS.gold : COLORS.muted;
  ctx.font = `22px ${FONT_UI}`;
  ctx.fillText(
    done ? "Press Enter to begin countdown" : "Loading controls...",
    142,
    HEIGHT - 126
  );
}

function drawBriefingArt(art) {
  const panelX = 584;
  const panelY = 214;
  const panelW = 236;
  const panelH = 250;

  ctx.fillStyle = "rgba(10, 17, 31, 0.95)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  if (art === "controls") {
    drawKeycap(panelX + 34, panelY + 38, "A");
    drawKeycap(panelX + 92, panelY + 38, "D");
    drawKeycap(panelX + 148, panelY + 38, "SPACE", 54);
    drawPattern(ALIEN_PATTERNS.player[0], panelX + 84, panelY + 118, 7, COLORS.gold);
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(panelX + 56, panelY + 150);
    ctx.lineTo(panelX + 26, panelY + 150);
    ctx.moveTo(panelX + 180, panelY + 150);
    ctx.lineTo(panelX + 210, panelY + 150);
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(panelX + 116, panelY + 82, 5, 42);
  } else if (art === "shields") {
    drawPattern(ALIEN_PATTERNS.octopus[0], panelX + 92, panelY + 24, 7, COLORS.green);
    drawMiniShield(panelX + 40, panelY + 128);
    drawMiniShield(panelX + 128, panelY + 128);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(panelX + 86, panelY + 64, 5, 64);
    ctx.fillRect(panelX + 150, panelY + 180, 5, 44);
  } else if (art === "threats") {
    drawPattern(ALIEN_PATTERNS.squid[1], panelX + 36, panelY + 54, 8, COLORS.cyan);
    drawPattern(ALIEN_PATTERNS.crab[1], panelX + 124, panelY + 54, 8, COLORS.pink);
    drawPattern(ALIEN_PATTERNS.ufo[0], panelX + 64, panelY + 154, 8, COLORS.red);
    ctx.fillStyle = COLORS.gold;
    ctx.font = `700 30px ${FONT_DISPLAY}`;
    ctx.fillText("300", panelX + 148, panelY + 204);
  }
}

function drawMiniShield(x, y) {
  for (let row = 0; row < SHIELD_MASK.length; row += 1) {
    for (let col = 0; col < SHIELD_MASK[row].length; col += 1) {
      if (SHIELD_MASK[row][col]) {
        ctx.fillStyle = COLORS.green;
        ctx.fillRect(x + col * 2, y + row * 2, 2, 2);
      }
    }
  }
}

function drawKeycap(x, y, label, width = 34) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(x, y, width, 34);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeRect(x, y, width, 34);
  ctx.fillStyle = COLORS.text;
  ctx.font = `20px ${FONT_UI}`;
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, y + 23);
  ctx.textAlign = "left";
}

function drawTypewriterText(text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split("\n");
  let currentY = y;
  for (const paragraph of paragraphs) {
    if (paragraph === "") {
      currentY += lineHeight;
      continue;
    }
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  }
}

function drawCountdownScreen() {
  ctx.fillStyle = "rgba(2, 5, 11, 0.5)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.cyan;
  ctx.font = `700 34px ${FONT_DISPLAY}`;
  ctx.fillText("Prepare to Engage", WIDTH / 2, 196);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `700 180px ${FONT_DISPLAY}`;
  ctx.fillText(String(state.countdownValue), WIDTH / 2, 408);
  ctx.fillStyle = COLORS.text;
  ctx.font = `28px ${FONT_UI}`;
  ctx.fillText("Alien formation locked. Countdown to launch.", WIDTH / 2, 472);
  ctx.textAlign = "left";
}

function drawPattern(pattern, x, y, scale, color) {
  ctx.fillStyle = color;
  const baseX = Math.round(x);
  const baseY = Math.round(y);
  for (let row = 0; row < pattern.length; row += 1) {
    for (let col = 0; col < pattern[row].length; col += 1) {
      if (pattern[row][col] === "1") {
        ctx.fillRect(baseX + col * scale, baseY + row * scale, scale, scale);
      }
    }
  }
}

function createRenderLayer(width, height) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  return layer;
}

function renderBackdropLayer() {
  const gradient = backdropCtx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#040914");
  gradient.addColorStop(1, "#010205");
  backdropCtx.fillStyle = gradient;
  backdropCtx.fillRect(0, 0, WIDTH, HEIGHT);

  backdropCtx.strokeStyle = COLORS.grid;
  backdropCtx.lineWidth = 1;
  for (let x = PLAY_LEFT; x <= PLAY_RIGHT; x += 48) {
    backdropCtx.beginPath();
    backdropCtx.moveTo(x, PLAY_TOP);
    backdropCtx.lineTo(x, PLAY_BOTTOM);
    backdropCtx.stroke();
  }
  for (let y = PLAY_TOP; y <= PLAY_BOTTOM; y += 42) {
    backdropCtx.beginPath();
    backdropCtx.moveTo(PLAY_LEFT, y);
    backdropCtx.lineTo(PLAY_RIGHT, y);
    backdropCtx.stroke();
  }

  backdropCtx.strokeStyle = "rgba(140, 255, 140, 0.55)";
  backdropCtx.lineWidth = 3;
  backdropCtx.beginPath();
  backdropCtx.moveTo(PLAY_LEFT, GROUND_Y);
  backdropCtx.lineTo(PLAY_RIGHT, GROUND_Y);
  backdropCtx.stroke();
}

function renderShieldLayer(shield) {
  const layerCtx = shield.layer.getContext("2d");
  layerCtx.clearRect(0, 0, shield.layer.width, shield.layer.height);
  layerCtx.fillStyle = COLORS.green;
  for (let row = 0; row < shield.cells.length; row += 1) {
    for (let col = 0; col < shield.cells[row].length; col += 1) {
      if (!shield.cells[row][col]) {
        continue;
      }
      layerCtx.fillRect(col * shield.pixel, row * shield.pixel, shield.pixel, shield.pixel);
    }
  }
  shield.dirty = false;
}

function refreshBottomAlienInColumn(column) {
  let result = null;
  for (const alien of state.aliens) {
    if (alien.alive && alien.col === column && (!result || alien.row > result.row)) {
      result = alien;
    }
  }
  state.bottomAlienByColumn[column] = result;
}

let lastFrameTime = 0;
let accumulator = 0;

function loop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const frameDelta = Math.min(timestamp - lastFrameTime, MAX_FRAME_DELTA_MS);
  lastFrameTime = timestamp;
  accumulator += frameDelta;

  while (accumulator >= FIXED_TIMESTEP_MS) {
    update();
    accumulator -= FIXED_TIMESTEP_MS;
  }

  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  audio.enable();
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    keys.left = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    keys.right = true;
  }
  if (event.code === "Space") {
    event.preventDefault();
    keys.fire = true;
  }
  if (event.code === "Enter") {
    if (state.mode === "title") {
      resetGame("controls");
    } else if (state.mode === "controls") {
      if (state.controlsChars < CONTROLS_TEXT.length) {
        state.controlsChars = CONTROLS_TEXT.length;
      } else {
        startCountdown();
      }
    } else if (state.mode === "gameover") {
      resetGame("countdown");
      state.countdownValue = 3;
      state.countdownTimer = 60;
    }
  }
  if (event.code === "KeyP") {
    if (state.mode === "running") {
      audio.play("pauseToggle");
      audio.stopAllLoops();
      state.mode = "paused";
    } else if (state.mode === "paused") {
      audio.play("pauseToggle");
      state.mode = "running";
      if (state.ufo) {
        audio.startLoop("ufoLoop");
      }
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    keys.left = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    keys.right = false;
  }
  if (event.code === "Space") {
    keys.fire = false;
  }
});

requestAnimationFrame(loop);
