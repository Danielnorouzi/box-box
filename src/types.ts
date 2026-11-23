export type TeamId =
  | 'mclaren' | 'ferrari' | 'mercedes' | 'redbull' | 'aston' | 'alpine'
  | 'williams' | 'rb' | 'haas' | 'audi' | 'cadillac' | 'kestrel';
export type TyreId = 'soft' | 'medium' | 'hard' | 'inter';
export type Weather = 'dry' | 'rain';
export type SkillId = 'fitness' | 'consistency' | 'racecraft' | 'reflexes' | 'wet';
export type ActivityId = 'gym' | 'sleep' | 'reading' | 'sport' | 'swim';
export type RndArea = 'aero' | 'pu' | 'chassis' | 'reliability';
export type Archetype = 'racer' | 'qualifier' | 'tyreWhisperer' | 'rainmaster';
export type HelmetPattern = 'stripe' | 'chevron' | 'halo' | 'split' | 'stars';

export interface Helmet { primary: string; secondary: string; accent: string; pattern: HelmetPattern }

export interface PlayerDriver {
  name: string;
  code: string; // three letters on the timing tower
  number: number;
  archetype: Archetype;
  helmet: Helmet;
}

// ───────── Race weekend ─────────

export interface TicketInfo {
  serial: string;
  round: number;
  grandstand: string;
  gate: string;
  row: string;
  seat: number;
  tier: 'General Admission' | 'Grandstand' | 'Grandstand Premium';
  price: number;
}

export interface Weekend {
  id: string;
  roundId: string;
  laps: number;
  weather: Weather;
  seed: number;
  createdAt: number;
  ticket: TicketInfo;
  rippedAt?: number;
  practice?: { plan: string; doneAt: number };
  quali?: { grid: number; focusMs: number; aborted: boolean; lapF1Ms: number; doneAt: number };
}

export type RaceEvent =
  | { type: 'start'; t: number }
  | { type: 'pit_in'; t: number }
  | { type: 'pit_out'; t: number; tyre: TyreId }
  | { type: 'away'; t: number }
  | { type: 'back'; t: number }
  | { type: 'om'; t: number }
  | { type: 'retire'; t: number };

/** Everything the sim needs, frozen at lights out so replays are deterministic. */
export interface RaceConfig {
  weekendId: string;
  roundId: string;
  trackId: string;
  laps: number;
  lapMs: number;
  seed: number;
  gridSlot: number;
  weather: Weather;
  startTyre: TyreId;
  teamId: TeamId;
  seasonProgress: number; // 0 at round 1, 1 at the finale; rivals develop
  you: { code: string; number: number; carPace: number; skills: Record<SkillId, number>; reliability: number };
  plan?: string;
}

export interface ActiveRace {
  id: string;
  config: RaceConfig;
  events: RaceEvent[];
  updatedAt: number;
}

export interface ClassifiedCar { code: string; teamId: TeamId; you: boolean; gap: string; dnf?: boolean; number: number }

export interface CreditLine { label: string; amount: number }

export interface RaceResult {
  id: string;
  weekendId: string;
  roundId: string;
  trackId: string;
  teamId: TeamId;
  weather: Weather;
  startedAt: number;
  endedAt: number;
  status: 'finished' | 'dnf';
  dnfReason?: 'retired' | 'away' | 'strikes';
  position: number;
  gridSlot: number;
  points: number;
  laps: number;
  lapsCompleted: number;
  focusMs: number;
  stops: number;
  tyres: TyreId[];
  strikes: number;
  overLongPit: boolean;
  bestLapF1Ms: number;
  credits: number;
  creditLines: CreditLine[];
  classification: ClassifiedCar[];
}

// ───────── Progression ─────────

export interface ActivityEntry {
  id: string;
  t: number;
  day: string; // local YYYY-MM-DD
  activity: ActivityId;
  minutes: number;
  counted: number; // minutes after the daily cap
}

export interface Contract { team: TeamId; t: number }

export interface Settings {
  sound: boolean;
  haptics: boolean;
  wakeLock: boolean;
  quality: 'auto' | 'high' | 'low';
  syncUrl: string;
  syncKey: string;
}

export type Tab = 'garage' | 'season' | 'car' | 'driver' | 'album' | 'settings';
