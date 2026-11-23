import { useRef, useState } from 'react';
import { useRace, type SyncedState } from '../../store/raceStore';
import { syncNow } from '../../sync/client';
import { mergeStates } from '../../sync/merge';
import { usePwa } from '../../hooks/usePwa';
import { lightBeep, lightsOut, unlock } from '../../lib/sound';
import { IconSpeaker } from '../icons';

function Switch({ id, on, onChange, label, hint }: { id: string; on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="setting">
      <div>
        <label htmlFor={id}>{label}</label>
        <p>{hint}</p>
      </div>
      <button id={id} role="switch" aria-checked={on} className="switch" onClick={() => onChange(!on)}><span /></button>
    </div>
  );
}

const newKey = () => {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
};

export function Settings() {
  const s = useRace();
  const pwa = usePwa();
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const snapshot = (): SyncedState => ({ teamId: s.teamId, active: s.active, history: s.history, tickets: s.tickets, activity: s.activity });

  const testSound = () => {
    unlock();
    [1, 2, 3, 4, 5].forEach(i => setTimeout(() => lightBeep(i), (i - 1) * 450));
    setTimeout(lightsOut, 5 * 450 + 500);
  };

  const exportJson = async () => {
    const text = JSON.stringify({ app: 'box-box', version: 2, exportedAt: Date.now(), state: snapshot() });
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = `box-box-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { /* downloads blocked; the clipboard copy below still works */ }
    try {
      await navigator.clipboard.writeText(text);
      setBackupMsg({ ok: true, text: 'Backup downloaded and copied to the clipboard.' });
    } catch {
      setBackupMsg({ ok: true, text: 'Backup downloaded. If no file appeared, this browser blocks downloads here.' });
    }
  };

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data?.app !== 'box-box' || !data.state) throw new Error('shape');
      s.applySynced(mergeStates(snapshot(), data.state as SyncedState), s.lastSyncAt ?? 0);
      setBackupMsg({ ok: true, text: `Merged ${data.state.history?.length ?? 0} races and ${data.state.tickets?.length ?? 0} tickets from the backup.` });
    } catch {
      setBackupMsg({ ok: false, text: 'That file is not a Box Box backup. Choose a file made with Export.' });
    }
  };

  return (
    <main className="page narrow settings">
      <div className="section-head"><h2>Settings</h2></div>

      <section className="panel" aria-labelledby="race-set">
        <h3 id="race-set">Race</h3>
        <Switch id="snd" on={s.settings.sound} onChange={v => s.setSettings({ sound: v })} label="Start sounds"
          hint="A tone with each start light, then the grid launching at lights out." />
        <div className="setting-actions">
          <button className="btn btn-ghost small" onClick={testSound} disabled={!s.settings.sound}><IconSpeaker />Play the start</button>
        </div>
        <Switch id="wake" on={s.settings.wakeLock} onChange={v => s.setSettings({ wakeLock: v })} label="Keep the screen on"
          hint="While a race is running, so your phone doesn't lock mid-lap. The timer is safe either way." />
      </section>

      <section className="panel" aria-labelledby="app-set">
        <h3 id="app-set">App</h3>
        <div className="setting">
          <div>
            <span className="setting-label">Install Box Box</span>
            <p>{pwa.standalone ? 'Installed. It works offline and opens like an app.'
              : pwa.canInstall ? 'Add it to your home screen or dock. It works offline once installed.'
                : 'On iPhone, use Share then Add to Home Screen. Elsewhere, your browser offers install when it can.'}</p>
          </div>
          {pwa.canInstall && <button className="btn btn-primary small" onClick={pwa.install}>Install</button>}
        </div>
      </section>

      <section className="panel" aria-labelledby="sync-set">
        <h3 id="sync-set">Sync between devices</h3>
        <p className="panel-intro">Run the small server in <code>server/</code> anywhere, then use the same server address and sync key on each device. Results and tickets merge; nothing is overwritten.</p>
        <div className="field-row">
          <label className="label" htmlFor="sync-url">Server address</label>
          <input id="sync-url" className="field" inputMode="url" placeholder="https://sync.example.com" value={s.settings.syncUrl}
            onChange={e => s.setSettings({ syncUrl: e.target.value.trim() })} autoComplete="off" />
        </div>
        <div className="field-row">
          <label className="label" htmlFor="sync-key">Sync key</label>
          <div className="inline">
            <input id="sync-key" className="field mono" value={s.settings.syncKey} placeholder="At least 16 characters"
              onChange={e => s.setSettings({ syncKey: e.target.value.trim() })} autoComplete="off" spellCheck={false} />
            <button className="btn btn-ghost small" onClick={() => s.setSettings({ syncKey: newKey() })}>New key</button>
          </div>
        </div>
        <div className="setting-actions">
          <button className="btn btn-primary small" disabled={busy || !s.settings.syncUrl || s.settings.syncKey.length < 16}
            onClick={async () => { setBusy(true); const r = await syncNow(); setBusy(false); setSyncMsg(r.ok ? { ok: true, text: 'Synced just now.' } : { ok: false, text: r.message }); }}>
            {busy ? 'Syncing…' : 'Sync now'}
          </button>
          <span className={'status ' + (syncMsg ? (syncMsg.ok ? 'ok' : 'err') : '')} role="status">
            {syncMsg?.text ?? (s.lastSyncAt ? `Last synced ${new Date(s.lastSyncAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Not synced yet.')}
          </span>
        </div>
      </section>

      <section className="panel" aria-labelledby="backup-set">
        <h3 id="backup-set">Backup</h3>
        <div className="setting-actions">
          <button className="btn btn-ghost small" onClick={exportJson}>Export</button>
          <button className="btn btn-ghost small" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }} />
        </div>
        {backupMsg && <p className={'status ' + (backupMsg.ok ? 'ok' : 'err')} role="status">{backupMsg.text}</p>}
      </section>

      <section className="panel" aria-labelledby="danger-set">
        <h3 id="danger-set">Start over</h3>
        <div className="setting">
          <div><span className="setting-label">Erase everything on this device</span><p>Races, tickets, logbook and settings. Synced copies on the server stay.</p></div>
          <button className={'btn btn-danger small' + (resetArmed ? ' armed' : '')}
            onClick={() => (resetArmed ? (s.resetAll(), setResetArmed(false)) : (setResetArmed(true), setTimeout(() => setResetArmed(false), 4000)))}>
            {resetArmed ? 'Confirm erase' : 'Erase'}
          </button>
        </div>
      </section>
    </main>
  );
}
