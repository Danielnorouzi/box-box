import { Suspense, lazy, useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import type { RaceResult } from '../../types';
import { trackOf } from '../../data/tracks';
import { roundById } from '../../data/calendar';
import { teamById } from '../../data/teams';
import { TYRES } from '../../config/balance';
import { clock, lapTime } from '../../lib/format';
import { useRace } from '../../store/raceStore';
import { rivalHelmet, DEFAULT_HELMET } from '../../lib/helmets';
import { buzz } from '../../lib/haptics';
import { corkPop } from '../../lib/sound';
import { IconBack } from '../icons';

const PodiumScene = lazy(() => import('./PodiumScene'));
const ease = [0.22, 1, 0.36, 1] as const;

function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return;
    const c = animate(0, to, { duration: 1.4, ease, onUpdate: x => setV(Math.round(x)) });
    return () => c.stop();
  }, [to, reduce]);
  return <>{v}</>;
}

export function ResultScreen({ r }: { r: RaceResult }) {
  const { closeResult, driver, settings } = useRace();
  const reduce = useReducedMotion() ?? false;
  const round = roundById(r.roundId);
  const track = trackOf(r.trackId);
  const dnf = r.status === 'dnf';
  const podium = !dnf && r.position <= 3;
  const delta = r.gridSlot - r.position;
  useEffect(() => {
    if (podium) { buzz('podium'); if (settings.sound) setTimeout(corkPop, 900); }
  }, [podium, settings.sound]);

  const top3 = r.classification.slice(0, 3).map(c => {
    const t = teamById(c.teamId);
    return { primary: t.color, secondary: t.color2, number: c.you ? driver?.number ?? c.number : c.number, helmet: c.you ? driver?.helmet ?? DEFAULT_HELMET : rivalHelmet(c.teamId, c.number), you: c.you };
  });

  const line = dnf
    ? r.dnfReason === 'retired' ? `Retired on lap ${Math.min(r.laps, r.lapsCompleted + 1)}.` : r.dnfReason === 'strikes' ? 'Black flag after a third strike.' : 'Stopped on track after leaving the app too long.'
    : `From P${r.gridSlot}, ${delta > 0 ? `up ${delta}` : delta < 0 ? `down ${-delta}` : 'held station'}. ${r.points ? `${r.points} points.` : 'No points this time.'}`;

  return (
    <main className={'page result' + (podium ? ' has-podium' : '')}>
      {podium && (
        <section className="podium-stage" aria-label={`Podium: ${r.classification.slice(0, 3).map(c => c.you ? 'you' : c.code).join(', ')}`}>
          <Suspense fallback={<div className="podium-fallback" />}>
            <PodiumScene drivers={top3 as never} reduce={reduce} />
          </Suspense>
        </section>
      )}
      <motion.section className="result-hero" initial={{ opacity: 0.35, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease, delay: podium ? 0.4 : 0 }}>
        <h1 className={'num' + (dnf ? ' red' : '')}>{dnf ? 'DNF' : `P${r.position}`}</h1>
        <p className="line">{line}</p>
        <span className="kicker num">{round?.name ?? track.name}{r.weather === 'rain' ? ' · Wet race' : ''} · {new Date(r.endedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>

        <div className="credits-earned">
          <span className="ce-num num">+<CountUp to={r.credits} /></span>
          <span className="ce-label">credits for R&amp;D</span>
          <ul className="ce-lines num">
            {r.creditLines.map(l => <li key={l.label}><span>{l.label}</span><b>+{l.amount}</b></li>)}
          </ul>
        </div>
        <dl className="result-stats num">
          <div><dt>Laps</dt><dd>{r.lapsCompleted}/{r.laps}</dd></div>
          <div><dt>Focus</dt><dd>{clock(r.focusMs)}</dd></div>
          <div><dt>Best lap</dt><dd className="purple">{r.bestLapF1Ms ? lapTime(r.bestLapF1Ms) : '–'}</dd></div>
          <div><dt>Strategy</dt><dd className="tyre-line">{r.tyres.map((t, i) => <i key={i} className="tyre-dot sm" style={{ '--tyre': TYRES[t].color } as React.CSSProperties}>{TYRES[t].label[0]}</i>)}</dd></div>
          <div><dt>Strikes</dt><dd>{r.strikes}</dd></div>
        </dl>
        <button className="btn btn-primary btn-xl" onClick={closeResult}><IconBack />Back to the garage</button>
      </motion.section>

      <section className="classif-wrap" aria-labelledby="cl-h">
        <h2 id="cl-h">Classification</h2>
        <ol className="classif num">
          {r.classification.map((c, i) => (
            <motion.li key={c.code + i} className={(c.you ? 'you' : '') + (c.dnf ? ' out' : '')} style={{ '--team': teamById(c.teamId).color } as React.CSSProperties}
              initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.025, duration: 0.3, ease }}>
              <span className="p">{c.dnf ? '–' : i + 1}</span>
              <i />
              <span>{c.code}<small>{c.number ? ` #${c.number}` : ''}</small></span>
              <span className="g">{c.gap}</span>
            </motion.li>
          ))}
        </ol>
      </section>
    </main>
  );
}
