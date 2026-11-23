import { CREDITS, DRIVER, LADDER, LADDER_FORM_RACES, RND, TEAM_DEFICIT } from '../config/balance';
import type { ActivityEntry, ActivityId, Archetype, RaceResult, RndArea, SkillId, TeamId } from '../types';

export const SKILLS = Object.keys(DRIVER.skills) as SkillId[];
export const AREAS = Object.keys(RND.areas) as RndArea[];
export type RndLevels = Record<RndArea, number>;

// ───────── Car R&D ─────────

/** Diminishing returns: each level adds less than the last. Returns 0..1 of the area's max. */
export const rndFrac = (area: RndArea, level: number) => 1 - Math.exp(-RND.areas[area].rate * level);
export const rndGain = (area: RndArea, level: number) => RND.areas[area].max * rndFrac(area, level);
/** Rising costs: the price of buying `level + 1`. */
export const rndCost = (level: number) => Math.round(RND.baseCost * RND.costGrowth ** level);

export function carPace(team: TeamId, levels: RndLevels) {
  return -TEAM_DEFICIT[team] + AREAS.reduce((a, k) => a + rndGain(k, levels[k]), 0);
}

// ───────── Driver ─────────

export const skillFrom = (xp: number, skill: SkillId) => 1 - Math.exp(-Math.max(0, xp) / DRIVER.skills[skill].scale);

export function skillXp(log: ActivityEntry[], archetype: Archetype, wetRaceXp: number): Record<SkillId, number> {
  const xp: Record<SkillId, number> = { fitness: 0, consistency: 0, racecraft: 0, reflexes: 0, wet: wetRaceXp };
  for (const e of log) xp[DRIVER.activities[e.activity].skill as SkillId] += e.counted;
  const boost = DRIVER.archetypes[archetype].boost as Partial<Record<SkillId, number>>;
  for (const k of SKILLS) xp[k] += boost[k] ?? 0;
  return xp;
}

export function skillLevels(xp: Record<SkillId, number>): Record<SkillId, number> {
  return Object.fromEntries(SKILLS.map(k => [k, skillFrom(xp[k], k)])) as Record<SkillId, number>;
}

/** Minutes that still count today for an activity, given what has already been logged. */
export function capRemaining(log: ActivityEntry[], activity: ActivityId, day: string) {
  const used = log.filter(e => e.activity === activity && e.day === day).reduce((a, e) => a + e.counted, 0);
  return Math.max(0, DRIVER.activities[activity].dailyCapMin - used);
}

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ───────── Credits ─────────

export function studyStreak(results: RaceResult[], now = Date.now()) {
  const days = new Set(results.filter(r => r.focusMs > 0).map(r => dayKey(r.startedAt)));
  let n = 0;
  for (let t = now; ; t -= 86_400_000) {
    if (days.has(dayKey(t))) n++;
    else if (dayKey(t) !== dayKey(now)) break;
    if (n > 3650) break;
  }
  return n;
}

export function creditsFor(o: {
  focusMs: number; finished: boolean; points: number; clean: boolean; rain: boolean; tyreMult: number; streak: number;
}) {
  const lines: { label: string; amount: number }[] = [];
  const base = (o.focusMs / 60_000) * CREDITS.perFocusMinute;
  lines.push({ label: 'Focus', amount: base });
  if (o.tyreMult !== 1) lines.push({ label: `Tyre strategy ×${o.tyreMult.toFixed(2)}`, amount: base * (o.tyreMult - 1) });
  if (o.finished) {
    lines.push({ label: 'Chequered flag', amount: CREDITS.finishBonus });
    if (o.points) lines.push({ label: 'Points', amount: o.points * CREDITS.pointsToCredits });
    if (o.clean) lines.push({ label: 'Clean race', amount: base * CREDITS.cleanBonus });
    if (o.rain) lines.push({ label: 'Wet race', amount: base * CREDITS.rainBonus });
    const s = Math.min(CREDITS.streakCap, o.streak * CREDITS.streakPerDay);
    if (s > 0) lines.push({ label: `${o.streak}-day streak`, amount: base * s });
  }
  const rounded = lines.map(l => ({ ...l, amount: Math.round(l.amount) })).filter(l => l.amount > 0);
  return { total: rounded.reduce((a, l) => a + l.amount, 0), lines: rounded };
}

// ───────── Contracts ─────────

export function ladderIndex(team: TeamId) {
  return LADDER.findIndex(l => l.team === team);
}

/** Teams above you on the ladder whose bar you clear. Only the next two rungs ever call. */
export function contractOffers(team: TeamId, hours: number, results: RaceResult[], declined: TeamId[]) {
  const recent = results.slice(0, LADDER_FORM_RACES);
  if (recent.length < 3) return [];
  const avg = recent.reduce((a, r) => a + (r.status === 'dnf' ? 23 : r.position), 0) / recent.length;
  const at = ladderIndex(team);
  return LADDER.slice(at + 1, at + 3).filter(l => hours >= l.hours && avg <= l.avgFinish && !declined.includes(l.team));
}
