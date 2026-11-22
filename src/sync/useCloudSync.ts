import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerProgress } from '../types/game';
import { mergeEnvelopes, type SyncEnvelope } from './mergeProgress';

// Cloudflare Worker (cloud-sync/) endpoint. Override with VITE_SYNC_URL for local testing.
export const SYNC_URL: string =
  (import.meta.env.VITE_SYNC_URL as string | undefined) || 'https://last-survival-sync.raydelw.workers.dev';

const META_KEY = 'last_survival_sync_v1';
const PUSH_DEBOUNCE_MS = 2500;
const POLL_MS = 45000;

interface SyncMeta {
  code: string | null;
  savedAt: number;
  generation: number;
  lastSyncAt: number | null;
}

export type CloudStatus = 'off' | 'syncing' | 'ok' | 'offline' | 'error';

export interface CloudSyncApi {
  code: string | null;
  status: CloudStatus;
  lastSyncAt: number | null;
  errorMsg: string | null;
  enable: () => Promise<void>;
  connect: (rawCode: string) => Promise<boolean>;
  disconnect: () => void;
  syncNow: () => void;
  markReset: () => void;
}

export function formatSyncCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

export function normalizeSyncCode(raw: string): string {
  // Codes never contain 0/O/1/I, so spaces, dashes and other separators are simply dropped.
  return raw.toUpperCase().replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '');
}

function readMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<SyncMeta>;
      return {
        code: typeof m.code === 'string' ? m.code : null,
        savedAt: Number(m.savedAt) || 0,
        generation: Number(m.generation) || 0,
        lastSyncAt: typeof m.lastSyncAt === 'number' ? m.lastSyncAt : null,
      };
    }
  } catch {
    // Ignore
  }
  return { code: null, savedAt: 0, generation: 0, lastSyncAt: null };
}

function writeMeta(m: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // Ignore
  }
}

async function api(path: string, method: 'GET' | 'POST' | 'PUT', body?: SyncEnvelope) {
  const res = await fetch(`${SYNC_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as SyncEnvelope & { code?: string; error?: string };
  if (!res.ok) {
    const err = new Error(data.error || `http_${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

/**
 * Keeps the local save in sync with the Cloudflare cloud save identified by a sync code.
 * Never applies remote data mid-battle; merges are lossless (see mergeProgress.ts).
 */
export function useCloudSync(
  progress: PlayerProgress,
  applyProgress: (p: PlayerProgress) => PlayerProgress,
  inBattle: boolean
): CloudSyncApi {
  const metaRef = useRef<SyncMeta>(readMeta());
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const lastJsonRef = useRef<string>(JSON.stringify(progress));
  const inBattleRef = useRef(inBattle);
  inBattleRef.current = inBattle;
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  const [code, setCode] = useState<string | null>(metaRef.current.code);
  const [status, setStatus] = useState<CloudStatus>(metaRef.current.code ? 'ok' : 'off');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(metaRef.current.lastSyncAt);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateMeta = useCallback((patch: Partial<SyncMeta>) => {
    metaRef.current = { ...metaRef.current, ...patch };
    writeMeta(metaRef.current);
  }, []);

  const localEnvelope = useCallback(
    (): SyncEnvelope => ({
      progress: progressRef.current,
      savedAt: metaRef.current.savedAt,
      generation: metaRef.current.generation,
    }),
    []
  );

  /** Apply a merged cloud result locally without counting it as a new local change. */
  const applyMerged = useCallback(
    (merged: SyncEnvelope) => {
      const clean = applyProgress(merged.progress);
      lastJsonRef.current = JSON.stringify(clean);
      updateMeta({ savedAt: merged.savedAt, generation: merged.generation });
    },
    [applyProgress, updateMeta]
  );

  const handleError = useCallback((err: unknown) => {
    const status = (err as { status?: number }).status;
    if (!navigator.onLine || status === undefined) {
      setStatus('offline');
      setErrorMsg('Sin conexión: se sincronizará al volver la red.');
    } else if (status === 404) {
      setStatus('error');
      setErrorMsg('Ese código no existe en la nube.');
    } else {
      setStatus('error');
      setErrorMsg('No se pudo sincronizar. Se reintentará automáticamente.');
    }
  }, []);

  const sync = useCallback(async () => {
    const c = metaRef.current.code;
    if (!c) return;
    if (inBattleRef.current) {
      pendingRef.current = true;
      return;
    }
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    pendingRef.current = false;
    setStatus('syncing');
    const sentSavedAt = metaRef.current.savedAt;
    try {
      const remote = await api(`/v1/saves/${c}`, 'PUT', localEnvelope());
      if (metaRef.current.code !== c) return; // disconnected meanwhile
      let merged: SyncEnvelope = remote;
      if (metaRef.current.savedAt !== sentSavedAt) {
        // Local changes happened while the request was in flight: fold them in, then push again.
        merged = mergeEnvelopes(localEnvelope(), remote);
        pendingRef.current = true;
      }
      if (!inBattleRef.current) applyMerged(merged);
      else pendingRef.current = true;
      const now = Date.now();
      updateMeta({ lastSyncAt: now });
      setLastSyncAt(now);
      setStatus('ok');
      setErrorMsg(null);
    } catch (err) {
      handleError(err);
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current && metaRef.current.code && !inBattleRef.current) {
        pendingRef.current = false;
        window.setTimeout(() => void sync(), 400);
      }
    }
  }, [applyMerged, handleError, localEnvelope, updateMeta]);

  const scheduleSync = useCallback(
    (delay = PUSH_DEBOUNCE_MS) => {
      if (!metaRef.current.code) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        void sync();
      }, delay);
    },
    [sync]
  );

  // Track real local changes (stamp savedAt) and push them after a short debounce.
  useEffect(() => {
    const json = JSON.stringify(progress);
    if (json === lastJsonRef.current) return;
    lastJsonRef.current = json;
    updateMeta({ savedAt: Date.now() });
    scheduleSync();
  }, [progress, scheduleSync, updateMeta]);

  // Sync right after a battle ends (progress gathered mid-battle is pushed then).
  useEffect(() => {
    if (!inBattle && metaRef.current.code) scheduleSync(300);
  }, [inBattle, scheduleSync]);

  // Initial sync + on app resume / focus / reconnect + light polling while visible.
  useEffect(() => {
    if (metaRef.current.code) scheduleSync(200);
    const onWake = () => {
      if (document.visibilityState === 'visible') scheduleSync(150);
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      window.clearInterval(id);
    };
  }, [scheduleSync, sync]);

  const enable = useCallback(async () => {
    setStatus('syncing');
    setErrorMsg(null);
    try {
      const created = await api('/v1/saves', 'POST', localEnvelope());
      if (!created.code) throw new Error('no_code');
      updateMeta({ code: created.code, lastSyncAt: Date.now() });
      setCode(created.code);
      setLastSyncAt(Date.now());
      setStatus('ok');
    } catch (err) {
      handleError(err);
    }
  }, [handleError, localEnvelope, updateMeta]);

  const connect = useCallback(
    async (rawCode: string): Promise<boolean> => {
      const c = normalizeSyncCode(rawCode);
      if (c.length !== 12) {
        setStatus(metaRef.current.code ? 'ok' : 'off');
        setErrorMsg('El código debe tener 12 caracteres (ej. ABCD-EFGH-JKLM).');
        return false;
      }
      setStatus('syncing');
      setErrorMsg(null);
      try {
        // PUT merges this device's progress into the cloud save, so nothing is lost on either side.
        const merged = await api(`/v1/saves/${c}`, 'PUT', localEnvelope());
        updateMeta({ code: c, lastSyncAt: Date.now() });
        applyMerged(merged);
        setCode(c);
        setLastSyncAt(Date.now());
        setStatus('ok');
        return true;
      } catch (err) {
        handleError(err);
        if (!metaRef.current.code) setStatus((s) => (s === 'offline' ? s : 'error'));
        return false;
      }
    },
    [applyMerged, handleError, localEnvelope, updateMeta]
  );

  const disconnect = useCallback(() => {
    updateMeta({ code: null, lastSyncAt: null });
    setCode(null);
    setLastSyncAt(null);
    setStatus('off');
    setErrorMsg(null);
  }, [updateMeta]);

  const markReset = useCallback(() => {
    updateMeta({ generation: metaRef.current.generation + 1 });
  }, [updateMeta]);

  return {
    code,
    status,
    lastSyncAt,
    errorMsg,
    enable,
    connect,
    disconnect,
    syncNow: () => void sync(),
    markReset,
  };
}
