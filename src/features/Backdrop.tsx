import { TRACKS } from '../data/tracks';
import { trackPath } from '../lib/trackPath';

/** The circuit itself, drawn large behind the glass. */
export function Backdrop() {
  const t = TRACKS.lusail;
  const { d } = trackPath(t);
  const [w, h] = t.geometry.viewBox;
  return (
    <div className="backdrop" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h}`}>
        <path d={d} fill="none" stroke="#2b3039" strokeWidth={30} strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#1a1e24" strokeWidth={22} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
