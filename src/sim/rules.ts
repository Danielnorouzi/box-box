import type { RaceFormat } from '../types';

export const MIN = 60_000;

export const FORMATS: Record<RaceFormat, { label: string; laps: (trackLaps: number) => number; durations: number[] }> = {
  sprint: { label: 'Sprint', laps: l => Math.round(l / 3), durations: [25] },
  gp: { label: 'Grand Prix', laps: l => l, durations: [45, 60, 90] },
};

export const VSC_BUDGET_SHARE = 0.1; // of race length
export const STOP_LIMIT_FLOOR = 10 * MIN; // a single stop longer than max(this, 2 × budget) is a DNF
export const MAX_PUSH = 0.006; // pace gain at full clean-lap streak
export const STREAK_FULL = 5; // clean laps to reach full push
export const GRID_GAP_LAPS = 0.0016; // ~8 m between grid slots, as a lap fraction

export const POINTS: Record<RaceFormat, number[]> = {
  gp: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  sprint: [8, 7, 6, 5, 4, 3, 2, 1],
};

export const pointsFor = (format: RaceFormat, position: number) => POINTS[format][position - 1] ?? 0;

export function stopLimitFor(vscBudgetMs: number) {
  return Math.max(STOP_LIMIT_FLOOR, 2 * vscBudgetMs);
}
