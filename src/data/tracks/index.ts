import type { TrackId } from '../../types';
import { lusailGeometry } from './lusail.geom';

export interface Track {
  id: TrackId;
  name: string;
  grandPrix: string;
  place: string;
  lengthKm: number;
  laps: number;
  refLapMs: number; // a representative race lap, used to scale displayed lap times and gaps
  sectors: [number, number]; // lap fraction where S1 and S2 end
  geometry: { viewBox: readonly [number, number]; points: [number, number][] };
}

export const TRACKS: Record<TrackId, Track> = {
  lusail: {
    id: 'lusail',
    name: 'Lusail International Circuit',
    grandPrix: 'Qatar Grand Prix',
    place: 'Lusail, Qatar',
    lengthKm: 5.419,
    laps: 57,
    refLapMs: 84_300,
    sectors: [0.34, 0.68],
    geometry: lusailGeometry,
  },
};
