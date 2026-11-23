// Race-start sounds, synthesised with Web Audio so there are no files to load or license.
// An AudioContext may only start after a tap, so `unlock()` is called from the Start button.

let ctx: AudioContext | null = null;

export function unlock() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** One light coming on: the short square-ish tone of the broadcast start sequence. */
export function lightBeep(n: number) {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2400;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.11 + n * 0.008, t + 0.008);
  g.gain.setValueAtTime(0.11 + n * 0.008, t + 0.16);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  osc.connect(f).connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.26);
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/**
 * Lights out: the grid launching. Several detuned "engines" climb through the revs
 * with a gear change, plus a burst of filtered noise for wheelspin, then fade into the distance.
 */
export function lightsOut() {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(0.5, t + 0.06);
  master.gain.setValueAtTime(0.5, t + 1.4);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
  const comp = c.createDynamicsCompressor();
  master.connect(comp).connect(c.destination);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.linearRampToValueAtTime(2600, t + 1.2);
  lp.frequency.exponentialRampToValueAtTime(500, t + 3.6); // cars pull away
  lp.Q.value = 2;
  lp.connect(master);

  const engines = 6;
  for (let i = 0; i < engines; i++) {
    const delay = i * 0.045 + Math.random() * 0.03;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    const base = 95 + Math.random() * 18;
    const f = osc.frequency;
    f.setValueAtTime(base, t + delay);
    f.exponentialRampToValueAtTime(base * 2.6, t + delay + 0.85); // first gear
    f.exponentialRampToValueAtTime(base * 1.9, t + delay + 0.95); // upshift
    f.exponentialRampToValueAtTime(base * 2.9, t + delay + 1.9);
    f.exponentialRampToValueAtTime(base * 2.2, t + delay + 2.0);
    f.exponentialRampToValueAtTime(base * 2.6, t + delay + 3.6);
    osc.detune.value = (Math.random() - 0.5) * 40;
    g.gain.value = 0.9 / engines;
    osc.connect(g).connect(lp);
    osc.start(t + delay);
    osc.stop(t + 3.7);
  }

  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 1.4);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  n.connect(bp).connect(ng).connect(master);
  n.start(t);
}

/** Team radio: the click and hiss of a channel opening, then a short tone. */
export function radioChirp(urgent = false) {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.35);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  n.connect(bp).connect(g).connect(c.destination); n.start(t);
  const o = c.createOscillator(); const og = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(urgent ? 1320 : 990, t + 0.05);
  if (urgent) o.frequency.setValueAtTime(990, t + 0.15);
  og.gain.setValueAtTime(0.0001, t + 0.05); og.gain.exponentialRampToValueAtTime(0.08, t + 0.07); og.gain.exponentialRampToValueAtTime(0.0001, t + (urgent ? 0.3 : 0.2));
  o.connect(og).connect(c.destination); o.start(t + 0.05); o.stop(t + 0.35);
}

/** Car coming to a stop: engine note falling away. */
export function engineDie() {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(30, t + 2.2);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1200, t); lp.frequency.exponentialRampToValueAtTime(200, t + 2.2);
  const g = c.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  o.connect(lp).connect(g).connect(c.destination); o.start(t); o.stop(t + 2.5);
}

/** Cork pop for the podium. */
export function corkPop() {
  const c = unlock();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  const g = c.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.15);
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 1.2);
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
  const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t + 0.05); ng.gain.exponentialRampToValueAtTime(0.08, t + 0.15); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  n.connect(hp).connect(ng).connect(c.destination); n.start(t + 0.05);
}
