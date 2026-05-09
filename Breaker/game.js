(function () {
  const WIDTH = 1200;
  const HEIGHT = 800;
  const HUD_LIVES_MAX = 5;
  const PADDLE_Y = HEIGHT - 72;
  const BRICK_W = 60;
  const BRICK_H = 20;
  const BRICK_GAP = 10;
  const GRID_COLS = 14;
  const GRID_X = 130;
  const GRID_Y = 120;
  const GRID_ROWS_MAX = 8;
  const EXIT_ANGLE_CAP = Math.PI * 0.4;
  const MIN_VERTICAL_RATIO = 0.38;
  const SURGE_INTERVAL = 11;
  const SURGE_DURATION = 3.4;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.getElementById("scoreValue");
  const levelValue = document.getElementById("levelValue");
  const livesIcons = document.getElementById("livesIcons");
  const powerBadge = document.getElementById("powerBadge");
  const titleOverlay = document.getElementById("titleOverlay");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const bannerOverlay = document.getElementById("bannerOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const bannerTitle = document.getElementById("bannerTitle");
  const bannerScore = document.getElementById("bannerScore");
  const bannerDetail = document.getElementById("bannerDetail");
  const finalScore = document.getElementById("finalScore");
  const touchHint = document.getElementById("touchHint");

  const rowColors = ["#ff4d6d", "#ff8a3d", "#ffe45e", "#41ead4", "#5aa9ff", "#b66dff", "#ff4de3", "#6df05f"];
  const powerTypes = {
    wide: { label: "Wide Paddle", color: "#00ffff", category: "paddle", duration: 15, weight: 14 },
    sticky: { label: "Sticky Paddle", color: "#f7ff00", category: "paddle", duration: 999, weight: 12 },
    multi: { label: "Multi-ball", color: "#ff00ff", category: "ball", duration: 0, weight: 10 },
    laser: { label: "Laser", color: "#ff4d6d", category: "weapon", duration: 999, weight: 10 },
    fireball: { label: "Fireball", color: "#ff8800", category: "ball", duration: 8, weight: 10 },
    slow: { label: "Slow Ball", color: "#8ef7ff", category: "ball", duration: 10, weight: 12 },
    life: { label: "Extra Life", color: "#00ff00", category: "instant", duration: 0, weight: 6 },
    score: { label: "Score x2", color: "#ffe45e", category: "score", duration: 12, weight: 8 },
  };

  const soundFiles = {
    paddle: "assets/sounds/paddle.wav",
    wall: "assets/sounds/wall.wav",
    brick: "assets/sounds/brick.wav",
    crack: "assets/sounds/crack.wav",
    explode: "assets/sounds/explode.wav",
    power: "assets/sounds/power.wav",
    lose: "assets/sounds/lose.wav",
    laser: "assets/sounds/laser.wav",
    launch: "assets/sounds/launch.wav",
  };

  const state = {
    mode: "title",
    level: 1,
    score: 0,
    submittedScore: false,
    lives: 3,
    bricks: [],
    balls: [],
    capsules: [],
    hazards: [],
    lasers: [],
    particles: [],
    popups: [],
    paddlesPulse: 0,
    flashAlpha: 0,
    warningAlpha: 0,
    dangerPulse: 0,
    surgeTimer: SURGE_INTERVAL,
    surgeRemaining: 0,
    transitionTimer: 0,
    lastTime: 0,
    pointerX: WIDTH / 2,
    keyboardLeft: false,
    keyboardRight: false,
    touchActive: false,
    activePowerups: {},
    endlessSeed: 0,
    stickyHeldBallId: null,
    bannerTimeout: null,
    audioReady: false,
    audioCtx: null,
    soundLibrary: {},
    brickFallOffset: 0,
    rowClearBoosts: 0,
    bossShieldTimer: 0,
    bossShieldPulse: 0,
    controlMode: "mouse",
  };

  const paddle = {
    x: WIDTH / 2,
    y: PADDLE_Y,
    width: 70,
    height: 12,
    speed: 530,
    baseWidth: 70,
    laserShots: 0,
  };

  function updateHud() {
    scoreValue.textContent = Math.floor(state.score);
    levelValue.textContent = state.level;
    livesIcons.innerHTML = "";
    for (let i = 0; i < HUD_LIVES_MAX; i += 1) {
      const icon = document.createElement("span");
      icon.className = `life-icon${i < state.lives ? "" : " empty"}`;
      livesIcons.appendChild(icon);
    }
    updatePowerBadge();
  }

  function updatePowerBadge() {
    const entries = Object.values(state.activePowerups).filter((p) => p.active);
    if (entries.length === 0) {
      powerBadge.classList.add("hidden");
      powerBadge.textContent = "";
      return;
    }

    const priority = entries.sort((a, b) => a.remaining - b.remaining)[0];
    const timer = priority.remaining >= 900 ? "Ready" : `${Math.max(0, priority.remaining).toFixed(1)}s`;
    powerBadge.classList.remove("hidden");
    powerBadge.textContent = `${priority.label} ${timer}`;
  }

  function setMode(mode) {
    state.mode = mode;
    titleOverlay.classList.toggle("hidden", mode !== "title");
    pauseOverlay.classList.toggle("hidden", mode !== "paused");
    gameOverOverlay.classList.toggle("hidden", mode !== "gameover");
  }

  function clearBanner() {
    bannerOverlay.classList.add("hidden");
    if (state.bannerTimeout) {
      clearTimeout(state.bannerTimeout);
      state.bannerTimeout = null;
    }
  }

  function showBanner(title, score, detail, duration = 1500) {
    bannerTitle.textContent = title;
    bannerScore.textContent = score;
    bannerDetail.textContent = detail;
    bannerOverlay.classList.remove("hidden");
    if (state.bannerTimeout) {
      clearTimeout(state.bannerTimeout);
    }
    state.bannerTimeout = setTimeout(() => {
      bannerOverlay.classList.add("hidden");
      state.bannerTimeout = null;
    }, duration);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function chooseWeighted(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.id;
      }
    }
    return items[items.length - 1].id;
  }

  function baseBallSpeed(level) {
    if (level === 1) return 340;
    if (level <= 3) return 380;
    if (level <= 5) return 425;
    if (level <= 8) return 470;
    return 520;
  }

  function createBall(x, y, vx, vy, isPrimary = false) {
    const speed = Math.hypot(vx, vy) || baseBallSpeed(state.level);
    return {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      prevX: x,
      prevY: y,
      radius: 10,
      vx,
      vy,
      speed,
      stuck: false,
      stuckOffset: 0,
      trail: [],
      isPrimary,
      fireballUntil: 0,
    };
  }

  function resetBallOnPaddle() {
    state.balls = [createBall(paddle.x, paddle.y - 16, 0, -baseBallSpeed(state.level), true)];
    state.balls[0].stuck = true;
    state.balls[0].stuckOffset = 0;
    state.stickyHeldBallId = state.balls[0].id;
  }

  function startGame() {
    if (state.mode === "gameover") {
      submitGameOverScore();
    }

    state.level = 1;
    state.score = 0;
    state.submittedScore = false;
    state.lives = 3;
    state.capsules = [];
    state.hazards = [];
    state.lasers = [];
    state.particles = [];
    state.popups = [];
    state.activePowerups = {};
    state.endlessSeed = 0;
    paddle.width = paddle.baseWidth;
    paddle.laserShots = 0;
    state.brickFallOffset = 0;
    state.rowClearBoosts = 0;
    state.bossShieldTimer = 5;
    state.bossShieldPulse = 0;
    state.dangerPulse = 0;
    state.surgeTimer = SURGE_INTERVAL;
    state.surgeRemaining = 0;
    state.controlMode = "mouse";
    loadLevel(1);
    resetBallOnPaddle();
    setMode("ready");
    clearBanner();
    updateHud();
  }

  function titleMode() {
    state.controlMode = "mouse";
    setMode("title");
    clearBanner();
  }

  function levelRows(level) {
    if (level === 1) return 4;
    if (level === 2) return 5;
    if (level <= 5) return 6;
    if (level <= 8) return 7;
    if (level === 9) return 7;
    return 7 + (level % 2);
  }

  function newBrick(col, row, type, hpOverride) {
    const x = GRID_X + col * (BRICK_W + BRICK_GAP);
    const y = GRID_Y + row * (BRICK_H + BRICK_GAP);
    const defs = {
      standard: { hp: 1, score: 10, color: rowColors[row % rowColors.length] },
      reinforced: { hp: 2, score: 25, color: shade(rowColors[row % rowColors.length], -0.28) },
      armored: { hp: 3, score: 50, color: "#8b8b8b" },
      explosive: { hp: 1, score: 20, color: "#ff8800" },
      hazard: { hp: 1, score: 18, color: "#ff145f" },
      indestructible: { hp: Infinity, score: 0, color: "#6f7689" },
      host: { hp: 1, score: 10, color: rowColors[row % rowColors.length] },
      moving: { hp: 1, score: 12, color: rowColors[row % rowColors.length] },
      boss: { hp: 20, score: 250, color: "#ff3b3b" },
    };

    const def = defs[type];
    return {
      x,
      y,
      w: type === "boss" ? BRICK_W * 3 + BRICK_GAP * 2 : BRICK_W,
      h: BRICK_H,
      col,
      row,
      type,
      hp: hpOverride || def.hp,
      maxHp: hpOverride || def.hp,
      score: def.score,
      color: def.color,
      alive: true,
      movingDir: Math.random() > 0.5 ? 1 : -1,
      movingSpeed: type === "moving" ? rand(40, 70) : 0,
      shielded: false,
      hostPower: type === "host" ? chooseWeighted(Object.entries(powerTypes).map(([id, value]) => ({ id, weight: value.weight }))) : null,
    };
  }

  function shade(hex, amount) {
    const v = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
    const next = [r, g, b].map((c) => clamp(Math.round(c * (1 + amount)), 0, 255));
    return `rgb(${next[0]}, ${next[1]}, ${next[2]})`;
  }

  function buildPattern(level, rows) {
    const layout = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        let type = "standard";

        if (level === 1 && row === 1 && (col === 3 || col === 10)) {
          type = "host";
        }
        if (level === 1 && row === 2 && (col === 5 || col === 8)) {
          type = "hazard";
        }
        if (level === 2 && (col === 2 || col === 6 || col === 10) && row % 2 === 0) {
          type = "host";
        }
        if (level === 2 && row === 3 && (col === 4 || col === 9)) {
          type = "explosive";
        }
        if (level === 2 && row === 1 && (col === 1 || col === 12)) {
          type = "moving";
        }
        if (level === 3 && (row >= 1 && row <= 3) && col > 2 && col < 11) {
          type = row === 2 ? "host" : "reinforced";
        }
        if (level === 3 && row === 4 && col % 4 === 1) {
          type = "hazard";
        }
        if (level === 4 && (row + col) % 2 === 0) {
          type = "indestructible";
        }
        if (level === 5 && row === 2 && (col === 4 || col === 9)) {
          type = "explosive";
        }
        if (level >= 5 && level < 9 && row === rows - 2 && col % 5 === 2) {
          type = "hazard";
        }
        if (level === 5 && row === 1 && (col === 3 || col === 10)) {
          type = "host";
        }
        if (level === 6 && row <= 1 && col > 3 && col < 10) {
          type = "armored";
        }
        if (level === 6 && row === 3 && (col === 5 || col === 8)) {
          type = "host";
        }
        if (level === 7 && (row === 1 || row === 4) && col > 1 && col < 12) {
          type = col % 2 === 0 ? "moving" : "standard";
        }
        if (level === 8 && (row === 0 || row === 5) && (col < 2 || col > 11)) {
          type = "indestructible";
        }
        if (level === 8 && row === 2 && (col === 4 || col === 9)) {
          type = "host";
        }
        if (level === 9) {
          if (row === 2 && (col < 4 || col > 9)) type = "indestructible";
          if (row === 3 && col >= 5 && col <= 7) continue;
          if (row === 3 && (col === 4 || col === 8)) type = "armored";
          if (row === 1 && (col === 5 || col === 8)) type = "host";
        }
        if (level > 9) {
          const roll = (col * 13 + row * 7 + level * 5 + state.endlessSeed) % 11;
          if (roll === 0) type = "host";
          else if (roll === 1 && level > 10) type = "reinforced";
          else if (roll === 2 && level > 12) type = "armored";
          else if (roll === 3) type = "explosive";
          else if (roll === 4 && row % 2 === 0) type = "moving";
          else if (roll === 5 && row === rows - 1 && col % 3 === 0) type = "indestructible";
          else if (roll === 6) type = "hazard";
        }

        if (level === 1 && row === rows - 1 && col % 4 === 1) {
          continue;
        }
        if (level === 4 && row === 2 && (col === 6 || col === 7)) {
          continue;
        }

        layout.push(newBrick(col, row, type));
      }
    }

    if (level === 9) {
      layout.push(newBrick(5, 3, "boss"));
    }
    return layout;
  }

  function loadLevel(level) {
    state.level = level;
    state.bricks = buildPattern(level, levelRows(level));
    state.capsules = [];
    state.hazards = [];
    state.lasers = [];
    state.particles = [];
    state.popups = [];
    state.activePowerups = {};
    state.stickyHeldBallId = null;
    state.brickFallOffset = 0;
    state.rowClearBoosts = 0;
    state.bossShieldTimer = 5;
    state.bossShieldPulse = 0;
    state.dangerPulse = 0;
    state.surgeTimer = Math.max(5, SURGE_INTERVAL - level * 0.35);
    state.surgeRemaining = 0;
    paddle.width = paddle.baseWidth;
    paddle.laserShots = 0;
    const levelDetail = level === 1
      ? "Warning bricks drop shards"
      : level === 9
        ? "Boss stage"
        : "Prepare to launch";
    showBanner(`Level ${level}`, `L${level}`, levelDetail, 1200);
    updateHud();
  }

  function launchHeldBalls() {
    let released = false;
    for (const ball of state.balls) {
      if (!ball.stuck) continue;
      const relative = clamp((state.pointerX - paddle.x) / (paddle.width / 2), -1, 1);
      const angle = relative * EXIT_ANGLE_CAP;
      ball.speed = effectiveBallSpeed();
      ball.vx = Math.sin(angle) * ball.speed;
      ball.vy = -Math.cos(angle) * ball.speed;
      ball.stuck = false;
      released = true;
    }
    state.stickyHeldBallId = null;
    if (released) playSound("launch");
  }

  function effectiveBallSpeed() {
    let speed = baseBallSpeed(state.level) + state.rowClearBoosts * 16;
    if (state.surgeRemaining > 0) {
      speed *= 1.2;
    }
    if (state.activePowerups.slow?.active) {
      speed *= 0.82;
    }
    return Math.min(speed, 660);
  }

  function addScore(points, x, y) {
    let total = points;
    if (state.activePowerups.score?.active) {
      total *= 2;
    }
    if (state.balls.length > 1) {
      total *= 1.5;
    }
    if (effectiveBallSpeed() > 380) {
      total += 2;
    }
    state.score += total;
    state.popups.push({ x, y, value: Math.floor(total), life: 0.6 });
    updateHud();
  }

  function destroyBrick(brick, impactX, impactY, skipScore = false) {
    brick.alive = false;
    if (!skipScore) {
      addScore(brick.score * state.level, impactX, impactY);
    }
    spawnBrickParticles(brick);
    playSound(brick.type === "explosive" ? "explode" : "brick");

    if (brick.type === "host" && brick.hostPower) {
      spawnCapsule(brick, brick.hostPower);
    }

    if (brick.type === "hazard") {
      spawnHazards(brick);
    }

    if (brick.type === "explosive") {
      for (const other of state.bricks) {
        if (!other.alive || other === brick || other.type === "indestructible" || other.type === "boss") continue;
        const adjacent = Math.abs(other.col - brick.col) <= 1 && Math.abs(other.row - brick.row) <= 1;
        if (adjacent) {
          other.hp = 0;
          destroyBrick(other, other.x + other.w / 2, other.y + other.h / 2);
        }
      }
    }

    if (brick.type === "boss") {
      for (const other of state.bricks) {
        if (other !== brick && other.type !== "indestructible") {
          other.alive = false;
        }
      }
    }

    const remainingRows = new Set(state.bricks.filter((b) => b.alive && b.type !== "indestructible").map((b) => b.row));
    const totalRows = new Set(state.bricks.filter((b) => b.type !== "indestructible").map((b) => b.row));
    state.rowClearBoosts = totalRows.size - remainingRows.size;
  }

  function spawnBrickParticles(brick) {
    for (let i = 0; i < 8; i += 1) {
      state.particles.push({
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        vx: rand(-140, 140),
        vy: rand(-120, 120),
        life: 0.4,
        color: brick.color,
        size: rand(3, 7),
      });
    }
  }

  function spawnCapsule(brick, powerId) {
    const power = powerTypes[powerId];
    state.capsules.push({
      x: brick.x + brick.w / 2 - 12,
      y: brick.y + brick.h / 2 - 12,
      w: 24,
      h: 24,
      vy: 140,
      rotation: 0,
      wobble: Math.random() * Math.PI * 2,
      powerId,
      label: power.label,
      color: power.color,
    });
  }

  function spawnHazards(brick) {
    const count = state.level >= 5 ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      state.hazards.push({
        x: brick.x + brick.w / 2 + rand(-brick.w * 0.35, brick.w * 0.35),
        y: brick.y + state.brickFallOffset + brick.h / 2,
        radius: rand(7, 10),
        vx: rand(-75, 75),
        vy: rand(165, 235) + state.level * 8,
        spin: rand(-6, 6),
        rotation: Math.random() * Math.PI * 2,
      });
    }
    state.warningAlpha = Math.max(state.warningAlpha, 0.12);
    state.dangerPulse = 1;
  }

  function activatePowerup(powerId) {
    const power = powerTypes[powerId];
    playSound("power");

    if (powerId === "life") {
      state.lives = clamp(state.lives + 1, 0, 5);
      showBanner(power.label, "+1", "Extra life secured", 1000);
      updateHud();
      return;
    }

    if (power.category === "paddle") {
      delete state.activePowerups.wide;
      delete state.activePowerups.sticky;
      paddle.width = paddle.baseWidth;
    }

    if (power.category === "weapon") {
      delete state.activePowerups.laser;
      paddle.laserShots = 0;
    }

    if (power.category === "ball") {
      delete state.activePowerups.fireball;
      delete state.activePowerups.slow;
    }

    if (powerId === "wide") {
      paddle.width = paddle.baseWidth * 1.5;
    } else if (powerId === "laser") {
      paddle.laserShots = 10;
    } else if (powerId === "multi") {
      const source = state.balls.find((ball) => !ball.stuck) || state.balls[0];
      const speed = effectiveBallSpeed();
      state.balls.push(createBall(source.x, source.y, speed * 0.8, -speed * 0.75));
      state.balls.push(createBall(source.x, source.y, -speed * 0.8, -speed * 0.75));
      showBanner(power.label, "x3", "Multiple balls active", 1000);
      updateHud();
      return;
    }

    state.activePowerups[powerId] = {
      active: true,
      remaining: power.duration,
      label: power.label,
      id: powerId,
    };
    showBanner(power.label, "Active", "Power-up collected", 1000);
    updateHud();
  }

  function expirePowerup(id) {
    if (id === "wide") {
      paddle.width = paddle.baseWidth;
    }
    if (id === "laser") {
      paddle.laserShots = 0;
    }
    delete state.activePowerups[id];
    updateHud();
  }

  function loseLife() {
    state.lives -= 1;
    state.warningAlpha = 0.3;
    state.surgeRemaining = 0;
    state.surgeTimer = Math.max(5, SURGE_INTERVAL - state.level * 0.35);
    clearBanner();
    playSound("lose");
    updateHud();
    clearTransientObjects();
    if (state.lives <= 0) {
      finalScore.textContent = Math.floor(state.score);
      setMode("gameover");
      return;
    }

    resetBallOnPaddle();
    setMode("ready");
  }

  function clearTransientObjects() {
    state.capsules = [];
    state.hazards = [];
    state.lasers = [];
    for (const key of Object.keys(state.activePowerups)) {
      if (key !== "score") {
        expirePowerup(key);
      }
    }
  }

  function nextLevel() {
    const bonus = state.lives * 500;
    state.score += bonus;
    updateHud();
    const next = state.level + 1;
    showBanner("Level Clear", `+${bonus}`, `Advancing to level ${next}`, 1500);
    setMode("transition");
    setTimeout(() => {
      loadLevel(next);
      resetBallOnPaddle();
      setMode("ready");
    }, 1600);
  }

  function anyDestructibleLeft() {
    return state.bricks.some((brick) => brick.alive && brick.type !== "indestructible");
  }

  function update(dt) {
    if (state.mode === "title" || state.mode === "paused" || state.mode === "gameover") {
      return;
    }

    state.warningAlpha = Math.max(0, state.warningAlpha - dt);
    state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.8);
    state.paddlesPulse = Math.max(0, state.paddlesPulse - dt * 8);
    state.dangerPulse = Math.max(0, state.dangerPulse - dt * 2.5);

    updatePaddle(dt);
    updatePowerups(dt);

    if (state.mode === "ready") {
      updateBalls(dt);
      updateParticles(dt);
      updatePopups(dt);
      return;
    }

    updateSurge(dt);
    updateMovingBricks(dt);
    updateDescendingBricks(dt);
    if (state.mode !== "playing") return;
    updateCapsules(dt);
    updateHazards(dt);
    if (state.mode !== "playing") return;
    updateLasers(dt);
    updateBalls(dt);
    if (state.mode !== "playing") return;
    updateParticles(dt);
    updatePopups(dt);

    if (!anyDestructibleLeft() && (state.mode === "playing" || state.mode === "ready")) {
      nextLevel();
    }
  }

  function updatePowerups(dt) {
    for (const [id, power] of Object.entries(state.activePowerups)) {
      if (power.remaining >= 900) continue;
      power.remaining -= dt;
      if (power.remaining <= 0) {
        expirePowerup(id);
      }
    }

    if (state.level === 9) {
      state.bossShieldTimer -= dt;
      if (state.bossShieldTimer <= 0) {
        state.bossShieldTimer = 5;
        const boss = state.bricks.find((brick) => brick.alive && brick.type === "boss");
        if (boss && boss.hp <= boss.maxHp / 2) {
          boss.shielded = true;
          state.bossShieldPulse = 1.1;
          setTimeout(() => {
            boss.shielded = false;
          }, 1200);
        }
      }
      state.bossShieldPulse = Math.max(0, state.bossShieldPulse - dt);
    }
    updateHud();
  }

  function updateSurge(dt) {
    if (state.mode !== "playing") return;
    if (state.surgeRemaining > 0) {
      state.surgeRemaining -= dt;
      state.warningAlpha = Math.max(state.warningAlpha, 0.04);
      state.dangerPulse = Math.max(state.dangerPulse, 0.18);
      if (state.surgeRemaining <= 0) {
        state.surgeTimer = Math.max(5, SURGE_INTERVAL - state.level * 0.45);
      }
      return;
    }

    state.surgeTimer -= dt;
    if (state.surgeTimer <= 0) {
      state.surgeRemaining = SURGE_DURATION + Math.min(state.level, 8) * 0.15;
      state.flashAlpha = 0.12;
      showBanner("Speed Surge", "20%", "Ball velocity unstable", 900);
    }
  }

  function updatePaddle(dt) {
    const speed = paddle.speed * dt;
    if (state.touchActive || state.controlMode === "mouse") {
      paddle.x = clamp(state.pointerX, paddle.width / 2 + 8, WIDTH - paddle.width / 2 - 8);
      return;
    }

    if (state.controlMode === "keyboard") {
      if (state.keyboardLeft) paddle.x -= speed;
      if (state.keyboardRight) paddle.x += speed;
      paddle.x = clamp(paddle.x, paddle.width / 2 + 8, WIDTH - paddle.width / 2 - 8);
      state.pointerX = paddle.x;
      return;
    }

    paddle.x = clamp(paddle.x, paddle.width / 2 + 8, WIDTH - paddle.width / 2 - 8);
  }

  function updateMovingBricks(dt) {
    for (const brick of state.bricks) {
      if (!brick.alive || brick.type !== "moving") continue;
      brick.x += brick.movingDir * brick.movingSpeed * dt;
      const minX = GRID_X;
      const maxX = GRID_X + GRID_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP - brick.w;
      if (brick.x <= minX || brick.x >= maxX) {
        brick.movingDir *= -1;
        brick.x = clamp(brick.x, minX, maxX);
      }
    }
  }

  function updateDescendingBricks(dt) {
    if (state.level < 4 && state.level <= 9) return;
    const rate = state.level >= 4 && state.level <= 7 ? 3 + state.level : state.level === 8 ? 11 : state.level > 9 ? 13 : 0;
    if (!rate) return;
    const destroyedCount = state.bricks.filter((brick) => !brick.alive && brick.type !== "indestructible").length;
    const total = state.bricks.filter((brick) => brick.type !== "indestructible").length || 1;
    state.brickFallOffset += (rate + (destroyedCount / total) * 8) * dt;
    for (const brick of state.bricks) {
      if (brick.alive && brick.y + state.brickFallOffset + brick.h >= paddle.y - 4) {
        state.brickFallOffset = 0;
        loseLife();
        return;
      }
    }
  }

  function updateCapsules(dt) {
    state.capsules = state.capsules.filter((capsule) => {
      capsule.y += capsule.vy * dt;
      capsule.rotation += dt * 2;
      const hitPaddle =
        capsule.x < paddle.x + paddle.width / 2 &&
        capsule.x + capsule.w > paddle.x - paddle.width / 2 &&
        capsule.y + capsule.h > paddle.y &&
        capsule.y < paddle.y + paddle.height;
      if (hitPaddle) {
        activatePowerup(capsule.powerId);
        return false;
      }
      return capsule.y < HEIGHT + 30;
    });
  }

  function updateHazards(dt) {
    let hitPaddle = false;
    state.hazards = state.hazards.filter((hazard) => {
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      hazard.rotation += hazard.spin * dt;
      hazard.vy += 90 * dt;
      if (hazard.x - hazard.radius <= 0 || hazard.x + hazard.radius >= WIDTH) {
        hazard.vx *= -0.75;
        hazard.x = clamp(hazard.x, hazard.radius, WIDTH - hazard.radius);
      }
      const hit =
        hazard.x + hazard.radius >= paddle.x - paddle.width / 2 &&
        hazard.x - hazard.radius <= paddle.x + paddle.width / 2 &&
        hazard.y + hazard.radius >= paddle.y &&
        hazard.y - hazard.radius <= paddle.y + paddle.height;
      if (hit) {
        hitPaddle = true;
        return false;
      }
      return hazard.y < HEIGHT + 40;
    });

    if (hitPaddle) {
      loseLife();
    }
  }

  function updateLasers(dt) {
    state.lasers = state.lasers.filter((laser) => {
      laser.y -= laser.vy * dt;
      for (const brick of state.bricks) {
        if (!brick.alive || brick.type === "indestructible") continue;
        const top = brick.y + state.brickFallOffset;
        if (laser.x > brick.x && laser.x < brick.x + brick.w && laser.y > top && laser.y < top + brick.h) {
          damageBrick(brick, laser.x, laser.y, false);
          return false;
        }
      }
      return laser.y > -20;
    });
  }

  function updateBalls(dt) {
    let lostAnyThisFrame = false;

    for (const ball of state.balls) {
      ball.prevX = ball.x;
      ball.prevY = ball.y;

      if (ball.stuck) {
        ball.x = paddle.x + ball.stuckOffset;
        ball.y = paddle.y - ball.radius - 2;
        ball.trail = [];
        continue;
      }

      const speed = effectiveBallSpeed();
      const norm = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx = (ball.vx / norm) * speed;
      ball.vy = (ball.vy / norm) * speed;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.trail.unshift({ x: ball.x, y: ball.y });
      ball.trail = ball.trail.slice(0, 3);

      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
        playSound("wall");
      } else if (ball.x + ball.radius >= WIDTH) {
        ball.x = WIDTH - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        playSound("wall");
      }

      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
        playSound("wall");
      }

      if (ball.y - ball.radius > HEIGHT + 20) {
        ball.lost = true;
        lostAnyThisFrame = true;
        continue;
      }

      collideBallPaddle(ball);
      collideBallBricks(ball);
    }

    const before = state.balls.length;
    state.balls = state.balls.filter((ball) => !ball.lost);
    if (before > 0 && state.balls.length === 0 && lostAnyThisFrame) {
      loseLife();
    }
  }

  function collideBallPaddle(ball) {
    const paddleLeft = paddle.x - paddle.width / 2;
    const paddleTop = paddle.y;
    if (
      ball.vy > 0 &&
      ball.x + ball.radius >= paddleLeft &&
      ball.x - ball.radius <= paddleLeft + paddle.width &&
      ball.y + ball.radius >= paddleTop &&
      ball.y - ball.radius <= paddleTop + paddle.height
    ) {
      ball.y = paddleTop - ball.radius - 1;
      const relative = clamp((ball.x - paddle.x) / (paddle.width / 2), -1, 1);
      const angle = relative * EXIT_ANGLE_CAP;
      const speed = effectiveBallSpeed();
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.max(Math.cos(angle) * speed, speed * MIN_VERTICAL_RATIO);
      enforceVerticalVelocity(ball);
      state.paddlesPulse = 1;
      playSound("paddle");

      if (state.activePowerups.sticky?.active) {
        ball.stuck = true;
        ball.stuckOffset = clamp(ball.x - paddle.x, -paddle.width / 2 + 8, paddle.width / 2 - 8);
        state.stickyHeldBallId = ball.id;
      }
    }
  }

  function collideBallBricks(ball) {
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const top = brick.y + state.brickFallOffset;
      const nearestX = clamp(ball.x, brick.x, brick.x + brick.w);
      const nearestY = clamp(ball.y, top, top + brick.h);
      const dx = ball.x - nearestX;
      const dy = ball.y - nearestY;
      if (dx * dx + dy * dy > ball.radius * ball.radius) continue;

      if (brick.type === "indestructible") {
        reflectBallOnRect(ball, brick.x, top, brick.w, brick.h, brick.movingDir * brick.movingSpeed * 0.05);
        playSound("wall");
        return;
      }

      if (brick.type === "boss" && brick.shielded) {
        reflectBallOnRect(ball, brick.x, top, brick.w, brick.h, 0);
        playSound("wall");
        return;
      }

      const throughFire = state.activePowerups.fireball?.active || ball.fireballUntil > 0;
      if (!throughFire) {
        reflectBallOnRect(ball, brick.x, top, brick.w, brick.h, brick.type === "moving" ? brick.movingDir * brick.movingSpeed * 0.25 : 0);
      }
      damageBrick(brick, ball.x, ball.y, throughFire);
      return;
    }
  }

  function reflectBallOnRect(ball, x, y, w, h, velocityBoost) {
    const overlapLeft = ball.x + ball.radius - x;
    const overlapRight = x + w - (ball.x - ball.radius);
    const overlapTop = ball.y + ball.radius - y;
    const overlapBottom = y + h - (ball.y - ball.radius);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      ball.vx *= -1;
      ball.vx += velocityBoost;
    } else {
      ball.vy *= -1;
    }
    enforceVerticalVelocity(ball);
  }

  function enforceVerticalVelocity(ball) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const minVertical = speed * MIN_VERTICAL_RATIO;
    if (Math.abs(ball.vy) < minVertical) {
      ball.vy = Math.sign(ball.vy || -1) * minVertical;
      const horizontal = Math.sqrt(Math.max(speed * speed - ball.vy * ball.vy, 0));
      ball.vx = Math.sign(ball.vx || 1) * horizontal;
    }
  }

  function damageBrick(brick, x, y, instantDestroy) {
    if (instantDestroy) {
      brick.hp = 0;
    } else {
      brick.hp -= 1;
    }

    if (brick.hp <= 0) {
      destroyBrick(brick, x, y);
    } else {
      playSound("crack");
      state.flashAlpha = 0.2;
    }
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 180 * dt;
      return particle.life > 0;
    });
  }

  function updatePopups(dt) {
    state.popups = state.popups.filter((popup) => {
      popup.life -= dt;
      popup.y -= 28 * dt;
      return popup.life > 0;
    });
  }

  function fireLaser() {
    if (!state.activePowerups.laser?.active || paddle.laserShots <= 0 || state.mode === "title") return;
    paddle.laserShots -= 1;
    state.lasers.push({ x: paddle.x - paddle.width / 4, y: paddle.y, vy: 720 });
    state.lasers.push({ x: paddle.x + paddle.width / 4, y: paddle.y, vy: 720 });
    playSound("laser");
    if (paddle.laserShots <= 0) {
      expirePowerup("laser");
    }
  }

  function pointerToCanvasX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const ratio = WIDTH / rect.width;
    return clamp((clientX - rect.left) * ratio, 0, WIDTH);
  }

  function onPressAction() {
    if (state.mode === "title") {
      startGame();
      return;
    }
    if (state.mode === "gameover") {
      startGame();
      return;
    }
    if (state.mode === "paused") {
      togglePause(false);
      return;
    }
    if (state.mode === "ready") {
      setMode("playing");
      launchHeldBalls();
      return;
    }
    if (state.mode === "playing") {
      if (state.activePowerups.sticky?.active && state.balls.some((ball) => ball.stuck)) {
        launchHeldBalls();
      } else if (state.activePowerups.laser?.active) {
        fireLaser();
      }
    }
  }

  function togglePause(force) {
    const next = typeof force === "boolean" ? force : state.mode !== "paused";
    if (next) {
      if (["playing", "ready"].includes(state.mode)) {
        setMode("paused");
      }
    } else if (state.mode === "paused") {
      setMode("playing");
    }
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    drawBricks();
    drawCapsules();
    drawHazards();
    drawLasers();
    drawPaddle();
    drawBalls();
    drawParticles();
    drawPopups();
    drawFieldOverlay();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#18233f");
    gradient.addColorStop(1, "#0b1023");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let y = 0; y < HEIGHT; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    if (state.surgeRemaining > 0) {
      ctx.strokeStyle = "rgba(255, 20, 95, 0.24)";
      ctx.lineWidth = 2;
      for (let x = -HEIGHT; x < WIDTH; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, HEIGHT);
        ctx.lineTo(x + HEIGHT, 0);
        ctx.stroke();
      }
    }
  }

  function drawPaddle() {
    ctx.save();
    const pulse = 1 + state.paddlesPulse * 0.05;
    ctx.translate(paddle.x, paddle.y + paddle.height / 2);
    ctx.scale(pulse, pulse);

    const grad = ctx.createLinearGradient(0, -paddle.height / 2, 0, paddle.height / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.2, "#84ffff");
    grad.addColorStop(1, "#00b8d4");
    ctx.shadowColor = "rgba(0, 255, 255, 0.55)";
    ctx.shadowBlur = 18;
    roundRect(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height, 8);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    roundRect(-paddle.width / 2 + 6, -paddle.height / 2 + 1, paddle.width - 12, 3, 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBalls() {
    for (const ball of state.balls) {
      for (let i = ball.trail.length - 1; i >= 0; i -= 1) {
        const trail = ball.trail[i];
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${0.12 + (0.18 * (ball.trail.length - i)) / ball.trail.length})`;
        ctx.arc(trail.x, trail.y, ball.radius * (0.65 + i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.shadowColor = "rgba(0, 255, 255, 0.7)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = ball.fireballUntil > 0 || state.activePowerups.fireball?.active ? "#ffdd88" : "#ffffff";
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawBricks() {
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const y = brick.y + state.brickFallOffset;

      if (brick.type === "indestructible") {
        ctx.fillStyle = "#596071";
        roundRect(brick.x, y, brick.w, brick.h, 5);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        for (let i = 0; i < 10; i += 1) {
          ctx.fillRect(brick.x + (i * 13) % brick.w, y + (i * 7) % brick.h, 2, 2);
        }
        continue;
      }

      if (brick.type === "explosive") {
        ctx.shadowColor = "rgba(255, 166, 0, 0.7)";
        ctx.shadowBlur = 20;
      } else if (brick.type === "hazard") {
        ctx.shadowColor = "rgba(255,20,95,0.8)";
        ctx.shadowBlur = 18;
      } else if (brick.type === "host") {
        ctx.shadowColor = "rgba(255,255,255,0.45)";
        ctx.shadowBlur = 8;
      } else if (brick.type === "boss" && brick.shielded) {
        ctx.shadowColor = "rgba(0, 255, 255, 0.7)";
        ctx.shadowBlur = 24;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = brick.type === "armored" ? "#8b8b8b" : brick.color;
      roundRect(brick.x, y, brick.w, brick.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = brick.type === "boss" ? "#ffffff" : "rgba(255,255,255,0.75)";
      ctx.lineWidth = brick.type === "host" ? 3 : 2;
      ctx.stroke();

      if (brick.type === "reinforced") {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.moveTo(brick.x + 15, y + 4);
        ctx.lineTo(brick.x + 30, y + 14);
        ctx.lineTo(brick.x + 40, y + 7);
        ctx.stroke();
      }

      if (brick.type === "hazard") {
        ctx.save();
        ctx.beginPath();
        roundRect(brick.x, y, brick.w, brick.h, 6);
        ctx.clip();
        ctx.strokeStyle = "rgba(12, 8, 18, 0.75)";
        ctx.lineWidth = 5;
        for (let stripe = -brick.h; stripe < brick.w + brick.h; stripe += 14) {
          ctx.beginPath();
          ctx.moveTo(brick.x + stripe, y + brick.h);
          ctx.lineTo(brick.x + stripe + brick.h, y);
          ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = "#ffe45e";
        ctx.beginPath();
        ctx.arc(brick.x + brick.w / 2, y + brick.h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#170915";
        ctx.font = '700 13px "Pixelify Sans"';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", brick.x + brick.w / 2, y + brick.h / 2 + 1);
      }

      if (brick.type === "armored" || brick.type === "boss") {
        ctx.fillStyle = brick.type === "boss" ? "#ffee57" : "#ffffff";
        ctx.font = `700 ${brick.type === "boss" ? 18 : 14}px "Pixelify Sans"`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(brick.hp), brick.x + brick.w / 2, y + brick.h / 2 + 1);
      }

      if (brick.type === "boss") {
        const barW = brick.w;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(brick.x, y - 12, barW, 6);
        ctx.fillStyle = brick.hp > 10 ? "#00ff66" : brick.hp > 5 ? "#ffff00" : "#ff3b3b";
        ctx.fillRect(brick.x, y - 12, (brick.hp / brick.maxHp) * barW, 6);
      }
    }
  }

  function drawCapsules() {
    for (const capsule of state.capsules) {
      ctx.save();
      ctx.translate(capsule.x + capsule.w / 2, capsule.y + capsule.h / 2);
      ctx.rotate(Math.sin(capsule.rotation + capsule.wobble) * 0.08);
      ctx.fillStyle = capsule.color;
      roundRect(-12, -12, 24, 24, 7);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#081019";
      ctx.font = '700 12px "Pixelify Sans"';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(capsule.label[0], 0, 1);
      ctx.restore();
    }
  }

  function drawLasers() {
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(255,77,109,0.8)";
    ctx.shadowBlur = 10;
    for (const laser of state.lasers) {
      ctx.beginPath();
      ctx.moveTo(laser.x, laser.y);
      ctx.lineTo(laser.x, laser.y + 20);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function drawHazards() {
    for (const hazard of state.hazards) {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.rotation);
      ctx.shadowColor = "rgba(255, 20, 95, 0.75)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffe45e";
      ctx.beginPath();
      ctx.moveTo(0, -hazard.radius);
      ctx.lineTo(hazard.radius * 0.9, hazard.radius * 0.75);
      ctx.lineTo(-hazard.radius * 0.9, hazard.radius * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ff145f";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#170915";
      ctx.font = '700 11px "Pixelify Sans"';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, hazard.radius * 0.12);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.globalAlpha = particle.life / 0.4;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups() {
    ctx.font = '700 18px "Pixelify Sans"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const popup of state.popups) {
      ctx.globalAlpha = popup.life / 0.6;
      ctx.fillStyle = "#ffff00";
      ctx.fillText(`+${popup.value}`, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawFieldOverlay() {
    if (state.warningAlpha > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${state.warningAlpha})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (state.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flashAlpha})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (state.dangerPulse > 0) {
      ctx.strokeStyle = `rgba(255, 20, 95, ${0.2 + state.dangerPulse * 0.35})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function gameLoop(time) {
    if (!state.lastTime) state.lastTime = time;
    const dt = Math.min((time - state.lastTime) / 1000, 1 / 30);
    state.lastTime = time;

    if (state.activePowerups.fireball?.active) {
      for (const ball of state.balls) {
        ball.fireballUntil = 0.08;
      }
    }
    for (const ball of state.balls) {
      ball.fireballUntil = Math.max(0, ball.fireballUntil - dt);
    }

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  function createAudio() {
    if (state.audioReady) return;
    state.audioReady = true;
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    for (const [name, src] of Object.entries(soundFiles)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      state.soundLibrary[name] = audio;
    }
  }

  function playSound(type) {
    const audioClip = state.soundLibrary[type];
    if (audioClip) {
      try {
        const clip = audioClip.cloneNode();
        clip.volume = type === "wall" ? 0.2 : type === "lose" ? 0.32 : 0.28;
        clip.play().catch(() => {});
      } catch (error) {
        // Fall back to synth path below.
      }
    }

    if (!state.audioCtx) return;
    const presets = {
      paddle: [360, 0.05, "square"],
      wall: [230, 0.03, "triangle"],
      brick: [540, 0.06, "square"],
      crack: [300, 0.05, "sawtooth"],
      explode: [120, 0.13, "sawtooth"],
      power: [720, 0.12, "triangle"],
      lose: [150, 0.22, "sine"],
      laser: [900, 0.08, "square"],
      launch: [500, 0.05, "triangle"],
    };
    if (audioClip && audioClip.readyState >= 2) {
      return;
    }
    const [freq, duration, wave] = presets[type] || presets.wall;
    const ctxAudio = state.audioCtx;
    const oscillator = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = freq;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(ctxAudio.destination);
    const now = ctxAudio.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function submitGameOverScore() {
    if (state.mode !== "gameover" || state.submittedScore) {
      return;
    }

    state.submittedScore = Boolean(window.ArcadeHighScores?.promptAndSubmit("breaker", state.score));
  }

  function bindEvents() {
    const goHome = () => {
      submitGameOverScore();
      window.location.href = "../index.html";
    };

    document.getElementById("startButton").addEventListener("click", onPressAction);
    document.getElementById("resumeButton").addEventListener("click", () => togglePause(false));
    document.getElementById("restartButton").addEventListener("click", startGame);
    document.getElementById("menuButton").addEventListener("click", goHome);
    document.getElementById("playAgainButton").addEventListener("click", startGame);
    document.getElementById("mainMenuButton").addEventListener("click", goHome);
    document.getElementById("pauseButton").addEventListener("click", () => togglePause());

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        state.controlMode = "keyboard";
        state.keyboardLeft = true;
      } else if (event.key === "ArrowRight") {
        state.controlMode = "keyboard";
        state.keyboardRight = true;
      } else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        onPressAction();
      } else if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        event.preventDefault();
        togglePause();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "ArrowLeft") {
        state.keyboardLeft = false;
      } else if (event.key === "ArrowRight") {
        state.keyboardRight = false;
      }
    });

    canvas.addEventListener("mousemove", (event) => {
      if (state.controlMode !== "mouse") return;
      state.pointerX = pointerToCanvasX(event.clientX);
    });

    canvas.addEventListener("mousedown", (event) => {
      createAudio();
      state.controlMode = "mouse";
      state.pointerX = pointerToCanvasX(event.clientX);
      onPressAction();
    });

    canvas.addEventListener("touchstart", (event) => {
      createAudio();
      state.touchActive = true;
      state.controlMode = "mouse";
      state.pointerX = pointerToCanvasX(event.touches[0].clientX);
      onPressAction();
    }, { passive: true });

    canvas.addEventListener("touchmove", (event) => {
      state.touchActive = true;
      state.controlMode = "mouse";
      state.pointerX = pointerToCanvasX(event.touches[0].clientX);
    }, { passive: true });

    window.addEventListener("touchend", () => {
      state.touchActive = false;
    }, { passive: true });

    window.addEventListener("pointerdown", createAudio, { once: true });
  }

  function init() {
    bindEvents();
    updateHud();
    titleMode();
    touchHint.classList.toggle("hidden", !("ontouchstart" in window));
    requestAnimationFrame(gameLoop);
  }

  init();
}());
