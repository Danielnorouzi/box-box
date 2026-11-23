import type { Helmet, HelmetPattern, TeamId } from '../types';
import { teamById } from '../data/teams';

const PATTERNS: HelmetPattern[] = ['stripe', 'chevron', 'halo', 'split', 'stars'];

/** Rival helmets: team colours, a pattern picked from the car number. Generic, not real designs. */
export function rivalHelmet(team: TeamId, number: number): Helmet {
  const t = teamById(team);
  return { primary: t.color, secondary: t.color2, accent: '#ffffff', pattern: PATTERNS[number % PATTERNS.length] };
}

export const DEFAULT_HELMET: Helmet = { primary: '#f2f2f2', secondary: '#c8743c', accent: '#16181d', pattern: 'stripe' };
