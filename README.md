# Pit Wall

Study sessions run as Formula 1 races. Your focus time drives your car around a real circuit;
a simulated 2026 field races around you. See `PROPOSAL.md` for the data model and rules.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, also on your LAN for phone testing
npm run build      # production build + service worker (installable PWA)
npm run sim:check  # headless calibration of the race sim
```

## Phase 1 (this build)

- Garage: pick subject, length (Sprint 25 / GP 45, 60, 90 min) and your team seat.
- Start lights, then one lap per `length / laps` of focus on Lusail (real geometry, 57 laps).
- VSC = pause. Budget 10% of race length with the field frozen; past it the field races on.
- DNF: two-step Retire, or one stop longer than max(10 min, 2 × budget).
- Timing tower with live intervals, F1-scaled lap times, fastest lap in purple.
- Everything persists (localStorage `pitwall:v1`). The clock is derived from a timestamped
  event log, so reloads, locked phones and closed tabs lose nothing; a race that ended
  while closed is filed on next open.
- Keyboard: Space toggles VSC.

## Credits

Circuit geometry: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT).
Team colours are approximations. Not affiliated with Formula 1.
