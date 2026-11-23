import type { Track } from '../../data/tracks';
import { trackPath } from '../../lib/trackPath';
import type { StandingRow } from '../../sim/standings';
import type { Phase } from '../../sim/clock';

interface Props { track: Track; rows: StandingRow[]; phase: Phase; lapFrac: number }

export function TrackMap({ track, rows, phase, lapFrac }: Props) {
  const { d, at, pts } = trackPath(track);
  const [w, h] = track.geometry.viewBox;
  const you = rows.find(r => r.car.isYou)!;
  const others = rows.filter(r => !r.car.isYou).slice().reverse(); // leader drawn on top
  const [sx, sy] = pts[0];
  const [nx, ny] = pts[1];
  const ang = Math.atan2(ny - sy, nx - sx);
  const [yx, yy] = at(you.distance);
  // Gridded cars sit behind the line (negative distance wraps to the end of the lap).
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={phase} role="img" aria-label={`${track.name} map. You are P${you.position}.`}>
      <path d={d} className="circuit-edge" strokeWidth={34} />
      <path d={d} className="circuit-surface" strokeWidth={26} />
      <path d={d} className="circuit-line" strokeWidth={2} />
      {phase !== 'grid' && (
        <path d={d} className="circuit-progress" strokeWidth={4} pathLength={1} strokeDasharray={`${lapFrac} 1`} />
      )}
      {/* start / finish line */}
      <g transform={`translate(${sx} ${sy}) rotate(${(ang * 180) / Math.PI + 90})`}>
        <rect x={-17} y={-3} width={34} height={6} fill="#fff" opacity={0.9} />
      </g>
      {others.map(r => {
        const [x, y] = at(r.distance);
        return <circle key={r.car.code} cx={x} cy={y} r={9} fill={r.car.color} stroke="#0d0f12" strokeWidth={3} />;
      })}
      <circle cx={yx} cy={yy} r={20} fill="none" stroke="#fff" strokeWidth={3} opacity={0.9} />
      <circle cx={yx} cy={yy} r={12} fill={you.car.color} stroke="#fff" strokeWidth={3} />
      <text x={yx + 28} y={yy + 8} className="car-label">YOU · P{you.position}</text>
    </svg>
  );
}
