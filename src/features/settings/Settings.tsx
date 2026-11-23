import { useRef, useState } from 'react';
import { useRace } from '../../store/raceStore';
import { syncNow, pick } from '../../sync/client';
import { mergeStates } from '../../sync/merge';
import { usePwa } from '../../hooks/usePwa';
import { lightBeep, lightsOut, radioChirp, unlock } from '../../lib/sound';
import { buzz } from '../../lib/haptics';
import { detectTier } from '../../three/quality';
import { IconSpeaker } from '../icons';
import type { Settings as S } from '../../types';

function Switch({ id, on, onChange, label, hint }: { id: string; on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="setting">
      <div><label htmlFor={id}>{label}</label><p>{hint}</p></div>
      <button id={id} role="switch" aria-checked={on} className="switch" onClick={() => onChange(!on)}><span /></button>
    </div>
  );
}

const newKey = () => { const b = new Uint8Array(18); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); };

export function Settings() {
  const s = useRace();
  const pwa = usePwa();
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = (p: Partial<S>) => s.setSettings(p);

  const testSound = () => { unlock(); [1, 2, 3, 4, 5].forEach(i => setTimeout(() => lightBeep(i), (i - 1) * 450)); setTimeout(lightsOut, 5 * 450 + 500); setTimeout(() => radioChirp(false), 6000); };
  const exportJson = async () => {
    const text = JSON.stringify({ app: 'box-box', version: 3, exportedAt: Date.now(), state: pick() });
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = `box-box-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); } catch { /* downloads blocked */ }
    try { await navigator.clipboard.writeText(text); setBackupMsg({ ok: true, text: 'Backup copied to the clipboard, and saved as a file where downloads are allowed.' }); }
    catch { setBackupMsg({ ok: true, text: 'Backup saved as a file. If none appeared, this page blocks downloads; use the installed app.' }); }
  };
  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data?.app !== 'box-box' || !data.state) throw new Error();
      s.applySynced(mergeStates(pick(), data.state), s.lastSyncAt ?? 0);
      setBackupMsg({ ok: true, text: `Merged ${data.state.history?.length ?? 0} races from the backup.` });
    } catch { setBackupMsg({ ok: false, text: 'That file isn’t a Box Box backup. Choose a file made with Export.' }); }
  };

  return (
    <main className="page narrow settings">
      <div className="section-head"><h2>Settings</h2></div>
      <section className="panel" aria-labelledby="r-set">
        <h3 id="r-set">Race</h3>
        <Switch id="snd" on={s.settings.sound} onChange={v => set({ sound: v })} label="Sound" hint="Start lights, team radio, the launch, the cork at the podium." />
        <div className="setting-actions"><button className="btn btn-ghost small" onClick={testSound} disabled={!s.settings.sound}><IconSpeaker />Play the start</button></div>
        <Switch id="hap" on={s.settings.haptics} onChange={v => { set({ haptics: v }); if (v) setTimeout(() => buzz('radio'), 50); }} label="Haptics" hint="Vibration for radio calls, pit stops and warnings, where the device supports it." />
        <Switch id="wake" on={s.settings.wakeLock} onChange={v => set({ wakeLock: v })} label="Keep the screen on" hint="During practice, qualifying and the race, so the phone doesn't lock and cost you a strike." />
      </section>
      <section className="panel" aria-labelledby="g-set">
        <h3 id="g-set">3D quality</h3>
        <div className="seg" role="group" aria-label="3D quality">
          {(['auto', 'high', 'low'] as const).map(q => <button key={q} aria-pressed={s.settings.quality === q} onClick={() => set({ quality: q })}><strong>{q === 'auto' ? 'Auto' : q === 'high' ? 'High' : 'Battery saver'}</strong><small>{q === 'auto' ? `This device: ${detectTier()}` : q === 'high' ? 'Shadows, full detail' : 'Lighter scenes'}</small></button>)}
        </div>
      </section>
      <section className="panel" aria-labelledby="a-set">
        <h3 id="a-set">App</h3>
        <div className="setting">
          <div><span className="setting-label">Install Box Box</span><p>{pwa.standalone ? 'Installed. Works offline.' : pwa.canInstall ? 'Add it to your home screen. It works offline once installed.' : 'On iPhone: Share, then Add to Home Screen. Elsewhere your browser offers it when it can.'}</p></div>
          {pwa.canInstall && <button className="btn btn-primary small" onClick={pwa.install}>Install</button>}
        </div>
      </section>
      <section className="panel" aria-labelledby="s-set">
        <h3 id="s-set">Sync between devices</h3>
        <p className="panel-intro">Run the small server in <code>server/</code>, then use the same address and key on each device. Everything merges; nothing is overwritten.</p>
        <div className="field-row"><label className="label" htmlFor="surl">Server address</label><input id="surl" className="field" inputMode="url" placeholder="https://sync.example.com" value={s.settings.syncUrl} onChange={e => set({ syncUrl: e.target.value.trim() })} /></div>
        <div className="field-row"><label className="label" htmlFor="skey">Sync key</label><div className="inline"><input id="skey" className="field mono" value={s.settings.syncKey} placeholder="At least 16 characters" onChange={e => set({ syncKey: e.target.value.trim() })} spellCheck={false} /><button className="btn btn-ghost small" onClick={() => set({ syncKey: newKey() })}>New key</button></div></div>
        <div className="setting-actions">
          <button className="btn btn-primary small" disabled={busy || !s.settings.syncUrl || s.settings.syncKey.length < 16} onClick={async () => { setBusy(true); const r = await syncNow(); setBusy(false); setSyncMsg(r.ok ? { ok: true, text: 'Synced just now.' } : { ok: false, text: r.message }); }}>{busy ? 'Syncing…' : 'Sync now'}</button>
          <span className={'status ' + (syncMsg ? (syncMsg.ok ? 'ok' : 'err') : '')} role="status">{syncMsg?.text ?? (s.lastSyncAt ? `Last synced ${new Date(s.lastSyncAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Not synced yet.')}</span>
        </div>
      </section>
      <section className="panel" aria-labelledby="b-set">
        <h3 id="b-set">Backup</h3>
        <div className="setting-actions">
          <button className="btn btn-ghost small" onClick={exportJson}>Export</button>
          <button className="btn btn-ghost small" onClick={() => file.current?.click()}>Import</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }} />
        </div>
        {backupMsg && <p className={'status ' + (backupMsg.ok ? 'ok' : 'err')} role="status">{backupMsg.text}</p>}
      </section>
      <section className="panel" aria-labelledby="d-set">
        <h3 id="d-set">Start over</h3>
        <div className="setting">
          <div><span className="setting-label">Erase this device</span><p>Driver, races, tickets, upgrades and training. A synced copy on your server stays.</p></div>
          <button className={'btn btn-danger small' + (resetArmed ? ' armed' : '')} onClick={() => (resetArmed ? (s.resetAll(), setResetArmed(false)) : (setResetArmed(true), setTimeout(() => setResetArmed(false), 4000)))}>{resetArmed ? 'Confirm erase' : 'Erase'}</button>
        </div>
      </section>
    </main>
  );
}
