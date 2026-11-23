import { trackOf } from '../data/tracks';
import { trackPath } from '../lib/trackPath';

/** The selected circuit, drawn large behind the glass. */
export function Backdrop({ trackId }: { trackId: string }) {
  const t = trackOf(trackId);
  const { d } = trackPath(t);
  const [w, h] = t.geometry.viewBox;
  return (
    <div className="backdrop" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h}`} key={t.id}>
        <path d={d} fill="none" stroke="#2b3039" strokeWidth={30} strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#1a1e24" strokeWidth={22} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
