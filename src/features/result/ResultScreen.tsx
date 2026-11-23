import { motion } from 'framer-motion';
import type { RaceResult } from '../../types';
import { TRACKS } from '../../data/tracks';
import { teamById } from '../../data/teams';
import { clock, lapTime, minutes } from '../../lib/format';
import { useRace } from '../../store/raceStore';
import { IconBack } from '../icons';

export function ResultScreen({ r }: { r: RaceResult }) {
  const close = useRace(s => s.closeResult);
  const track = TRACKS[r.trackId];
  const dnf = r.status === 'dnf';
  const delta = r.gridSlot - r.position;
  const kept = r.focusMs >= 60_000 ? <> <b>{minutes(r.focusMs)}</b> of focus still counts.</> : null;
  const line = dnf
    ? <>{r.dnfReason === 'retired' ? 'Retired' : 'Stopped too long'} on lap {Math.min(r.laps, r.lapsCompleted + 1)}.{kept}</>
    : <>From P{r.gridSlot} on the grid, {delta > 0 ? <b>up {delta}</b> : delta < 0 ? <b>down {-delta}</b> : <b>holding station</b>}. {r.points} point{r.points === 1 ? '' : 's'}.</>;

  return (
    <main className="result">
      <motion.section
        className="glass dark result-hero"
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow">
          {track.grandPrix}{r.format === 'sprint' ? ' · Sprint' : ''}{r.subject ? ` · ${r.subject}` : ''}
        </span>
        <h1 className={'num' + (dnf ? ' dnf' : '')}>{dnf ? 'DNF' : `P${r.position}`}</h1>
        <p className="line">{line}</p>
        <dl className="result-stats num">
          <div><dt>Laps</dt><dd>{r.lapsCompleted}/{r.laps}</dd></div>
          <div><dt>Focus</dt><dd>{clock(r.focusMs)}</dd></div>
          <div><dt>VSC used</dt><dd>{clock(r.vscUsedMs)}</dd></div>
          <div><dt>Clean laps</dt><dd>{r.cleanLaps}</dd></div>
          <div><dt>Best lap</dt><dd className="purple">{r.bestLapF1Ms ? lapTime(r.bestLapF1Ms) : '–'}</dd></div>
          <div><dt>Team</dt><dd>{teamById(r.teamId).name}</dd></div>
        </dl>
        <div><button className="btn btn-primary" onClick={close}><IconBack />Back to the garage</button></div>
      </motion.section>

      <section aria-labelledby="classif-h" style={{ display: 'grid', gap: 'var(--s3)' }}>
        <h2 id="classif-h" style={{ margin: 0, font: '700 18px/1.2 var(--font)' }}>Classification</h2>
        <ol className="classif num">
          {r.classification.map((c, i) => (
            <li key={c.code} className={c.you ? 'you' : undefined} style={{ '--team': teamById(c.teamId).color } as React.CSSProperties}>
              <span className="p">{c.gap === 'DNF' ? '–' : i + 1}</span>
              <i />
              <span>{c.you ? 'YOU' : c.code}</span>
              <span className="g">{c.gap}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
