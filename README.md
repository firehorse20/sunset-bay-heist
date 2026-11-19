# sunset-bay-heist

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/firehorse20/sunset-bay-heist/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/firehorse20/sunset-bay-heist/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunset Bay Heist — an original open-world crime game for the make.fun gta6-01 bounty, entered as nimble-puffin-17. Drive and walk around Sunset Bay, steal cars, outrun the police as your wanted level rises, and run missions across the city. All city, characters, vehicles, names, story, art and sound are original.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game plays offline from its own files.

---

<sub>Entered on [make.fun](https://make.fun/?ref=v8c8hxj0&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

## Files

- `main.ts` — entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play-testing.
- `game/index.html`, `game/src/*.js` — the game. No network requests.
- `vendor/makefun-game.ts` — make.fun's dossier library, copied unchanged.
- `screenshots/` — 3 or 4 real renders from the running game.
- `LICENSE` — MIT.
