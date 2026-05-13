class ClaudeBot {
  constructor(game) {
    this.game = game;
    this.playerId = "p2";
    this.opponentId = "p1";
  }

  getMove() {
    const player = this.game.players[this.playerId];
    const candidates = this.getSafeMoves(player);
    if (candidates.length === 0) return player.direction;
    if (this.game.botDifficulty === "easy") return this.chooseEasyMove(candidates);
    return this.chooseHardMove(candidates);
  }

  chooseHardMove(candidates) {
    const player = this.game.players[this.playerId];
    const opponent = this.game.players[this.opponentId];
    let bestScore = -Infinity;
    let bestDirs = [];

    for (const candidate of candidates) {
      const score = this.scoreMove(candidate, opponent, player.direction);
      if (score > bestScore) {
        bestScore = score;
        bestDirs = [candidate.direction];
      } else if (score === bestScore) {
        bestDirs.push(candidate.direction);
      }
    }

    return bestDirs[Math.floor(Math.random() * bestDirs.length)];
  }

  scoreMove(candidate, opponent, prevDir) {
    const grid1 = this.game.grid.map((r) => r.slice());
    grid1[candidate.next.y][candidate.next.x] = 2;

    if (candidate.next.x === opponent.x && candidate.next.y === opponent.y) return -400;

    const oppMoves = this.getSafeMoves(opponent, grid1);
    if (oppMoves.length === 0) return 100000;

    let worstScore = Infinity;
    let totalScore = 0;

    for (const oppMove of oppMoves) {
      if (oppMove.next.x === candidate.next.x && oppMove.next.y === candidate.next.y) {
        const s = -400;
        worstScore = Math.min(worstScore, s);
        totalScore += s;
        continue;
      }
      if (this.isCollisionOnGrid(grid1, oppMove.next.x, oppMove.next.y)) {
        worstScore = Math.min(worstScore, 100000);
        totalScore += 100000;
        continue;
      }

      const grid2 = grid1.map((r) => r.slice());
      grid2[oppMove.next.y][oppMove.next.x] = 1;
      const s = this.evaluate(candidate.next, candidate.direction, oppMove.next, oppMove.direction, grid2, prevDir);
      worstScore = Math.min(worstScore, s);
      totalScore += s;
    }

    const avgScore = totalScore / oppMoves.length;
    return worstScore * 0.9 + avgScore * 0.1;
  }

  evaluate(botPos, botDir, oppPos, oppDir, grid, prevDir) {
    const mySpace = this.floodFillOnGrid(botPos.x, botPos.y, grid);
    const oppSpace = this.floodFillOnGrid(oppPos.x, oppPos.y, grid);

    if (mySpace === 0) return -100000;
    if (oppSpace === 0) return 100000;
    if (mySpace < 10) return -50000 + mySpace * 1000;

    const projSafety = this.projectedSafety(botPos, botDir, grid, 12);
    // Raised threshold: hollows of up to 30 cells now trigger hard penalty
    if (projSafety < 30) return -20000 + projSafety * 600;
    // Relative trap: if projecting forward cuts off 65%+ of current space, it's a hollow/trap
    if (mySpace > 60 && projSafety < mySpace * 0.35) return -18000 + projSafety * 200;

    const botCorridorRisk = this.measureCorridorRisk(botPos, grid);
    // Lowered threshold: catches smaller nooks and one-way folds (was 30)
    if (botCorridorRisk > 20) return -15000 + (40 - Math.min(botCorridorRisk, 40)) * 250;

    const botEscape = this.measureEscapePotential(botPos, botDir, grid);
    const oppEscape = this.measureEscapePotential(oppPos, oppDir, grid);
    const botMobility = this.countSafeTurns(botPos, botDir, grid);
    const oppMobility = this.countSafeTurns(oppPos, oppDir, grid);
    const oppCorridorRisk = this.measureCorridorRisk(oppPos, grid);

    const pressure = (mySpace - oppSpace) + (botMobility - oppMobility) * 18;

    const centerX = (CONFIG.cols - 1) / 2;
    const centerY = (CONFIG.rows - 1) / 2;
    const centerControl = (
      (Math.abs(oppPos.x - centerX) + Math.abs(oppPos.y - centerY)) -
      (Math.abs(botPos.x - centerX) + Math.abs(botPos.y - centerY))
    ) / (CONFIG.cols + CONFIG.rows);

    // Only penalize approaching opponent when truly close — reduced radius prevents overriding consistency
    const oppDist = Math.abs(botPos.x - oppPos.x) + Math.abs(botPos.y - oppPos.y);
    const dirVec = DIRECTIONS[botDir];
    const approach = dirVec.x * Math.sign(oppPos.x - botPos.x) + dirVec.y * Math.sign(oppPos.y - botPos.y);
    const avoidApproach = oppDist < 10 ? -approach * (10 - oppDist) * 20 : 0;

    // Adaptive consistency: strong in open game (sweep outward), relaxed in tight late game
    const consistencyBonus = mySpace > 800 ? 150 : mySpace > 300 ? 80 : 35;
    const consistency = (prevDir !== undefined && botDir === prevDir) ? consistencyBonus : 0;

    // Serpentine fill bonus: reward moving alongside own trail (back cell + one side = 2 own neighbors)
    // This encourages efficient lawnmower-style sweeps with no internal gaps
    let ownTrailNeighbors = 0;
    for (const d of Object.values(DIRECTIONS)) {
      const nx = botPos.x + d.x, ny = botPos.y + d.y;
      if (nx >= 0 && ny >= 0 && nx < CONFIG.cols && ny < CONFIG.rows && grid[ny][nx] === 2)
        ownTrailNeighbors++;
    }
    const serpentine = ownTrailNeighbors === 2 ? 90 : 0;

    const emptyCount = this.countEmptyCells(grid);
    const separated = (mySpace + oppSpace) <= emptyCount + 20;

    if (separated) {
      return mySpace * 2.0 + projSafety * 0.8 + botEscape * 0.5 - botCorridorRisk * 3.0 + consistency + serpentine * 1.5;
    }

    const territory = this.computeTerritoryControl(botPos, oppPos, grid);
    return (
      territory * 0.95 +
      (mySpace - oppSpace) * 1.25 +
      projSafety * 0.4 +
      (botEscape - oppEscape) * 55 * 0.75 +
      (botMobility - oppMobility) * 90 * 0.8 +
      (oppCorridorRisk - botCorridorRisk) * 35 * 0.55 +
      -botCorridorRisk * 5 +
      pressure * 0.45 +
      centerControl * 100 * 0.08 +
      avoidApproach +
      consistency +
      serpentine
    );
  }

  countEmptyCells(grid) {
    let n = 0;
    for (let y = 0; y < CONFIG.rows; y++)
      for (let x = 0; x < CONFIG.cols; x++)
        if (grid[y][x] === 0) n++;
    return n;
  }

  projectedSafety(startPos, startDir, grid, steps) {
    let pos = startPos;
    let dir = startDir;
    const g = grid.map((r) => r.slice());
    let minSafety = this.floodFillOnGrid(pos.x, pos.y, g);

    for (let i = 0; i < steps; i++) {
      const moves = this.getSafeMoves({ x: pos.x, y: pos.y, direction: dir }, g);
      if (moves.length === 0) return 0;

      let bestMove = null;
      let bestFF = -1;
      for (const m of moves) {
        const ff = this.floodFillOnGrid(m.next.x, m.next.y, g);
        if (ff > bestFF) { bestFF = ff; bestMove = m; }
      }

      g[bestMove.next.y][bestMove.next.x] = 2;
      if (bestFF < minSafety) minSafety = bestFF;
      pos = bestMove.next;
      dir = bestMove.direction;
    }

    return minSafety;
  }

  measureCorridorRisk(position, grid) {
    const seen = new Set();
    const queue = [{ x: position.x, y: position.y, depth: 0 }];
    let risk = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (seen.has(key) || current.depth > 12) continue;
      seen.add(key);

      const exits = Object.values(DIRECTIONS)
        .map((d) => ({ x: current.x + d.x, y: current.y + d.y }))
        .filter((n) => !this.isCollisionOnGrid(grid, n.x, n.y))
        .length;

      if (exits <= 1) {
        risk += 4;
      } else if (exits === 2) {
        risk += 1;
      }

      for (const d of Object.values(DIRECTIONS)) {
        const next = { x: current.x + d.x, y: current.y + d.y, depth: current.depth + 1 };
        const nKey = `${next.x},${next.y}`;
        if (!seen.has(nKey) && !this.isCollisionOnGrid(grid, next.x, next.y)) {
          queue.push(next);
        }
      }
    }

    return risk;
  }

  measureEscapePotential(position, direction, grid) {
    const nextMoves = this.getCandidateDirections(direction)
      .map((d) => {
        const v = DIRECTIONS[d];
        return { direction: d, next: { x: position.x + v.x, y: position.y + v.y } };
      })
      .filter((c) => !this.isCollisionOnGrid(grid, c.next.x, c.next.y));

    if (nextMoves.length === 0) return -10;

    let bestFutureSpace = 0;
    let totalFutureSpace = 0;

    for (const move of nextMoves) {
      const g = grid.map((r) => r.slice());
      g[move.next.y][move.next.x] = 2;
      const space = this.floodFillOnGrid(move.next.x, move.next.y, g);
      if (space > bestFutureSpace) bestFutureSpace = space;
      totalFutureSpace += space;
    }

    return nextMoves.length * 3 + bestFutureSpace * 0.08 + (totalFutureSpace / nextMoves.length) * 0.03;
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  getCandidateDirections(currentDirection) {
    const opposite = DIRECTIONS[currentDirection].opposite;
    return Object.keys(DIRECTIONS).filter((d) => d !== opposite);
  }

  previewMove(player, direction) {
    const v = DIRECTIONS[direction];
    return { x: player.x + v.x, y: player.y + v.y };
  }

  getSafeMoves(player, grid = this.game.grid) {
    const candidates = this.getCandidateDirections(player.direction)
      .map((direction) => ({ direction, next: this.previewMove(player, direction) }))
      .filter((c) => !this.isCollisionOnGrid(grid, c.next.x, c.next.y));

    // Hard filter: never move into a cell with no exits (instant death next tick)
    const nonSuicidal = candidates.filter((c) => {
      const freeNeighbors = Object.values(DIRECTIONS)
        .map((d) => ({ x: c.next.x + d.x, y: c.next.y + d.y }))
        .filter((n) => {
          if (n.x === player.x && n.y === player.y) return false; // current pos becomes trail
          return !this.isCollisionOnGrid(grid, n.x, n.y);
        }).length;
      return freeNeighbors > 0;
    });

    return nonSuicidal.length > 0 ? nonSuicidal : candidates;
  }

  chooseEasyMove(candidates) {
    const opponent = this.game.players[this.opponentId];
    const oppMoves = this.getSafeMoves(opponent);
    const fallback = { direction: opponent.direction, next: this.previewMove(opponent, opponent.direction) };
    const sample = oppMoves.length > 0
      ? oppMoves[Math.floor(Math.random() * oppMoves.length)]
      : fallback;

    const scored = candidates.map((c) => {
      if (this.isCollisionOnGrid(this.game.grid, sample.next.x, sample.next.y)) {
        return { direction: c.direction, score: 50000 };
      }
      const grid = this.game.grid.map((r) => r.slice());
      grid[c.next.y][c.next.x] = 2;
      grid[sample.next.y][sample.next.x] = 1;
      return {
        direction: c.direction,
        score: this.evaluate(c.next, c.direction, sample.next, sample.direction, grid, undefined),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    if (Math.random() < 0.24) {
      const pool = scored.slice(0, Math.min(3, scored.length));
      return pool[Math.floor(Math.random() * pool.length)].direction;
    }
    return scored[0].direction;
  }

  isCollisionOnGrid(grid, x, y) {
    if (x < 0 || y < 0 || x >= CONFIG.cols || y >= CONFIG.rows) return true;
    return grid[y][x] !== 0;
  }

  floodFillOnGrid(startX, startY, grid) {
    if (startX < 0 || startY < 0 || startX >= CONFIG.cols || startY >= CONFIG.rows) return 0;
    const seen = new Uint8Array(CONFIG.cols * CONFIG.rows);
    const queue = [startY * CONFIG.cols + startX];
    let head = 0;
    let count = 0;

    while (head < queue.length) {
      const idx = queue[head++];
      if (seen[idx]) continue;
      const x = idx % CONFIG.cols;
      const y = (idx / CONFIG.cols) | 0;
      if ((x !== startX || y !== startY) && this.isCollisionOnGrid(grid, x, y)) continue;
      seen[idx] = 1;
      count++;
      if (x > 0) queue.push(idx - 1);
      if (x < CONFIG.cols - 1) queue.push(idx + 1);
      if (y > 0) queue.push(idx - CONFIG.cols);
      if (y < CONFIG.rows - 1) queue.push(idx + CONFIG.cols);
    }
    return count;
  }

  computeTerritoryControl(botStart, oppStart, grid) {
    const total = CONFIG.cols * CONFIG.rows;
    const dist = new Int16Array(total).fill(-1);
    const owner = new Uint8Array(total);

    const queue = [];
    const bIdx = botStart.y * CONFIG.cols + botStart.x;
    const oIdx = oppStart.y * CONFIG.cols + oppStart.x;
    dist[bIdx] = 0; owner[bIdx] = 1; queue.push(bIdx);
    dist[oIdx] = 0; owner[oIdx] = 2; queue.push(oIdx);

    let botCount = 1;
    let oppCount = 1;
    if (bIdx === oIdx) { owner[bIdx] = 3; botCount = 0; oppCount = 0; }

    let head = 0;
    const neighbors = [-1, 1, -CONFIG.cols, CONFIG.cols];

    while (head < queue.length) {
      const idx = queue[head++];
      const x = idx % CONFIG.cols;
      const y = (idx / CONFIG.cols) | 0;
      const d = dist[idx];
      const o = owner[idx];
      if (o === 3) continue;

      for (const delta of neighbors) {
        const nx = x + (delta === -1 ? -1 : delta === 1 ? 1 : 0);
        const ny = y + (delta === -CONFIG.cols ? -1 : delta === CONFIG.cols ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= CONFIG.cols || ny >= CONFIG.rows) continue;
        const nIdx = ny * CONFIG.cols + nx;
        if (grid[ny][nx] !== 0) continue;

        if (dist[nIdx] === -1) {
          dist[nIdx] = d + 1;
          owner[nIdx] = o;
          if (o === 1) botCount++; else oppCount++;
          queue.push(nIdx);
        } else if (dist[nIdx] === d + 1 && owner[nIdx] !== o && owner[nIdx] !== 3) {
          if (owner[nIdx] === 1) botCount--; else oppCount--;
          owner[nIdx] = 3;
        }
      }
    }

    return botCount - oppCount;
  }

  countSafeTurns(position, direction, grid) {
    return this.getCandidateDirections(direction)
      .map((d) => { const v = DIRECTIONS[d]; return { x: position.x + v.x, y: position.y + v.y }; })
      .filter((m) => !this.isCollisionOnGrid(grid, m.x, m.y))
      .length;
  }
}
