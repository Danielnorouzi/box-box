import { useMemo } from 'react';
import { useRace } from '../../store/raceStore';
import { minutes } from '../../lib/format';
import type { ActivityKind } from '../../types';

const WEEKS = 18;
const DAY = 86_400_000;
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

const KIND_LABEL: Record<ActivityKind, string> = {
  race_start: 'Start', vsc: 'VSC', green: 'Green', finish: 'Flag', dnf: 'DNF',
  ticket_add: 'Ticket', ticket_done: 'Closed', ticket_reopen: 'Reopened',
};

export function Logbook() {
  const { history, activity } = useRace();

  const { cells, streak, week, total, best } = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const r of history) perDay.set(dayKey(r.startedAt), (perDay.get(dayKey(r.startedAt)) ?? 0) + r.focusMs);
    const today = startOfDay(Date.now());
    // Grid ends on this week's Sunday; weeks start on Monday.
    const dow = (new Date(today).getDay() + 6) % 7;
    const end = today + (6 - dow) * DAY;
    const first = end - (WEEKS * 7 - 1) * DAY;
    const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
      const t = first + i * DAY;
      return { t, ms: perDay.get(dayKey(t)) ?? 0, future: t > today };
    });
    let streak = 0;
    for (let t = today; ; t -= DAY) {
      const has = (perDay.get(dayKey(t)) ?? 0) > 0;
      if (has) streak++;
      else if (t !== today) break; // today without a race doesn't break a streak yet
      if (streak > 3650) break;
    }
    const weekStart = today - dow * DAY;
    const week = history.filter(r => r.startedAt >= weekStart).reduce((a, r) => a + r.focusMs, 0);
    const total = history.reduce((a, r) => a + r.focusMs, 0);
    const best = Math.max(0, ...perDay.values());
    return { cells, streak, week, total, best };
  }, [history]);

  const level = (ms: number) => (ms <= 0 ? 0 : ms < 30 * 60_000 ? 1 : ms < 60 * 60_000 ? 2 : ms < 120 * 60_000 ? 3 : 4);

  const grouped = useMemo(() => {
    const out: { label: string; items: typeof activity }[] = [];
    for (const a of activity.slice(0, 120)) {
      const label = new Date(a.t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      const g = out.at(-1);
      if (g && g.label === label) g.items.push(a);
      else out.push({ label, items: [a] });
    }
    return out;
  }, [activity]);

  const months = cells.filter((_, i) => i % 7 === 0).map((c, i, arr) => {
    const m = new Date(c.t).getMonth();
    const prev = i ? new Date(arr[i - 1].t).getMonth() : -1;
    // Label a month at its first week, unless that week is the grid's first and the month changes again next week.
    const nextM = arr[i + 1] ? new Date(arr[i + 1].t).getMonth() : m;
    if (i === 0 && nextM !== m) return '';
    return m !== prev ? new Date(c.t).toLocaleDateString(undefined, { month: 'short' }) : '';
  });

  return (
    <main className="page narrow">
      <div className="section-head">
        <h2>Logbook</h2>
        <p>Every race and ticket, by day. Darker squares mean more focus.</p>
      </div>

      <div className="season-stats num">
        <div className="stat"><strong>{streak}</strong><span>day streak</span></div>
        <div className="stat"><strong>{minutes(week)}</strong><span>this week</span></div>
        <div className="stat"><strong>{minutes(total)}</strong><span>all season</span></div>
        <div className="stat"><strong>{minutes(best)}</strong><span>best day</span></div>
      </div>

      <figure className="heat" aria-label={`Focus per day over the last ${WEEKS} weeks`}>
        <div className="heat-months num" aria-hidden>{months.map((m, i) => <span key={i}>{m}</span>)}</div>
        <div className="heat-grid">
          {cells.map(c => (
            <span
              key={c.t}
              className={`cell l${level(c.ms)}${c.future ? ' future' : ''}`}
              title={c.future ? '' : `${new Date(c.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${c.ms ? minutes(c.ms) : 'no races'}`}
            />
          ))}
        </div>
        <figcaption className="heat-key num">
          Less <span className="cell l0" /><span className="cell l1" /><span className="cell l2" /><span className="cell l3" /><span className="cell l4" /> More
          <span className="sep">Shades step at 30 min, 1 h and 2 h.</span>
        </figcaption>
      </figure>

      <section aria-labelledby="act-h">
        <h3 id="act-h" className="list-h">Activity</h3>
        {grouped.length === 0 ? (
          <p className="empty">Nothing logged yet. Starting a race, calling a VSC and closing a ticket all show up here.</p>
        ) : (
          grouped.map(g => (
            <div key={g.label} className="act-day">
              <h4>{g.label}</h4>
              <ul>
                {g.items.map(a => (
                  <li key={a.id} className={`act ${a.kind}`}>
                    <time className="num">{new Date(a.t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time>
                    <b>{KIND_LABEL[a.kind]}</b>
                    <span>{a.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
