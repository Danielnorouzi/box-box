import { RND, pointsFor, OVERTAKE } from '../config/balance';
import { RACES, roundById } from '../data/calendar';
import type { ActivityEntry, Contract, PlayerDriver, RaceResult, RndArea, TeamId, Weekend } from '../types';
import { AREAS, contractOffers, skillLevels, skillXp, studyStreak, type RndLevels } from '../sim/progression';

export interface Purchase { id: string; t: number; area: RndArea; level: number; cost: number; season: number }

/** The parts of state that sync. Everything else is derived from these logs. */
export interface Ledger {
  driver: PlayerDriver | null;
  driverUpdatedAt: number;
  history: RaceResult[];
  weekends: Weekend[];
  purchases: Purchase[];
  contracts: Contract[];
  declined: TeamId[];
  activity: ActivityEntry[];
}

export const teamOf = (l: Pick<Ledger, 'contracts'>): TeamId =>
  [...l.contracts].sort((a, b) => b.t - a.t)[0]?.team ?? 'kestrel';

export function rndLevels(l: Pick<Ledger, 'purchases'>): RndLevels {
  const lv: RndLevels = { aero: 0, pu: 0, chassis: 0, reliability: 0 };
  for (const p of l.purchases) lv[p.area] = Math.max(lv[p.area], p.level);
  return lv;
}

export function earned(l: Pick<Ledger, 'history' | 'weekends'>) {
  const races = l.history.reduce((a, r) => a + r.credits, 0);
  const weekends = l.weekends.reduce((a, w) => a + (w.practice ? 5 : 0) + (w.quali && !w.quali.aborted ? Math.round(w.quali.focusMs / 60_000) + 5 : 0), 0);
  return races + weekends;
}

export const spent = (l: Pick<Ledger, 'purchases'>) => l.purchases.reduce((a, p) => a + p.cost, 0);
export const balance = (l: Pick<Ledger, 'history' | 'weekends' | 'purchases'>) => earned(l) - spent(l);

/** Seasons roll over each time you race the finale. */
export function seasonNumber(l: Pick<Ledger, 'history'>) {
  const finale = RACES[RACES.length - 1].id;
  return 1 + l.history.filter(r => r.roundId === finale).length;
}
export const seasonSpent = (l: Pick<Ledger, 'purchases' | 'history'>) => {
  const s = seasonNumber(l);
  return l.purchases.filter(p => p.season === s).reduce((a, p) => a + p.cost, 0);
};
export const seasonCapLeft = (l: Pick<Ledger, 'purchases' | 'history'>) => RND.seasonCap - seasonSpent(l);

export function studyMs(l: Pick<Ledger, 'history' | 'weekends'>) {
  return l.history.reduce((a, r) => a + r.focusMs, 0) + l.weekends.reduce((a, w) => a + (w.quali?.focusMs ?? 0), 0);
}

export function wetRaceXp(l: Pick<Ledger, 'history'>) {
  return l.history.filter(r => r.weather === 'rain').reduce((a, r) => a + (r.focusMs / 60_000) * 0.5, 0);
}

export function driverSkills(l: Ledger) {
  return skillLevels(skillXp(l.activity, l.driver?.archetype ?? 'racer', wetRaceXp(l)));
}

export function offers(l: Ledger) {
  return contractOffers(teamOf(l), studyMs(l) / 3_600_000, l.history, l.declined);
}

export const streak = (l: Pick<Ledger, 'history'>) => studyStreak(l.history);

// ───────── Championship ─────────

export interface ChampRow { code: string; teamId: TeamId; you: boolean; points: number; wins: number; podiums: number }

/** Split results into seasons: a season ends with each race at the finale. */
export function seasons(history: RaceResult[]) {
  const finale = RACES[RACES.length - 1].id;
  const out: RaceResult[][] = [[]];
  for (const r of [...history].sort((a, b) => a.startedAt - b.startedAt)) {
    out[out.length - 1].push(r);
    if (r.roundId === finale) out.push([]);
  }
  return out; // the last entry is the season in progress (possibly empty)
}

/** Standings from a set of results: the latest race you ran at each round counts. */
export function table(results: RaceResult[]) {
  const latest = new Map<string, RaceResult>();
  for (const r of results) latest.set(r.roundId, r);
  const rows = new Map<string, ChampRow>();
  for (const r of latest.values()) {
    r.classification.forEach((c, i) => {
      const key = c.you ? 'YOU' : c.code;
      const row = rows.get(key) ?? { code: c.code, teamId: c.teamId, you: c.you, points: 0, wins: 0, podiums: 0 };
      if (!c.dnf) {
        row.points += pointsFor(i + 1);
        if (i === 0) row.wins++;
        if (i < 3) row.podiums++;
      }
      if (c.you) { row.teamId = c.teamId; row.code = c.code; }
      rows.set(key, row);
    });
  }
  return { rows: [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins), rounds: latest.size };
}

export function championship(l: Pick<Ledger, 'history'>) {
  const all = seasons(l.history);
  return { ...table(all[all.length - 1]), season: all.length };
}

// ───────── Album: trophies and passes ─────────

export interface Trophy { id: string; kind: 'podium' | 'champion'; position: number; result?: RaceResult; season?: number; points?: number }

export function trophies(l: Pick<Ledger, 'history'>): Trophy[] {
  const out: Trophy[] = l.history
    .filter(r => r.status === 'finished' && r.position <= 3)
    .map(r => ({ id: r.id, kind: 'podium' as const, position: r.position, result: r }));
  seasons(l.history).slice(0, -1).forEach((season, i) => {
    const t = table(season);
    if (t.rows[0]?.you) out.push({ id: `champ-${i + 1}`, kind: 'champion', position: 1, season: i + 1, points: t.rows[0].points });
  });
  return out;
}

export interface Pass { id: string; title: string; zones: string[]; unlocked: boolean; requirement: string; at?: number }

export function passes(l: Pick<Ledger, 'history' | 'weekends'>): Pass[] {
  const fin = [...l.history].filter(r => r.status === 'finished').sort((a, b) => a.endedAt - b.endedAt);
  const firstWhere = (f: (r: RaceResult) => boolean) => fin.find(f)?.endedAt;
  let acc = 0;
  const hoursAt = (h: number) => {
    acc = 0;
    const all = [...l.history].sort((a, b) => a.endedAt - b.endedAt);
    for (const r of all) { acc += r.focusMs; if (acc >= h * 3_600_000) return r.endedAt; }
    return undefined;
  };
  const defs: Omit<Pass, 'unlocked'>[] = [
    { id: 'guest', title: 'Paddock Guest', zones: ['Paddock'], requirement: 'Score your first points', at: firstWhere(r => r.points > 0) },
    { id: 'pitlane', title: 'Pit Lane Access', zones: ['Paddock', 'Pit Lane Walk'], requirement: 'Finish on the podium', at: firstWhere(r => r.position <= 3) },
    { id: 'club', title: 'Paddock Club', zones: ['Paddock', 'Pit Lane Walk', 'Hospitality'], requirement: 'Win a Grand Prix', at: firstWhere(r => r.position === 1) },
    { id: 'season50', title: 'Season Pass', zones: ['Paddock', 'Pit Lane Walk', 'Hospitality'], requirement: 'Study 50 hours', at: hoursAt(50) },
    { id: 'centurion', title: 'All Access', zones: ['Paddock', 'Pit Lane Walk', 'Hospitality', 'Team Garage'], requirement: 'Study 100 hours', at: hoursAt(100) },
  ];
  return defs.map(d => ({ ...d, unlocked: d.at !== undefined }));
}

export const roundOf = (r: RaceResult) => roundById(r.roundId);
export { AREAS, OVERTAKE };
