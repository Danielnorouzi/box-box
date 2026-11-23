import type { RaceConfig, TeamId, TyreId } from '../types';
import { DRIVER, GRID, OVERTAKE, PIT, RIVAL_DEV, RIVALS, TEAM_DEFICIT, TYRES, TYRE_RULES, WEATHER, RND } from '../config/balance';
import { TEAMS, markerColor } from '../data/teams';
import { trackOf } from '../data/tracks';
import { hash, rng } from './rng';
import type { ClockState } from './clock';

export interface Car {
  code: string;
  name: string;
  number: number;
  teamId: TeamId;
  color: string;
  isYou: boolean;
  gridSlot: number;
  pace: number; // relative to 1.0
  wet: number; // 0..1
  wobble: [number, number, number];
  pitAt: number | null; // race-distance lap of the rival's stop
  dnfAt: number | null; // lap the car stops, if it does
  errorRate: number;
}

export interface Lap { n: number; f1Ms: number; tyre: TyreId; clean: boolean; om: boolean; error: boolean; sectors: [number, number, number] }

export interface Row {
  car: Car;
  position: number;
  distance: number; // laps, true race distance
  shown: number; // laps, as drawn on the map (aligned to your focus clock)
  gapToLeaderS: number;
  intervalS: number;
  lapsDown: number;
  dnf: boolean;
  inPit: boolean;
}

const gauss = (r: () => number) => {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const needsStop = (cfg: Pick<RaceConfig, 'laps' | 'weather'>) => cfg.weather === 'dry' && cfg.laps >= TYRE_RULES.mandatoryStopLaps;
export const stintLaps = (tyre: TyreId, laps: number) => Math.max(2, Math.round(TYRES[tyre].stint * Math.max(laps, 12)));

const cache = new Map<string, Car[]>();

/** The grid: 22 drivers plus you. On Kestrel you're a 23rd entry; elsewhere you take a team's second seat. */
export function buildField(cfg: RaceConfig): Car[] {
  const key = `${cfg.seed}:${cfg.teamId}:${cfg.gridSlot}:${cfg.you.code}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(cfg.seed);
  const rivals: Omit<Car, 'gridSlot'>[] = [];
  for (const t of TEAMS) {
    t.drivers.forEach((d, i) => {
      if (t.id === cfg.teamId && i === 1) return;
      const dnf = r() < RIVALS.dnfChancePerRace * (cfg.laps / 20);
      const [a, b] = RIVALS.pitLapWindow;
      rivals.push({
        code: d.code, name: d.name, number: d.number, teamId: t.id, color: markerColor(t), isYou: false,
        pace: 1 - TEAM_DEFICIT[t.id] + RIVAL_DEV[t.id] * cfg.seasonProgress + (r() - 0.5) * RIVALS.driverSpread + gauss(r) * RIVALS.raceForm,
        wet: r(),
        wobble: [0.002 + r() * 0.003, 0.08 + r() * 0.12, r() * Math.PI * 2],
        pitAt: needsStop(cfg) ? cfg.laps * (a + r() * (b - a)) : null,
        dnfAt: dnf ? 1 + r() * (cfg.laps - 1.5) : null,
        errorRate: RIVALS.errorChancePerLap * (0.5 + r()),
      });
    });
  }
  const order = rivals.map(c => ({ c, q: qualiPace(c.pace, cfg, r) })).sort((x, y) => y.q - x.q);
  const cars: Car[] = [];
  let slot = 1;
  for (const { c } of order) {
    if (slot === cfg.gridSlot) slot++;
    cars.push({ ...c, gridSlot: slot++ });
  }
  const team = TEAMS.find(t => t.id === cfg.teamId)!;
  cars.push({
    code: cfg.you.code, name: 'You', number: cfg.you.number, teamId: cfg.teamId, color: markerColor(team), isYou: true,
    gridSlot: cfg.gridSlot, pace: 1 + cfg.you.carPace + yourDriverPace(cfg), wet: cfg.you.skills.wet,
    wobble: [0, 0, 0], pitAt: null, dnfAt: null, errorRate: 0,
  });
  cache.set(key, cars);
  return cars;
}

function qualiPace(pace: number, cfg: RaceConfig, r: () => number) {
  return pace + gauss(r) * 0.0025 * (cfg.weather === 'rain' ? 2 : 1);
}

export function yourDriverPace(cfg: Pick<RaceConfig, 'you' | 'weather'>) {
  const s = cfg.you.skills;
  const avg = (s.fitness + s.consistency + s.racecraft + s.reflexes) / 4;
  let p = DRIVER.effects.base * avg;
  if (cfg.weather === 'rain') p += (s.wet - 0.5) * DRIVER.effects.wetRange;
  return p;
}

/** Your qualifying: the grid slot and a lap time. Aborting sends you to the back. */
export function qualify(cfg: Omit<RaceConfig, 'gridSlot'>, aborted: boolean) {
  const r = rng(hash(cfg.seed, 7));
  const fieldPaces: number[] = [];
  for (const t of TEAMS) t.drivers.forEach((_, i) => {
    if (t.id === cfg.teamId && i === 1) return;
    fieldPaces.push(qualiPace(1 - TEAM_DEFICIT[t.id] + RIVAL_DEV[t.id] * cfg.seasonProgress + (r() - 0.5) * RIVALS.driverSpread, cfg as RaceConfig, r));
  });
  const mine = 1 + cfg.you.carPace + yourDriverPace(cfg) + cfg.you.skills.reflexes * DRIVER.effects.reflexesQuali + gauss(r) * 0.0018;
  const grid = aborted ? fieldPaces.length + 1 : 1 + fieldPaces.filter(p => p > mine).length;
  const ref = trackOf(cfg.trackId).refLapMs * 0.965; // a qualifying lap is quicker than a race lap
  return { grid, lapF1Ms: Math.round(ref / mine) };
}

/** Your laps, including the one in progress. Deterministic from the seed and the clock. */
export function yourLaps(cfg: RaceConfig, c: ClockState): Lap[] {
  const ref = trackOf(cfg.trackId).refLapMs;
  const total = Math.min(cfg.laps, Math.ceil(c.focusMs / cfg.lapMs - 1e-9));
  const sk = cfg.you.skills;
  const rain = cfg.weather === 'rain';
  const wearCut = 1 - RND.reliabilityWearCut * cfg.you.reliability;
  const errChance = DRIVER.effects.errorChancePerLap * (1 - sk.consistency * 0.85) * (1 - RND.reliabilityErrorCut * cfg.you.reliability) * (rain ? WEATHER.rainErrorMult : 1);
  const noise = DRIVER.effects.consistencyNoise * (1 - sk.consistency * 0.7) * (rain ? WEATHER.rainNoiseMult : 1);
  const form = gauss(rng(hash(cfg.seed, 55))) * DRIVER.effects.raceForm * (1 - 0.5 * sk.consistency);
  const base = 1 + cfg.you.carPace + yourDriverPace(cfg) + sk.racecraft * DRIVER.effects.racecraftClose * 0.5 + form;
  const out: Lap[] = [];
  for (let i = 0; i < total; i++) {
    const lo = i * cfg.lapMs, hi = lo + cfg.lapMs;
    const stint = [...c.stints].reverse().find(s => s.fromFocusMs <= lo + 1) ?? c.stints[0];
    const stintLap = Math.floor((lo - stint.fromFocusMs) / cfg.lapMs + 1e-9);
    const t = TYRES[stint.tyre];
    const life = stintLaps(stint.tyre, cfg.laps);
    const over = Math.max(0, stintLap + 1 - life);
    // Wear is measured from the stint's midpoint, so a stint of the designed length is neutral on average.
    let pace = base + t.pace - TYRE_RULES.wearBeforeCliff * (stintLap - life / 2) * wearCut - TYRE_RULES.cliffPerLap * over * wearCut;
    if (i / cfg.laps > 0.6) pace -= DRIVER.effects.fitnessFade * (0.5 - sk.fitness); // vs an average-fitness field
    const om = c.omAt.some(f => f >= lo && f < hi);
    if (om) pace += OVERTAKE.boost;
    const r = rng(hash(cfg.seed, 101, i));
    pace += gauss(r) * noise;
    const error = r() < errChance;
    const clean = !c.absences.some(a => a.strike && a.focusAt >= lo && a.focusAt < hi) && !error;
    const f1 = ref / pace + (error ? DRIVER.effects.errorCostLaps * ref : 0) + (i === 0 ? 2600 : 0);
    const split = [0.33 + (r() - 0.5) * 0.01, 0.34 + (r() - 0.5) * 0.01];
    const sectors: [number, number, number] = [Math.round(f1 * split[0]), Math.round(f1 * split[1]), 0];
    sectors[2] = Math.round(f1) - sectors[0] - sectors[1];
    out.push({ n: i + 1, f1Ms: Math.round(f1), tyre: stint.tyre, clean, om, error, sectors });
  }
  return out;
}

function yourDistance(cfg: RaceConfig, c: ClockState, laps: Lap[]) {
  const ref = trackOf(cfg.trackId).refLapMs;
  const focusLaps = c.focusMs / cfg.lapMs;
  let d = 0;
  laps.forEach((l, i) => {
    const covered = Math.min(1, focusLaps - i);
    d += covered * (ref / l.f1Ms) * (i === 0 ? 1.03 : 1); // lap one includes the standing start
  });
  d += cfg.you.skills.reflexes * DRIVER.effects.reflexesStart * Math.min(1, focusLaps);
  const stops = c.stops.length;
  d -= (stops * PIT.lossS * 1000 + stops * PIT.extraLossVarS * 1000 * (1 - cfg.you.reliability)) / ref;
  d -= (cfg.gridSlot - 1) * GRID.gapLaps;
  if (c.phase === 'finished' && needsStop(cfg) && stops === 0) d -= (TYRE_RULES.missedStopPenaltyS * 1000) / ref;
  return d;
}

function rivalDistance(cfg: RaceConfig, car: Car, simMs: number) {
  const x = simMs / cfg.lapMs;
  const stopX = car.dnfAt !== null ? Math.min(x, car.dnfAt) : x;
  const [amp, freq, ph] = car.wobble;
  const rainPace = cfg.weather === 'rain' ? (car.wet - 0.5) * DRIVER.effects.wetRange : 0;
  let d = stopX * (car.pace + rainPace) + amp * (Math.sin(stopX * freq * Math.PI * 2 + ph) - Math.sin(ph));
  const r = rng(hash(cfg.seed, 202, car.number));
  const rate = car.errorRate * (cfg.weather === 'rain' ? WEATHER.rainErrorMult : 1);
  for (let i = 0; i < Math.floor(stopX); i++) if (r() < rate) d -= RIVALS.errorCostLaps;
  const ref = trackOf(cfg.trackId).refLapMs;
  if (car.pitAt !== null && stopX > car.pitAt) d -= (PIT.lossS * 1000) / ref;
  return d - (car.gridSlot - 1) * GRID.gapLaps;
}

export function standings(cfg: RaceConfig, c: ClockState): { rows: Row[]; laps: Lap[] } {
  const field = buildField(cfg);
  const laps = yourLaps(cfg, c);
  const refS = trackOf(cfg.trackId).refLapMs / 1000;
  const focusLaps = c.focusMs / cfg.lapMs;
  const youD = yourDistance(cfg, c, laps);
  const raw = field.map(car => {
    const distance = car.isYou ? youD : rivalDistance(cfg, car, c.simMs);
    const x = c.simMs / cfg.lapMs;
    const dnf = car.isYou ? c.phase === 'dnf' : car.dnfAt !== null && x >= car.dnfAt;
    const inPit = car.isYou ? c.phase === 'pit' : car.pitAt !== null && x > car.pitAt && x < car.pitAt + 0.12;
    return { car, distance, dnf, inPit };
  });
  if (c.phase === 'grid') raw.sort((a, b) => a.car.gridSlot - b.car.gridSlot);
  else raw.sort((a, b) => Number(a.dnf) - Number(b.dnf) || b.distance - a.distance);
  const lead = raw[0].distance;
  const offset = focusLaps - youD; // draw everyone relative to your lap counter
  const rows = raw.map((r, i) => ({
    car: r.car,
    position: i + 1,
    distance: r.distance,
    shown: r.car.isYou ? focusLaps : r.distance + offset,
    gapToLeaderS: (lead - r.distance) * refS,
    intervalS: i === 0 ? 0 : Math.max(0, (raw[i - 1].distance - r.distance) * refS),
    lapsDown: Math.max(0, Math.floor(lead - r.distance)),
    dnf: r.dnf,
    inPit: r.inPit,
  }));
  return { rows, laps };
}

/** Overtake Mode charges: one per N consecutive laps without a strike, capped, minus those used. */
export function overtakeCharges(cfg: RaceConfig, c: ClockState) {
  const done = Math.floor(c.focusMs / cfg.lapMs + 1e-9);
  const strikes = c.absences.filter(a => a.strike).map(a => a.focusAt);
  let earned = 0, run = 0;
  for (let i = 0; i < done; i++) {
    const lo = i * cfg.lapMs, hi = lo + cfg.lapMs;
    if (strikes.some(f => f >= lo && f < hi)) { run = 0; continue; }
    if (++run === OVERTAKE.cleanLapsPerCharge) { earned++; run = 0; }
  }
  const used = c.omAt.length;
  return { available: Math.max(0, Math.min(OVERTAKE.maxCharges, earned - used)), used, left: OVERTAKE.maxUsesPerRace - used };
}
