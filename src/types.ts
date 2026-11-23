export type TeamId =
  | 'mclaren' | 'ferrari' | 'mercedes' | 'redbull' | 'aston' | 'alpine'
  | 'williams' | 'rb' | 'haas' | 'audi' | 'cadillac';
export type TrackId = 'lusail';
export type RaceFormat = 'sprint' | 'gp';

export type RaceEvent =
  | { type: 'start'; t: number }
  | { type: 'vsc_on'; t: number }
  | { type: 'vsc_off'; t: number }
  | { type: 'retire'; t: number }
  | { type: 'finish'; t: number };

export interface RaceConfig {
  trackId: TrackId;
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
}

export interface ActiveRace {
  id: string;
  config: RaceConfig;
  events: RaceEvent[];
}

export interface RaceResult {
  id: string;
  trackId: TrackId;
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
  classification: { code: string; teamId: TeamId; you: boolean; gap: string }[];
}
