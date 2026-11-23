import type { RaceConfig, TeamId } from '../types';
import { TEAMS } from '../data/teams';
import { trackOf } from '../data/tracks';
import { GRID_GAP_LAPS, MAX_PUSH, STREAK_FULL } from './rules';
import { hash, rng } from './rng';
import type { ClockState } from './clock';

export interface Car {
  code: string;
  teamId: TeamId;
  color: string;
  isYou: boolean;
  gridSlot: number;
  pace: number; // relative to a neutral 1.0
  wobbleAmp: number;
  wobbleFreq: number;
  wobblePhase: number;
}

export interface Lap {
  n: number;
  clean: boolean;
  push: number; // 0..MAX_PUSH
  f1Ms: number; // displayed lap time, scaled to the real circuit
}

export interface StandingRow {
  car: Car;
  position: number;
  distance: number; // laps, fractional
  gapToLeaderS: number;
  intervalS: number;
  lapsDown: number;
}

const fieldCache = new Map<string, Car[]>();

/** The 22-car grid. You take the second seat of your chosen team. */
export function buildField(cfg: RaceConfig): Car[] {
  const key = `${cfg.seed}:${cfg.teamId}:${cfg.gridSlot}`;
  const hit = fieldCache.get(key);
  if (hit) return hit;
  const r = rng(cfg.seed);
  const rivals: Omit<Car, 'gridSlot'>[] = [];
  for (const t of TEAMS) {
    t.drivers.forEach((code, i) => {
      if (t.id === cfg.teamId && i === 1) return;
      rivals.push({
        code, teamId: t.id, color: t.color, isYou: false,
        // Tier spacing ~0.004 per tier; the quickest car edges a fully pushed you.
        pace: 1.0058 - t.tier * 0.0042 + (r() - 0.5) * 0.004,
        wobbleAmp: 0.002 + r() * 0.004,
        wobbleFreq: 0.08 + r() * 0.12,
        wobblePhase: r() * Math.PI * 2,
      });
    });
  }
  // Qualifying: rivals sorted by pace plus a bit of luck fill every slot except yours.
  const quali = rivals
    .map(c => ({ c, q: c.pace + (r() - 0.5) * 0.006 }))
    .sort((a, b) => b.q - a.q);
  const cars: Car[] = [];
  let slot = 1;
  for (const { c } of quali) {
    if (slot === cfg.gridSlot) slot++;
    cars.push({ ...c, gridSlot: slot++ });
  }
  const team = TEAMS.find(t => t.id === cfg.teamId)!;
  cars.push({
    code: 'YOU', teamId: team.id, color: team.color, isYou: true, gridSlot: cfg.gridSlot,
    pace: 1, wobbleAmp: 0, wobbleFreq: 0, wobblePhase: 0,
  });
  fieldCache.set(key, cars);
  return cars;
}

/** Your laps so far, including the one in progress (last entry, if any). */
export function yourLaps(cfg: RaceConfig, clock: ClockState): Lap[] {
  const { lapMs, laps: total, seed } = cfg;
  const ref = trackOf(cfg.trackId).refLapMs;
  const done = Math.min(total, Math.ceil(clock.focusMs / lapMs - 1e-9));
  const out: Lap[] = [];
  let streak = 0;
  for (let i = 0; i < done; i++) {
    const lo = i * lapMs, hi = lo + lapMs;
    const clean = !clock.pausePoints.some(p => p >= lo && p < hi);
    streak = clean ? streak + 1 : 0;
    const push = (MAX_PUSH * Math.min(streak, STREAK_FULL)) / STREAK_FULL;
    const jitter = (rng(hash(seed, i))() - 0.5) * 600;
    const base = clean ? ref * (1 - push * 3) : ref * 1.36;
    const startBonus = i === 0 ? 2_600 : 0; // standing start
    out.push({ n: i + 1, clean, push, f1Ms: Math.round(base + jitter + startBonus) });
  }
  return out;
}

function yourDistance(cfg: RaceConfig, clock: ClockState, laps: Lap[]) {
  let bonus = 0;
  laps.forEach((l, i) => {
    const covered = Math.min(1, clock.focusMs / cfg.lapMs - i);
    bonus += l.push * covered;
  });
  return clock.focusMs / cfg.lapMs + bonus - (cfg.gridSlot - 1) * GRID_GAP_LAPS;
}

function rivalDistance(cfg: RaceConfig, car: Car, simMs: number) {
  const x = simMs / cfg.lapMs;
  const wob = car.wobbleAmp * (Math.sin(x * car.wobbleFreq * Math.PI * 2 + car.wobblePhase) - Math.sin(car.wobblePhase));
  return x * car.pace + wob - (car.gridSlot - 1) * GRID_GAP_LAPS;
}

export function standings(cfg: RaceConfig, clock: ClockState): { rows: StandingRow[]; laps: Lap[] } {
  const field = buildField(cfg);
  const laps = yourLaps(cfg, clock);
  const ref = trackOf(cfg.trackId).refLapMs / 1000;
  const raw = field.map(car => ({
    car,
    distance: car.isYou ? yourDistance(cfg, clock, laps) : rivalDistance(cfg, car, clock.simMs),
  }));
  // Before the start, order by grid.
  if (clock.phase === 'grid') raw.sort((a, b) => a.car.gridSlot - b.car.gridSlot);
  else raw.sort((a, b) => b.distance - a.distance);
  const lead = raw[0].distance;
  const rows = raw.map((r, i) => {
    const down = Math.floor(lead - r.distance);
    return {
      car: r.car,
      position: i + 1,
      distance: r.distance,
      gapToLeaderS: (lead - r.distance) * ref,
      intervalS: i === 0 ? 0 : (raw[i - 1].distance - r.distance) * ref,
      lapsDown: down,
    };
  });
  return { rows, laps };
}
