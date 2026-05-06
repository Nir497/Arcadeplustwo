const GAMES = [
  { id: "snake", label: "Snake", color: "green" },
  { id: "pong", label: "Pong", color: "cyan" },
  { id: "breaker", label: "Breaker", color: "pink" },
  { id: "space-invaders", label: "Invaders", color: "yellow" },
  { id: "pacman", label: "Pacman", color: "orange" },
  { id: "tetris", label: "Tetris", color: "blue" },
  { id: "tron", label: "Tron", color: "red" },
];

const launcherView = document.getElementById("launcherView");
const highScoresView = document.getElementById("highScoresView");
const highScoresButton = document.getElementById("highScoresButton");
const backButton = document.getElementById("backButton");
const tabs = document.getElementById("scoreTabs");
const scoreList = document.getElementById("scoreList");
const scoreStatus = document.getElementById("scoreStatus");

let activeGame = GAMES[0].id;

function setView(view) {
  const showingScores = view === "scores";
  launcherView.hidden = showingScores;
  highScoresView.hidden = !showingScores;

  if (showingScores) {
    loadScores(activeGame);
  }
}

function renderTabs() {
  tabs.innerHTML = GAMES.map((game) => {
    const active = game.id === activeGame ? " is-active" : "";
    return `<button class="score-tab score-tab-${game.color}${active}" type="button" data-game="${game.id}">${game.label}</button>`;
  }).join("");
}

function renderScores(scores) {
  if (!scores.length) {
    scoreList.innerHTML = '<li class="empty-score">No scores yet. Play a game to claim #1.</li>';
    return;
  }

  scoreList.innerHTML = scores.map((entry, index) => `
    <li class="score-row">
      <span class="score-rank">#${index + 1}</span>
      <span class="score-name">${escapeHtml(entry.playerName)}</span>
      <span class="score-value">${Number(entry.score).toLocaleString()}</span>
    </li>
  `).join("");
}

function loadScores(gameId) {
  const scores = window.ArcadeHighScores.getScores(gameId, 10);
  renderScores(scores);
  scoreStatus.textContent = "Scores are stored in this browser with localStorage.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderTabs();

highScoresButton.addEventListener("click", () => setView("scores"));
backButton.addEventListener("click", () => setView("launcher"));

tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-game]");
  if (!button) {
    return;
  }

  activeGame = button.dataset.game;
  renderTabs();
  loadScores(activeGame);
});
