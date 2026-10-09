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

let inflight: Promise<void> | null = null;
let lastAttempt = 0;
let lastAttemptFailed = false;

// Pulls every remote row newer than our local write timestamp into AsyncStorage.
// Safe to call at every provider mount: no-op without config, times out offline,
// and never throws — the app always continues with local data.
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
        const key = row?.data_key;
        if (!key || !isSyncable(key) || !row.updated_at) continue;
        let localTs: string | null = null;
        try {
          const raw = await AsyncStorage.getItem(metaKey(key));
          localTs = raw ? (JSON.parse(raw) as string) : null;
        } catch { localTs = null; }
        if (localTs && new Date(row.updated_at).getTime() <= new Date(localTs).getTime()) continue;
        await AsyncStorage.setItem(key, JSON.stringify(row.value ?? null));
        await AsyncStorage.setItem(metaKey(key), JSON.stringify(row.updated_at));
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
