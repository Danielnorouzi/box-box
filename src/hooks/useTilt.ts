import { useEffect } from 'react';
import { useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

/**
 * Device tilt as two springs in −1..1. Uses DeviceOrientation where the browser allows it
 * (iOS asks permission on the first tap); elsewhere the hologram drifts slowly on its own.
 */
export function useTilt() {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const x = useSpring(rx, { stiffness: 120, damping: 18 }), y = useSpring(ry, { stiffness: 120, damping: 18 });
  useEffect(() => {
    if (reduce) return;
    let got = false;
    const onOri = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      got = true;
      rx.set(Math.max(-1, Math.min(1, e.gamma / 30)));
      ry.set(Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
    };
    window.addEventListener('deviceorientation', onOri);
    let raf = 0;
    const t0 = performance.now();
    const idle = (t: number) => {
      if (!got) { const k = (t - t0) / 1000; rx.set(Math.sin(k * 0.7) * 0.6); ry.set(Math.cos(k * 0.5) * 0.4); }
      raf = requestAnimationFrame(idle);
    };
    raf = requestAnimationFrame(idle);
    return () => { window.removeEventListener('deviceorientation', onOri); cancelAnimationFrame(raf); };
  }, [reduce, rx, ry]);
  return { x, y };
}

/** iOS needs an explicit permission request from a tap before it sends orientation events. */
export async function askTiltPermission() {
  const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  try { if (D?.requestPermission) await D.requestPermission(); } catch { /* refused: idle drift continues */ }
}
