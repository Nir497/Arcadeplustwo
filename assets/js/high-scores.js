(function () {
  const STORAGE_KEY = "arcade_plus_high_scores";
  const MAX_SCORES_PER_GAME = 50;

  function cleanName(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 18);
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeStore(scores) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  }

  function submitScore({ gameId, score, playerName }) {
    const numericScore = Math.max(0, Math.floor(Number(score) || 0));
    const name = cleanName(playerName);

    if (!name) {
      return null;
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      gameId,
      playerName: name,
      score: numericScore,
      createdAt: new Date().toISOString(),
    };

    const scores = readStore();
    scores.push(entry);

    const trimmedScores = scores
      .sort((left, right) => right.score - left.score || new Date(left.createdAt) - new Date(right.createdAt))
      .filter((entry, index, sorted) => {
        const gameRank = sorted.slice(0, index + 1).filter((score) => score.gameId === entry.gameId).length;
        return gameRank <= MAX_SCORES_PER_GAME;
      });

    writeStore(trimmedScores);
    return entry;
  }

  function promptAndSubmit(gameId, score) {
    const numericScore = Math.max(0, Math.floor(Number(score) || 0));
    const playerName = window.prompt(`Game over. Enter your name for the ${numericScore} point high score:`, "");

    if (playerName === null) {
      return null;
    }

    return submitScore({ gameId, score: numericScore, playerName });
  }

  function getScores(gameId, limit = 10) {
    let scores = readStore();

    if (gameId) {
      scores = scores.filter((entry) => entry.gameId === gameId);
    }

    return scores
      .sort((left, right) => right.score - left.score || new Date(left.createdAt) - new Date(right.createdAt))
      .slice(0, limit);
  }

  window.ArcadeHighScores = {
    getScores,
    promptAndSubmit,
    submitScore,
  };
})();
