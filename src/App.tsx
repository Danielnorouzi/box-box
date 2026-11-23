import { useEffect, useRef } from 'react';
import { useRace } from './store/raceStore';
import { nextRound, roundById } from './data/calendar';
import { Backdrop } from './features/Backdrop';
import { Nav } from './features/Nav';
import { Garage } from './features/garage/Garage';
import { RaceScreen } from './features/race/RaceScreen';
import { ResultScreen } from './features/result/ResultScreen';
import { Season } from './features/season/Season';
import { Tickets } from './features/tickets/Tickets';
import { Logbook } from './features/logbook/Logbook';
import { Settings } from './features/settings/Settings';
import { usePwa } from './hooks/usePwa';
import { syncNow } from './sync/client';

export default function App() {
  const hydrated = useRace(s => s.hydrated);
  const active = useRace(s => s.active);
  const tab = useRace(s => s.tab);
  const roundId = useRace(s => s.roundId);
  const historyLen = useRace(s => s.history.length);
  const viewing = useRace(s => s.history.find(r => r.id === s.viewingResultId));
  const pwa = usePwa();

  // A race that ended while the app was closed is filed once storage has loaded.
  useEffect(() => { if (hydrated) useRace.getState().settle(); }, [hydrated]);
  useEffect(() => { document.body.classList.toggle('race-on', !!active); }, [active]);

  // Sync on open and after each filed result, when a server is set up.
  const synced = useRef(-1);
  useEffect(() => {
    if (!hydrated || synced.current === historyLen) return;
    synced.current = historyLen;
    const { syncUrl, syncKey } = useRace.getState().settings;
    if (syncUrl && syncKey.length >= 16) void syncNow();
  }, [hydrated, historyLen]);

  if (!hydrated) return <div className="boot" aria-busy="true" />;

  const trackId = active?.config.trackId ?? viewing?.trackId ?? (roundId && roundById(roundId)?.trackId) ?? nextRound().trackId;
  const screen = active ? <RaceScreen race={active} />
    : viewing ? <ResultScreen r={viewing} />
      : tab === 'season' ? <Season />
        : tab === 'tickets' ? <Tickets />
          : tab === 'logbook' ? <Logbook />
            : tab === 'settings' ? <Settings />
              : <Garage />;

  return (
    <>
      <Backdrop trackId={trackId} />
      {!active && !viewing && <Nav />}
      {pwa.needRefresh && !active && (
        <div className="update-bar glass dark" role="status">
          A new version of Box Box is ready.
          <button className="btn btn-primary small" onClick={pwa.refresh}>Reload</button>
        </div>
      )}
      {screen}
    </>
  );
}
