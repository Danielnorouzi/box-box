import type { TeamId } from '../types';

export interface GridDriver { code: string; name: string; number: number }
export interface Team {
  id: TeamId;
  name: string;
  color: string; // livery primary, tuned for the dark UI
  color2: string; // livery secondary
  drivers: GridDriver[];
  fictional?: boolean;
}

// 2026 line-ups. Car numbers are as announced for 2026 to the best of our knowledge; check before relying on them.
// Colours approximate each livery; no logos or wordmarks are drawn anywhere.
export const TEAMS: Team[] = [
  { id: 'mclaren', name: 'McLaren', color: '#ff8a1f', color2: '#1b1f27', drivers: [{ code: 'NOR', name: 'Lando Norris', number: 1 }, { code: 'PIA', name: 'Oscar Piastri', number: 81 }] },
  { id: 'ferrari', name: 'Ferrari', color: '#e8102c', color2: '#f5d33c', drivers: [{ code: 'LEC', name: 'Charles Leclerc', number: 16 }, { code: 'HAM', name: 'Lewis Hamilton', number: 44 }] },
  { id: 'redbull', name: 'Red Bull', color: '#25356b', color2: '#e8102c', drivers: [{ code: 'VER', name: 'Max Verstappen', number: 3 }, { code: 'HAD', name: 'Isack Hadjar', number: 6 }] },
  { id: 'mercedes', name: 'Mercedes', color: '#c9ced6', color2: '#18c7b3', drivers: [{ code: 'RUS', name: 'George Russell', number: 63 }, { code: 'ANT', name: 'Kimi Antonelli', number: 12 }] },
  { id: 'audi', name: 'Audi', color: '#8d939c', color2: '#e5232f', drivers: [{ code: 'HUL', name: 'Nico Hülkenberg', number: 27 }, { code: 'BOR', name: 'Gabriel Bortoleto', number: 5 }] },
  { id: 'aston', name: 'Aston Martin', color: '#0e6b4f', color2: '#c6e86b', drivers: [{ code: 'ALO', name: 'Fernando Alonso', number: 14 }, { code: 'STR', name: 'Lance Stroll', number: 18 }] },
  { id: 'williams', name: 'Williams', color: '#1a5fd0', color2: '#7fd1ff', drivers: [{ code: 'ALB', name: 'Alexander Albon', number: 23 }, { code: 'SAI', name: 'Carlos Sainz', number: 55 }] },
  { id: 'rb', name: 'Racing Bulls', color: '#e9edf5', color2: '#3d5bd9', drivers: [{ code: 'LAW', name: 'Liam Lawson', number: 30 }, { code: 'LIN', name: 'Arvid Lindblad', number: 41 }] },
  { id: 'alpine', name: 'Alpine', color: '#1e78d6', color2: '#ff7ab8', drivers: [{ code: 'GAS', name: 'Pierre Gasly', number: 10 }, { code: 'COL', name: 'Franco Colapinto', number: 43 }] },
  { id: 'haas', name: 'Haas', color: '#f1f2f4', color2: '#d3202f', drivers: [{ code: 'OCO', name: 'Esteban Ocon', number: 31 }, { code: 'BEA', name: 'Oliver Bearman', number: 87 }] },
  { id: 'cadillac', name: 'Cadillac', color: '#2a2d33', color2: '#d9dde3', drivers: [{ code: 'PER', name: 'Sergio Pérez', number: 11 }, { code: 'BOT', name: 'Valtteri Bottas', number: 77 }] },
  { id: 'kestrel', name: 'Kestrel Racing', color: '#c8743c', color2: '#f3e6d4', drivers: [], fictional: true },
];

export const teamById = (id: TeamId) => TEAMS.find(t => t.id === id) ?? TEAMS[TEAMS.length - 1];
export const GRID_DRIVERS = TEAMS.flatMap(t => t.drivers.map(d => ({ ...d, teamId: t.id })));
export const TAKEN_NUMBERS = new Set(GRID_DRIVERS.map(d => d.number));
/** Colour used for markers on the dark map: the brighter of the two livery colours. */
export function markerColor(t: Team) {
  const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  return lum(t.color) < 70 ? t.color2 : t.color;
}
