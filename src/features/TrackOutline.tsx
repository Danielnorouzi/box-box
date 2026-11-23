import { trackOf } from '../data/tracks';
import { trackPath } from '../lib/trackPath';

/** Small circuit outline, for lists and the backdrop. */
export function TrackOutline({ id, stroke = 'currentColor', width = 40, className }: { id: string; stroke?: string; width?: number; className?: string }) {
  const t = trackOf(id);
  const [w, h] = t.geometry.viewBox;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <path d={trackPath(t).d} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" />
    </svg>
  );
}
