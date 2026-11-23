// Simulates a typical player and reports study hours to each milestone. Tune src/config/balance.ts.
import { RACES } from '../src/data/calendar';
import { LADDER } from '../src/config/balance';
const QUALI_MIN = 5;
import { RND } from '../src/config/balance';
import { deriveClock } from '../src/sim/clock';
import { needsStop, qualify, standings, overtakeCharges } from '../src/sim/race';
import { AREAS, contractOffers, creditsFor, rndCost, rndGain, dayKey } from '../src/sim/progression';
import { raceConfig, lapMsFor, weatherFor, type CareerSnapshot } from '../src/sim/setup';
import { pointsFor } from '../src/config/balance';
import type { ActivityEntry, RaceEvent, RaceResult } from '../src/types';
void LADDER;

const SESSION_MIN = Number(process.env.SESSION ?? 45);
const MAX_H = 260;

function run(seed: number) {
  const career: CareerSnapshot = { teamId: 'kestrel', rnd: { aero: 0, pu: 0, chassis: 0, reliability: 0 }, activity: [], archetype: 'racer', wetRaceXp: 0, code: 'YOU', number: 7 };
  let credits = 0, spentSeason = 0, hours = 0, day = 0;
  const results: RaceResult[] = [];
  const hit: Record<string, number | null> = { points: null, podium: null, win: null, contention: null };
  const teams: string[] = [];
  let ri = 0;
  while (hours < MAX_H) {
    const t = Date.UTC(2026, 0, 1) + day * 86_400_000;
    // Activities: a moderately active student.
    const add = (activity: ActivityEntry['activity'], minutes: number) => career.activity.push({ id: '', t, day: dayKey(t), activity, minutes, counted: minutes });
    add('sleep', 450); add('gym', day % 2 ? 45 : 0); add('reading', 20); if (day % 7 < 3) add('sport', 40);
    const round = RACES[ri % RACES.length];
    if (ri && ri % RACES.length === 0) spentSeason = 0;
    const lapMs = lapMsFor(round.trackId);
    const laps = Math.max(3, Math.round((SESSION_MIN * 60_000) / lapMs));
    const s = seed * 1000 + ri;
    const weather = weatherFor(round.trackId, s);
    const base = raceConfig({ career, roundId: round.id, laps, seed: s, weather, gridSlot: 1, startTyre: 'medium', weekendId: 'w' });
    const q = qualify(base, false);
    const cfg = { ...base, gridSlot: q.grid };
    const ev: RaceEvent[] = [{ type: 'start', t: 0 }];
    let clockT = 0;
    if (needsStop(cfg)) {
      clockT = Math.round(laps / 2) * lapMs;
      ev.push({ type: 'pit_in', t: clockT }, { type: 'pit_out', t: clockT + 180_000, tyre: 'hard' });
    }
    // Overtake Mode: use a charge as soon as one is available, lap by lap.
    const race = { id: 'r', config: cfg, events: ev, updatedAt: 0 };
    for (let l = 1; l < laps; l++) {
      const shift = needsStop(cfg) && l >= Math.round(laps / 2) ? 180_000 : 0;
      const at = l * lapMs + shift + 1000;
      const c = deriveClock({ ...race, events: [...ev].sort((a, b) => a.t - b.t) }, at);
      if (c.phase === 'green' && overtakeCharges(cfg, c).available > 0 && overtakeCharges(cfg, c).left > 0) ev.push({ type: 'om', t: at });
    }
    ev.sort((a, b) => a.t - b.t);
    const c = deriveClock({ ...race, events: ev }, 1e12);
    const { rows } = standings(cfg, c);
    const pos = rows.find(r => r.car.isYou)!.position;
    const pts = pointsFor(pos);
    const focusMs = c.focusMs + QUALI_MIN * 60_000;
    const cr = creditsFor({ focusMs, finished: true, points: pts, clean: true, rain: weather === 'rain', tyreMult: 1, streak: Math.min(day, 10) });
    credits += cr.total;
    if (weather === 'rain') career.wetRaceXp += (c.focusMs / 60_000) * 0.5;
    hours += focusMs / 3_600_000;
    results.unshift({ position: pos, status: 'finished' } as RaceResult);
    // Spend: best gain per credit first.
    for (;;) {
      let best: { k: typeof AREAS[number]; v: number; cost: number } | null = null;
      for (const k of AREAS) {
        const lv = career.rnd[k];
        if (lv >= RND.maxLevel) continue;
        const cost = rndCost(lv);
        const gain = k === 'reliability' ? 0.0006 * Math.exp(-0.2 * lv) : rndGain(k, lv + 1) - rndGain(k, lv);
        if (!best || gain / cost > best.v) best = { k, v: gain / cost, cost };
      }
      if (!best || best.cost > credits || spentSeason + best.cost > RND.seasonCap) break;
      credits -= best.cost; spentSeason += best.cost; career.rnd[best.k]++;
    }
    const offers = contractOffers(career.teamId, hours, results, []);
    if (offers.length) { career.teamId = offers[offers.length - 1].team; teams.push(`${career.teamId}@${hours.toFixed(0)}h`); }
    if (pos <= 10 && hit.points === null) hit.points = hours;
    if (pos <= 3 && hit.podium === null) hit.podium = hours;
    if (pos === 1 && hit.win === null) hit.win = hours;
    const last10 = results.slice(0, 10);
    if (hit.contention === null && last10.length === 10 && last10.filter(r => r.position === 1).length >= 3) hit.contention = hours;
    if (process.env.TRACE && seed === 1 && ri % 3 === 0) console.log(hours.toFixed(1), career.teamId, 'car', (base.you.carPace*100).toFixed(2)+'%', 'drv', JSON.stringify(Object.fromEntries(Object.entries(base.you.skills).map(([k,v])=>[k,+v.toFixed(2)]))), 'grid', q.grid, 'P', pos, weather, 'laps', laps, 'rnd', JSON.stringify(career.rnd), 'cr', credits);
    ri++; day++;
  }
  return { hit, teams };
}

const runs = Array.from({ length: 12 }, (_, i) => run(i + 1));
const med = (k: string) => {
  const v = runs.map(r => r.hit[k]).filter((x): x is number => x !== null).sort((a, b) => a - b);
  return v.length ? `${v[Math.floor(v.length / 2)].toFixed(1)} h (${v.length}/${runs.length} reached, ${v[0].toFixed(0)}-${v.at(-1)!.toFixed(0)})` : 'never';
};
console.log(`Typical player, ${SESSION_MIN}-min races. Targets: points ~5 h, podium 15-20 h, win 40-60 h, contention ~200 h`);
for (const k of ['points', 'podium', 'win', 'contention']) console.log(k.padEnd(11), med(k));
console.log('contracts (run 1):', runs[0].teams.join(' → '));
