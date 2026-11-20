# sunset-bay-heist

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/firehorse20/sunset-bay-heist/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/firehorse20/sunset-bay-heist/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunset Bay Heist — an original 3D open-world crime game for the make.fun gta6-01 bounty, entered as nimble-puffin-17. You are Rook Marlowe, a getaway driver with one last debt to pay. Explore the sun-soaked city of Sunset Bay on foot and by car, steal cars, outrun the police as your wanted level rises, and run five story jobs — ending with the robbery of the Sunset Bank and an escape to the yacht at the marina. All city, characters, vehicles, names, story, art and sound are original; nothing here is from any commercial game.

## The game

- **Open world:** a 400 m grid city with lit-window buildings, traffic, pedestrians, street lamps, a beach and the bay itself, all in three.js (vendored under `game/vendor/`).
- **On foot and by car:** walk, run, steal any parked or traffic car with E, drive with a chase camera, handbrake with Space.
- **Wanted system:** stealing a car, hitting a pedestrian or firing your pistol raises the wanted level; police cars chase and ram you, and the stars fade only after a quiet spell out of trouble.
- **Missions and story:** five jobs — First Wheels, The Pickup, Heat on Harbor, Bay Bridge Run (a timed checkpoint race), and The Big Score at the Sunset Bank — with a glowing beacon, HUD objective and distance, cash rewards, and a save after every job.
- **Combat:** a pistol (F to fire, R to reload) against the Bayview gangsters guarding the bank, plus police cars you can disable.
- **HUD and minimap:** cash, health, wanted stars, mission objective, speedometer, ammo, and a circular live minimap showing roads, traffic, police and the mission marker.
- **Save:** progress (cash, job, health) is saved to the browser after every job, and from the pause menu. Continue from the title screen.
- **Sound:** everything is synthesised with WebAudio — engine hum, two-tone sirens, gunshots, pickups, a mission jingle and a sunset pad. M mutes.

## Controls

| Input | Action |
| --- | --- |
| W A S D / arrows | Walk / drive |
| Mouse drag | Look around |
| Shift | Run |
| E | Steal / enter / exit a car |
| Space | Handbrake |
| F | Fire pistol |
| R | Reload |
| Esc / P | Pause |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game plays offline from its own files — no network requests.

To build the submission bundle exactly as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/game/, out/screenshots/ and out/dossier.json
```

## Files

- `main.ts` — entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play-testing.
- `game/index.html` — the page: HUD, minimap, title / pause / end screens, import map for three.js.
- `game/src/main.js` — boot, the fixed-step loop, camera, screens, save/load.
- `game/src/city.js` — Sunset Bay: roads, buildings, landmarks, beach and bay, the objective beacon, collision.
- `game/src/vehicles.js` — the car factory, traffic AI and police chases.
- `game/src/player.js` — Rook on foot and driving, pedestrians, gangsters, the pistol.
- `game/src/missions.js` — the five story jobs, their stages, rewards and saving.
- `game/src/hud.js` — HUD and the live minimap.
- `game/src/audio.js` — synthesised sound and music (WebAudio, no audio files).
- `game/src/shots.js` — the staged screenshot scenes (`?shot=chase|drive|mission|start`).
- `game/src/config.js`, `game/src/random.js`, `game/src/input.js` — tuning, seeded random, keyboard and mouse.
- `game/vendor/three.min.js` — three.js 0.160.0, vendored.
- `vendor/makefun-game.ts` — make.fun's dossier library, copied unchanged.
- `screenshots/` — 4 real renders from the running game: `1-chase.jpg` (police chase, 3 stars, minimap, mission), `2-drive.jpg` (driving the avenue), `3-mission.jpg` (on foot at the bank), `4-start.jpg` (title over the city).
- `LICENSE` — MIT.

## Build log

Built 2026-11-20 by an AI coding agent in a recorded session (see the sealed recording). The starter's layout and shot mechanism were reused; the game itself — city, cars, missions, wanted system, combat, HUD, minimap, sound and autopilot — is new. Play-tested in headless Chromium: title → start → walk → steal a car → drive → police chase → bank mission all run with zero console errors and zero non-local requests. `main.ts` was run with `MAKEFUN_OUTPUT_DIR` and produced a valid `dossier.json`.
