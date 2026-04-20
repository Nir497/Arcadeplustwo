(function () {
  class ArcadeSoundLibrary {
    constructor() {
      this.enabled = typeof Audio !== "undefined";
      this.volume = 0.45;
      this.sounds = {};
      this.paths = {
        start: "assets/sounds/start.wav",
        pause: "assets/sounds/pause.wav",
        resume: "assets/sounds/resume.wav",
        paddleHit: "assets/sounds/paddle-hit.wav",
        wallBounce: "assets/sounds/wall-bounce.wav",
        score: "assets/sounds/score.wav",
        win: "assets/sounds/win.wav",
      };

      if (this.enabled) {
        Object.entries(this.paths).forEach(([key, path]) => {
          const audio = new Audio(path);
          audio.preload = "auto";
          audio.volume = this.volume;
          this.sounds[key] = audio;
        });
      }
    }

    unlock() {
      if (!this.enabled) {
        return;
      }

      Object.values(this.sounds).forEach((audio) => {
        audio.load();
      });
    }

    play(name) {
      if (!this.enabled || !this.sounds[name]) {
        return;
      }

      const base = this.sounds[name];
      const audio = base.cloneNode();
      audio.volume = this.volume;
      audio.play().catch(() => {});
    }

    playStart() {
      this.play("start");
    }

    playPause() {
      this.play("pause");
    }

    playResume() {
      this.play("resume");
    }

    playPaddleHit() {
      this.play("paddleHit");
    }

    playWallBounce() {
      this.play("wallBounce");
    }

    playScore() {
      this.play("score");
    }

    playWin() {
      this.play("win");
    }
  }

  window.ArcadeSoundLibrary = ArcadeSoundLibrary;
})();
