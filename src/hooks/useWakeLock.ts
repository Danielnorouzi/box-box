import { useEffect } from 'react';

/** Keeps the screen on while `on` is true. Re-acquires after the tab comes back. Silent if refused. */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const get = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
      } catch { /* not allowed here; the race works without it */ }
      if (gone) void lock?.release();
    };
    void get();
    const vis = () => { if (document.visibilityState === 'visible') void get(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', vis);
      void lock?.release();
    };
  }, [on]);
}
