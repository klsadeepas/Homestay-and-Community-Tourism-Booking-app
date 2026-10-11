// Uploads images picked from the device into Supabase Storage so every phone
// (and the admin panel) can render the same file. Requires the `media` bucket
// from supabase/schema_v3.sql.
import { Platform } from 'react-native';
import { File, UploadType } from 'expo-file-system';
import { getSupabaseClient } from '@/services/sync';

export const MEDIA_BUCKET = 'media';

const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

export function mediaPublicUrl(path: string): string {
  const c = getSupabaseClient();
  if (!c) return '';
  return c.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface UploadResult {
  url?: string;
  path?: string;
  error?: string;
}

export async function uploadMedia(localUri: string, folder = 'general'): Promise<UploadResult> {
  if (!localUri) return { error: 'No image selected.' };
  if (isRemote(localUri)) return { url: localUri };

  const c = getSupabaseClient();
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!c || !baseUrl || !anonKey) {
    return { error: 'This build has no database configured, so images cannot be shared between devices yet.' };
  }

  const slug = (folder.replace(/[^a-z0-9-]/gi, '') || 'general').toLowerCase();
  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/${MEDIA_BUCKET}/${path}`;
  const headers = {
    authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'content-type': 'image/jpeg',
    'x-upsert': 'true',
  };

  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(localUri)).blob();
      const res = await fetch(endpoint, { method: 'POST', headers, body: blob });
      if (!res.ok) return { error: await uploadRejected(res.status, res) };
    } else {
      const res = await new File(localUri).upload(endpoint, {
        httpMethod: 'POST',
        uploadType: UploadType.BINARY_CONTENT,
        headers,
        mimeType: 'image/jpeg',
      });
      if (res.status < 200 || res.status >= 300) return { error: describeRejection(res.status, res.body) };
    }
    return { url: mediaPublicUrl(path), path };
  } catch (e) {
    console.warn('[uploads] media upload failed', e);
    return { error: 'Upload failed — check your connection, and make sure supabase/schema_v3.sql has been run.' };
  }
}

export type MediaStatus = 'ready' | 'missing' | 'unreachable' | 'unconfigured';

// Cheap check of whether the `media` bucket exists, so admin screens can tell
// the user to run schema_v3.sql instead of failing silently on a phone.
export async function probeMediaBucket(): Promise<MediaStatus> {
  const url = mediaPublicUrl('__probe__.jpg');
  if (!url) return 'unconfigured';
  try {
    const res = await fetch(url, { method: 'GET' });
    const body = await res.text().catch(() => '');
    if (res.ok) return 'ready';
    if (/bucket/i.test(body) && /not\s*found/i.test(body)) return 'missing';
    return 'ready';
  } catch {
    return 'unreachable';
  }
}

async function uploadRejected(status: number, res: Response): Promise<string> {
  let body = '';
  try { body = await res.text(); } catch { /* ignore */ }
  return describeRejection(status, body);
}

function describeRejection(status: number, body: string): string {
  console.warn(`[uploads] storage rejected the file (${status})`, body);
  if (status === 404 || /bucket.*not.*found/i.test(body)) {
    return 'The media bucket does not exist yet — run supabase/schema_v3.sql in the Supabase SQL Editor.';
  }
  if (status === 401 || status === 403) return 'Storage policies are blocking uploads — re-run supabase/schema_v3.sql.';
  return `Upload rejected by the server (${status}).`;
}
