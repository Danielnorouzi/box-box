# Box Box

Study sessions run as Formula 1 races. Your focus time drives your car around a real 2026
circuit while a simulated grid races around you. See `PROPOSAL.md` for the data model and rules.

## Run

```bash
npm install
npm run dev            # http://localhost:5173 (also on your LAN for phone testing)
npm run build          # production build + service worker (installable, works offline)
npm run build:artifact # single-file preview build, no service worker
npm run sim:check      # headless calibration of the race sim
node server/server.mjs # optional sync server (PORT=8787, DATA_DIR=./server-data)
```

## What's in it

| Phase | Feature |
| --- | --- |
| 1 | Lap-time race timer, start lights, VSC budget, DNF rules, timing tower, event-log clock that survives reloads |
| 2 | Tickets: units of study work you enter into races; focus and race counts per ticket; close from the result screen |
| 3 | 2026 calendar (22 races, Bahrain and Saudi Arabia cancelled), all circuits with real geometry, drivers' standings across the rounds you've raced |
| 4 | 3D garage car in your team colour (react-three-fiber, lazy-loaded, studio lighting built in code, no downloads) |
| 5 | Logbook with focus heatmap, streak and activity feed; IndexedDB storage (migrates Phase 1 data); install button, update prompt, screen wake lock during races |
| 6 | Multi-device sync: tiny dependency-free server, client-side merge (results/activity union, tickets last-write-wins with tombstones), optimistic concurrency; JSON backup export/import |
| + | Start sounds: a tone per light and the grid launching at lights out, synthesised with Web Audio (toggle in Settings) |

## Scoring

- Championship: per round, your latest Grand Prix counts, plus your latest Sprint on the six sprint
  weekends. A Sprint at any other round is practice and scores nothing. Every car in a counted race
  scores, so you are ranked against the grid.

## Sync server

`server/server.mjs` stores one JSON document per sync key (hashed on disk) with a version
number. `GET /v1/state` and `PUT /v1/state {baseVersion, state}`; a stale write gets 409 and the
client re-merges. Put it behind HTTPS (any small VPS, Fly.io, Render, a home server with a tunnel)
and set `ALLOW_ORIGIN` to your app's origin.

## Credits

Circuit geometry: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT).
Team colours are approximations. Not affiliated with Formula 1.
