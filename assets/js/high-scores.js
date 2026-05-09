(function () {
  const STORAGE_KEY = "arcade_plus_high_scores";
  const MAX_SCORES_PER_GAME = 50;
  const MODAL_ID = "arcadeHighScoreNameModal";
  const STYLE_ID = "arcadeHighScoreModalStyles";

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
    openNameModal(gameId, numericScore);
    return true;
  }

  function ensureModalStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body.arcade-score-modal-open {
        overflow: hidden;
      }

      .arcade-score-modal {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: grid;
        place-items: center;
        padding: 1rem;
        font-family: "Pixelify Sans", monospace;
      }

      .arcade-score-modal[hidden] {
        display: none;
      }

      .arcade-score-modal__backdrop {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 50% 28%, rgba(101, 234, 255, 0.18), transparent 26rem),
          rgba(0, 0, 0, 0.78);
        backdrop-filter: blur(6px);
      }

      .arcade-score-modal__panel {
        position: relative;
        z-index: 1;
        width: min(100%, 30rem);
        border: 2px solid #65eaff;
        border-radius: 18px;
        padding: clamp(1.25rem, 4vw, 2rem);
        color: #65eaff;
        background:
          linear-gradient(180deg, rgba(101, 234, 255, 0.1), transparent 42%),
          rgba(5, 6, 6, 0.96);
        box-shadow:
          0 0 10px rgba(101, 234, 255, 0.92),
          0 0 36px rgba(101, 234, 255, 0.42),
          inset 0 0 24px rgba(101, 234, 255, 0.12);
        text-align: center;
        text-transform: uppercase;
      }

      .arcade-score-modal__kicker {
        margin: 0 0 0.45rem;
        color: #fff241;
        font-size: 1rem;
        letter-spacing: 0.08em;
        text-shadow: 0 0 12px rgba(255, 242, 65, 0.7);
      }

      .arcade-score-modal__title {
        margin: 0;
        font-size: clamp(2rem, 8vw, 3.4rem);
        line-height: 0.95;
        text-shadow:
          0 0 8px currentColor,
          0 0 24px rgba(101, 234, 255, 0.72);
      }

      .arcade-score-modal__score {
        margin: 1rem 0 1.25rem;
        color: rgba(245, 245, 245, 0.78);
        font-size: 1.2rem;
        letter-spacing: 0.06em;
      }

      .arcade-score-modal__score strong {
        color: #65eaff;
        text-shadow: 0 0 14px rgba(101, 234, 255, 0.78);
      }

      .arcade-score-modal__label {
        display: block;
        margin-bottom: 0.5rem;
        color: rgba(245, 245, 245, 0.78);
        font-size: 0.95rem;
        letter-spacing: 0.08em;
      }

      .arcade-score-modal__input {
        width: 100%;
        border: 2px solid rgba(101, 234, 255, 0.72);
        border-radius: 10px;
        padding: 0.85rem 1rem;
        color: #fff;
        background: rgba(0, 0, 0, 0.64);
        box-shadow: inset 0 0 16px rgba(101, 234, 255, 0.12);
        font: inherit;
        font-size: 1.35rem;
        letter-spacing: 0.08em;
        text-align: center;
        text-transform: uppercase;
      }

      .arcade-score-modal__input:focus {
        border-color: #fff241;
        outline: none;
        box-shadow:
          0 0 16px rgba(255, 242, 65, 0.42),
          inset 0 0 16px rgba(101, 234, 255, 0.14);
      }

      .arcade-score-modal__actions {
        display: flex;
        justify-content: center;
        gap: 0.8rem;
        margin-top: 1.25rem;
      }

      .arcade-score-modal__button {
        border: 2px solid #65eaff;
        border-radius: 10px;
        padding: 0.65rem 1rem;
        color: #65eaff;
        background: rgba(7, 10, 10, 0.86);
        box-shadow: 0 0 14px rgba(101, 234, 255, 0.3);
        font: inherit;
        font-size: 1rem;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        cursor: pointer;
      }

      .arcade-score-modal__button--primary,
      .arcade-score-modal__button:hover,
      .arcade-score-modal__button:focus-visible {
        color: #050606;
        background: #65eaff;
        outline: none;
      }

      .arcade-score-modal__button--ghost {
        border-color: rgba(245, 245, 245, 0.36);
        color: rgba(245, 245, 245, 0.72);
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureModalStyles();

    let modal = document.getElementById(MODAL_ID);
    if (modal) {
      return modal;
    }

    modal = document.createElement("section");
    modal.id = MODAL_ID;
    modal.className = "arcade-score-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "arcadeScoreModalTitle");
    modal.innerHTML = `
      <div class="arcade-score-modal__backdrop" data-score-cancel></div>
      <form class="arcade-score-modal__panel" data-score-form>
        <p class="arcade-score-modal__kicker">Game Over</p>
        <h2 class="arcade-score-modal__title" id="arcadeScoreModalTitle">Save Score</h2>
        <p class="arcade-score-modal__score">Score <strong data-score-value>0</strong></p>
        <label class="arcade-score-modal__label" for="arcadeScoreNameInput">Enter your name</label>
        <input
          class="arcade-score-modal__input"
          id="arcadeScoreNameInput"
          name="playerName"
          maxlength="18"
          autocomplete="off"
          required
        />
        <div class="arcade-score-modal__actions">
          <button class="arcade-score-modal__button arcade-score-modal__button--primary" type="submit">Save</button>
          <button class="arcade-score-modal__button arcade-score-modal__button--ghost" type="button" data-score-cancel>
            Skip
          </button>
        </div>
      </form>
    `;

    modal.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        closeNameModal();
      }
    });

    modal.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target.closest("[data-score-cancel]")) {
        closeNameModal();
      }
    });

    modal.querySelector("[data-score-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const playerName = modal.querySelector("[name='playerName']").value;
      submitScore({
        gameId: modal.dataset.gameId,
        score: Number(modal.dataset.score || 0),
        playerName,
      });
      closeNameModal();
    });

    document.body.appendChild(modal);
    return modal;
  }

  function openNameModal(gameId, score) {
    const modal = ensureModal();
    const input = modal.querySelector("[name='playerName']");

    modal.dataset.gameId = gameId;
    modal.dataset.score = String(score);
    modal.querySelector("[data-score-value]").textContent = score.toLocaleString();
    input.value = "";
    modal.hidden = false;
    document.body.classList.add("arcade-score-modal-open");
    window.setTimeout(() => input.focus(), 0);
  }

  function closeNameModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) {
      return;
    }

    modal.hidden = true;
    document.body.classList.remove("arcade-score-modal-open");
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
