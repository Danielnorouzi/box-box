import { useRace } from '../store/raceStore';
import type { Tab } from '../types';
import { IconBook, IconCalendar, IconFlag, IconGear, IconTicket } from './icons';

const TABS: { id: Tab; label: string; Icon: (p: { title?: string }) => React.JSX.Element }[] = [
  { id: 'race', label: 'Race', Icon: IconFlag },
  { id: 'season', label: 'Season', Icon: IconCalendar },
  { id: 'tickets', label: 'Tickets', Icon: IconTicket },
  { id: 'logbook', label: 'Logbook', Icon: IconBook },
  { id: 'settings', label: 'Settings', Icon: IconGear },
];

export function Nav() {
  const { tab, setTab } = useRace();
  return (
    <header className="topbar">
      <div className="brand"><span className="mark" aria-hidden />Box Box</div>
      <nav className="tabs glass dark" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
