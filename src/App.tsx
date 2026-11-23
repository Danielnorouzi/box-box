import { useEffect } from 'react';
import { useRace } from './store/raceStore';
import { Backdrop } from './features/Backdrop';
import { Garage } from './features/garage/Garage';
import { RaceScreen } from './features/race/RaceScreen';
import { ResultScreen } from './features/result/ResultScreen';

export default function App() {
  const active = useRace(s => s.active);
  const viewing = useRace(s => s.history.find(r => r.id === s.viewingResultId));

  // A race that ended while the app was closed is filed on load.
  useEffect(() => { useRace.getState().settle(); }, []);
  useEffect(() => { document.body.classList.toggle('race-on', !!active); }, [active]);

  return (
    <>
      <Backdrop />
      {active ? <RaceScreen race={active} /> : viewing ? <ResultScreen r={viewing} /> : <Garage />}
    </>
  );
}
