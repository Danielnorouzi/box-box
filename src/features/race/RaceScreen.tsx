import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRace } from '../../store/raceStore';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { deriveClock } from '../../sim/clock';
import { needsStop, overtakeCharges, standings, stintLaps } from '../../sim/race';
import { trackOf } from '../../data/tracks';
import { roundById } from '../../data/calendar';
import { ABSENCE, OVERTAKE, PIT, TYRES } from '../../config/balance';
import { clock as fmt, lapTime } from '../../lib/format';
import { engineer, type RadioMsg } from '../../lib/radio';
import { buzz } from '../../lib/haptics';
import { engineDie, lightBeep, lightsOut, radioChirp, unlock } from '../../lib/sound';
import type { ActiveRace, TyreId } from '../../types';
import { TrackMap } from './TrackMap';
import { TimingTower } from './TimingTower';
import { IconBack, IconFlag, IconPlay, IconStop } from '../icons';

const ease = [0.22, 1, 0.36, 1] as const;
const DNF_ANIM_MS = 3200;
const FLAG_MS = 1600;

export function RaceScreen({ race }: { race: ActiveRace }) {
  const { push, settle, leaveGrid, settings } = useRace();
  const reduce = useReducedMotion() ?? false;
  const now = useNow(40);
  const cfg = race.config;
  const track = trackOf(cfg.trackId);
  const round = roundById(cfg.roundId);
  const c = useMemo(() => deriveClock(race, now), [race, now]);
  const { rows, laps } = useMemo(() => standings(cfg, c), [cfg, c]);
  const you = rows.find(r => r.car.isYou)!;
  const om = overtakeCharges(cfg, c);
  const sound = settings.sound;

  // ── Laps, sectors, tyres
  const lapPos = c.focusMs / cfg.lapMs;
  const lapNo = Math.min(cfg.laps, Math.floor(lapPos) + 1);
  const lapFrac = lapPos - Math.floor(lapPos);
  const lapLeft = cfg.lapMs * (Math.min(cfg.laps, Math.floor(lapPos) + 1) - lapPos);
  const raceLeft = cfg.laps * cfg.lapMs - c.focusMs;
  const done = laps.slice(0, Math.floor(lapPos + 1e-9));
  const last = done.at(-1);
  const bestSector = [0, 1, 2].map(i => Math.min(...done.filter(l => l.clean).map(l => l.sectors[i]), Infinity));
  const sectorNow = Math.min(2, Math.floor(lapFrac * 3));
  const stint = c.stints[c.stints.length - 1];
  const stintLap = Math.floor((c.focusMs - stint.fromFocusMs) / cfg.lapMs);
  const life = stintLaps(stint.tyre, cfg.laps);
  const wear = Math.min(1.2, (c.focusMs - stint.fromFocusMs) / cfg.lapMs / life);
  const mustStop = needsStop(cfg) && c.stops.length === 0;

  // ── End of race: hold the flag or the DNF sequence, then file the result.
  const endedAt = c.endedAt;
  const dnf = c.phase === 'dnf';
  const dnfT = dnf && endedAt ? Math.min(1, (now - endedAt) / DNF_ANIM_MS) : 0;
  const dnfAtRef = useRef<number | null>(null);
  if (dnf && dnfAtRef.current === null) dnfAtRef.current = you.shown;
  useEffect(() => {
    if (c.phase !== 'finished' && c.phase !== 'dnf') return;
    // A race that ended long ago (app was closed) files straight away.
    const hold = c.phase === 'dnf' ? DNF_ANIM_MS : FLAG_MS;
    const wait = Math.max(0, (endedAt ?? 0) + hold - Date.now());
    const t = setTimeout(() => settle(), Date.now() - (endedAt ?? 0) > 60_000 ? 0 : wait);
    return () => clearTimeout(t);
  }, [c.phase, endedAt, settle]);
  useEffect(() => {
    if (c.phase === 'dnf' && endedAt && Date.now() - endedAt < 10_000) { buzz('dnf'); if (sound) engineDie(); }
  }, [c.phase, endedAt, sound]);

  // ── Leaving the app: yellow flag, strikes, DNF. Only counts while racing.
  const phaseRef = useRef(c.phase);
  phaseRef.current = c.phase;
  useEffect(() => {
    const vis = () => {
      const p = phaseRef.current;
      if (document.visibilityState === 'hidden' && p === 'green') push('away');
      if (document.visibilityState === 'visible' && p === 'away') { push('back'); buzz('warning'); }
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [push]);

  // ── Team radio
  const [radio, setRadio] = useState<RadioMsg | null>(null);
  const said = useRef(new Set<string>());
  const msg = engineer(cfg, c, rows, laps, om);
  useEffect(() => {
    if (!msg || said.current.has(msg.id)) return;
    said.current.add(msg.id);
    setRadio(msg);
    if (sound && document.visibilityState === 'visible') radioChirp(msg.urgent);
    buzz(msg.urgent ? 'warning' : 'radio');
    const t = setTimeout(() => setRadio(r => (r?.id === msg.id ? null : r)), msg.urgent ? 9000 : 6000);
    return () => clearTimeout(t);
  }, [msg?.id, msg, sound]);

  useWakeLock(settings.wakeLock && (c.phase === 'green' || c.phase === 'pit'));

  useEffect(() => {
    document.title = c.phase === 'grid' ? 'On the grid · Box Box'
      : c.phase === 'pit' ? `IN PIT · P${you.position} · Box Box`
        : c.phase === 'away' ? '⚠ Yellow flag · Box Box'
          : `L${lapNo}/${cfg.laps} · ${fmt(lapLeft)} · P${you.position}`;
    return () => { document.title = 'Box Box'; };
  }, [c.phase, lapNo, cfg.laps, lapLeft, you.position]);

  // ── Start lights
  const [lights, setLights] = useState(-1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const startSequence = () => {
    if (sound) unlock();
    setLights(0);
    for (let i = 1; i <= 5; i++) timers.current.push(window.setTimeout(() => { setLights(i); buzz('tap'); if (useRace.getState().settings.sound) lightBeep(i); }, i * 900));
    timers.current.push(window.setTimeout(() => {
      setLights(-1); push('start'); buzz('light');
      if (useRace.getState().settings.sound) lightsOut();
    }, 5 * 900 + 500 + Math.random() * 1800));
  };

  // ── Controls
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  const [nextTyre, setNextTyre] = useState<TyreId>(cfg.weather === 'rain' ? 'inter' : stint.tyre === 'hard' ? 'medium' : 'hard');
  const box = () => { push('pit_in'); buzz('pit'); };
  const pitLeft = c.pitFreeUntil ? c.pitFreeUntil - now : 0;
  const strikesLeft = ABSENCE.strikesToDnf - c.strikes;

  return (
    <main className={`race phase-${c.phase}`}>
      {/* ── header strip: lap, position, timers, sectors */}
      <header className="race-head num">
        <div className="rh-cell lap"><span>Lap</span><b>{c.phase === 'grid' ? 0 : lapNo}<small>/{cfg.laps}</small></b></div>
        <div className="rh-cell pos"><span>Pos</span><b className={dnf ? 'red' : undefined}>{dnf ? 'DNF' : `P${you.position}`}</b></div>
        <div className="rh-cell"><span>This lap</span><b>{c.phase === 'grid' ? fmt(cfg.lapMs) : fmt(lapLeft)}</b></div>
        <div className="rh-cell"><span>To the flag</span><b>{fmt(raceLeft)}</b></div>
        <div className="rh-cell sectors" aria-label="Sectors of your last lap">
          <span>Sectors</span>
          <div>
            {[0, 1, 2].map(i => {
              const v = last?.sectors[i];
              const cls = !v ? '' : v <= bestSector[i] ? 'purple' : last?.clean ? 'green' : 'yellow';
              return <i key={i} className={`sec ${cls}${i === sectorNow && c.phase === 'green' ? ' live' : ''}`}>{v ? (v / 1000).toFixed(1) : '–'}</i>;
            })}
          </div>
        </div>
        <div className="rh-cell gp"><span>{round?.name ?? track.name}</span><b className="gp-sub">{cfg.weather === 'rain' ? 'Wet' : 'Dry'} · {track.name}</b></div>
      </header>

      {/* ── flag / status bar */}
      <AnimatePresence initial={false}>
        {(c.phase === 'away' || c.phase === 'pit' || dnf || c.phase === 'finished') && (
          <motion.div key={c.phase} className={`flagbar ${c.phase}`} role="status"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}>
            {c.phase === 'away' && <><b>Yellow flag</b><span>You left the app. {strikesLeft - 1 > 0 ? `${strikesLeft - 1} more strike${strikesLeft - 1 > 1 ? 's' : ''} and you're out.` : 'One more and you are out.'}</span><em className="num">{fmt((c.awayLimitAt ?? now) - now)}</em></>}
            {c.phase === 'pit' && <><b>In the pit box</b><span>{pitLeft > 0 ? 'Take your break. The field is holding.' : 'Over the allowance: the field is racing on.'}</span><em className="num">{pitLeft > 0 ? fmt(pitLeft) : `+${fmt(-pitLeft)}`}</em></>}
            {dnf && <><b>DNF</b><span>{c.dnfReason === 'retired' ? 'Retired from the race.' : c.dnfReason === 'strikes' ? 'Third strike. The stewards have black-flagged the car.' : 'Away too long. The car stopped on track.'}</span></>}
            {c.phase === 'finished' && <><b>Chequered flag</b><span>P{you.position}. Bringing it back to parc fermé.</span></>}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="race-map">
        <TrackMap track={track} rows={rows} phase={c.phase} lapFrac={lapFrac} dnfT={dnfT} dnfAt={dnf ? dnfAtRef.current : null} rain={cfg.weather === 'rain'} reduce={reduce} />
        {lights >= 0 && c.phase === 'grid' && (
          <div className="lights" role="status" aria-label={`${lights} of 5 lights`}>
            <div className="lights-row">{[1, 2, 3, 4, 5].map(i => <span key={i} className={'lamp' + (lights >= i ? ' on' : '')}><i /><i /></span>)}</div>
          </div>
        )}
        <AnimatePresence>
          {radio && (
            <motion.div key={radio.id} className={'radio' + (radio.urgent ? ' urgent' : '')} role="status" aria-live="polite"
              initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25, ease }}>
              <span className="radio-from">Team radio</span>
              <p>{radio.text}</p>
              <span className="radio-wave" aria-hidden>{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${i * 0.09}s` }} />)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <TimingTower rows={rows} lap={Math.min(cfg.laps, Math.max(1, Math.floor(rows[0].distance) + 1))} laps={cfg.laps} phase={c.phase} yourTyre={stint.tyre} youDnf={dnf} />

      {/* ── pit wall telemetry */}
      <section className="telemetry num" aria-label="Telemetry">
        <div className="tl-tyre" style={{ '--tyre': TYRES[stint.tyre].color } as React.CSSProperties}>
          <span className="tl-label">Tyre</span>
          <b><i className="tyre-dot sm">{TYRES[stint.tyre].label[0]}</i>{TYRES[stint.tyre].label}</b>
          <div className="wear" aria-label={`Tyre life ${Math.round((1 - Math.min(1, wear)) * 100)}%`}><div style={{ transform: `scaleX(${Math.max(0, 1 - wear)})` }} className={wear > 0.85 ? 'hot' : ''} /></div>
          <small>{stintLap} / ~{life} laps{mustStop ? ' · stop due' : ''}</small>
        </div>
        <div>
          <span className="tl-label">Overtake</span>
          <b>{om.available}<small> ready</small></b>
          <small>{om.left} of {OVERTAKE.maxUsesPerRace} left · 1 per {OVERTAKE.cleanLapsPerCharge} clean laps</small>
        </div>
        <div>
          <span className="tl-label">Strikes</span>
          <b className={c.strikes ? 'yellow' : undefined}>{c.strikes}<small>/{ABSENCE.strikesToDnf}</small></b>
          <small>Leave the app over {ABSENCE.graceMs / 1000}s = strike</small>
        </div>
        <div>
          <span className="tl-label">Last lap</span>
          <b className={last && last.f1Ms === Math.min(...done.filter(l => l.clean).map(l => l.f1Ms)) ? 'purple' : undefined}>{last ? lapTime(last.f1Ms) : '–'}</b>
          <small>{you.position > 1 ? `${rows[you.position - 2].car.code} ahead +${rows[you.position - 1].intervalS.toFixed(1)}s` : 'Leading'}</small>
        </div>
        {cfg.plan && <div className="tl-plan"><span className="tl-label">Your plan</span><p>{cfg.plan}</p></div>}
      </section>

      {/* ── controls */}
      <nav className="controls" aria-label="Race controls">
        {c.phase === 'grid' && (
          <>
            <button className="btn btn-primary btn-xl" onClick={startSequence} disabled={lights >= 0}><IconFlag />{lights >= 0 ? 'Lights…' : 'Start the race'}</button>
            <button className="btn btn-ghost" onClick={leaveGrid} disabled={lights >= 0}><IconBack />Back</button>
            <span className="hint num">Grid slot P{cfg.gridSlot}</span>
          </>
        )}
        {c.phase === 'green' && (
          <>
            <button className="btn btn-box btn-xl" onClick={box}>Box, box<small>Pit stop = break</small></button>
            <button className="btn btn-om" disabled={om.available < 1 || om.left < 1} onClick={() => { push('om'); buzz('light'); }}>
              Overtake<small>{om.available ? `${om.available} ready` : 'Earn with clean laps'}</small>
            </button>
          </>
        )}
        {c.phase === 'pit' && (
          <>
            <div className="pit-tyres" role="radiogroup" aria-label="Fit tyres">
              {(cfg.weather === 'rain' ? ['inter'] : ['soft', 'medium', 'hard'] as TyreId[]).map(t => (
                <button key={t} role="radio" aria-checked={nextTyre === t} className="tyre-pick compact" style={{ '--tyre': TYRES[t as TyreId].color } as React.CSSProperties} onClick={() => setNextTyre(t as TyreId)}>
                  <span className="tyre-dot sm">{TYRES[t as TyreId].label[0]}</span>{TYRES[t as TyreId].label}
                </button>
              ))}
            </div>
            <button className="btn btn-green btn-xl" onClick={() => { push('pit_out', nextTyre); buzz('light'); }}><IconPlay />Release the car</button>
          </>
        )}
        {(c.phase === 'green' || c.phase === 'pit') && (
          <button className={'btn btn-danger' + (armed ? ' armed' : '')} onClick={() => (armed ? push('retire') : setArmed(true))}>
            <IconStop />{armed ? 'Confirm retire' : 'Retire'}
          </button>
        )}
        {c.phase === 'green' && <span className="hint num">Pit allowance {fmt(PIT.allowanceMs)} per stop</span>}
      </nav>
    </main>
  );
}
