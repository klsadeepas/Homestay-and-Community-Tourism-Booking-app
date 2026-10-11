import React, { createContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '@/services/storage';
import {
  CollectionKey, fetchCollection, writeItem, removeRow, flushPending,
  addTableChangeListener, isTableBackendReady, startTableLiveStream, startTablePolling,
} from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import {
  Listing, Booking, Review, EventItem, Announcement, Thread, Message, Notification, AuditEntry, Report, Village,
  TransportInfo, PickupRequest, ArrivalInfo, ResponsibleGuide, SeasonalHighlight,
  FAQItem, SupportTicket, PlatformConfig,
  sampleListings, sampleBookings, sampleReviews, sampleEvents, sampleAnnouncements, sampleThreads, sampleMessages,
  sampleNotifications, sampleAudit, sampleReports, sampleVillages,
  sampleTransport, samplePickups, sampleArrivals, sampleResponsible, sampleSeasonal,
  sampleFAQs, sampleTickets, samplePlatform,
} from '@/constants/sampleData';

type DataState = {
  listings: Listing[];
  bookings: Booking[];
  reviews: Review[];
  events: EventItem[];
  announcements: Announcement[];
  threads: Thread[];
  messages: Message[];
  notifications: Notification[];
  audit: AuditEntry[];
  reports: Report[];
  villages: Village[];
  wishlist: string[];
  transport: TransportInfo[];
  pickups: PickupRequest[];
  arrivals: ArrivalInfo[];
  responsible: ResponsibleGuide[];
  seasonal: SeasonalHighlight[];
  faqs: FAQItem[];
  tickets: SupportTicket[];
  platform: PlatformConfig;
  ready: boolean;
  live: boolean;
  updateListing: (id: string, patch: Partial<Listing>) => Promise<void>;
  addListing: (l: Listing) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  addBooking: (b: Booking) => Promise<void>;
  updateBooking: (id: string, patch: Partial<Booking>) => Promise<void>;
  addReview: (r: Review) => Promise<void>;
  updateReview: (id: string, patch: Partial<Review>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  addEvent: (e: EventItem) => Promise<void>;
  updateEvent: (id: string, patch: Partial<EventItem>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addAnnouncement: (a: Announcement) => Promise<void>;
  addMessage: (m: Message) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addNotification: (n: Notification) => Promise<void>;
  addAudit: (a: AuditEntry) => Promise<void>;
  logAction: (action: string, target: string, reason?: string) => Promise<void>;
  addReport: (r: Report) => Promise<void>;
  updateReport: (id: string, patch: Partial<Report>) => Promise<void>;
  updateVillage: (id: string, patch: Partial<Village>) => Promise<void>;
  toggleWishlist: (id: string) => Promise<void>;
  addPickup: (p: PickupRequest) => Promise<void>;
  updatePickup: (id: string, patch: Partial<PickupRequest>) => Promise<void>;
  upsertArrival: (bookingId: string, patch: Partial<ArrivalInfo>) => Promise<void>;
  addResponsible: (g: ResponsibleGuide) => Promise<void>;
  updateResponsible: (id: string, patch: Partial<ResponsibleGuide>) => Promise<void>;
  addFAQ: (f: FAQItem) => Promise<void>;
  updateFAQ: (id: string, patch: Partial<FAQItem>) => Promise<void>;
  deleteFAQ: (id: string) => Promise<void>;
  addTicket: (t: SupportTicket) => Promise<void>;
  updateTicket: (id: string, patch: Partial<SupportTicket>) => Promise<void>;
  updatePlatform: (patch: Partial<PlatformConfig>) => Promise<void>;
  refreshAll: () => Promise<void>;
  resetDemoData: () => Promise<void>;
};

export const DataContext = createContext<DataState | undefined>(undefined);

// AsyncStorage is now only the on-device cache (offline reads, wishlist, session).
// The source of truth is the Supabase tables, one row per record.
async function cacheGet<T>(storageKey: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
async function cacheSet<T>(storageKey: string, value: T): Promise<void> {
  try { await AsyncStorage.setItem(storageKey, JSON.stringify(value)); } catch {}
}

const ALL_STORAGE_KEYS: Record<CollectionKey, string> = {
  users: KEYS.users,
  villages: KEYS.villages,
  listings: KEYS.listings,
  bookings: KEYS.bookings,
  reviews: KEYS.reviews,
  events: KEYS.events,
  announcements: KEYS.announcements,
  threads: KEYS.threads,
  messages: KEYS.messages,
  notifications: KEYS.notifications,
  audit: KEYS.audit,
  reports: KEYS.reports,
  transport: KEYS.transport,
  pickups: KEYS.pickups,
  arrivals: KEYS.arrivals,
  responsible: KEYS.responsible,
  seasonal: KEYS.seasonal,
  faqs: KEYS.faqs,
  tickets: KEYS.tickets,
  platform: KEYS.platform,
};

// 'users' belongs to AuthContext; 'platform' is a single row, not a list.
const STORAGE_KEYS = ALL_STORAGE_KEYS;
const LIST_KEYS: CollectionKey[] = (Object.keys(STORAGE_KEYS) as CollectionKey[])
  .filter((k) => k !== 'users' && k !== 'platform');
const SYNC_KEYS: CollectionKey[] = [...LIST_KEYS, 'platform'];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [listings, setListings] = useState<Listing[]>(sampleListings);
  const [bookings, setBookings] = useState<Booking[]>(sampleBookings);
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);
  const [events, setEvents] = useState<EventItem[]>(sampleEvents);
  const [announcements, setAnnouncements] = useState<Announcement[]>(sampleAnnouncements);
  const [threads, setThreads] = useState<Thread[]>(sampleThreads);
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [audit, setAudit] = useState<AuditEntry[]>(sampleAudit);
  const [reports, setReports] = useState<Report[]>(sampleReports);
  const [villages, setVillages] = useState<Village[]>(sampleVillages);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [transport, setTransport] = useState<TransportInfo[]>(sampleTransport);
  const [pickups, setPickups] = useState<PickupRequest[]>(samplePickups);
  const [arrivals, setArrivals] = useState<ArrivalInfo[]>(sampleArrivals);
  const [responsible, setResponsible] = useState<ResponsibleGuide[]>(sampleResponsible);
  const [seasonal, setSeasonal] = useState<SeasonalHighlight[]>(sampleSeasonal);
  const [faqs, setFaqs] = useState<FAQItem[]>(sampleFAQs);
  const [tickets, setTickets] = useState<SupportTicket[]>(sampleTickets);
  const [platform, setPlatform] = useState<PlatformConfig>(samplePlatform);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const readyRef = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLive = useRef<Set<CollectionKey>>(new Set());

  // Latest state per collection, so a mutation that chains several writes (a
  // review also recomputes a listing rating) never reads a stale array.
  const stateRef = useRef<Record<string, unknown>>({});
  const settersRef = useRef<Record<string, (v: never) => void>>({});
  const setCollection = useCallback(<T,>(key: CollectionKey, value: T) => {
    stateRef.current[key] = value;
    settersRef.current[key]?.(value as never);
  }, []);

  const seedFor: Partial<Record<CollectionKey, unknown[]>> = {
    listings: sampleListings, bookings: sampleBookings, reviews: sampleReviews,
    events: sampleEvents, announcements: sampleAnnouncements, threads: sampleThreads,
    messages: sampleMessages, notifications: sampleNotifications, audit: sampleAudit,
    reports: sampleReports, villages: sampleVillages, transport: sampleTransport,
    pickups: samplePickups, arrivals: sampleArrivals, responsible: sampleResponsible,
    seasonal: sampleSeasonal, faqs: sampleFAQs, tickets: sampleTickets,
  };

  // Loads one collection: cloud table -> device cache -> demo seed. When the
  // table is reachable but empty on a fresh install, the seed rows are pushed so
  // a brand-new project starts with the same sample content the app shows.
  const loadOne = useCallback(async (key: CollectionKey) => {
    const storageKey = STORAGE_KEYS[key];

    if (key === 'platform') {
      const remote = await fetchCollection<PlatformConfig>('platform');
      if (remote) {
        const value = remote[0] ?? samplePlatform;
        if (!remote.length) await writeItem('platform', value);
        setCollection('platform', value);
        await cacheSet(storageKey, value);
        return;
      }
      const cached = await cacheGet<PlatformConfig>(storageKey);
      if (cached) setCollection('platform', cached);
      return;
    }

    const remote = await fetchCollection(key);
    if (remote) {
      if (remote.length === 0 && !stateRef.current[`${key}:seeded`]) {
        const local = await cacheGet<unknown[]>(storageKey);
        const seed = seedFor[key];
        if (seed && seed.length && (!local || !local.length)) {
          stateRef.current[`${key}:seeded`] = true;
          setCollection(key, seed);
          for (const item of seed) await writeItem(key, item);
          await cacheSet(storageKey, seed);
          return;
        }
      }
      setCollection(key, remote);
      await cacheSet(storageKey, remote);
      return;
    }
    // No cloud (offline build, or schema_v2.sql not applied yet): device copy.
    const cached = await cacheGet<unknown[]>(storageKey);
    if (cached && cached.length) setCollection(key, cached);
    else if (seedFor[key]) setCollection(key, seedFor[key]);
  }, [setCollection]);

  // One collection's list, its changed rows written to the table, and the device
  // cache refreshed. Removed ids are deleted from the table too.
  const commit = useCallback(async (
    key: CollectionKey,
    next: unknown[],
    changed: unknown[] = [],
    removedIds: string[] = [],
  ) => {
    setCollection(key, next);
    await cacheSet(STORAGE_KEYS[key], next);
    for (const item of changed) await writeItem(key, item);
    for (const id of removedIds) await removeRow(key, id);
  }, [setCollection]);

  const refreshKeys = useCallback(async (keys: CollectionKey[]) => {
    for (const key of keys) await loadOne(key);
  }, [loadOne]);

  // Boot: pull every table, then let the live stream take over.
  useEffect(() => {
    (async () => {
      const wl = await cacheGet<string[]>(KEYS.wishlist);
      setWishlist(Array.isArray(wl) ? wl : []);
      await Promise.all(SYNC_KEYS.map((k) => loadOne(k)));
      void flushPending();
      setLive(isTableBackendReady());
      readyRef.current = true;
      setReady(true);
    })();
  }, [loadOne]);

  // Live refresh: any row written on any device refetches just its collection
  // (debounced), so open screens update without a restart.
  useEffect(() => {
    startTableLiveStream();
    startTablePolling(() => { if (readyRef.current) void refreshKeys(SYNC_KEYS); }, 30000);
    return addTableChangeListener((keys) => {
      if (!readyRef.current) return;
      setLive(true);
      keys.forEach((k) => pendingLive.current.add(k));
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        const todo = [...pendingLive.current];
        pendingLive.current.clear();
        void refreshKeys(todo);
      }, 250);
    });
  }, [refreshKeys]);

  // Coming back to the foreground is the other moment a phone has been offline;
  // replay queued writes and pull whatever changed.
  useEffect(() => {
    const onFocus = () => {
      if (!readyRef.current) return;
      void flushPending();
      void refreshKeys(SYNC_KEYS);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onFocus);
      return () => document.removeEventListener('visibilitychange', onFocus);
    }
    return undefined;
  }, [refreshKeys]);

  // ---------------------------------------------------------------- audit
  const addAudit = useCallback(async (a: AuditEntry) => {
    const entry: AuditEntry = { ...a, createdAt: a.createdAt || new Date().toISOString() };
    const next = [entry, ...((stateRef.current.audit as AuditEntry[]) ?? [])];
    await commit('audit', next, [entry]);
  }, [commit]);

  // The one-line way for a screen to record what the signed-in person just did.
  const logAction = useCallback(async (action: string, target: string, reason?: string) => {
    const actor = userRef.current;
    const entry: AuditEntry = {
      id: `au-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      actorId: actor?.id || 'anonymous',
      action,
      target,
      reason,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...((stateRef.current.audit as AuditEntry[]) ?? [])];
    await commit('audit', next, [entry]);
  }, [commit]);

  // ---------------------------------------------------------------- listings
  const updateListing = useCallback(async (id: string, patch: Partial<Listing>) => {
    const all = (stateRef.current.listings as Listing[]) ?? [];
    const next = all.map((l) => (l.id === id ? { ...l, ...patch } : l));
    const changed = next.find((l) => l.id === id);
    await commit('listings', next, changed ? [changed] : []);
  }, [commit]);

  const addListing = useCallback(async (l: Listing) => {
    const next = [l, ...((stateRef.current.listings as Listing[]) ?? [])];
    await commit('listings', next, [l]);
  }, [commit]);

  const deleteListing = useCallback(async (id: string) => {
    const all = (stateRef.current.listings as Listing[]) ?? [];
    await commit('listings', all.filter((l) => l.id !== id), [], [id]);
  }, [commit]);

  // ---------------------------------------------------------------- bookings
  const addBooking = useCallback(async (b: Booking) => {
    const next = [b, ...((stateRef.current.bookings as Booking[]) ?? [])];
    await commit('bookings', next, [b]);
  }, [commit]);

  const updateBooking = useCallback(async (id: string, patch: Partial<Booking>) => {
    const all = (stateRef.current.bookings as Booking[]) ?? [];
    const next = all.map((b) => (b.id === id ? { ...b, ...patch } : b));
    const changed = next.find((b) => b.id === id);
    await commit('bookings', next, changed ? [changed] : []);
  }, [commit]);

  // ---------------------------------------------------------------- reviews
  const recomputeRating = useCallback(async (listingId: string) => {
    const all = (stateRef.current.reviews as Review[]) ?? [];
    const listingsAll = (stateRef.current.listings as Listing[]) ?? [];
    const visible = all.filter((x) => x.listingId === listingId && !x.hidden);
    const avg = visible.length ? visible.reduce((s, x) => s + x.rating, 0) / visible.length : 0;
    const nextListings = listingsAll.map((l) => (l.id === listingId
      ? { ...l, rating: Math.round(avg * 10) / 10, reviewCount: visible.length }
      : l));
    const changed = nextListings.find((l) => l.id === listingId);
    await commit('listings', nextListings, changed ? [changed] : []);
  }, [commit]);

  const addReview = useCallback(async (r: Review) => {
    const next = [r, ...((stateRef.current.reviews as Review[]) ?? [])];
    await commit('reviews', next, [r]);
    await recomputeRating(r.listingId);
  }, [commit, recomputeRating]);

  const updateReview = useCallback(async (id: string, patch: Partial<Review>) => {
    const all = (stateRef.current.reviews as Review[]) ?? [];
    const next = all.map((r) => (r.id === id ? { ...r, ...patch } : r));
    const changed = next.find((r) => r.id === id);
    await commit('reviews', next, changed ? [changed] : []);
    const listingId = changed?.listingId;
    if (listingId) await recomputeRating(listingId);
  }, [commit, recomputeRating]);

  const deleteReview = useCallback(async (id: string) => {
    const all = (stateRef.current.reviews as Review[]) ?? [];
    const target = all.find((r) => r.id === id);
    await commit('reviews', all.filter((r) => r.id !== id), [], [id]);
    if (target) await recomputeRating(target.listingId);
  }, [commit, recomputeRating]);

  // ---------------------------------------------------------------- events
  const addEvent = useCallback(async (e: EventItem) => {
    const next = [e, ...((stateRef.current.events as EventItem[]) ?? [])];
    await commit('events', next, [e]);
  }, [commit]);

  const updateEvent = useCallback(async (id: string, patch: Partial<EventItem>) => {
    const all = (stateRef.current.events as EventItem[]) ?? [];
    const next = all.map((e) => (e.id === id ? { ...e, ...patch } : e));
    const changed = next.find((e) => e.id === id);
    await commit('events', next, changed ? [changed] : []);
  }, [commit]);

  const deleteEvent = useCallback(async (id: string) => {
    const all = (stateRef.current.events as EventItem[]) ?? [];
    await commit('events', all.filter((e) => e.id !== id), [], [id]);
  }, [commit]);

  const addAnnouncement = useCallback(async (a: Announcement) => {
    const next = [a, ...((stateRef.current.announcements as Announcement[]) ?? [])];
    await commit('announcements', next, [a]);
  }, [commit]);

  // ---------------------------------------------------------------- chat
  const addMessage = useCallback(async (m: Message) => {
    const msgs = [...((stateRef.current.messages as Message[]) ?? []), m];
    const all = (stateRef.current.threads as Thread[]) ?? [];
    const nextThreads = all.map((t) => (t.id === m.threadId ? { ...t, lastMessage: m.text, updatedAt: m.createdAt } : t));
    const changedThread = nextThreads.find((t) => t.id === m.threadId);
    await commit('messages', msgs, [m]);
    await commit('threads', nextThreads, changedThread ? [changedThread] : []);
  }, [commit]);

  // ---------------------------------------------------------------- notifications
  const markNotificationRead = useCallback(async (id: string) => {
    const all = (stateRef.current.notifications as Notification[]) ?? [];
    const next = all.map((n) => (n.id === id ? { ...n, read: true } : n));
    const changed = next.find((n) => n.id === id);
    await commit('notifications', next, changed ? [changed] : []);
  }, [commit]);

  const addNotification = useCallback(async (n: Notification) => {
    const next = [n, ...((stateRef.current.notifications as Notification[]) ?? [])];
    await commit('notifications', next, [n]);
  }, [commit]);

  // ---------------------------------------------------------------- reports
  const addReport = useCallback(async (r: Report) => {
    const next = [r, ...((stateRef.current.reports as Report[]) ?? [])];
    await commit('reports', next, [r]);
  }, [commit]);

  const updateReport = useCallback(async (id: string, patch: Partial<Report>) => {
    const all = (stateRef.current.reports as Report[]) ?? [];
    const next = all.map((r) => (r.id === id ? { ...r, ...patch } : r));
    const changed = next.find((r) => r.id === id);
    await commit('reports', next, changed ? [changed] : []);
  }, [commit]);

  const updateVillage = useCallback(async (id: string, patch: Partial<Village>) => {
    const all = (stateRef.current.villages as Village[]) ?? [];
    const next = all.map((v) => (v.id === id ? { ...v, ...patch } : v));
    const changed = next.find((v) => v.id === id);
    await commit('villages', next, changed ? [changed] : []);
  }, [commit]);

  // Wishlist is device-local by design (it is personal to whoever holds the phone).
  const toggleWishlist = useCallback(async (id: string) => {
    const all = wishlist;
    const next = all.includes(id) ? all.filter((x) => x !== id) : [...all, id];
    setWishlist(next);
    await cacheSet(KEYS.wishlist, next);
  }, [wishlist]);

  // ---------------------------------------------------------------- pickups / arrivals
  const addPickup = useCallback(async (p: PickupRequest) => {
    const next = [p, ...((stateRef.current.pickups as PickupRequest[]) ?? [])];
    await commit('pickups', next, [p]);
  }, [commit]);

  const updatePickup = useCallback(async (id: string, patch: Partial<PickupRequest>) => {
    const all = (stateRef.current.pickups as PickupRequest[]) ?? [];
    const next = all.map((p) => (p.id === id ? { ...p, ...patch } : p));
    const changed = next.find((p) => p.id === id);
    await commit('pickups', next, changed ? [changed] : []);
  }, [commit]);

  const upsertArrival = useCallback(async (bookingId: string, patch: Partial<ArrivalInfo>) => {
    const all = (stateRef.current.arrivals as ArrivalInfo[]) ?? [];
    const exists = all.find((a) => a.bookingId === bookingId);
    const row: ArrivalInfo = exists ? { ...exists, ...patch } : { bookingId, ...patch };
    const next = exists ? all.map((a) => (a.bookingId === bookingId ? row : a)) : [row, ...all];
    await commit('arrivals', next, [row]);
  }, [commit]);

  // ---------------------------------------------------------------- responsible / seasonal
  const addResponsible = useCallback(async (g: ResponsibleGuide) => {
    const next = [g, ...((stateRef.current.responsible as ResponsibleGuide[]) ?? [])];
    await commit('responsible', next, [g]);
  }, [commit]);

  const updateResponsible = useCallback(async (id: string, patch: Partial<ResponsibleGuide>) => {
    const all = (stateRef.current.responsible as ResponsibleGuide[]) ?? [];
    const next = all.map((g) => (g.id === id ? { ...g, ...patch } : g));
    const changed = next.find((g) => g.id === id);
    await commit('responsible', next, changed ? [changed] : []);
  }, [commit]);

  // ---------------------------------------------------------------- faqs
  const addFAQ = useCallback(async (f: FAQItem) => {
    const next = [...((stateRef.current.faqs as FAQItem[]) ?? []), f];
    await commit('faqs', next, [f]);
  }, [commit]);

  const updateFAQ = useCallback(async (id: string, patch: Partial<FAQItem>) => {
    const all = (stateRef.current.faqs as FAQItem[]) ?? [];
    const next = all.map((f) => (f.id === id ? { ...f, ...patch } : f));
    const changed = next.find((f) => f.id === id);
    await commit('faqs', next, changed ? [changed] : []);
  }, [commit]);

  const deleteFAQ = useCallback(async (id: string) => {
    const all = (stateRef.current.faqs as FAQItem[]) ?? [];
    await commit('faqs', all.filter((f) => f.id !== id), [], [id]);
  }, [commit]);

  // ---------------------------------------------------------------- tickets
  const addTicket = useCallback(async (t: SupportTicket) => {
    const next = [t, ...((stateRef.current.tickets as SupportTicket[]) ?? [])];
    await commit('tickets', next, [t]);
  }, [commit]);

  const updateTicket = useCallback(async (id: string, patch: Partial<SupportTicket>) => {
    const all = (stateRef.current.tickets as SupportTicket[]) ?? [];
    const next = all.map((t) => (t.id === id ? { ...t, ...patch } : t));
    const changed = next.find((t) => t.id === id);
    await commit('tickets', next, changed ? [changed] : []);
  }, [commit]);

  // ---------------------------------------------------------------- platform
  const updatePlatform = useCallback(async (patch: Partial<PlatformConfig>) => {
    const next = { ...(stateRef.current.platform as PlatformConfig), ...patch };
    setCollection('platform', next);
    await cacheSet(KEYS.platform, next);
    await writeItem('platform', next);
  }, [setCollection]);

  const refreshAll = useCallback(async () => {
    await Promise.all(SYNC_KEYS.map((k) => loadOne(k)));
    setLive(isTableBackendReady());
  }, [loadOne]);

  const resetDemoData = useCallback(async () => {
    for (const storageKey of SYNC_KEYS.map((k) => STORAGE_KEYS[k])) {
      try { await AsyncStorage.removeItem(storageKey); } catch {}
    }
    try { await AsyncStorage.removeItem(KEYS.wishlist); await AsyncStorage.removeItem('rs_pending_ops'); } catch {}
    stateRef.current = {};
    await Promise.all(SYNC_KEYS.map((k) => loadOne(k)));
  }, [loadOne]);

  // Keep the ref mirrors in sync with rendered state (remote pushes included).
  const liveState: Record<string, unknown> = {
    listings, bookings, reviews, events, announcements, threads, messages, notifications,
    audit, reports, villages, transport, pickups, arrivals, responsible, seasonal, faqs, tickets, platform,
  };
  Object.entries(liveState).forEach(([k, v]) => { stateRef.current[k] = v; });
  const setterMap: Record<string, (v: never) => void> = {
    listings: setListings as never, bookings: setBookings as never, reviews: setReviews as never,
    events: setEvents as never, announcements: setAnnouncements as never, threads: setThreads as never,
    messages: setMessages as never, notifications: setNotifications as never, audit: setAudit as never,
    reports: setReports as never, villages: setVillages as never, transport: setTransport as never,
    pickups: setPickups as never, arrivals: setArrivals as never, responsible: setResponsible as never,
    seasonal: setSeasonal as never, faqs: setFaqs as never, tickets: setTickets as never,
    platform: setPlatform as never,
  };
  Object.entries(setterMap).forEach(([k, fn]) => { settersRef.current[k] = fn; });

  return (
    <DataContext.Provider
      value={{
        listings, bookings, reviews, events, announcements, threads, messages, notifications,
        audit, reports, villages, wishlist, transport, pickups, arrivals, responsible, seasonal, ready, live,
        faqs, tickets, platform,
        updateListing, addListing, deleteListing, addBooking, updateBooking, addReview, updateReview, deleteReview,
        addEvent, updateEvent, deleteEvent, addAnnouncement, addMessage, markNotificationRead, addNotification,
        addAudit, logAction, addReport, updateReport, updateVillage, toggleWishlist,
        addPickup, updatePickup, upsertArrival, addResponsible, updateResponsible,
        addFAQ, updateFAQ, deleteFAQ, addTicket, updateTicket, updatePlatform, refreshAll, resetDemoData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
