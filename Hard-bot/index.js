class CodexBot {
  constructor(game) {
    this.game = game;
    this.playerId = "p1";
    this.opponentId = "p2";
  }

  getMove() {
    const player = this.game.players[this.playerId];
    const candidates = this.getSafeMoves(player);

    if (candidates.length === 0) {
      return player.direction;
    }

    if (this.game.botDifficulty === "easy") {
      return this.chooseEasyMove(candidates);
    }

    let bestScore = -Infinity;
    let bestDirections = [];

    for (const candidate of candidates) {
      const score = this.evaluateHardMove(candidate);

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

  getSafeMoves(player, grid = this.game.grid) {
    return this.getCandidateDirections(player.direction)
      .map((direction) => ({
        direction,
        next: this.previewMove(player, direction),
      }))
      .filter((candidate) => !this.isCollisionOnGrid(grid, candidate.next.x, candidate.next.y));
  }

  chooseEasyMove(candidates) {
    const scored = candidates.map((candidate) => ({
      direction: candidate.direction,
      score: this.evaluateEasyMove(candidate),
    }));
    scored.sort((left, right) => right.score - left.score);

    return scored[0].direction;
  }

  evaluateEasyMove(candidate) {
    const opponent = this.game.players[this.opponentId];
    const opponentResponses = this.getSafeMoves(opponent);
    const fallbackResponse = {
      direction: opponent.direction,
      next: this.previewMove(opponent, opponent.direction),
    };
    const responses = opponentResponses.length > 0 ? opponentResponses : [fallbackResponse];
    let worstCase = Infinity;
    let aggregate = 0;

    for (const response of responses) {
      const score = this.scoreFutureState(candidate, response, {
        survivalWeight: 1.2,
        territoryWeight: 0.7,
        mobilityWeight: 0.65,
        pressureWeight: 0.3,
        centerWeight: 0.05,
        escapeWeight: 0.55,
        corridorWeight: 0.38,
      });
      aggregate += score;
      worstCase = Math.min(worstCase, score);
    }

    return worstCase * 0.75 + (aggregate / responses.length) * 0.25;
  }

  evaluateHardMove(candidate) {
    const opponent = this.game.players[this.opponentId];
    const opponentResponses = this.getSafeMoves(opponent);
    const fallbackResponse = {
      direction: opponent.direction,
      next: this.previewMove(opponent, opponent.direction),
    };
    const responses = opponentResponses.length > 0 ? opponentResponses : [fallbackResponse];
    let worstCase = Infinity;
    let aggregate = 0;

    for (const response of responses) {
      const score = this.scoreFutureState(candidate, response, {
        survivalWeight: 1.25,
        territoryWeight: 0.95,
        mobilityWeight: 0.8,
        pressureWeight: 0.45,
        centerWeight: 0.08,
        escapeWeight: 0.75,
        corridorWeight: 0.55,
      });
      aggregate += score;
      worstCase = Math.min(worstCase, score);
    }

    return worstCase * 0.9 + (aggregate / responses.length) * 0.1;
  }

  scoreFutureState(botCandidate, opponentCandidate, weights) {
    const botCrash = this.game.isCollision(botCandidate.next.x, botCandidate.next.y);
    const gridAfterBotMove = this.cloneGridWithMoves(botCandidate.next);
    const opponentCrash = this.isCollisionOnGrid(gridAfterBotMove, opponentCandidate.next.x, opponentCandidate.next.y);
    const headOn = botCandidate.next.x === opponentCandidate.next.x && botCandidate.next.y === opponentCandidate.next.y;

    if (headOn) {
      return -65000;
    }
    if (botCrash && opponentCrash) {
      return -250;
    }
    if (botCrash) {
      return -100000;
    }
    if (opponentCrash) {
      return 100000;
    }

    const futureGrid = this.cloneGridWithMoves(botCandidate.next, opponentCandidate.next);
    const territory = this.computeTerritoryControl(botCandidate.next, opponentCandidate.next, futureGrid);
    const botSpace = this.floodFillOnGrid(botCandidate.next.x, botCandidate.next.y, futureGrid);
    const opponentSpace = this.floodFillOnGrid(opponentCandidate.next.x, opponentCandidate.next.y, futureGrid);
    const botMobility = this.countSafeTurns(botCandidate.next, botCandidate.direction, futureGrid);
    const opponentMobility = this.countSafeTurns(opponentCandidate.next, opponentCandidate.direction, futureGrid);
    const botEscape = this.measureEscapePotential(botCandidate.next, botCandidate.direction, futureGrid);
    const opponentEscape = this.measureEscapePotential(opponentCandidate.next, opponentCandidate.direction, futureGrid);
    const botCorridorRisk = this.measureCorridorRisk(botCandidate.next, futureGrid);
    const opponentCorridorRisk = this.measureCorridorRisk(opponentCandidate.next, futureGrid);
    const pressure = (botSpace - opponentSpace) + (botMobility - opponentMobility) * 18;
    const centerControl = this.computeCenterBias(botCandidate.next) - this.computeCenterBias(opponentCandidate.next);

    return (
      territory * weights.territoryWeight +
      (botSpace - opponentSpace) * weights.survivalWeight +
      (botMobility - opponentMobility) * 90 * weights.mobilityWeight +
      (botEscape - opponentEscape) * 55 * weights.escapeWeight +
      (opponentCorridorRisk - botCorridorRisk) * 35 * weights.corridorWeight +
      pressure * weights.pressureWeight +
      centerControl * 100 * weights.centerWeight
    );
  }

  cloneGridWithMoves(botNext, opponentNext) {
    const grid = this.game.grid.map((row) => row.slice());
    grid[botNext.y][botNext.x] = 1;
    if (opponentNext) {
      grid[opponentNext.y][opponentNext.x] = 2;
    }
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

  computeTerritoryControl(botStart, opponentStart, grid) {
    const queue = [
      { x: botStart.x, y: botStart.y, owner: "bot", distance: 0 },
      { x: opponentStart.x, y: opponentStart.y, owner: "opponent", distance: 0 },
    ];
    const visited = new Map();
    let botCount = 0;
    let opponentCount = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      const isSeed =
        (current.x === botStart.x && current.y === botStart.y) ||
        (current.x === opponentStart.x && current.y === opponentStart.y);

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
            opponentCount -= 1;
          }
        }
        continue;
      }

      visited.set(key, { owner: current.owner, distance: current.distance });
      if (current.owner === "bot") {
        botCount += 1;
      } else {
        opponentCount += 1;
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

    return botCount - opponentCount;
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

  measureEscapePotential(position, direction, grid) {
    const nextMoves = this.getCandidateDirections(direction)
      .map((candidateDirection) => {
        const vector = DIRECTIONS[candidateDirection];
        return {
          direction: candidateDirection,
          next: {
            x: position.x + vector.x,
            y: position.y + vector.y,
          },
        };
      })
      .filter((candidate) => !this.isCollisionOnGrid(grid, candidate.next.x, candidate.next.y));

    if (nextMoves.length === 0) {
      return -10;
    }

    let bestFutureSpace = 0;
    let totalFutureSpace = 0;

    for (const move of nextMoves) {
      const futureGrid = grid.map((row) => row.slice());
      futureGrid[move.next.y][move.next.x] = 1;
      const space = this.floodFillOnGrid(move.next.x, move.next.y, futureGrid);
      bestFutureSpace = Math.max(bestFutureSpace, space);
      totalFutureSpace += space;
    }

    return nextMoves.length * 3 + bestFutureSpace * 0.08 + (totalFutureSpace / nextMoves.length) * 0.03;
  }

  measureCorridorRisk(position, grid) {
    const seen = new Set();
    const queue = [{ x: position.x, y: position.y, depth: 0 }];
    let risk = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (seen.has(key) || current.depth > 12) {
        continue;
      }

      seen.add(key);

      const exits = Object.values(DIRECTIONS)
        .map((direction) => ({
          x: current.x + direction.x,
          y: current.y + direction.y,
        }))
        .filter((next) => !this.isCollisionOnGrid(grid, next.x, next.y))
        .length;

      if (exits <= 1) {
        risk += 4;
      } else if (exits === 2) {
        risk += 1;
      }

      for (const direction of Object.values(DIRECTIONS)) {
        const next = {
          x: current.x + direction.x,
          y: current.y + direction.y,
          depth: current.depth + 1,
        };
        const nextKey = `${next.x},${next.y}`;
        if (!seen.has(nextKey) && !this.isCollisionOnGrid(grid, next.x, next.y)) {
          queue.push(next);
        }
      }
    }

    return risk;
  }

  computeCenterBias(position) {
    const centerX = (CONFIG.cols - 1) / 2;
    const centerY = (CONFIG.rows - 1) / 2;
    const distance = Math.abs(position.x - centerX) + Math.abs(position.y - centerY);
    return -(distance / (CONFIG.cols + CONFIG.rows));
  }
}
