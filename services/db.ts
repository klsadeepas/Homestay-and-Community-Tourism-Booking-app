import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from './sync';

// ---------------------------------------------------------------------------
// Table-backed data layer.
//
// Every collection the app shows lives in its own Supabase table with real,
// typed columns (see supabase/schema_v2.sql). `payload` stores the complete app
// object so nested fields round-trip without a mapper per type. Screens keep
// reading plain arrays from useData(); only the storage underneath changed.
// ---------------------------------------------------------------------------

export type CollectionKey =
  | 'users' | 'villages' | 'listings' | 'bookings' | 'reviews' | 'events'
  | 'announcements' | 'threads' | 'messages' | 'notifications' | 'audit'
  | 'reports' | 'transport' | 'pickups' | 'arrivals' | 'responsible'
  | 'seasonal' | 'faqs' | 'tickets' | 'platform';

type Cast = 'text' | 'int' | 'num' | 'bool' | 'arr' | 'json';
type Col = [column: string, field: string, cast?: Cast];

type Spec = {
  table: string;
  idColumn?: string;
  idField: string;
  tsField?: string;
  orderBy: string;
  ascending?: boolean;
  cap?: number;
  columns: Col[];
};

const SPECS: Record<CollectionKey, Spec> = {
  users: {
    table: 'app_users', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['email', 'email'], ['password', 'password'], ['name', 'name'], ['role', 'role'],
      ['phone', 'phone'], ['photo', 'photo'], ['status', 'status'], ['village', 'village'],
      ['homestay_name', 'homestayName'], ['bio', 'bio']],
  },
  villages: {
    table: 'villages', idField: 'id', orderBy: 'id', ascending: true,
    columns: [['name', 'name'], ['region', 'region'], ['description', 'description'],
      ['photo', 'photo'], ['transport', 'transport'], ['etiquette', 'etiquette']],
  },
  listings: {
    table: 'listings', idField: 'id', orderBy: 'recorded_at', ascending: false,
    columns: [['type', 'type'], ['owner_id', 'ownerId'], ['village_id', 'villageId'],
      ['title', 'title'], ['description', 'description'], ['photo', 'photo'],
      ['price_per_unit_lkr', 'pricePerUnitLKR', 'num'], ['capacity', 'capacity', 'int'],
      ['rooms', 'rooms', 'int'], ['rating', 'rating', 'num'], ['review_count', 'reviewCount', 'int'],
      ['status', 'status'], ['duration', 'duration'], ['difficulty', 'difficulty'],
      ['meeting_point', 'meetingPoint'], ['tour_category', 'tourCategory'],
      ['experience_category', 'experienceCategory'], ['season_info', 'seasonInfo'],
      ['instant_booking', 'instantBooking', 'bool'], ['review_reason', 'reviewReason']],
  },
  bookings: {
    table: 'bookings', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['listing_id', 'listingId'], ['traveler_id', 'travelerId'],
      ['date_from', 'dateFrom'], ['date_to', 'dateTo'], ['guests', 'guests', 'int'],
      ['rooms', 'rooms', 'int'], ['total_lkr', 'totalLKR', 'num'], ['status', 'status'],
      ['note', 'note'], ['check_in', 'checkIn'], ['payment_status', 'paymentStatus'],
      ['payment_method', 'paymentMethod'], ['payment_ref', 'paymentRef'], ['paid_at', 'paidAt']],
  },
  reviews: {
    table: 'reviews', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['listing_id', 'listingId'], ['traveler_id', 'travelerId'], ['booking_id', 'bookingId'],
      ['rating', 'rating', 'int'], ['body', 'text'], ['hidden', 'hidden', 'bool']],
  },
  events: {
    table: 'events', idField: 'id', orderBy: 'recorded_at', ascending: false,
    columns: [['village_id', 'villageId'], ['title', 'title'], ['date_from', 'dateFrom'],
      ['date_to', 'dateTo'], ['description', 'description'], ['capacity', 'capacity', 'int'],
      ['photo', 'photo'], ['status', 'status'], ['audience', 'audience'], ['location', 'location'],
      ['type', 'type'], ['author_id', 'authorId']],
  },
  announcements: {
    table: 'announcements', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['village_id', 'villageId'], ['title', 'title'], ['body', 'body'],
      ['audience', 'audience'], ['urgent', 'urgent', 'bool'], ['author_id', 'authorId']],
  },
  threads: {
    table: 'chat_threads', idField: 'id', tsField: 'updatedAt', orderBy: 'recorded_at', ascending: false,
    columns: [['participants', 'participants', 'arr'], ['listing_id', 'listingId'],
      ['booking_id', 'bookingId'], ['last_message', 'lastMessage'], ['updated_at', 'updatedAt']],
  },
  messages: {
    table: 'chat_messages', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: true,
    columns: [['thread_id', 'threadId'], ['sender_id', 'from'], ['recipient_id', 'to'], ['body', 'text']],
  },
  notifications: {
    table: 'notifications', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    cap: 800,
    columns: [['user_id', 'userId'], ['title', 'title'], ['body', 'body'], ['read', 'read', 'bool'],
      ['type', 'type'], ['link', 'link']],
  },
  audit: {
    table: 'audit_log', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    cap: 1000,
    columns: [['actor_id', 'actorId'], ['action', 'action'], ['target', 'target'], ['reason', 'reason']],
  },
  reports: {
    table: 'reports', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['reporter_id', 'reporterId'], ['target_type', 'targetType'], ['target_id', 'targetId'],
      ['reason', 'reason'], ['status', 'status']],
  },
  transport: {
    table: 'transport_info', idField: 'id', orderBy: 'id', ascending: true,
    columns: [['village_id', 'villageId'], ['name', 'name'], ['mode', 'mode'],
      ['operating_area', 'operatingArea'], ['contact_method', 'contactMethod'],
      ['availability', 'availability'], ['accessibility', 'accessibility'],
      ['est_fare_lkr', 'estFareLKR', 'num'], ['note', 'note']],
  },
  pickups: {
    table: 'pickup_requests', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['booking_id', 'bookingId'], ['traveler_id', 'travelerId'], ['pickup_from', 'pickupFrom'],
      ['date_time', 'dateTime'], ['passengers', 'passengers', 'int'], ['accessibility', 'accessibility'],
      ['note', 'note'], ['status', 'status'], ['response', 'response'], ['responder_id', 'responderId']],
  },
  arrivals: {
    table: 'arrival_info', idColumn: 'booking_id', idField: 'bookingId', tsField: 'hostUpdatedAt',
    orderBy: 'updated_at', ascending: false,
    columns: [['traveler_eta', 'travelerEta'], ['traveler_method', 'travelerMethod'],
      ['host_check_in_window', 'hostCheckInWindow'], ['host_meeting_point', 'hostMeetingPoint'],
      ['acknowledged', 'acknowledged', 'bool'], ['updated_at', 'hostUpdatedAt']],
  },
  responsible: {
    table: 'responsible_guides', idField: 'id', tsField: 'updatedAt', orderBy: 'recorded_at', ascending: false,
    columns: [['village_id', 'villageId'], ['topic', 'topic'], ['title', 'title'], ['body', 'body'],
      ['status', 'status'], ['reviewed_by', 'reviewedBy'], ['reviewed_at', 'reviewedAt'],
      ['updated_at', 'updatedAt']],
  },
  seasonal: {
    table: 'seasonal_highlights', idField: 'id', orderBy: 'id', ascending: true,
    columns: [['village_id', 'villageId'], ['title', 'title'], ['type', 'type'],
      ['description', 'description'], ['date_from', 'dateFrom'], ['date_to', 'dateTo'],
      ['recurring', 'recurring', 'bool'], ['photo', 'photo']],
  },
  faqs: {
    table: 'faqs', idField: 'id', orderBy: 'sort_order', ascending: true,
    columns: [['question', 'question'], ['answer', 'answer'], ['category', 'category'],
      ['published', 'published', 'bool'], ['sort_order', 'order', 'int']],
  },
  tickets: {
    table: 'support_tickets', idField: 'id', tsField: 'createdAt', orderBy: 'recorded_at', ascending: false,
    columns: [['user_id', 'userId'], ['subject', 'subject'], ['category', 'category'],
      ['message', 'message'], ['status', 'status'], ['priority', 'priority'], ['replies', 'replies', 'json']],
  },
  platform: {
    table: 'platform_config', idField: '', orderBy: 'id', ascending: true,
    columns: [['service_fee_pct', 'serviceFeePct', 'num'], ['booking_notice_days', 'bookingNoticeDays', 'int'],
      ['maintenance_mode', 'maintenanceMode', 'bool'], ['support_email', 'supportEmail']],
  },
};

const KEYS = Object.keys(SPECS) as CollectionKey[];
const SINGLETON: CollectionKey = 'platform';

const PENDING_KEY = 'rs_pending_ops';
type PendingOp = { key: CollectionKey; item: unknown };

function coerce(value: unknown, cast?: Cast): unknown | undefined {
  if (value === undefined || value === null) return undefined;
  switch (cast) {
    case 'int': { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : undefined; }
    case 'num': { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
    case 'bool': return value === true || value === 'true';
    case 'arr': return Array.isArray(value) ? value.map((v) => String(v)) : undefined;
    case 'json': return value;
    default: return typeof value === 'object' ? undefined : String(value);
  }
}

function safeTs(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function idOf(key: CollectionKey, item: Record<string, unknown>): string {
  if (key === SINGLETON) return 'platform';
  const raw = item[SPECS[key].idField];
  return typeof raw === 'string' ? raw : '';
}

function toRow(key: CollectionKey, item: unknown): Record<string, unknown> | null {
  const spec = SPECS[key];
  const obj = item as Record<string, unknown>;
  const id = idOf(key, obj);
  if (!id) return null;
  const row: Record<string, unknown> = { payload: obj };
  row[spec.idColumn ?? 'id'] = id;
  const ts = spec.tsField ? safeTs(obj[spec.tsField]) : null;
  if (ts) row.recorded_at = ts;
  for (const [col, field, cast] of spec.columns) {
    const v = coerce(obj[field], cast);
    if (v !== undefined) row[col] = v;
  }
  return row;
}

function fromRow(key: CollectionKey, row: Record<string, unknown> | null): unknown | null {
  const payload = row?.payload;
  if (payload && typeof payload === 'object') return payload;
  return null;
}

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// True once we have successfully talked to at least one v2 table. False means
// either the cloud is not configured for this build or schema_v2.sql has not
// been run yet — DataContext then serves the local copy.
let schemaReady = false;
export const isTableBackendReady = (): boolean => schemaReady;

let missingTablesWarned = false;

export async function fetchCollection<T = unknown>(key: CollectionKey): Promise<T[] | null> {
  const c = getSupabaseClient();
  if (!c) return null;
  const spec = SPECS[key];
  try {
    const idColumn = spec.idColumn ?? 'id';
    const res = await withTimeout(
      c.from(spec.table).select('*')
        .order(spec.orderBy, { ascending: spec.ascending ?? false })
        .order(idColumn, { ascending: true })
        .limit(spec.cap ?? 5000),
      9000,
      `fetch ${spec.table}`,
    );
    if (res.error) {
      if (!missingTablesWarned) {
        missingTablesWarned = true;
        console.warn(`[db] ${spec.table} not reachable (${res.error.message}). Run supabase/schema_v2.sql in the Supabase SQL Editor.`);
      }
      return null;
    }
    schemaReady = true;
    const items = (res.data ?? []).map((r) => fromRow(key, r as Record<string, unknown>)).filter(Boolean) as T[];
    return items;
  } catch (e) {
    console.warn(`[db] fetch ${spec.table} failed (offline?) — using local copy`, e);
    return null;
  }
}

async function upsertRow(key: CollectionKey, item: unknown): Promise<boolean> {
  const c = getSupabaseClient();
  if (!c) return false;
  const spec = SPECS[key];
  const row = toRow(key, item);
  if (!row) return false;
  const idColumn = spec.idColumn ?? 'id';
  try {
    const res = await withTimeout(
      c.from(spec.table).upsert(row, { onConflict: idColumn }),
      12000,
      `upsert ${spec.table}`,
    );
    if (res.error) {
      console.warn(`[db] write to ${spec.table} rejected:`, res.error.message);
      return false;
    }
    schemaReady = true;
    return true;
  } catch (e) {
    console.warn(`[db] write to ${spec.table} failed (queued for retry)`, e);
    return false;
  }
}

export async function removeRow(key: CollectionKey, id: string): Promise<boolean> {
  const c = getSupabaseClient();
  if (!c) return false;
  const spec = SPECS[key];
  const idColumn = spec.idColumn ?? 'id';
  try {
    const res = await withTimeout(c.from(spec.table).delete().eq(idColumn, id), 12000, `delete ${spec.table}`);
    if (res.error) { console.warn(`[db] delete from ${spec.table} rejected:`, res.error.message); return false; }
    return true;
  } catch (e) {
    console.warn(`[db] delete from ${spec.table} failed`, e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Offline write queue. A member on a phone with no signal still gets an instant
// UI; the row is parked in AsyncStorage and replayed the next time the app can
// reach Supabase, so nothing done offline is silently lost.
// ---------------------------------------------------------------------------
async function loadPending(): Promise<PendingOp[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingOp[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function savePending(ops: PendingOp[]): Promise<void> {
  try { await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(ops)); } catch {}
}

async function addPending(op: PendingOp): Promise<void> {
  const ops = await loadPending();
  const idColumn = SPECS[op.key].idColumn ?? 'id';
  const row = toRow(op.key, op.item);
  const mine = row?.[idColumn];
  // Keep only the newest queued version of a given row.
  const next = ops.filter((o) => !(o.key === op.key && toRow(o.key, o.item)?.[idColumn] === mine));
  next.push(op);
  await savePending(next.slice(-400));
}

let flushing = false;

export async function flushPending(): Promise<void> {
  const c = getSupabaseClient();
  if (!c || flushing) return;
  const ops = await loadPending();
  if (!ops.length) return;
  flushing = true;
  const remaining: PendingOp[] = [];
  for (const op of ops) {
    if (!(await upsertRow(op.key, op.item))) remaining.push(op);
  }
  flushing = false;
  if (remaining.length !== ops.length) {
    await savePending(remaining);
    if (remaining.length === 0) console.info(`[db] replayed ${ops.length} offline change(s)`);
  }
}

export async function writeItem(key: CollectionKey, item: unknown): Promise<void> {
  if (await upsertRow(key, item)) { void flushPending(); return; }
  await addPending({ key, item });
}

// ---------------------------------------------------------------------------
// Live updates: one Realtime channel watching every v2 table. A change on any
// device marks the affected collection dirty; the provider refetches just those
// tables (debounced) so every open screen repaints within about a second.
// ---------------------------------------------------------------------------
type ChangeHandler = (keys: CollectionKey[]) => void;
const handlers = new Set<ChangeHandler>();
const dirty = new Set<CollectionKey>();
let dirtyTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function markDirty(key: CollectionKey): void {
  dirty.add(key);
  if (dirtyTimer) return;
  dirtyTimer = setTimeout(() => {
    dirtyTimer = null;
    const keys = [...dirty];
    dirty.clear();
    for (const h of handlers) { try { h(keys); } catch {} }
  }, 200);
}

export function addTableChangeListener(cb: ChangeHandler): () => void {
  handlers.add(cb);
  return () => { handlers.delete(cb); };
}

export function startTableLiveStream(): void {
  const c = getSupabaseClient();
  if (!c || started) return;
  started = true;
  try {
    let ch = c.channel('live-rootedstay-tables');
    for (const key of KEYS) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: SPECS[key].table }, () => {
        // A row written by this very device echoes back too; markDirty is
        // idempotent, so the resulting refetch is one cheap query per table and
        // leaves every device with identical ordering.
        markDirty(key);
      });
    }
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') { console.info('[db] live table updates connected'); void flushPending(); }
      else console.warn(`[db] live channel ${status}`);
    });
  } catch (e) {
    console.warn('[db] realtime unavailable — refresh on focus only', e);
  }
}

// Periodic safety net for devices that drop realtime (bg Android, flaky data).
let pollTimer: ReturnType<typeof setInterval> | null = null;
export function startTablePolling(onTick: () => void, everyMs = 25000): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => { void flushPending(); onTick(); }, everyMs);
}
