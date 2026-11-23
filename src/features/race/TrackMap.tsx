import { useMemo } from 'react';
import type { Track } from '../../data/tracks';
import { trackPath } from '../../lib/trackPath';
import type { Row } from '../../sim/race';
import type { Phase } from '../../sim/clock';

interface Props {
  track: Track;
  rows: Row[];
  phase: Phase;
  lapFrac: number;
  dnfT: number; // 0..1 progress of your DNF animation, 0 when not retiring
  dnfAt: number | null; // your track position when it happened
  rain: boolean;
  reduce: boolean;
}

/** Smoke puffs that rise and spread from a stopped car. Pure SVG, driven by the animation clock. */
function Smoke({ x, y, t }: { x: number; y: number; t: number }) {
  const puffs = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ dx: (i % 3 - 1) * 14, ph: i / 9 })), []);
  return (
    <g aria-hidden>
      {puffs.map((p, i) => {
        const k = (t * 1.6 + p.ph) % 1;
        return <circle key={i} cx={x + p.dx * k} cy={y - 70 * k} r={10 + 34 * k} fill="#c9ccd2" opacity={(1 - k) * 0.45 * Math.min(1, t * 3)} />;
      })}
    </g>
  );
}

export function TrackMap({ track, rows, phase, lapFrac, dnfT, dnfAt, rain, reduce }: Props) {
  const { d, at, pts } = trackPath(track);
  const [w, h] = track.geometry.viewBox;
  const you = rows.find(r => r.car.isYou)!;
  const others = rows.filter(r => !r.car.isYou).slice().reverse();
  const [sx, sy] = pts[0];
  const [nx, ny] = pts[1];
  const ang = (Math.atan2(ny - sy, nx - sx) * 180) / Math.PI;
  // Your DNF: the car coasts to a halt over the first 40% of the animation (ease-out), then sits smoking.
  const coast = dnfAt !== null ? dnfAt + 0.018 * (1 - (1 - Math.min(1, dnfT / 0.4)) ** 3) : you.shown;
  const [yx, yy] = at(coast);
  return (
    <svg viewBox={`-40 -40 ${w + 80} ${h + 80}`} className={`map ${phase}${rain ? ' rain' : ''}`} role="img" aria-label={`${track.name}. You are P${you.position}.`}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <path d={d} className="circuit-edge" strokeWidth={36} />
      <path d={d} className="circuit-surface" strokeWidth={28} />
      <path d={d} className="circuit-line" strokeWidth={2} />
      {phase !== 'grid' && <path d={d} className="circuit-progress" strokeWidth={5} pathLength={1} strokeDasharray={`${lapFrac} 1`} />}
      <g transform={`translate(${sx} ${sy}) rotate(${ang + 90})`}>
        {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={-18 + i * 6} y={-4} width={6} height={4} fill={i % 2 ? '#111' : '#fff'} />)}
        {[0, 1, 2, 3, 4, 5].map(i => <rect key={`b${i}`} x={-18 + i * 6} y={0} width={6} height={4} fill={i % 2 ? '#fff' : '#111'} />)}
      </g>
      {others.map(r => {
        const [x, y] = at(r.shown);
        return (
          <g key={r.car.code} opacity={r.dnf ? 0.35 : 1}>
            <circle cx={x} cy={y} r={10} fill={r.car.color} stroke="#0b0c0f" strokeWidth={3} />
          </g>
        );
      })}
      {dnfAt !== null && <Smoke x={yx} y={yy} t={reduce ? 0.3 : dnfT} />}
      <circle cx={yx} cy={yy} r={26} fill={you.car.color} opacity={phase === 'green' ? 0.25 : 0} filter="url(#glow)" />
      <circle cx={yx} cy={yy} r={14} fill={you.car.color} stroke="#fff" strokeWidth={4} />
      <text x={yx + 26} y={yy + 8} className="car-label">{phase === 'pit' ? 'IN PIT' : dnfAt !== null ? 'DNF' : `P${you.position}`}</text>
    </svg>
  );
}
