// Headless calibration: how does a clean race, a paused race and an over-budget race end?
import { deriveClock } from '../src/sim/clock';
import { standings } from '../src/sim/standings';
import { MIN, VSC_BUDGET_SHARE, stopLimitFor } from '../src/sim/rules';
import type { ActiveRace, RaceEvent } from '../src/types';

function race(seed: number, grid: number, durMin: number, laps: number, events: (t0: number, lap: number) => RaceEvent[]): ActiveRace {
  const durationMs = durMin * MIN, vscBudgetMs = durationMs * VSC_BUDGET_SHARE;
  return {
    id: 'x',
    config: { trackId: 'qa-2004', roundId: '2026-qatar', format: 'gp', durationMs, laps, lapMs: durationMs / laps, vscBudgetMs,
      stopLimitMs: stopLimitFor(vscBudgetMs), seed, gridSlot: grid, teamId: 'williams', subject: '' },
    events: events(0, durationMs / laps), updatedAt: 0,
  };
}
const scen: Record<string, (t0: number, lap: number) => RaceEvent[]> = {
  clean: t => [{ type: 'start', t }],
  '3 short VSCs': (t, lap) => [{ type: 'start', t },
    { type: 'vsc_on', t: 10 * lap }, { type: 'vsc_off', t: 10 * lap + 60_000 },
    { type: 'vsc_on', t: 30 * lap + 60_000 }, { type: 'vsc_off', t: 30 * lap + 120_000 },
    { type: 'vsc_on', t: 45 * lap + 120_000 }, { type: 'vsc_off', t: 45 * lap + 180_000 }],
  '1 min over budget': (t, lap) => [{ type: 'start', t },
    { type: 'vsc_on', t: 20 * lap }, { type: 'vsc_off', t: 20 * lap + 7 * MIN }],
};
for (const [name, ev] of Object.entries(scen)) {
  const res: number[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const grid = 6 + (seed % 10);
    const r = race(seed * 7919, grid, 60, 57, ev);
    const c = deriveClock(r, 10 * 60 * MIN);
    const { rows } = standings(r.config, c);
    res.push(rows.find(x => x.car.isYou)!.position);
  }
  res.sort((a, b) => a - b);
  const avg = res.reduce((a, b) => a + b, 0) / res.length;
  console.log(name.padEnd(20), 'avg P' + avg.toFixed(1), 'best P' + res[0], 'worst P' + res.at(-1), 'wins', res.filter(x => x === 1).length);
}
