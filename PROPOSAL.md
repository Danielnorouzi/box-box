# Box Box — data model & structure

Status: built to the full brief. `src/types.ts` is the source of truth; this explains it.

## Principles

- **The race is an event log.** `ActiveRace.events` (start, pit_in, pit_out{tyre}, away, back, om, retire) replays
  deterministically through `sim/clock.ts` into focus time, the field's time, stops, stints, strikes and phase.
  Reloads, locked phones and closed tabs lose nothing; a race that ended while closed files on next open.
- **Progression is derived from append-only ledgers** (`store/derive.ts`): results, weekends, R&D purchases,
  contracts, activities. Credits, R&D levels, current team, skills, standings, trophies and passes are computed,
  never stored, so multi-device sync is a union with no conflicts (`sync/merge.ts`).
- **All tuning lives in `config/balance.ts`**, checked by `npm run balance:check`.

## Synced ledger

```ts
driver: PlayerDriver | null          // name, code, number, archetype, helmet {primary, secondary, accent, pattern}
history: RaceResult[]                // classification, credits + lines, tyres, strikes, weather …
weekends: Weekend[]                  // roundId, laps, weather, seed, ticket, rippedAt, practice, quali
purchases: { area, level, cost, season }[]
contracts: { team, t }[]             // latest wins; none = Kestrel Racing
declined: TeamId[]
activity: { activity, minutes, counted, day }[]   // counted = after the daily cap
active: ActiveRace | null
```

Local only: settings, current tab/weekend, practice/quali timers.

## Folders

```
src/config/balance.ts   every tuning number
src/data/               2026 calendar, teams + grid, circuits (generated geometry), grandstands
src/sim/                clock (event log → state), race (field, pace, tyres, quali, OM), progression, setup
src/store/              zustand store (IndexedDB), derive (credits, standings, trophies, passes)
src/three/              geometry helpers, Car, DriverFigure, Trophy, Cabinet, Podium, Stage, quality tiers
src/features/           garage, weekend (ticket, practice, quali), race, result, season, car, driver, album, settings
src/lib/                sound (Web Audio), radio (engineer), haptics, ticket, helmets, format
src/sync/ + server/     merge, client, dependency-free sync server
scripts/                circuit geometry builder, balance simulator, single-file artifact inliner
```
