// Every tuning number in the game. Change balance here, then run `npm run balance:check`,
// which simulates a typical player and reports hours to each milestone.
//
// Paces are fractions of lap distance per lap: +0.010 means 1% quicker than a neutral car.
// Targets (brief): first points ~5 h, first podium ~15-20 h, first win ~40-60 h, title fight ~200 h.

import type { TeamId } from '../types';

export const TIME = {
  /** Study minutes per lap = real lap time in seconds / 30, so real ms per lap = F1 lap ms × 2. */
  studyPerF1: 2,
  lapPresets: [5, 10, 15, 20],
  minLaps: 3,
};

/** Car pace deficit to the quickest car, before upgrades. A game ladder, not a claim about real teams. */
export const TEAM_DEFICIT: Record<TeamId, number> = {
  mclaren: 0,
  ferrari: 0.0019,
  redbull: 0.0026,
  mercedes: 0.004,
  audi: 0.0098,
  aston: 0.0103,
  williams: 0.0107,
  rb: 0.0112,
  alpine: 0.0117,
  haas: 0.0122,
  cadillac: 0.0128,
  kestrel: 0.0134,
};

/** How much each team's car improves from round 1 to the finale. */
export const RIVAL_DEV: Record<TeamId, number> = {
  mclaren: 0.0015, ferrari: 0.0018, redbull: 0.0016, mercedes: 0.0018, audi: 0.0022, aston: 0.0016,
  williams: 0.0016, rb: 0.0014, alpine: 0.0014, haas: 0.0014, cadillac: 0.0024, kestrel: 0,
};

export const RIVALS = {
  driverSpread: 0.0026, // ± per-driver skill on top of the car
  raceForm: 0.0018, // sd of each car's pace on the day
  lapNoise: 0.004, // per-lap variation
  errorChancePerLap: 0.012,
  errorCostLaps: 0.012,
  dnfChancePerRace: 0.085, // per car, scaled by race length
  pitLapWindow: [0.35, 0.65] as [number, number], // share of race distance where rivals stop
};

export const GRID = {
  gapLaps: 0.0016, // ~8 m between slots
  noQualiSlot: 'back' as const,
};

export const RND = {
  areas: {
    aero: { label: 'Aero', max: 0.0019, rate: 0.32, blurb: 'Downforce through the quick corners.' },
    pu: { label: 'Power Unit', max: 0.0019, rate: 0.32, blurb: 'Straight-line speed and energy deployment.' },
    chassis: { label: 'Chassis', max: 0.0012, rate: 0.34, blurb: 'Weight, balance and mechanical grip.' },
    reliability: { label: 'Reliability', max: 0, rate: 0.1, blurb: 'Slower tyre wear, fewer driver errors, steadier pit stops.' },
  },
  maxLevel: 20,
  baseCost: 18,
  costGrowth: 1.27,
  seasonCap: 9000, // credits that can be spent on R&D in one season
  reliabilityWearCut: 0.45, // at full reliability, tyre wear × (1 - this)
  reliabilityErrorCut: 0.4,
};

export const CREDITS = {
  perFocusMinute: 1,
  finishBonus: 10,
  pointsToCredits: 1, // + championship points scored
  cleanBonus: 0.15, // no strikes, no over-long stops
  streakPerDay: 0.02,
  streakCap: 0.2,
  rainBonus: 0.25,
  practice: 5,
  quali: 5,
};

export const TYRES = {
  soft: { label: 'Soft', color: '#ff4b4b', stint: 0.33, pace: 0.0045, mult: 1.15 },
  medium: { label: 'Medium', color: '#ffd23f', stint: 0.55, pace: 0.0015, mult: 1.0 },
  hard: { label: 'Hard', color: '#f2f2f2', stint: 0.85, pace: -0.001, mult: 0.9 },
  inter: { label: 'Intermediate', color: '#39d07b', stint: 1.2, pace: 0, mult: 1.0 },
} as const;
export const TYRE_RULES = {
  cliffPerLap: 0.011, // pace lost per lap past the stint length
  wearBeforeCliff: 0.0004, // gentle fade across the stint, per lap
  mandatoryStopLaps: 10, // dry races this long need one stop
  missedStopPenaltyS: 30,
};

export const PIT = {
  allowanceMs: 5 * 60_000, // a normal break; the field waits for you
  lossS: 22, // F1 seconds lost in the pit lane
  extraLossVarS: 1.5, // reduced by reliability
};

export const ABSENCE = {
  graceMs: 15_000, // a glance at a notification is free
  strikesToDnf: 3,
  longMs: 3 * 60_000, // one absence this long is a DNF
};

export const OVERTAKE = {
  cleanLapsPerCharge: 3,
  maxCharges: 2,
  maxUsesPerRace: 3,
  boost: 0.012,
};

export const DRIVER = {
  // XP is minutes; skill = 100 × (1 − e^(−xp / scale)).
  skills: {
    fitness: { label: 'Fitness', scale: 6000, blurb: 'Holds pace late in the race.' },
    consistency: { label: 'Consistency', scale: 30000, blurb: 'Fewer mistakes, tighter laps.' },
    racecraft: { label: 'Racecraft', scale: 4000, blurb: 'Better at passing and defending.' },
    reflexes: { label: 'Reflexes', scale: 5000, blurb: 'Sharper starts and qualifying laps.' },
    wet: { label: 'Wet weather', scale: 1500, blurb: 'Confidence when it rains.' },
  },
  activities: {
    gym: { label: 'Gym', skill: 'fitness', dailyCapMin: 90, unit: 'min' },
    sleep: { label: 'Sleep', skill: 'consistency', dailyCapMin: 540, unit: 'h' },
    reading: { label: 'Reading', skill: 'racecraft', dailyCapMin: 60, unit: 'min' },
    sport: { label: 'Sport', skill: 'reflexes', dailyCapMin: 120, unit: 'min' },
    swim: { label: 'Swim', skill: 'wet', dailyCapMin: 60, unit: 'min' },
  },
  rainRaceWetXpPerMin: 0.5,
  effects: {
    base: 0.002, // pace at full average skill
    raceForm: 0.0022, // sd of your pace on the day, cut by consistency
    fitnessFade: 0.002, // late-race pace vs an average-fitness field, per 0.5 of skill
    consistencyNoise: 0.004,
    errorChancePerLap: 0.03,
    errorCostLaps: 0.015,
    racecraftClose: 0.0025, // extra pace when within a second of the car ahead
    reflexesStart: 0.003, // lap-1 gain
    reflexesQuali: 0.0015,
    wetRange: 0.008, // rain pace from 0 to 100 wet skill spans this
  },
  archetypes: {
    racer: { label: 'Racer', blurb: 'Lives for wheel-to-wheel.', boost: { racecraft: 400, reflexes: 200 } },
    qualifier: { label: 'Qualifier', blurb: 'One lap, all in.', boost: { reflexes: 500, consistency: 300 } },
    tyreWhisperer: { label: 'Tyre whisperer', blurb: 'Makes a stint last.', boost: { consistency: 1200, fitness: 200 } },
    rainmaster: { label: 'Rainmaster', blurb: 'Smiles when the clouds roll in.', boost: { wet: 400, racecraft: 150 } },
  },
};

export const WEATHER = {
  rainPaceAll: -0.0, // everyone slows equally; relative pace is what matters
  rainNoiseMult: 1.8,
  rainErrorMult: 2,
};

/** Contract ladder. Offers arrive when hours and recent form are both good enough. */
export const LADDER: { team: TeamId; hours: number; avgFinish: number; label: string }[] = [
  { team: 'kestrel', hours: 0, avgFinish: 99, label: 'Kestrel Racing' },
  { team: 'cadillac', hours: 2, avgFinish: 22, label: 'Cadillac' },
  { team: 'haas', hours: 5, avgFinish: 19, label: 'Haas' },
  { team: 'alpine', hours: 9, avgFinish: 17, label: 'Alpine' },
  { team: 'rb', hours: 13, avgFinish: 15, label: 'Racing Bulls' },
  { team: 'williams', hours: 18, avgFinish: 13, label: 'Williams' },
  { team: 'aston', hours: 25, avgFinish: 11, label: 'Aston Martin' },
  { team: 'audi', hours: 38, avgFinish: 9, label: 'Audi' },
  { team: 'mercedes', hours: 180, avgFinish: 5, label: 'Mercedes' },
  { team: 'redbull', hours: 200, avgFinish: 4, label: 'Red Bull' },
  { team: 'ferrari', hours: 215, avgFinish: 3.5, label: 'Ferrari' },
  { team: 'mclaren', hours: 230, avgFinish: 3, label: 'McLaren' },
];
export const LADDER_FORM_RACES = 5;

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const pointsFor = (pos: number) => POINTS[pos - 1] ?? 0;
