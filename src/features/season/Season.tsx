import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CALENDAR, isPast, nextRound, roundNumber, weekendLabel } from '../../data/calendar';
import { teamById } from '../../data/teams';
import { trackOf } from '../../data/tracks';
import { championship } from '../../store/derive';
import { useRace } from '../../store/raceStore';
import { TrackOutline } from '../TrackOutline';

const ease = [0.22, 1, 0.36, 1] as const;

export function Season() {
  const { history, roundId, pickRound, openResult } = useRace();
  const next = nextRound();
  const selected = roundId ?? next.id;
  const champ = useMemo(() => championship({ history }), [history]);
  return (
    <main className="page season">
      <section className="calendar" aria-labelledby="cal-h">
        <div className="section-head">
          <h2 id="cal-h">2026 calendar</h2>
          <p>22 rounds. Bahrain and Saudi Arabia were cancelled this season and not replaced. Race any round; your latest result there counts.</p>
        </div>
        <ol className="rounds">
          {CALENDAR.map((x, i) => {
            const t = trackOf(x.trackId);
            const res = history.find(h => h.roundId === x.id);
            const state = x.cancelled ? 'cancelled' : x.id === next.id ? 'next' : isPast(x) ? 'past' : 'future';
            return (
              <motion.li key={x.id} className={state} initial={{ opacity: 0.35, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.018, duration: 0.3, ease }}>
                <button className="round" disabled={x.cancelled} aria-pressed={selected === x.id} onClick={() => pickRound(x.id === next.id ? null : x.id)}>
                  <span className="rnum num">{x.cancelled ? '—' : String(roundNumber(x.id)).padStart(2, '0')}</span>
                  <TrackOutline id={x.trackId} className="mini" width={60} />
                  <span className="round-main">
                    <strong>{x.name}</strong>
                    <small className="num">{weekendLabel(x)} · {t.place}</small>
                  </span>
                  <span className="round-tags">
                    {x.cancelled && <b className="chip muted">Cancelled</b>}
                    {state === 'next' && <b className="chip">Next</b>}
                    {t.rain >= 0.25 && !x.cancelled && <b className="chip outline">Rain likely</b>}
                  </span>
                </button>
                {res && <button className="res-pill num" onClick={() => openResult(res.id)}>{res.status === 'dnf' ? 'DNF' : `P${res.position}`}</button>}
              </motion.li>
            );
          })}
        </ol>
      </section>
      <aside className="tower standings" aria-labelledby="st-h">
        <div className="tower-head num"><strong id="st-h">Drivers' standings</strong><span>{champ.rounds} rd{champ.rounds === 1 ? '' : 's'}</span></div>
        {champ.rows.length === 0 ? (
          <p className="empty-inline">Race a Grand Prix and the whole grid scores from it, 25-18-15-12-10-8-6-4-2-1. Your latest race at each round counts.</p>
        ) : (
          <ol className="num">
            {champ.rows.map((r, i) => (
              <li key={r.code + i} className={r.you ? 'you' : undefined} style={{ '--team': teamById(r.teamId).color } as React.CSSProperties}>
                <span className="p">{i + 1}</span><i /><span className="code">{r.code}</span><span className="g">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </main>
  );
}
