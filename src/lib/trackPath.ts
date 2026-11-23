import type { Track } from '../data/tracks';

export interface TrackPath {
  d: string;
  at: (frac: number) => [number, number];
  pts: [number, number][];
}

const cache = new Map<string, TrackPath>();

export function trackPath(track: Track): TrackPath {
  const hit = cache.get(track.id);
  if (hit) return hit;
  let pts = track.geometry.points;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (a[0] === b[0] && a[1] === b[1]) pts = pts.slice(0, -1);
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const p = pts[i - 1], q = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const total = cum[cum.length - 1];
  const at = (frac: number): [number, number] => {
    const f = ((frac % 1) + 1) % 1;
    const L = f * total;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= L) lo = mid; else hi = mid;
    }
    const p = pts[lo], q = pts[(lo + 1) % pts.length];
    const t = (L - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  const d = 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';
  const out = { d, at, pts };
  cache.set(track.id, out);
  return out;
}
