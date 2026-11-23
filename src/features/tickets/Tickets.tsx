import { useMemo, useState } from 'react';
import { liveTickets, useRace } from '../../store/raceStore';
import { minutes } from '../../lib/format';
import type { Ticket } from '../../types';
import { IconCheck, IconFlag } from '../icons';

function TicketRow({ t, races, focus }: { t: Ticket; races: number; focus: number }) {
  const { setTicketDone, deleteTicket, renameTicket, setDraftTicket, setTab } = useRace();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(t.title);
  const [armed, setArmed] = useState(false);
  const done = !!t.doneAt;

  return (
    <li className={'ticket' + (done ? ' done' : '')}>
      <button
        className="tick" role="checkbox" aria-checked={done}
        aria-label={done ? `Reopen ${t.title}` : `Close ${t.title}`}
        onClick={() => setTicketDone(t.id, !done)}
      >
        <IconCheck />
      </button>
      <div className="ticket-main">
        {editing ? (
          <form onSubmit={e => { e.preventDefault(); renameTicket(t.id, title); setEditing(false); }}>
            <input className="field small" value={title} autoFocus maxLength={120} aria-label="Ticket title"
              onChange={e => setTitle(e.target.value)} onBlur={() => { renameTicket(t.id, title); setEditing(false); }} />
          </form>
        ) : (
          <button className="ticket-title" onClick={() => setEditing(true)} title="Rename">{t.title}</button>
        )}
        <small className="num">
          {races ? `${races} race${races > 1 ? 's' : ''} · ${minutes(focus)} of focus` : 'Not raced yet'}
          {done && ` · closed ${new Date(t.doneAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
        </small>
      </div>
      <div className="ticket-actions">
        {!done && (
          <button className="btn btn-ghost small" onClick={() => { setDraftTicket(t.id); setTab('race'); }}>
            <IconFlag />Race it
          </button>
        )}
        <button
          className={'btn btn-danger small' + (armed ? ' armed' : '')}
          onClick={() => (armed ? deleteTicket(t.id) : (setArmed(true), setTimeout(() => setArmed(false), 4000)))}
        >
          {armed ? 'Confirm' : 'Delete'}
        </button>
      </div>
    </li>
  );
}

export function Tickets() {
  const { tickets, history, addTicket } = useRace();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const live = liveTickets(tickets);
  const open = live.filter(t => !t.doneAt);
  const done = live.filter(t => t.doneAt).sort((a, b) => b.doneAt! - a.doneAt!);
  const stats = useMemo(() => {
    const m = new Map<string, { races: number; focus: number }>();
    for (const r of history) {
      if (!r.ticketId) continue;
      const x = m.get(r.ticketId) ?? { races: 0, focus: 0 };
      x.races++;
      x.focus += r.focusMs;
      m.set(r.ticketId, x);
    }
    return m;
  }, [history]);
  const row = (t: Ticket) => <TicketRow key={t.id} t={t} races={stats.get(t.id)?.races ?? 0} focus={stats.get(t.id)?.focus ?? 0} />;

  return (
    <main className="page narrow">
      <div className="section-head">
        <h2>Tickets</h2>
        <p>One ticket per piece of work. Enter it into races until it's done, and every lap of focus is counted against it.</p>
      </div>
      <form
        className="add-ticket"
        onSubmit={e => {
          e.preventDefault();
          if (!addTicket(title)) return setError('Give the ticket a name first.');
          setTitle(''); setError('');
        }}
      >
        <input id="new-ticket" className="field" value={title} maxLength={120} placeholder="e.g. Past paper 2023, section B"
          aria-label="New ticket" aria-describedby={error ? 'ticket-err' : undefined}
          onChange={e => { setTitle(e.target.value); if (error) setError(''); }} />
        <button className="btn btn-primary" type="submit">Add ticket</button>
        {error && <p id="ticket-err" className="inline-error" role="alert">{error}</p>}
      </form>

      <section aria-labelledby="open-h">
        <h3 id="open-h" className="list-h">Open <span className="num">{open.length}</span></h3>
        {open.length ? <ul className="ticket-list">{open.map(row)}</ul>
          : <p className="empty">No open tickets. Add the next thing you need to study above.</p>}
      </section>
      {done.length > 0 && (
        <section aria-labelledby="done-h">
          <h3 id="done-h" className="list-h">Closed <span className="num">{done.length}</span></h3>
          <ul className="ticket-list">{done.map(row)}</ul>
        </section>
      )}
    </main>
  );
}
