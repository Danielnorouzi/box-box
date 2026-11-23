import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRace, currentWeekend } from './store/raceStore';
import { nextRound, roundById } from './data/calendar';
import { Backdrop } from './features/Backdrop';
import { Nav } from './features/shell/Nav';
import { Garage } from './features/garage/Garage';
import { RaceScreen } from './features/race/RaceScreen';
import { ResultScreen } from './features/result/ResultScreen';
import { Season } from './features/season/Season';
import { CarRnd } from './features/car/CarRnd';
import { Driver } from './features/driver/Driver';
import { CreateDriver } from './features/driver/CreateDriver';
import { Album } from './features/album/Album';
import { Settings } from './features/settings/Settings';
import { WeekendScreen } from './features/weekend/Weekend';
import { usePwa } from './hooks/usePwa';
import { syncNow } from './sync/client';

const ease = [0.22, 1, 0.36, 1] as const;

export default function App() {
  const s = useRace();
  const pwa = usePwa();
  const { hydrated, active, tab, driver } = s;
  const viewing = s.history.find(r => r.id === s.viewingResultId);
  const weekend = currentWeekend(s);

  // A race that ended while the app was closed is filed once storage has loaded.
  useEffect(() => { if (hydrated) useRace.getState().settle(); }, [hydrated]);
  useEffect(() => { document.body.classList.toggle('race-on', !!active); }, [active]);

  const synced = useRef(-1);
  useEffect(() => {
    if (!hydrated || synced.current === s.history.length) return;
    synced.current = s.history.length;
    const { syncUrl, syncKey } = useRace.getState().settings;
    if (syncUrl && syncKey.length >= 16) void syncNow();
  }, [hydrated, s.history.length]);

  if (!hydrated) return <div className="boot" aria-busy="true" />;
  if (!driver) return <><Backdrop trackId={nextRound().trackId} /><CreateDriver /></>;

  const trackId = active?.config.trackId ?? viewing?.trackId ?? (weekend && roundById(weekend.roundId)?.trackId) ?? (s.roundId && roundById(s.roundId)?.trackId) ?? nextRound().trackId;
  const key = active ? 'race' : viewing ? `result-${viewing.id}` : weekend ? 'weekend' : tab;
  const screen = active ? <RaceScreen race={active} />
    : viewing ? <ResultScreen r={viewing} />
      : weekend ? <WeekendScreen />
        : tab === 'season' ? <Season /> : tab === 'car' ? <CarRnd /> : tab === 'driver' ? <Driver /> : tab === 'album' ? <Album /> : tab === 'settings' ? <Settings /> : <Garage />;

  return (
    <>
      <Backdrop trackId={trackId} />
      {!active && !viewing && !weekend && <Nav />}
      {pwa.needRefresh && !active && (
        <div className="update-bar" role="status">A new version is ready.<button className="btn btn-primary small" onClick={pwa.refresh}>Reload</button></div>
      )}
      {/* Enter-only and never from opacity 0: if animation frames stall (a locked phone, a background tab)
          the next screen must still appear. Race screens must never wait on an exit animation. */}
      <motion.div key={key} className="screen" initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease }}>
        {screen}
      </motion.div>
    </>
  );
}
