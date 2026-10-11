import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// One shared Supabase client for the whole app.
//
// EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are inlined into
// the JavaScript bundle at build time, so an APK built without them (or with a
// different project's keys) silently runs against no database at all. Set both
// as EAS environment variables in the dashboard before building.

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
      console.info(`[cloud] Supabase connected: ${url.replace(/^https?:\/\//, '').split('/')[0]}`);
    } else {
      console.warn('[cloud] EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY missing — this build runs on device storage only');
    }
  } catch (e) {
    client = null;
    console.warn('[cloud] Supabase init failed — running on device storage only', e);
  }
  return client;
}

export const isCloudSyncEnabled = (): boolean => getClient() !== null;
export const cloudHost = (): string => (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('/')[0] || 'none';
export { getClient as getSupabaseClient };
