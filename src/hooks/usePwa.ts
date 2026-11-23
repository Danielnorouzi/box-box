import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallEvent | null = null;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();
const ping = () => listeners.forEach(f => f());
let needRefresh = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; ping(); });
  window.addEventListener('appinstalled', () => { deferred = null; ping(); });
  updateSW = registerSW({ onNeedRefresh() { needRefresh = true; ping(); } }) ?? null;
}

export function usePwa() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(x => x + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
  return {
    canInstall: !!deferred,
    standalone,
    install: async () => { if (!deferred) return; await deferred.prompt(); deferred = null; ping(); },
    needRefresh,
    refresh: () => updateSW?.(true),
  };
}
