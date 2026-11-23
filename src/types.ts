export type TeamId =
  | 'mclaren' | 'ferrari' | 'mercedes' | 'redbull' | 'aston' | 'alpine'
  | 'williams' | 'rb' | 'haas' | 'audi' | 'cadillac';
export type RaceFormat = 'sprint' | 'gp';

export type RaceEvent =
  | { type: 'start'; t: number }
  | { type: 'vsc_on'; t: number }
  | { type: 'vsc_off'; t: number }
  | { type: 'retire'; t: number }
  | { type: 'finish'; t: number };

export interface RaceConfig {
  trackId: string;
  roundId: string;
  format: RaceFormat;
  durationMs: number;
  laps: number;
  lapMs: number;
  vscBudgetMs: number;
  stopLimitMs: number;
  seed: number;
  gridSlot: number;
  teamId: TeamId;
  subject: string;
  ticketId?: string;
}

export interface ActiveRace {
  id: string;
  config: RaceConfig;
  events: RaceEvent[];
  updatedAt: number;
}

export interface ClassifiedCar { code: string; teamId: TeamId; you: boolean; gap: string }

export interface RaceResult {
  id: string;
  trackId: string;
  roundId: string;
  ticketId?: string;
  format: RaceFormat;
  subject: string;
  teamId: TeamId;
  startedAt: number;
  endedAt: number;
  status: 'finished' | 'dnf';
  dnfReason?: 'retired' | 'stopped';
  position: number;
  gridSlot: number;
  points: number;
  lapsCompleted: number;
  laps: number;
  focusMs: number;
  vscUsedMs: number;
  cleanLaps: number;
  bestLapF1Ms: number;
  classification: ClassifiedCar[];
}

/** Phase 2: a piece of study work you enter into races. */
export interface Ticket {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  doneAt?: number;
  deleted?: boolean; // tombstone, so deletes survive sync
}

/** Phase 5: everything that happened, for the logbook. */
export type ActivityKind =
  | 'race_start' | 'vsc' | 'green' | 'finish' | 'dnf' | 'ticket_add' | 'ticket_done' | 'ticket_reopen';

export interface ActivityEntry {
  id: string;
  t: number;
  kind: ActivityKind;
  raceId?: string;
  ticketId?: string;
  text: string;
}

export interface Settings {
  sound: boolean;
  wakeLock: boolean;
  syncUrl: string;
  syncKey: string;
}

export type Tab = 'race' | 'season' | 'tickets' | 'logbook' | 'settings';
