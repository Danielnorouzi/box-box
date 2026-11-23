import type { TeamId } from '../types';

export interface Team {
  id: TeamId;
  name: string;
  color: string;
  drivers: [string, string]; // three-letter timing codes, 2026 line-ups
  tier: number; // 0 = quickest; drives simulated pace
}

// Colours are approximations of each 2026 livery, tuned to stay readable on the dark map.
export const TEAMS: Team[] = [
  { id: 'mclaren', name: 'McLaren', color: '#ff8a1f', drivers: ['NOR', 'PIA'], tier: 0 },
  { id: 'mercedes', name: 'Mercedes', color: '#2fd8c4', drivers: ['RUS', 'ANT'], tier: 1 },
  { id: 'redbull', name: 'Red Bull', color: '#4a7fe0', drivers: ['VER', 'HAD'], tier: 1 },
  { id: 'ferrari', name: 'Ferrari', color: '#f0263c', drivers: ['LEC', 'HAM'], tier: 2 },
  { id: 'williams', name: 'Williams', color: '#5fb8f2', drivers: ['ALB', 'SAI'], tier: 3 },
  { id: 'rb', name: 'Racing Bulls', color: '#8ea6ff', drivers: ['LAW', 'LIN'], tier: 4 },
  { id: 'aston', name: 'Aston Martin', color: '#1fa27a', drivers: ['ALO', 'STR'], tier: 4 },
  { id: 'haas', name: 'Haas', color: '#d9dcdf', drivers: ['OCO', 'BEA'], tier: 5 },
  { id: 'alpine', name: 'Alpine', color: '#ff7ab8', drivers: ['GAS', 'COL'], tier: 5 },
  { id: 'audi', name: 'Audi', color: '#c9cfd6', drivers: ['HUL', 'BOR'], tier: 6 },
  { id: 'cadillac', name: 'Cadillac', color: '#a7b3c2', drivers: ['PER', 'BOT'], tier: 7 },
];

export const teamById = (id: TeamId) => TEAMS.find(t => t.id === id)!;
