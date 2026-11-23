import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PRACTICE_MS, QUALI_MS, currentWeekend, useRace } from '../../store/raceStore';
import { roundById, weekendLabel } from '../../data/calendar';
import { trackOf } from '../../data/tracks';
import { TYRES } from '../../config/balance';
import { needsStop, stintLaps } from '../../sim/race';
import { lapMsFor } from '../../sim/setup';
import { teamOf } from '../../store/derive';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { clock, lapTime, minutes } from '../../lib/format';
import { buzz } from '../../lib/haptics';
import type { TyreId, Weekend as W } from '../../types';
import { TicketRip } from './Ticket';
import { trackPath } from '../../lib/trackPath';
import { IconBack, IconFlag, IconPlay } from '../icons';

const ease = [0.22, 1, 0.36, 1] as const;

function Practice({ w }: { w: W }) {
  const { practiceStartedAt, startPractice, finishPractice, cancelPractice, settings } = useRace();
  const [plan, setPlan] = useState(w.practice?.plan ?? '');
  const now = useNow(250, !!practiceStartedAt);
  useWakeLock(settings.wakeLock && !!practiceStartedAt);
  const left = practiceStartedAt ? Math.max(0, PRACTICE_MS - (now - practiceStartedAt)) : PRACTICE_MS;
  const done = !!w.practice;
  return (
    <section className={'session' + (done ? ' done' : '')} aria-labelledby="fp-h">
      <header>
        <span className="session-tag">FP</span>
        <h3 id="fp-h">Practice</h3>
        <span className="session-state">{done ? 'Plan saved' : 'Optional · 5 min'}</span>
      </header>
      <p>Plan the session. Write what you'll cover in each stint; your engineer will read it back during the race.</p>
      <textarea id="plan" className="field area" rows={4} value={plan} maxLength={600}
        placeholder={'Stint 1: chapter 3 problems\nStint 2: past paper Q4–6\nAfter the stop: flashcards'}
        onChange={e => setPlan(e.target.value)} aria-label="Session plan" />
      {practiceStartedAt ? (
        <div className="session-run">
          <span className="big-clock num" aria-live="off">{clock(left)}</span>
          <button className="btn btn-primary" disabled={left > 0 || !plan.trim()} onClick={() => { finishPractice(plan); buzz('light'); }}>
            {left > 0 ? 'Planning…' : 'Save plan'}
          </button>
          <button className="btn btn-ghost" onClick={cancelPractice}>Stop</button>
        </div>
      ) : (
        <div className="session-run">
          <button className="btn btn-ghost" onClick={startPractice} disabled={done}><IconPlay />{done ? 'Done' : 'Start practice'}</button>
          {!done && plan.trim() && <button className="link" onClick={() => finishPractice(plan)}>Save plan without the timer (no credits)</button>}
        </div>
      )}
    </section>
  );
}

function FlyingLap({ trackId, progress }: { trackId: string; progress: number }) {
  const t = trackOf(trackId);
  const { d, at } = trackPath(t);
  const [vw, vh] = t.geometry.viewBox;
  const [x, y] = at(progress);
  return (
    <svg className="quali-map" viewBox={`0 0 ${vw} ${vh}`} aria-label="Your flying lap" role="img">
      <path d={d} className="circuit-edge" strokeWidth={30} />
      <path d={d} className="circuit-surface" strokeWidth={22} />
      <path d={d} fill="none" stroke="var(--purple)" strokeWidth={6} pathLength={1} strokeDasharray={`${progress} 1`} strokeLinecap="round" />
      <circle cx={x} cy={y} r={16} fill="var(--ink)" stroke="var(--bg)" strokeWidth={5} />
    </svg>
  );
}

function Quali({ w }: { w: W }) {
  const { qualiStartedAt, startQuali, finishQuali, qualiAway, settings } = useRace();
  const now = useNow(250, !!qualiStartedAt);
  useWakeLock(settings.wakeLock && !!qualiStartedAt);
  const left = qualiStartedAt ? Math.max(0, QUALI_MS - (now - qualiStartedAt)) : QUALI_MS;
  useEffect(() => { if (qualiStartedAt && left <= 0) { finishQuali(false); buzz('radio'); } }, [left, qualiStartedAt, finishQuali]);
  useEffect(() => {
    if (!qualiStartedAt) return;
    const vis = () => qualiAway(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [qualiStartedAt, qualiAway]);
  const q = w.quali;
  const round = roundById(w.roundId)!;
  const field = teamOf(useRace.getState()) === 'kestrel' ? 23 : 22;
  return (
    <section className={'session' + (q ? ' done' : '')} aria-labelledby="q-h">
      <header>
        <span className="session-tag">Q</span>
        <h3 id="q-h">Qualifying</h3>
        <span className="session-state">{q ? (q.aborted ? 'Lap deleted' : `P${q.grid} on the grid`) : 'Optional · 5 min'}</span>
      </header>
      {q ? (
        <div className="quali-result">
          <span className="grid-pos num">{q.aborted ? 'P' + field : `P${q.grid}`}</span>
          <p>{q.aborted ? 'You left during the flying lap, so it was deleted. You start from the back.' : <>Best lap <b className="num">{lapTime(q.lapF1Ms)}</b>. That's your grid slot for the race.</>}</p>
        </div>
      ) : qualiStartedAt ? (
        <div className="quali-run">
          <FlyingLap trackId={round.trackId} progress={1 - left / QUALI_MS} />
          <span className="big-clock num">{clock(left)}</span>
          <p>Flying lap. Stay in the app: leaving for more than 15 seconds deletes it.</p>
          <button className="btn btn-ghost" onClick={() => finishQuali(true)}>Abort lap</button>
        </div>
      ) : (
        <>
          <p>Five minutes of flat-out focus. Your car, your driver and a clean lap decide the grid. Skip it and you start last.</p>
          <div className="session-run"><button className="btn btn-ghost" onClick={startQuali}><IconPlay />Start qualifying</button></div>
        </>
      )}
    </section>
  );
}

function RaceSetup({ w }: { w: W }) {
  const lineUp = useRace(s => s.lineUp);
  const rain = w.weather === 'rain';
  const [tyre, setTyre] = useState<TyreId>(rain ? 'inter' : 'medium');
  const stop = needsStop({ laps: w.laps, weather: w.weather });
  const choices: TyreId[] = rain ? ['inter'] : ['soft', 'medium', 'hard'];
  return (
    <section className="session race-session" aria-labelledby="r-h">
      <header>
        <span className="session-tag red">R</span>
        <h3 id="r-h">Race</h3>
        <span className="session-state num">{w.laps} laps</span>
      </header>
      <span className="label" id="tyre-l">Starting tyre</span>
      <div className="tyres" role="radiogroup" aria-labelledby="tyre-l">
        {choices.map(t => (
          <button key={t} role="radio" aria-checked={tyre === t} className="tyre-pick" onClick={() => setTyre(t)} style={{ '--tyre': TYRES[t].color } as React.CSSProperties}>
            <span className="tyre-dot" aria-hidden>{TYRES[t].label[0]}</span>
            <b>{TYRES[t].label}</b>
            <small className="num">~{stintLaps(t, w.laps)} laps · credits ×{TYRES[t].mult.toFixed(2)}</small>
          </button>
        ))}
      </div>
      <p className="strategy">
        {rain ? 'Wet race: intermediates only, and every focused minute earns 25% more.'
          : stop ? `${w.laps} laps means one pit stop is mandatory. A stop is your break: five minutes and the field waits.`
            : 'Short race, no mandatory stop. Box any time you need a break.'}
      </p>
      <button className="btn btn-primary btn-xl" onClick={() => lineUp(tyre)}><IconFlag />Go to the grid</button>
    </section>
  );
}

export function WeekendScreen() {
  const s = useRace();
  const w = currentWeekend(s);
  if (!w) return null;
  const round = roundById(w.roundId)!;
  const track = trackOf(round.trackId);
  const total = w.laps * lapMsFor(round.trackId);
  return (
    <main className="page weekend">
      {!w.rippedAt ? (
          <motion.div key="rip" initial={{ y: 16 }} animate={{ y: 0 }} transition={{ duration: 0.35, ease }}>
            <div className="weekend-head">
              <button className="link back" onClick={s.leaveWeekend}><IconBack />Garage</button>
              <h2>Your ticket</h2>
            </div>
            <TicketRip w={w} onTorn={s.ripTicket} />
          </motion.div>
        ) : (
          <motion.div key="hub" initial={{ y: 16 }} animate={{ y: 0 }} transition={{ duration: 0.35, ease }} className="hub">
            <div className="weekend-head">
              <button className="link back" onClick={s.leaveWeekend}><IconBack />Garage</button>
              <div>
                <h2>{round.name}</h2>
                <p className="num">Round {w.ticket.round} · {weekendLabel(round)} · {track.name} · {w.laps} laps · {minutes(total)} of racing · {w.weather === 'rain' ? 'Rain expected' : 'Dry'}</p>
              </div>
            </div>
            <div className="sessions">
              <Practice w={w} />
              <Quali w={w} />
              <RaceSetup w={w} />
            </div>
          </motion.div>
        )}
    </main>
  );
}
