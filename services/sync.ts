import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'app_data';

// Device-local keys that must never sync to the cloud.
const EXCLUDED = ['rs_session', 'rs_settings', 'rs_filters'];
const isSyncable = (key: string) => key.startsWith('rs_') && !EXCLUDED.includes(key);
const metaKey = (key: string) => `__meta:${key}`;

let client: SupabaseClient | null = null;
let clientResolved = false;

function getClient(): SupabaseClient | null {
  if (clientResolved) return client;
  clientResolved = true;
  try {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey && /^https?:\/\//i.test(url) && anonKey.length > 20) {
      client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      console.info('[sync] Supabase cloud sync enabled');
    } else {
      console.info('[sync] Supabase not configured — running in offline demo mode');
    }
  } catch (e) {
    client = null;
    console.warn('[sync] Supabase init failed — running offline', e);
  }
  return client;
}

export const isCloudSyncEnabled = (): boolean => getClient() !== null;

type Pending = { value: unknown; ts: string };
const pending = new Map<string, Pending>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateHooked = false;

function hookAppState() {
  if (appStateHooked) return;
  appStateHooked = true;
  try {
    AppState.addEventListener('change', (s) => {
      if (s === 'background') void flush();
    });
  } catch {}
}

// Called after every local write. The timestamp is recorded locally BEFORE the
// push so an offline write still wins over stale remote data on the next pull.
export function notifyWrite(key: string, value: unknown): void {
  if (!isSyncable(key)) return;
  if (!getClient()) return;
  hookAppState();
  const ts = new Date().toISOString();
  AsyncStorage.setItem(metaKey(key), JSON.stringify(ts)).catch(() => {});
  pending.set(key, { value, ts });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 1200);
}

export async function flush(): Promise<void> {
  const c = getClient();
  if (!c || pending.size === 0) return;
  const batch = [...pending.entries()];
  pending.clear();
  for (const [key, p] of batch) {
    try {
      const { error } = await c
        .from(TABLE)
        .upsert({ data_key: key, value: p.value as never, updated_at: p.ts }, { onConflict: 'data_key' });
      if (error) console.warn('[sync] push failed:', key, error.message);
    } catch (e) {
      console.warn('[sync] push error:', key, e);
    }
  }
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ---------------------------------------------------------------------------
// Remote-change listeners. Contexts subscribe so in-memory React state
// refreshes the moment another device writes to the cloud table — writing
// AsyncStorage alone would not update what is already on screen.
// ---------------------------------------------------------------------------
type RemoteListener = (keys: string[]) => void;
const listeners = new Set<RemoteListener>();
const notifyQueue = new Set<string>();
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

export function addRemoteChangeListener(cb: RemoteListener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// Batched 150ms so a multi-key write from another device (e.g. chat message
// touching rs_messages + rs_threads) triggers one refresh wave, not N.
function queueNotify(key: string): void {
  notifyQueue.add(key);
  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    const keys = [...notifyQueue];
    notifyQueue.clear();
    for (const cb of listeners) {
      try { cb(keys); } catch {}
    }
  }, 150);
}

// Applies one remote row to AsyncStorage only when it is newer than the last
// local write (last-write-wins by timestamp). Writes AsyncStorage directly —
// going through storage.set would re-trigger notifyWrite and echo the value
// back to the cloud forever. Returns true when the stored value changed.
async function applyRemoteRow(key: string, value: unknown, updatedAt: string): Promise<boolean> {
  if (!isSyncable(key) || !updatedAt) return false;
  let localTs: string | null = null;
  try {
    const raw = await AsyncStorage.getItem(metaKey(key));
    localTs = raw ? (JSON.parse(raw) as string) : null;
  } catch { localTs = null; }
  if (localTs && new Date(updatedAt).getTime() <= new Date(localTs).getTime()) return false;
  const next = JSON.stringify(value ?? null);
  let changed = true;
  try {
    changed = (await AsyncStorage.getItem(key)) !== next;
  } catch { changed = true; }
  await AsyncStorage.setItem(key, next);
  await AsyncStorage.setItem(metaKey(key), JSON.stringify(updatedAt));
  return changed;
}

async function applyRemoteDelete(key: string): Promise<boolean> {
  if (!isSyncable(key)) return false;
  let existed = false;
  try { existed = (await AsyncStorage.getItem(key)) !== null; } catch { existed = false; }
  await AsyncStorage.removeItem(key);
  await AsyncStorage.removeItem(metaKey(key));
  return existed;
}

let inflight: Promise<void> | null = null;
let lastAttempt = 0;
let lastAttemptFailed = false;

// Pulls every remote row newer than our local write timestamp into AsyncStorage
// and notifies listeners about changed keys. Safe to call at every provider
// mount: no-op without config, times out offline, and never throws — the app
// always continues with local data.
export async function syncFromRemote(timeoutMs = 2500): Promise<void> {
  const c = getClient();
  if (!c) return;
  if (inflight) return inflight;
  // Back off 30s after a failed attempt (e.g. no internet) so a dead endpoint
  // is not hammered on every navigation, but allow frequent pulls when healthy.
  const cooldown = lastAttemptFailed ? 30000 : 3000;
  if (Date.now() - lastAttempt < cooldown) return;
  lastAttempt = Date.now();
  inflight = (async () => {
    try {
      const res = await withTimeout(c.from(TABLE).select('data_key,value,updated_at'), timeoutMs);
      if (res.error) {
        lastAttemptFailed = true;
        console.warn('[sync] pull failed:', res.error.message);
        return;
      }
      const rows = (res.data ?? []) as Array<{ data_key: string; value: unknown; updated_at: string }>;
      for (const row of rows) {
        if (!row?.data_key || !row.updated_at) continue;
        try {
          if (await applyRemoteRow(row.data_key, row.value ?? null, row.updated_at)) {
            queueNotify(row.data_key);
          }
        } catch {}
      }
      lastAttemptFailed = false;
    } catch (e) {
      lastAttemptFailed = true;
      console.warn('[sync] pull error (offline?) — continuing with local data', e);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let liveStarted = false;

// Starts live cross-device sync. A Supabase Realtime channel streams every
// change on app_data to this device within ~1s; a 20s poll covers realtime
// being unavailable (e.g. table not added to the publication in the
// dashboard). Idempotent; no-op when the cloud is not configured.
export function startLiveSync(): void {
  const c = getClient();
  if (!c || liveStarted) return;
  liveStarted = true;

  try {
    c.channel(`live-${TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        void (async () => {
          try {
            if (payload.eventType === 'DELETE') {
              const key = (payload.old as { data_key?: string } | null)?.data_key;
              if (key && (await applyRemoteDelete(key))) queueNotify(key);
              return;
            }
            const row = payload.new as { data_key?: string; value?: unknown; updated_at?: string } | null;
            if (!row?.data_key || !row.updated_at) return;
            if (await applyRemoteRow(row.data_key, row.value ?? null, row.updated_at)) {
              queueNotify(row.data_key);
            }
          } catch (e) {
            console.warn('[sync] live apply error', e);
          }
        })();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.info('[sync] live updates connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[sync] live channel ${status} — 20s polling keeps data fresh`);
        }
      });
  } catch (e) {
    console.warn('[sync] realtime unavailable — polling only', e);
  }

  setInterval(() => { void syncFromRemote(); }, 20000);
}
