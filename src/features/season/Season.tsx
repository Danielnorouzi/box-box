import { useMemo } from 'react';
import { CALENDAR, isPast, nextRound, weekendLabel } from '../../data/calendar';
import { teamById } from '../../data/teams';
import { trackOf } from '../../data/tracks';
import { championship, roundResults } from '../../lib/championship';
import { useRace } from '../../store/raceStore';
import type { RaceResult } from '../../types';
import { TrackOutline } from '../TrackOutline';

const badge = (r?: RaceResult) => (r ? (r.status === 'dnf' ? 'DNF' : `P${r.position}`) : null);

export function Season() {
  const { history, roundId, pickRound, openResult } = useRace();
  const next = nextRound();
  const selected = roundId ?? next.id;
  const champ = useMemo(() => championship(history), [history]);

  return (
    <main className="page season">
      <section aria-labelledby="cal-h" className="calendar">
        <div className="section-head">
          <h2 id="cal-h">2026 calendar</h2>
          <p>Pick any Grand Prix to race on its circuit. Bahrain and Saudi Arabia were cancelled this season.</p>
        </div>
        <ol className="rounds">
          {CALENDAR.map(x => {
            const res = roundResults(history, x.id);
            const t = trackOf(x.trackId);
            const state = x.cancelled ? 'cancelled' : x.id === next.id ? 'next' : isPast(x) ? 'past' : 'future';
            return (
              <li key={x.id} className={state}>
                <button
                  className="round" disabled={x.cancelled} aria-pressed={selected === x.id}
                  onClick={() => pickRound(x.id === next.id ? null : x.id)}
                >
                  <TrackOutline id={x.trackId} className="mini" width={60} />
                  <span className="round-main">
                    <strong>{x.name}</strong>
                    <small className="num">{weekendLabel(x)} · {t.place}</small>
                  </span>
                  <span className="round-tags">
                    {x.cancelled && <b className="chip muted">Cancelled</b>}
                    {state === 'next' && <b className="chip">This weekend</b>}
                    {x.sprint && !x.cancelled && <b className="chip outline">Sprint</b>}
                  </span>
                </button>
                {(res.gp || res.sprint) && (
                  <span className="round-res num">
                    {res.sprint && <button className="res-pill" onClick={() => openResult(res.sprint!.id)}>Sprint {badge(res.sprint)}</button>}
                    {res.gp && <button className="res-pill" onClick={() => openResult(res.gp!.id)}>GP {badge(res.gp)}</button>}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <aside className="glass dark standings" aria-labelledby="st-h">
        <div className="tower-head">
          <strong id="st-h">Drivers' standings</strong>
          <span className="num">{champ.rounds} round{champ.rounds === 1 ? '' : 's'}</span>
        </div>
        {champ.rows.length === 0 ? (
          <p className="empty-inline">Finish a Grand Prix and the whole grid scores from that race. Your latest GP at each round counts, plus the Sprint on sprint weekends.</p>
        ) : (
          <ol className="num">
            {champ.rows.map((r, i) => (
              <li key={r.code} className={r.you ? 'you' : undefined} style={{ '--team': teamById(r.teamId).color } as React.CSSProperties}>
                <span className="p">{i + 1}</span>
                <i />
                <span>{r.code}</span>
                <span className="g">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </main>
  );
}
