import { useEffect, useState } from 'react';

/** Current time, refreshed every `ms` (or every frame when ms = 0). Stops when `active` is false. */
export function useNow(ms: number, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let id = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last >= ms) {
        last = t;
        setNow(Date.now());
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    // rAF stops in background tabs; catch up the moment we're visible again.
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ms, active]);
  return now;
}
