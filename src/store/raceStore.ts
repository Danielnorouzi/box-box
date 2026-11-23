import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ActiveRace, ActivityId, PlayerDriver, RaceEvent, RaceResult, RndArea, Settings, Tab, TeamId, TyreId, Weekend,
} from '../types';
import { DRIVER, RND, TYRES, pointsFor, ABSENCE } from '../config/balance';
import { nextRound, roundById } from '../data/calendar';
import { deriveClock } from '../sim/clock';
import { qualify, standings } from '../sim/race';
import { capRemaining, creditsFor, dayKey, rndCost } from '../sim/progression';
import { raceConfig, weatherFor, type CareerSnapshot } from '../sim/setup';
import { gap } from '../lib/format';
import { uid } from '../lib/id';
import { makeTicket } from '../lib/ticket';
import {
  type Ledger, type Purchase, balance, rndLevels, seasonCapLeft, seasonNumber, streak, teamOf, wetRaceXp,
} from './derive';
import { STORE_KEY, idbStorage } from './storage';

export type SyncedState = Ledger & { active: ActiveRace | null };

export const QUALI_MS = 5 * 60_000;
export const PRACTICE_MS = 5 * 60_000;

interface State extends SyncedState {
  hydrated: boolean;
  tab: Tab;
  roundId: string | null;
  weekendId: string | null; // the weekend you're in, until the race is filed
  viewingResultId: string | null;
  settings: Settings;
  lastSyncAt: number | null;
  lastLaps: number;
  practiceStartedAt: number | null;
  qualiStartedAt: number | null;
  qualiAwayAt: number | null;

  saveDriver: (d: PlayerDriver) => void;
  setTab: (t: Tab) => void;
  pickRound: (id: string | null) => void;
  setSettings: (s: Partial<Settings>) => void;

  openWeekend: (roundId: string, laps: number) => void;
  leaveWeekend: () => void;
  ripTicket: () => void;
  startPractice: () => void;
  finishPractice: (plan: string) => void;
  cancelPractice: () => void;
  startQuali: () => void;
  qualiAway: (away: boolean) => void;
  finishQuali: (aborted: boolean) => void;
  lineUp: (tyre: TyreId) => void;
  leaveGrid: () => void;
  push: (e: RaceEvent['type'], tyre?: TyreId) => void;
  settle: (now?: number) => void;
  openResult: (id: string) => void;
  closeResult: () => void;

  buyRnd: (area: RndArea) => string | null;
  logActivity: (a: ActivityId, minutes: number) => { counted: number };
  removeActivity: (id: string) => void;
  signContract: (team: TeamId) => void;
  declineOffer: (team: TeamId) => void;

  applySynced: (s: SyncedState, at: number) => void;
  resetAll: () => void;
}

const ledgerInit: SyncedState = {
  driver: null, driverUpdatedAt: 0, history: [], weekends: [], purchases: [], contracts: [], declined: [], activity: [], active: null,
};

const uiInit = {
  tab: 'garage' as Tab, roundId: null, weekendId: null, viewingResultId: null, lastSyncAt: null, lastLaps: 10,
  practiceStartedAt: null, qualiStartedAt: null, qualiAwayAt: null,
  settings: { sound: true, haptics: true, wakeLock: true, quality: 'auto', syncUrl: '', syncKey: '' } as Settings,
};

export const careerOf = (s: SyncedState): CareerSnapshot => ({
  teamId: teamOf(s), rnd: rndLevels(s), activity: s.activity, archetype: s.driver?.archetype ?? 'racer',
  wetRaceXp: wetRaceXp(s), code: s.driver?.code ?? 'YOU', number: s.driver?.number ?? 7,
});

export const useRace = create<State>()(
  persist(
    (set, get) => {
      const weekend = () => get().weekends.find(w => w.id === get().weekendId) ?? null;
      const patchWeekend = (p: Partial<Weekend>) =>
        set(s => ({ weekends: s.weekends.map(w => (w.id === s.weekendId ? { ...w, ...p } : w)) }));

      return {
        ...ledgerInit,
        ...uiInit,
        hydrated: false,

        saveDriver: d => set({ driver: d, driverUpdatedAt: Date.now() }),
        setTab: tab => set({ tab, viewingResultId: null }),
        pickRound: roundId => set({ roundId, tab: 'garage' }),
        setSettings: p => set(s => ({ settings: { ...s.settings, ...p } })),

        openWeekend: (roundId, laps) => {
          const seed = (Math.random() * 2 ** 32) >>> 0;
          const round = roundById(roundId) ?? nextRound();
          const w: Weekend = {
            id: uid(), roundId: round.id, laps, seed, createdAt: Date.now(),
            weather: weatherFor(round.trackId, seed), ticket: makeTicket(round.id, seed),
          };
          set(s => ({ weekends: [w, ...s.weekends], weekendId: w.id, lastLaps: laps, viewingResultId: null }));
        },
        leaveWeekend: () => set({ weekendId: null, practiceStartedAt: null, qualiStartedAt: null, qualiAwayAt: null }),
        ripTicket: () => patchWeekend({ rippedAt: Date.now() }),

        startPractice: () => set({ practiceStartedAt: Date.now() }),
        cancelPractice: () => set({ practiceStartedAt: null }),
        finishPractice: plan => { patchWeekend({ practice: { plan: plan.trim(), doneAt: Date.now() } }); set({ practiceStartedAt: null }); },

        startQuali: () => set({ qualiStartedAt: Date.now(), qualiAwayAt: null }),
        qualiAway: away => {
          const s = get();
          if (!s.qualiStartedAt) return;
          if (away) set({ qualiAwayAt: Date.now() });
          else if (s.qualiAwayAt) {
            // Leaving during a flying lap deletes it, past the same short grace as the race.
            const ms = Date.now() - s.qualiAwayAt;
            set({ qualiAwayAt: null });
            if (ms > ABSENCE.graceMs) get().finishQuali(true);
          }
        },
        finishQuali: aborted => {
          const s = get();
          const w = weekend();
          if (!w || !s.qualiStartedAt) return;
          const focusMs = aborted ? 0 : Math.min(Date.now() - s.qualiStartedAt, QUALI_MS);
          const base = raceConfig({ career: careerOf(s), roundId: w.roundId, laps: w.laps, seed: w.seed, weather: w.weather, gridSlot: 1, startTyre: 'medium', weekendId: w.id });
          const q = qualify(base, aborted);
          patchWeekend({ quali: { grid: q.grid, focusMs, aborted, lapF1Ms: aborted ? 0 : q.lapF1Ms, doneAt: Date.now() } });
          set({ qualiStartedAt: null, qualiAwayAt: null });
        },

        lineUp: tyre => {
          const s = get();
          const w = weekend();
          if (!w) return;
          const fieldSize = teamOf(s) === 'kestrel' ? 23 : 22;
          const cfg = raceConfig({
            career: careerOf(s), roundId: w.roundId, laps: w.laps, seed: w.seed, weather: w.weather,
            gridSlot: w.quali ? Math.min(fieldSize, w.quali.grid) : fieldSize, startTyre: tyre, weekendId: w.id, plan: w.practice?.plan,
          });
          set({ active: { id: uid(), config: cfg, events: [], updatedAt: Date.now() } });
        },
        leaveGrid: () => { const a = get().active; if (a && a.events.length === 0) set({ active: null }); },

        push: (type, tyre) => {
          const a = get().active;
          if (!a) return;
          const t = Date.now();
          const ev = (type === 'pit_out' ? { type, t, tyre: tyre ?? 'medium' } : { type, t }) as RaceEvent;
          set({ active: { ...a, events: [...a.events, ev], updatedAt: t } });
          // Filing happens on the race screen after the flag or DNF animation (or on next open).
        },

        settle: (now = Date.now()) => {
          const s = get();
          const a = s.active;
          if (!a) return;
          const c = deriveClock(a, now);
          if (c.phase !== 'finished' && c.phase !== 'dnf') return;
          const cfg = a.config;
          const { rows, laps } = standings(cfg, c);
          const you = rows.find(r => r.car.isYou)!;
          const dnf = c.phase === 'dnf';
          const position = dnf ? rows.length : you.position;
          const points = dnf ? 0 : pointsFor(position);
          const stints = c.stints;
          const span = (i: number) => (stints[i + 1]?.fromFocusMs ?? c.focusMs) - stints[i].fromFocusMs;
          const tyreMult = c.focusMs ? stints.reduce((m, st, i) => m + TYRES[st.tyre].mult * span(i), 0) / c.focusMs : 1;
          const overLong = c.stops.some(st => st.overMs > 0);
          const cr = creditsFor({
            focusMs: c.focusMs, finished: !dnf, points, clean: c.strikes === 0 && !overLong,
            rain: cfg.weather === 'rain', tyreMult, streak: streak(s) + 1,
          });
          const clean = laps.filter(l => l.clean);
          const order = rows.filter(r => !(r.car.isYou && dnf)).concat(dnf ? [you] : []);
          const result: RaceResult = {
            id: a.id, weekendId: cfg.weekendId, roundId: cfg.roundId, trackId: cfg.trackId, teamId: cfg.teamId, weather: cfg.weather,
            startedAt: c.startedAt ?? now, endedAt: c.endedAt ?? now,
            status: dnf ? 'dnf' : 'finished', dnfReason: c.dnfReason, position, gridSlot: cfg.gridSlot, points,
            laps: cfg.laps, lapsCompleted: Math.floor(c.focusMs / cfg.lapMs + 1e-9), focusMs: c.focusMs,
            stops: c.stops.length, tyres: stints.map(x => x.tyre), strikes: c.strikes, overLongPit: overLong,
            bestLapF1Ms: clean.length ? Math.min(...clean.map(l => l.f1Ms)) : 0,
            credits: cr.total, creditLines: cr.lines,
            classification: order.map((r, i) => {
              const out = r.dnf || (r.car.isYou && dnf);
              return {
                code: r.car.code, teamId: r.car.teamId, you: r.car.isYou, number: r.car.number, dnf: out,
                gap: out ? 'DNF' : i === 0 ? 'Winner' : r.lapsDown > 0 ? `+${r.lapsDown} lap${r.lapsDown > 1 ? 's' : ''}` : gap(r.gapToLeaderS),
              };
            }),
          };
          set(st => ({ active: null, history: [result, ...st.history], viewingResultId: result.id, weekendId: null }));
        },

        openResult: id => set({ viewingResultId: id }),
        closeResult: () => set({ viewingResultId: null }),

        buyRnd: area => {
          const s = get();
          const lv = rndLevels(s)[area];
          if (lv >= RND.maxLevel) return 'Fully developed.';
          const cost = rndCost(lv);
          const bal = balance(s);
          if (bal < cost) return `Needs ${cost - bal} more credits. Credits come from study time.`;
          if (seasonCapLeft(s) < cost) return 'That would break the season budget cap. It resets after the season finale.';
          const p: Purchase = { id: uid(), t: Date.now(), area, level: lv + 1, cost, season: seasonNumber(s) };
          set({ purchases: [...s.purchases, p] });
          return null;
        },

        logActivity: (activity, minutes) => {
          const t = Date.now();
          const day = dayKey(t);
          const counted = Math.max(0, Math.min(minutes, capRemaining(get().activity, activity, day)));
          set(s => ({ activity: [{ id: uid(), t, day, activity, minutes, counted }, ...s.activity] }));
          return { counted };
        },
        removeActivity: id => set(s => ({ activity: s.activity.filter(a => a.id !== id) })),
        signContract: team => set(s => ({ contracts: [...s.contracts, { team, t: Date.now() }] })),
        declineOffer: team => set(s => ({ declined: [...s.declined, team] })),

        applySynced: (x, at) => set({ ...x, lastSyncAt: at }),
        resetAll: () => set({ ...ledgerInit, ...uiInit, hydrated: true }),
      };
    },
    {
      name: STORE_KEY,
      version: 3,
      storage: createJSONStorage(() => idbStorage),
      partialize: s => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function' && k !== 'hydrated') out[k] = v;
        return out as Partial<State>;
      },
      // Earlier builds used a different race model. Their results stay in your history (and your
      // study hours count), but in-flight races are dropped because they can't be replayed.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 3) {
          const old = (p.history as Record<string, unknown>[] | undefined) ?? [];
          return {
            ...ledgerInit,
            history: old.map(h => ({
              weekendId: '', weather: 'dry', stops: 0, tyres: ['medium'], strikes: 0, overLongPit: false, creditLines: [],
              ...h,
              credits: Math.round(((h.focusMs as number) ?? 0) / 60_000),
              trackId: h.trackId === 'lusail' ? 'qa-2004' : h.trackId,
              roundId: (h.roundId as string) ?? '2026-qatar',
              teamId: 'kestrel',
              points: h.format === 'sprint' ? 0 : h.points,
              classification: ((h.classification as { code: string; teamId: TeamId; you: boolean; gap: string }[]) ?? []).map(c => ({ ...c, number: 0, dnf: c.gap === 'DNF' })),
            })),
          } as unknown as State;
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

export const currentWeekend = (s: Pick<State, 'weekends' | 'weekendId'>) => s.weekends.find(w => w.id === s.weekendId) ?? null;
export const activityLabel = (a: ActivityId) => DRIVER.activities[a].label;
