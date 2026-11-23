import { useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import qrcode from 'qrcode-generator';
import type { Weekend } from '../../types';
import { roundById, weekendLabel } from '../../data/calendar';
import { trackOf } from '../../data/tracks';
import { TrackOutline } from '../TrackOutline';
import { buzz } from '../../lib/haptics';

function QR({ text, size = 92 }: { text: string; size?: number }) {
  const cells = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const out: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) out.push([c, r]);
    return { n, out };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} width={size} height={size} className="qr" aria-label="Ticket QR code" role="img">
      <rect x={-2} y={-2} width={cells.n + 4} height={cells.n + 4} fill="#fbf8f1" />
      <path d={cells.out.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')} fill="#16130f" />
    </svg>
  );
}

/** Jagged tear line as a polygon edge, so the stub and the body each keep half the teeth. */
function jag(seed: number, h: number, side: 'left' | 'right') {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts: string[] = [];
  for (let y = 0; y <= h; y += 6) pts.push(`${(side === 'left' ? 0 : 6) + (r() - 0.5) * 5}px ${y}px`);
  return pts;
}

export function TicketFace({ w, stub = true, torn = false }: { w: Weekend; stub?: boolean; torn?: boolean }) {
  const round = roundById(w.roundId)!;
  const track = trackOf(round.trackId);
  const t = w.ticket;
  const date = new Date(round.race + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className={'ticket-face' + (torn ? ' torn' : '')}>
      <div className="ticket-main">
        <div className="tk-top">
          <span className="tk-round num">Round {String(t.round).padStart(2, '0')} · 2026</span>
          <span className="tk-admit">Admit one</span>
        </div>
        <div className="tk-gp">
          <h3>{round.name.replace(' Grand Prix', '')}<span> Grand Prix</span></h3>
          <TrackOutline id={round.trackId} className="tk-map" width={36} />
        </div>
        <p className="tk-circuit">{track.name} · {track.place}</p>
        <div className="tk-day"><b>Race Day – Sunday</b><span>{date}</span></div>
        <dl className="tk-grid num">
          <div><dt>Gate</dt><dd>{t.gate}</dd></div>
          <div className="wide"><dt>Grandstand</dt><dd>{t.grandstand}</dd></div>
          <div><dt>Row</dt><dd>{t.row}</dd></div>
          <div><dt>Seat</dt><dd>{t.seat || '—'}</dd></div>
        </dl>
        <div className="tk-foot">
          <div className="tk-holo" aria-hidden><span>Genuine · 2026 · Genuine · 2026 · Genuine · 2026 · Genuine · 2026</span></div>
          <QR text={`BOXBOX-${t.serial}-R${t.round}-${t.gate}-${t.row}${t.seat}`} />
        </div>
        <p className="tk-small">
          {t.tier} · €{t.price}.00 incl. VAT · Serial <span className="num">{t.serial}</span>. Valid for one person on race day only. Not for resale. Gates open
          {' '}four hours before the start. The holder accepts the circuit's conditions of entry, including bag checks and the noise warning. Schedule subject to change.
        </p>
      </div>
      {stub && <StubFace w={w} />}
    </div>
  );
}

export function StubFace({ w, jagSeed }: { w: Weekend; jagSeed?: number }) {
  const round = roundById(w.roundId)!;
  const t = w.ticket;
  return (
    <div className="ticket-stub" style={jagSeed ? { clipPath: `polygon(${jag(jagSeed, 640, 'left').join(',')}, 100% 640px, 100% 0)` } : undefined}>
      <span className="stub-round num">R{String(t.round).padStart(2, '0')}</span>
      <span className="stub-name">{round.name.replace(' Grand Prix', '')}</span>
      <span className="stub-seat num">{t.gate} · {t.row}{t.seat ? `-${t.seat}` : ''}</span>
      <span className="stub-serial num">{t.serial}</span>
      <span className="stub-date num">{weekendLabel(round)}</span>
    </div>
  );
}

/**
 * Drag along the perforation to tear the stub off. Progress follows the finger down the line;
 * past 85% the stub separates and falls into the album. Keyboard: Enter tears it in one go.
 */
export function TicketRip({ w, onTorn }: { w: Weekend; onTorn: () => void }) {
  const reduce = useReducedMotion();
  const line = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const [done, setDone] = useState(false);
  const [grab, setGrab] = useState(false);
  const clip = useTransform(progress, p => `inset(0 0 ${100 - p * 100}% 0)`);
  const stubX = useMotionValue(0), stubR = useMotionValue(0), stubY = useMotionValue(0);
  const seed = parseInt(w.ticket.serial.replace(/\D/g, '').slice(0, 6) || '7', 10) + 3;
  const lastBuzz = useRef(0);

  const finish = () => {
    if (done) return;
    setDone(true);
    progress.set(1);
    buzz('light');
    if (reduce) { onTorn(); return; }
    void animate(stubX, 60, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
    void animate(stubR, 14, { duration: 0.6 });
    void animate(stubY, 30, { duration: 0.6 }).then(() => setTimeout(onTorn, 350));
  };

  const track = (clientY: number) => {
    const r = line.current?.getBoundingClientRect();
    if (!r || done) return;
    const p = Math.max(progress.get(), Math.min(1, (clientY - r.top) / r.height));
    progress.set(p);
    if (p - lastBuzz.current > 0.12) { lastBuzz.current = p; buzz('tap'); }
    if (p > 0.85) finish();
  };

  return (
    <div className="rip">
      <div className="ticket-wrap">
        <TicketFace w={w} stub={false} torn={done} />
        <div
          ref={line}
          className={'perforation' + (grab ? ' grabbing' : '')}
          role="slider" tabIndex={0} aria-label="Tear the stub: drag down the perforation, or press Enter"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.get() * 100)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } }}
          onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setGrab(true); track(e.clientY); }}
          onPointerMove={e => grab && track(e.clientY)}
          onPointerUp={() => setGrab(false)}
          onPointerCancel={() => setGrab(false)}
        >
          <motion.span className="tear" style={{ clipPath: clip }} />
          {!done && <span className="grip" aria-hidden>Tear ↓</span>}
        </div>
        <motion.div className="stub-motion" style={{ x: stubX, y: stubY, rotate: stubR }}>
          <StubFace w={w} jagSeed={done ? seed : undefined} />
        </motion.div>
      </div>
      <p className="rip-hint" role="status">{done ? 'Stub saved to your Ticket Album.' : 'Drag down the dotted line to tear off your stub.'}</p>
    </div>
  );
}
