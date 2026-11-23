import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ActiveRace, ActivityEntry, ActivityKind, RaceEvent, RaceFormat, RaceResult, Settings, Tab, TeamId, Ticket,
} from '../types';
import { trackOf } from '../data/tracks';
import { nextRound, roundById } from '../data/calendar';
import { FORMATS, MIN, VSC_BUDGET_SHARE, pointsFor, stopLimitFor } from '../sim/rules';
import { deriveClock } from '../sim/clock';
import { standings } from '../sim/standings';
import { gap, minutes } from '../lib/format';
import { uid } from '../lib/id';
import { STORE_KEY, idbStorage } from './storage';

interface Setup { format: RaceFormat; durationMin: number; subject: string; roundId: string; ticketId?: string }

export interface SyncedState {
  teamId: TeamId;
  active: ActiveRace | null;
  history: RaceResult[];
  tickets: Ticket[];
  activity: ActivityEntry[];
}

interface State extends SyncedState {
  hydrated: boolean;
  lastLength: number;
  roundId: string | null; // chosen round, null = follow the calendar
  viewingResultId: string | null;
  tab: Tab;
  settings: Settings;
  lastSyncAt: number | null;
  draftTicketId: string | null; // ticket chosen for the next race

  setDraftTicket: (id: string | null) => void;
  setTeam: (id: TeamId) => void;
  setTab: (t: Tab) => void;
  pickRound: (id: string | null) => void;
  setSettings: (s: Partial<Settings>) => void;
  lineUp: (s: Setup) => void;
  leaveGrid: () => void;
  push: (type: RaceEvent['type']) => void;
  settle: (now?: number) => void;
  openResult: (id: string) => void;
  closeResult: () => void;

  addTicket: (title: string) => string | null;
  renameTicket: (id: string, title: string) => void;
  setTicketDone: (id: string, done: boolean) => void;
  deleteTicket: (id: string) => void;

  applySynced: (s: SyncedState, at: number) => void;
  resetAll: () => void;
}

const ACTIVITY_CAP = 3000;

const log = (kind: ActivityKind, text: string, extra: Partial<ActivityEntry> = {}): ActivityEntry =>
  ({ id: uid(), t: Date.now(), kind, text, ...extra });

const initial = {
  teamId: 'williams' as TeamId,
  lastLength: 60,
  roundId: null,
  active: null,
  history: [],
  tickets: [],
  activity: [],
  viewingResultId: null,
  tab: 'race' as Tab,
  settings: { sound: true, wakeLock: true, syncUrl: '', syncKey: '' },
  lastSyncAt: null,
  draftTicketId: null as string | null,
};

export const useRace = create<State>()(
  persist(
    (set, get) => {
      const addLog = (e: ActivityEntry) =>
        set(s => ({ activity: [e, ...s.activity].slice(0, ACTIVITY_CAP) }));

      return {
        ...initial,
        hydrated: false,

        setDraftTicket: draftTicketId => set({ draftTicketId }),
        setTeam: teamId => set({ teamId }),
        setTab: tab => set({ tab, viewingResultId: null }),
        pickRound: roundId => set({ roundId, tab: 'race' }),
        setSettings: p => set(s => ({ settings: { ...s.settings, ...p } })),

        lineUp: ({ format, durationMin, subject, roundId, ticketId }) => {
          const round = roundById(roundId) ?? nextRound();
          const track = trackOf(round.trackId);
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
              updatedAt: Date.now(),
              config: {
                trackId: track.id, roundId: round.id, format, durationMs, laps, lapMs: durationMs / laps,
                vscBudgetMs, stopLimitMs: stopLimitFor(vscBudgetMs),
                seed, gridSlot: 6 + (seed % 10), teamId: get().teamId, subject: subject.trim(), ticketId,
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
          const t = Date.now();
          set({ active: { ...a, events: [...a.events, { type, t }], updatedAt: t } });
          const round = roundById(a.config.roundId);
          const what = a.config.subject || 'free session';
          if (type === 'start') addLog(log('race_start', `Lights out at the ${round?.name ?? 'Grand Prix'}: ${what}`, { raceId: a.id, ticketId: a.config.ticketId }));
          if (type === 'vsc_on') addLog(log('vsc', 'VSC called', { raceId: a.id }));
          if (type === 'vsc_off') addLog(log('green', 'Back to green', { raceId: a.id }));
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
          const ordered = [...rows.filter(r => !(dnf && r.car.isYou)), ...(dnf ? [you] : [])];
          const result: RaceResult = {
            id: a.id, trackId: a.config.trackId, roundId: a.config.roundId, ticketId: a.config.ticketId,
            format: a.config.format, subject: a.config.subject,
            teamId: a.config.teamId, startedAt: clock.startedAt ?? now, endedAt: clock.endedAt ?? now,
            status: dnf ? 'dnf' : 'finished', dnfReason: clock.dnfReason,
            position: dnf ? rows.length : you.position, gridSlot: a.config.gridSlot,
            // A Sprint only scores on a sprint weekend; elsewhere it is practice.
            points: dnf || (a.config.format === 'sprint' && !roundById(a.config.roundId)?.sprint) ? 0 : pointsFor(a.config.format, you.position),
            lapsCompleted: Math.floor(clock.focusMs / a.config.lapMs + 1e-9), laps: a.config.laps,
            focusMs: clock.focusMs, vscUsedMs: clock.vscUsedMs, cleanLaps: clean.length,
            bestLapF1Ms: clean.length ? Math.min(...clean.map(l => l.f1Ms)) : 0,
            classification: ordered.map((r, i) => ({
              code: r.car.code, teamId: r.car.teamId, you: r.car.isYou,
              gap: dnf && r.car.isYou ? 'DNF' : i === 0 ? 'Winner'
                : r.lapsDown > 0 ? `+${r.lapsDown} lap${r.lapsDown > 1 ? 's' : ''}` : gap(r.gapToLeaderS),
            })),
          };
          set(s => ({ active: null, history: [result, ...s.history], viewingResultId: result.id }));
          addLog(dnf
            ? log('dnf', `DNF on lap ${Math.min(result.laps, result.lapsCompleted + 1)} after ${minutes(result.focusMs)} of focus`, { raceId: a.id, ticketId: a.config.ticketId, t: result.endedAt })
            : log('finish', `P${result.position}, ${result.points} pts, ${minutes(result.focusMs)} of focus`, { raceId: a.id, ticketId: a.config.ticketId, t: result.endedAt }));
        },

        openResult: id => set({ viewingResultId: id }),
        closeResult: () => set({ viewingResultId: null }),

        addTicket: title => {
          const t = title.trim();
          if (!t) return null;
          const now = Date.now();
          const ticket: Ticket = { id: uid(), title: t.slice(0, 120), createdAt: now, updatedAt: now };
          set(s => ({ tickets: [ticket, ...s.tickets] }));
          addLog(log('ticket_add', `Ticket opened: ${ticket.title}`, { ticketId: ticket.id }));
          return ticket.id;
        },
        renameTicket: (id, title) => {
          const t = title.trim();
          if (!t) return;
          set(s => ({ tickets: s.tickets.map(x => (x.id === id ? { ...x, title: t.slice(0, 120), updatedAt: Date.now() } : x)) }));
        },
        setTicketDone: (id, done) => {
          const now = Date.now();
          const tk = get().tickets.find(x => x.id === id);
          if (!tk) return;
          set(s => ({ tickets: s.tickets.map(x => (x.id === id ? { ...x, doneAt: done ? now : undefined, updatedAt: now } : x)) }));
          addLog(log(done ? 'ticket_done' : 'ticket_reopen', `${done ? 'Ticket closed' : 'Ticket reopened'}: ${tk.title}`, { ticketId: id }));
        },
        deleteTicket: id =>
          set(s => ({ tickets: s.tickets.map(x => (x.id === id ? { ...x, deleted: true, updatedAt: Date.now() } : x)) })),

        applySynced: (s, at) => set({ ...s, lastSyncAt: at }),
        resetAll: () => set({ ...initial, hydrated: true }),
      };
    },
    {
      name: STORE_KEY,
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      partialize: s => ({
        teamId: s.teamId, lastLength: s.lastLength, roundId: s.roundId, active: s.active, history: s.history,
        tickets: s.tickets, activity: s.activity, viewingResultId: s.viewingResultId, tab: s.tab,
        settings: s.settings, lastSyncAt: s.lastSyncAt, draftTicketId: s.draftTicketId,
      }),
      // Phase 1 stored everything under "pitwall:v1" with a single Lusail track.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown> & { history?: RaceResult[]; active?: ActiveRace | null };
        if (version < 2) {
          const fix = <T extends { trackId?: string; roundId?: string }>(x: T): T =>
            ({ ...x, trackId: x.trackId === 'lusail' || !x.trackId ? 'qa-2004' : x.trackId, roundId: x.roundId ?? '2026-qatar' });
          p.history = (p.history ?? []).map(fix);
          if (p.active) p.active = { ...p.active, updatedAt: p.active.updatedAt ?? Date.now(), config: fix(p.active.config) };
        }
        return p as unknown as State;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<State>),
        settings: { ...current.settings, ...((persisted as Partial<State>)?.settings ?? {}) },
      }),
      onRehydrateStorage: () => () => useRace.setState({ hydrated: true }),
    },
  ),
);

export const liveTickets = (t: Ticket[]) => t.filter(x => !x.deleted);
