import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveRace, RaceEvent, RaceFormat, RaceResult, TeamId } from '../types';
import { TRACKS } from '../data/tracks';
import { FORMATS, MIN, VSC_BUDGET_SHARE, pointsFor, stopLimitFor } from '../sim/rules';
import { deriveClock } from '../sim/clock';
import { standings } from '../sim/standings';
import { gap } from '../lib/format';

interface Setup { format: RaceFormat; durationMin: number; subject: string }

interface State {
  teamId: TeamId;
  lastLength: number; // minutes, remembered for the next race
  active: ActiveRace | null;
  history: RaceResult[];
  viewingResultId: string | null;
  setTeam: (id: TeamId) => void;
  lineUp: (s: Setup) => void;
  leaveGrid: () => void;
  push: (type: RaceEvent['type']) => void;
  settle: (now?: number) => void;
  closeResult: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useRace = create<State>()(
  persist(
    (set, get) => ({
      teamId: 'williams',
      lastLength: 60,
      active: null,
      history: [],
      viewingResultId: null,

      setTeam: teamId => set({ teamId }),

      lineUp: ({ format, durationMin, subject }) => {
        const track = TRACKS.lusail;
        const durationMs = durationMin * MIN;
        const laps = FORMATS[format].laps(track.laps);
        const seed = (Math.random() * 2 ** 32) >>> 0;
        const vscBudgetMs = Math.round(durationMs * VSC_BUDGET_SHARE);
        set({
          lastLength: durationMin,
          viewingResultId: null,
          active: {
            id: uid(),
            events: [],
            config: {
              trackId: track.id, format, durationMs, laps, lapMs: durationMs / laps,
              vscBudgetMs, stopLimitMs: stopLimitFor(vscBudgetMs),
              seed, gridSlot: 6 + (seed % 10), teamId: get().teamId, subject: subject.trim(),
            },
          },
        });
      },

      leaveGrid: () => {
        const a = get().active;
        if (a && a.events.length === 0) set({ active: null });
      },

      push: type => {
        const a = get().active;
        if (!a) return;
        set({ active: { ...a, events: [...a.events, { type, t: Date.now() }] } });
        get().settle();
      },

      /** If the race has ended (flag, retirement, or a stop over the limit), file the result. */
      settle: (now = Date.now()) => {
        const a = get().active;
        if (!a) return;
        const clock = deriveClock(a, now);
        if (clock.phase !== 'finished' && clock.phase !== 'dnf') return;
        const { rows, laps } = standings(a.config, clock);
        const you = rows.find(r => r.car.isYou)!;
        const dnf = clock.phase === 'dnf';
        const clean = laps.filter(l => l.clean);
        const result: RaceResult = {
          id: a.id, trackId: a.config.trackId, format: a.config.format, subject: a.config.subject,
          teamId: a.config.teamId, startedAt: clock.startedAt ?? now, endedAt: clock.endedAt ?? now,
          status: dnf ? 'dnf' : 'finished', dnfReason: clock.dnfReason,
          position: dnf ? rows.length : you.position, gridSlot: a.config.gridSlot,
          points: dnf ? 0 : pointsFor(a.config.format, you.position),
          lapsCompleted: Math.floor(clock.focusMs / a.config.lapMs + 1e-9), laps: a.config.laps,
          focusMs: clock.focusMs, vscUsedMs: clock.vscUsedMs, cleanLaps: clean.length,
          bestLapF1Ms: clean.length ? Math.min(...clean.map(l => l.f1Ms)) : 0,
          classification: [...rows.filter(r => !(dnf && r.car.isYou)), ...(dnf ? [you] : [])].map((r, i) => ({
            code: r.car.code, teamId: r.car.teamId, you: r.car.isYou,
            gap: dnf && r.car.isYou ? 'DNF' : i === 0 ? 'Winner' : r.lapsDown > 0 ? `+${r.lapsDown} lap${r.lapsDown > 1 ? 's' : ''}` : gap(r.gapToLeaderS),
          })),
        };
        set(s => ({ active: null, history: [result, ...s.history], viewingResultId: result.id }));
      },

      closeResult: () => set({ viewingResultId: null }),
    }),
    {
      name: 'pitwall:v1',
      version: 1,
      partialize: s => ({ teamId: s.teamId, lastLength: s.lastLength, active: s.active, history: s.history, viewingResultId: s.viewingResultId }),
    },
  ),
);
