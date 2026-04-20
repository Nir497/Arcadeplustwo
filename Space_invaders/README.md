# Space Invaders

Static browser build of the game described in `docs/design.docx` and `docs/Space_Invaders_mechanics.docx`.

## Run

Open [index.html](/Users/nirchuk/Downloads/arcadeplustwo/Space_invaders/index.html) in a browser.

If you prefer a local server:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## Controls

- `A` / `D` or arrow keys: move
- `Space`: fire, with multiple player projectiles allowed
- `P`: pause
- `Enter`: start, confirm controls, or restart

## Startup Flow

- Title screen appears inside the game view
- `Enter` opens the controls panel
- Controls panel leads into a countdown
- Gameplay starts after the countdown finishes

## Sound Library

Generated retro arcade sound effects live in [assets/sounds](/Users/nirchuk/Downloads/arcadeplustwo/Space_invaders/assets/sounds) and are wired into the browser build.

- `player_shoot.wav`: player fire
- `alien_shoot.wav`: alien fire
- `alien_hit.wav`: alien destroyed
- `player_hit.wav`: player death
- `shield_hit.wav`: shield impact
- `alien_step_1.wav` to `alien_step_4.wav`: marching loop
- `ufo_loop.wav`: UFO pass
- `ufo_hit.wav`: UFO destroyed
- `countdown_beep.wav`: countdown ticks
- `countdown_go.wav`: start cue
- `wave_start.wav`: round start stinger
- `extra_life.wav`: bonus life cue
- `pause_toggle.wav`: pause toggle
- `game_over.wav`: game over cue
