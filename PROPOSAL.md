# Box Box — data model & structure

Status: Phases 1–6 built. `src/types.ts` is the source of truth; this file explains it.

## Core idea

A study session is a race. Your focus time drives your car; the field is simulated around you.
The timing tower is your progress display. Everything is derived from a short, timestamped
**event log**, so a reload, a backgrounded tab or a phone lock never loses a second.

## Race rules (Phase 1)

| Thing | Rule |
| --- | --- |
| Race length | Sprint = 25 min / 19 laps. Grand Prix = 45, 60 or 90 min / 57 laps (Lusail's real count). |
| Lap time | `duration / laps` in real time. Displayed lap times are scaled to the real circuit (~1:24 at Lusail). |
| Grid | Seeded "qualifying" puts you P6–P15. |
| Green flag | Your car moves only while you are focused (timer running). |
| VSC | Pausing deploys a Virtual Safety Car: the whole field is frozen, you hold position. Budget = 10% of race length. |
| Over budget | VSC is withdrawn while you are still stopped: the field races on without you. |
| Clean laps | A lap with no VSC is clean. Consecutive clean laps build pace (up to +0.6%), reset by any VSC. |
| DNF | You retire (two-step button), or a single stop lasts longer than `max(10 min, 2 × budget)`. |
| Points | 25-18-15-12-10-8-6-4-2-1. Sprint pays 8-7-6-5-4-3-2-1. DNF scores 0. |

## Types (src/types.ts)

```ts
type RaceEvent =
  | { type: 'start'; t: number }        // epoch ms
  | { type: 'vsc_on'; t: number }       // pause
  | { type: 'vsc_off'; t: number }      // resume
  | { type: 'retire'; t: number }
  | { type: 'finish'; t: number };      // committed once derived, so history is stable

interface RaceConfig {
  trackId: TrackId; format: 'sprint' | 'gp';
  durationMs: number; laps: number; lapMs: number;
  vscBudgetMs: number; stopLimitMs: number;
  seed: number; gridSlot: number; teamId: TeamId; subject: string;
}

interface ActiveRace { id: string; config: RaceConfig; events: RaceEvent[] }

interface RaceResult {
  id: string; trackId; format; subject; teamId;
  startedAt: number; endedAt: number;
  status: 'finished' | 'dnf'; dnfReason?: 'retired' | 'stopped';
  position: number; gridSlot: number; points: number;
  lapsCompleted: number; focusMs: number; vscUsedMs: number;
  cleanLaps: number; bestLapF1Ms: number;
}

interface PersistedState {          // zustand persist → localStorage key "pitwall:v1"
  version: 1;
  teamId: TeamId;                    // your seat
  active: ActiveRace | null;
  history: RaceResult[];             // newest first
}
```

Derived, never stored: `ClockState` (focus/sim time, phase, laps), standings, gaps.

### Phases 2–6 (built)

Ticket, ActivityEntry, Settings and the 2026 Round list are in `src/types.ts` and `src/data/calendar.ts`.
Sync merge rules are in `src/sync/merge.ts`. The original sketch is kept below for reference.

### Original sketch

```ts
// Phase 2 — tickets: a unit of study work you "enter" into a race
interface Ticket { id; title; subject; estimateLaps?; status: 'open' | 'in_race' | 'done'; raceIds: string[] }
// Phase 3 — calendar: real 2026 rounds, each unlocks its circuit
interface Round { round; trackId; name; raceDate: string; sprint: boolean }
// Phase 4 — 3D garage assets (react-three-fiber), team liveries
// Phase 5 — activity log / PWA: ActivityEntry { t; kind; raceId?; ticketId? }, install + offline
// Phase 6 — sync: same PersistedState pushed to a backend; event logs merge by id
```

Storage: IndexedDB (`idb-keyval`, key `boxbox:v2`), falling back to localStorage when IndexedDB is
blocked. Phase 1's `pitwall:v1` localStorage data is imported and migrated on first open.

## Folder structure

```
pit-wall/
├─ PROPOSAL.md                 this file
├─ scripts/build-track.mjs     GeoJSON → SVG geometry (add circuits here)
├─ src/
│  ├─ data/                    static: teams, tracks (+ generated geometry.ts), 2026 calendar
│  ├─ sim/                     pure, framework-free: rng, rules, clock (event log → state), standings
│  ├─ store/                   zustand store + persistence
│  ├─ features/
│  │  ├─ garage/               race setup + season results
│  │  ├─ race/                 track map, timing tower, lap clock, controls
│  │  ├─ result/               classification after the flag
│  │  ├─ season/ tickets/ logbook/ settings/
│  ├─ sync/                    merge (pure) + client
├─ server/server.mjs           optional sync server, no dependencies
│  ├─ hooks/  lib/  styles/
│  └─ App.tsx  main.tsx  types.ts
```

`sim/` has no React imports and is checked by `npm run sim:check` (a headless calibration run).
