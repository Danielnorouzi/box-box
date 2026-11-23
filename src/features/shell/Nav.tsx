import { useRace } from '../../store/raceStore';
import { balance } from '../../store/derive';
import type { Tab } from '../../types';
import { IconBook, IconCalendar, IconFlag, IconGear, IconHelmet, IconWrench } from '../icons';

const TABS: { id: Tab; label: string; Icon: (p: { title?: string }) => React.JSX.Element }[] = [
  { id: 'garage', label: 'Garage', Icon: IconFlag },
  { id: 'season', label: 'Season', Icon: IconCalendar },
  { id: 'car', label: 'Car', Icon: IconWrench },
  { id: 'driver', label: 'Driver', Icon: IconHelmet },
  { id: 'album', label: 'Album', Icon: IconBook },
];

export function Nav() {
  const s = useRace();
  return (
    <header className="topbar">
      <div className="brand"><span className="mark" aria-hidden />Box Box</div>
      <nav className="tabs" aria-label="Sections">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} aria-current={s.tab === id ? 'page' : undefined} onClick={() => s.setTab(id)}><Icon /><span>{label}</span></button>
        ))}
      </nav>
      <div className="topbar-right">
        <span className="credits-chip num" title="R&D credits">{balance(s)}<small>cr</small></span>
        <button className="icon-btn" aria-label="Settings" aria-current={s.tab === 'settings' ? 'page' : undefined} onClick={() => s.setTab('settings')}><IconGear /></button>
      </div>
    </header>
  );
}
