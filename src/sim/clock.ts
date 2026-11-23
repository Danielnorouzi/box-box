import type { ActiveRace } from '../types';

export type Phase = 'grid' | 'green' | 'vsc' | 'stopped' | 'finished' | 'dnf';

export interface ClockState {
  phase: Phase;
  focusMs: number; // your racing time: only runs under green
  simMs: number; // the field's racing time: frozen under VSC, runs once the budget is gone
  vscUsedMs: number;
  stopStartedAt: number | null; // epoch of the current stop
  stopLimitAt: number | null; // epoch when the current stop becomes a DNF
  pausePoints: number[]; // focusMs at each VSC call, decides which laps were clean
  startedAt: number | null;
  endedAt: number | null;
  dnfReason?: 'retired' | 'stopped';
}

/** Replays the event log up to `now`. Pure: same log + same now = same state. */
export function deriveClock(race: ActiveRace, now: number): ClockState {
  const { durationMs, vscBudgetMs, stopLimitMs } = race.config;
  const s: ClockState = {
    phase: 'grid', focusMs: 0, simMs: 0, vscUsedMs: 0,
    stopStartedAt: null, stopLimitAt: null, pausePoints: [],
    startedAt: null, endedAt: null,
  };
  let last = 0;
  const ended = () => s.phase === 'finished' || s.phase === 'dnf';

  const advance = (to: number) => {
    if (ended() || s.phase === 'grid' || to <= last) return;
    if (s.phase === 'green') {
      const dt = to - last;
      const left = durationMs - s.focusMs;
      if (dt >= left) {
        s.focusMs = durationMs;
        s.simMs += left;
        s.phase = 'finished';
        s.endedAt = last + left;
      } else {
        s.focusMs += dt;
        s.simMs += dt;
      }
    } else {
      const limitAt = s.stopStartedAt! + stopLimitMs;
      const end = Math.min(to, limitAt);
      const dt = end - last;
      const inBudget = Math.min(dt, Math.max(0, vscBudgetMs - s.vscUsedMs));
      s.vscUsedMs += inBudget;
      s.simMs += dt - inBudget;
      if (to >= limitAt) {
        s.phase = 'dnf';
        s.dnfReason = 'stopped';
        s.endedAt = limitAt;
      }
    }
    last = to;
  };

  for (const ev of race.events) {
    if (ended()) break;
    if (ev.type === 'start') {
      if (s.phase !== 'grid') continue;
      s.phase = 'green';
      s.startedAt = ev.t;
      last = ev.t;
      continue;
    }
    advance(ev.t);
    if (ended()) break;
    if (ev.type === 'vsc_on' && s.phase === 'green') {
      s.phase = 'vsc';
      s.stopStartedAt = ev.t;
      s.pausePoints.push(s.focusMs);
    } else if (ev.type === 'vsc_off' && s.phase === 'vsc') {
      s.phase = 'green';
      s.stopStartedAt = null;
    } else if (ev.type === 'retire') {
      s.phase = 'dnf';
      s.dnfReason = 'retired';
      s.endedAt = ev.t;
    }
  }
  advance(now);

  if (s.phase === 'vsc' && s.vscUsedMs >= vscBudgetMs) s.phase = 'stopped';
  if (s.stopStartedAt !== null && (s.phase === 'vsc' || s.phase === 'stopped')) {
    s.stopLimitAt = s.stopStartedAt + stopLimitMs;
  } else s.stopStartedAt = null;
  return s;
}
