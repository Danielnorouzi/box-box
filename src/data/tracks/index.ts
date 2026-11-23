import { GEOMETRY } from './geometry';

export interface Track {
  id: string;
  name: string;
  place: string;
  lengthKm: number;
  laps: number;
  refLapMs: number; // a representative race lap, used to scale displayed lap times and gaps
  geometry: { viewBox: readonly [number, number]; points: [number, number][] };
}

// Lap counts and lengths are the published race figures. Reference laps are typical
// race-pace laps rounded to the half second, used only to make the numbers feel right.
const META: [id: string, name: string, place: string, km: number, laps: number, refS: number][] = [
  ['au-1953', 'Albert Park Circuit', 'Melbourne, Australia', 5.278, 58, 82],
  ['cn-2004', 'Shanghai International Circuit', 'Shanghai, China', 5.451, 56, 97],
  ['jp-1962', 'Suzuka Circuit', 'Suzuka, Japan', 5.807, 53, 94],
  ['bh-2002', 'Bahrain International Circuit', 'Sakhir, Bahrain', 5.412, 57, 96],
  ['sa-2021', 'Jeddah Corniche Circuit', 'Jeddah, Saudi Arabia', 6.174, 50, 92],
  ['us-2022', 'Miami International Autodrome', 'Miami, USA', 5.412, 57, 91],
  ['ca-1978', 'Circuit Gilles Villeneuve', 'Montréal, Canada', 4.361, 70, 76],
  ['mc-1929', 'Circuit de Monaco', 'Monte Carlo, Monaco', 3.337, 78, 76],
  ['es-1991', 'Circuit de Barcelona-Catalunya', 'Barcelona, Spain', 4.657, 66, 79],
  ['at-1969', 'Red Bull Ring', 'Spielberg, Austria', 4.318, 71, 68.5],
  ['gb-1948', 'Silverstone Circuit', 'Silverstone, Great Britain', 5.891, 52, 90],
  ['be-1925', 'Circuit de Spa-Francorchamps', 'Stavelot, Belgium', 7.004, 44, 107],
  ['hu-1986', 'Hungaroring', 'Budapest, Hungary', 4.381, 70, 81],
  ['nl-1948', 'Circuit Zandvoort', 'Zandvoort, Netherlands', 4.259, 72, 74.5],
  ['it-1922', 'Autodromo Nazionale Monza', 'Monza, Italy', 5.793, 53, 84],
  ['es-2026', 'Madring', 'Madrid, Spain', 5.474, 57, 88],
  ['az-2016', 'Baku City Circuit', 'Baku, Azerbaijan', 6.003, 51, 106],
  ['sg-2008', 'Marina Bay Street Circuit', 'Singapore', 4.927, 62, 98],
  ['us-2012', 'Circuit of the Americas', 'Austin, USA', 5.513, 56, 99],
  ['mx-1962', 'Autódromo Hermanos Rodríguez', 'Mexico City, Mexico', 4.304, 71, 81],
  ['br-1940', 'Autódromo José Carlos Pace', 'São Paulo, Brazil', 4.309, 71, 74],
  ['us-2023', 'Las Vegas Strip Circuit', 'Las Vegas, USA', 6.201, 50, 97],
  ['qa-2004', 'Lusail International Circuit', 'Lusail, Qatar', 5.419, 57, 84.5],
  ['ae-2009', 'Yas Marina Circuit', 'Abu Dhabi, UAE', 5.281, 58, 88.5],
];

export const TRACKS: Record<string, Track> = Object.fromEntries(
  META.map(([id, name, place, lengthKm, laps, refS]) => [
    id,
    { id, name, place, lengthKm, laps, refLapMs: refS * 1000, geometry: GEOMETRY[id] },
  ]),
);

export const DEFAULT_TRACK = 'qa-2004';
export const trackOf = (id: string) => TRACKS[id] ?? TRACKS[DEFAULT_TRACK];
