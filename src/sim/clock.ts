import type { ActiveRace, TyreId } from '../types';
import { ABSENCE, PIT } from '../config/balance';

export type Phase = 'grid' | 'green' | 'pit' | 'away' | 'finished' | 'dnf';

export interface Stop { inFocusMs: number; inAt: number; outAt: number | null; tyre: TyreId | null; overMs: number }
export interface Absence { at: number; ms: number; strike: boolean; focusAt: number }

export interface ClockState {
  phase: Phase;
  focusMs: number; // your racing time: only runs under green
  simMs: number; // the field's racing time
  stops: Stop[];
  stints: { tyre: TyreId; fromFocusMs: number }[];
  absences: Absence[];
  strikes: number;
  omAt: number[]; // focusMs at each Overtake Mode activation
  startedAt: number | null;
  endedAt: number | null;
  dnfReason?: 'retired' | 'away' | 'strikes';
  awayStartedAt: number | null;
  awayLimitAt: number | null; // DNF moment if the current absence goes on
  pitStartedAt: number | null;
  pitFreeUntil: number | null; // end of the current stop's allowance
}

/**
 * Replays the event log up to `now`. Pure: the same log and the same `now` give the same state.
 * Green: you and the field race. Pit (a break): the field waits for the allowance, then races on.
 * Away (app hidden): the field is neutralised; long absences and a third strike end the race.
 */
export function deriveClock(race: ActiveRace, now: number): ClockState {
  const { laps, lapMs, startTyre } = race.config;
  const durationMs = laps * lapMs;
  const s: ClockState = {
    phase: 'grid', focusMs: 0, simMs: 0, stops: [], stints: [{ tyre: startTyre, fromFocusMs: 0 }],
    absences: [], strikes: 0, omAt: [], startedAt: null, endedAt: null,
    awayStartedAt: null, awayLimitAt: null, pitStartedAt: null, pitFreeUntil: null,
  };
  let last = 0;
  const ended = () => s.phase === 'finished' || s.phase === 'dnf';
  const dnf = (at: number, reason: ClockState['dnfReason']) => { s.phase = 'dnf'; s.dnfReason = reason; s.endedAt = at; };

  /** When the current absence would end the race, if it runs on. */
  const awayLimit = (start: number) =>
    s.strikes >= ABSENCE.strikesToDnf - 1 ? Math.min(start + ABSENCE.graceMs, start + ABSENCE.longMs) : start + ABSENCE.longMs;

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
    } else if (s.phase === 'pit') {
      const free = s.pitFreeUntil!;
      const runFrom = Math.max(last, free);
      if (to > runFrom) {
        s.simMs += to - runFrom;
        s.stops[s.stops.length - 1].overMs += to - runFrom;
      }
    } else if (s.phase === 'away') {
      const limit = s.awayLimitAt!;
      if (to >= limit) {
        s.absences.push({ at: s.awayStartedAt!, ms: limit - s.awayStartedAt!, strike: true, focusAt: s.focusMs });
        s.strikes++;
        dnf(limit, s.strikes >= ABSENCE.strikesToDnf && limit - s.awayStartedAt! < ABSENCE.longMs ? 'strikes' : 'away');
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
    switch (ev.type) {
      case 'pit_in':
        if (s.phase !== 'green') break;
        s.phase = 'pit';
        s.pitStartedAt = ev.t;
        s.pitFreeUntil = ev.t + PIT.allowanceMs;
        s.stops.push({ inFocusMs: s.focusMs, inAt: ev.t, outAt: null, tyre: null, overMs: 0 });
        break;
      case 'pit_out': {
        if (s.phase !== 'pit') break;
        const st = s.stops[s.stops.length - 1];
        st.outAt = ev.t;
        st.tyre = ev.tyre;
        s.stints.push({ tyre: ev.tyre, fromFocusMs: s.focusMs });
        s.phase = 'green';
        s.pitStartedAt = s.pitFreeUntil = null;
        break;
      }
      case 'away':
        if (s.phase !== 'green') break; // leaving during a pit stop is the point of a break
        s.phase = 'away';
        s.awayStartedAt = ev.t;
        s.awayLimitAt = awayLimit(ev.t);
        break;
      case 'back': {
        if (s.phase !== 'away') break;
        const ms = ev.t - s.awayStartedAt!;
        const strike = ms > ABSENCE.graceMs;
        s.absences.push({ at: s.awayStartedAt!, ms, strike, focusAt: s.focusMs });
        if (strike) s.strikes++;
        s.phase = 'green';
        s.awayStartedAt = s.awayLimitAt = null;
        break;
      }
      case 'om':
        if (s.phase === 'green') s.omAt.push(s.focusMs);
        break;
      case 'retire':
        dnf(ev.t, 'retired');
        break;
    }
  }
  advance(now);
  return s;
}

export const raceDurationMs = (laps: number, lapMs: number) => laps * lapMs;
