import type { RaceResult, TeamId } from '../types';
import { RACES } from '../data/calendar';
import { pointsFor } from '../sim/rules';

export interface ChampRow { code: string; teamId: TeamId; you: boolean; points: number; wins: number; best: number }

/**
 * Drivers' championship across the rounds you have raced. For each round the latest
 * Grand Prix counts, plus the latest Sprint on sprint weekends. Every car in that race's
 * classification scores, so you are measured against the field, not just yourself.
 */
export function championship(history: RaceResult[]) {
  const counted: RaceResult[] = [];
  for (const round of RACES) {
    const mine = history.filter(h => h.roundId === round.id); // newest first
    const gp = mine.find(h => h.format === 'gp');
    if (gp) counted.push(gp);
    const sprint = round.sprint ? mine.find(h => h.format === 'sprint') : undefined;
    if (sprint) counted.push(sprint);
  }
  const table = new Map<string, ChampRow>();
  for (const r of counted) {
    r.classification.forEach((c, i) => {
      const key = c.you ? 'YOU' : c.code;
      const row = table.get(key) ?? { code: key, teamId: c.teamId, you: c.you, points: 0, wins: 0, best: 99 };
      const pos = i + 1;
      const dnf = c.gap === 'DNF';
      row.points += dnf ? 0 : pointsFor(r.format, pos);
      if (!dnf && pos === 1 && r.format === 'gp') row.wins++;
      if (!dnf) row.best = Math.min(row.best, pos);
      if (c.you) row.teamId = c.teamId;
      table.set(key, row);
    });
  }
  const rows = [...table.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.best - b.best);
  return { rows, rounds: new Set(counted.map(r => r.roundId)).size, races: counted.length };
}

/** Your result at a round: the latest GP and Sprint. */
export function roundResults(history: RaceResult[], roundId: string) {
  const mine = history.filter(h => h.roundId === roundId);
  return { gp: mine.find(h => h.format === 'gp'), sprint: mine.find(h => h.format === 'sprint') };
}
