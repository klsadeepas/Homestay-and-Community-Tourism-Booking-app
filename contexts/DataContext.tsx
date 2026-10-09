import React, { createContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { storage, KEYS } from '@/services/storage';
import { syncFromRemote, addRemoteChangeListener } from '@/services/sync';
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
  resetDemoData: () => Promise<void>;
};

export const DataContext = createContext<DataState | undefined>(undefined);

async function loadOrSeed<T>(key: string, seed: T): Promise<T> {
  const stored = await storage.get<T>(key);
  if (stored !== null && stored !== undefined) return stored;
  await storage.set(key, seed);
  return seed;
}

export function DataProvider({ children }: { children: ReactNode }) {
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
  const readyRef = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-reads every synced key from AsyncStorage into React state — the same
  // values a fresh app start would show. Used for live cross-device refresh.
  const reloadAllFromStorage = useCallback(async () => {
    const [l, b, r, e, an, th, me, no, au, rep, vi, wi, tr, pi, ar, rg, se, fq, ti, pf] =
      await Promise.all([
        loadOrSeed(KEYS.listings, sampleListings),
        loadOrSeed(KEYS.bookings, sampleBookings),
        loadOrSeed(KEYS.reviews, sampleReviews),
        loadOrSeed(KEYS.events, sampleEvents),
        loadOrSeed(KEYS.announcements, sampleAnnouncements),
        loadOrSeed(KEYS.threads, sampleThreads),
        loadOrSeed(KEYS.messages, sampleMessages),
        loadOrSeed(KEYS.notifications, sampleNotifications),
        loadOrSeed(KEYS.audit, sampleAudit),
        loadOrSeed(KEYS.reports, sampleReports),
        loadOrSeed(KEYS.villages, sampleVillages),
        loadOrSeed(KEYS.wishlist, [] as string[]),
        loadOrSeed(KEYS.transport, sampleTransport),
        loadOrSeed(KEYS.pickups, samplePickups),
        loadOrSeed(KEYS.arrivals, sampleArrivals),
        loadOrSeed(KEYS.responsible, sampleResponsible),
        loadOrSeed(KEYS.seasonal, sampleSeasonal),
        loadOrSeed(KEYS.faqs, sampleFAQs),
        loadOrSeed(KEYS.tickets, sampleTickets),
        loadOrSeed(KEYS.platform, samplePlatform),
      ]);
    setListings(l);
    setBookings(b);
    setReviews(r);
    setEvents(e);
    setAnnouncements(an);
    setThreads(th);
    setMessages(me);
    setNotifications(no);
    setAudit(au);
    setReports(rep);
    setVillages(vi);
    setWishlist(wi);
    setTransport(tr);
    setPickups(pi);
    setArrivals(ar);
    setResponsible(rg);
    setSeasonal(se);
    setFaqs(fq);
    setTickets(ti);
    setPlatform(pf);
  }, []);

  // Live refresh: whenever another device writes to the cloud, reload state
  // from storage so screens update without an app restart. Debounced so a
  // burst of remote keys settles into one reload.
  useEffect(() => {
    return addRemoteChangeListener(() => {
      if (!readyRef.current) return;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => { void reloadAllFromStorage(); }, 250);
    });
  }, [reloadAllFromStorage]);

  useEffect(() => {
    (async () => {
      await syncFromRemote();
      const storedListings = await loadOrSeed(KEYS.listings, sampleListings);
      const fixedListings = storedListings.map((l) =>
        l.id === 'l-1' && (l.photo?.includes('photo-1587874522487') || !l.photo)
          ? { ...l, photo: sampleListings.find((s) => s.id === 'l-1')?.photo || l.photo }
          : l
      );
      if (JSON.stringify(fixedListings) !== JSON.stringify(storedListings)) {
        await storage.set(KEYS.listings, fixedListings);
      }
      setListings(fixedListings);

      setBookings(await loadOrSeed(KEYS.bookings, sampleBookings));
      setReviews(await loadOrSeed(KEYS.reviews, sampleReviews));
      setEvents(await loadOrSeed(KEYS.events, sampleEvents));
      setAnnouncements(await loadOrSeed(KEYS.announcements, sampleAnnouncements));
      setThreads(await loadOrSeed(KEYS.threads, sampleThreads));
      setMessages(await loadOrSeed(KEYS.messages, sampleMessages));
      setNotifications(await loadOrSeed(KEYS.notifications, sampleNotifications));
      setAudit(await loadOrSeed(KEYS.audit, sampleAudit));
      setReports(await loadOrSeed(KEYS.reports, sampleReports));

      const storedVillages = await loadOrSeed(KEYS.villages, sampleVillages);
      const fixedVillages = storedVillages.map((v) => {
        const seedVillage = sampleVillages.find((sv) => sv.id === v.id);
        if (seedVillage && (v.photo?.includes('photo-1588416499018') || !v.photo)) {
          return { ...v, photo: seedVillage.photo };
        }
        return v;
      });
      if (JSON.stringify(fixedVillages) !== JSON.stringify(storedVillages)) {
        await storage.set(KEYS.villages, fixedVillages);
      }
      setVillages(fixedVillages);

      setWishlist(await loadOrSeed(KEYS.wishlist, [] as string[]));
      setTransport(await loadOrSeed(KEYS.transport, sampleTransport));
      setPickups(await loadOrSeed(KEYS.pickups, samplePickups));
      setArrivals(await loadOrSeed(KEYS.arrivals, sampleArrivals));
      setResponsible(await loadOrSeed(KEYS.responsible, sampleResponsible));

      const storedSeasonal = await loadOrSeed(KEYS.seasonal, sampleSeasonal);
      const fixedSeasonal = storedSeasonal.map((s) => {
        const seedSeasonal = sampleSeasonal.find((ss) => ss.id === s.id);
        if (seedSeasonal && (s.photo?.includes('photo-1588416499018') || !s.photo)) {
          return { ...s, photo: seedSeasonal.photo };
        }
        return s;
      });
      if (JSON.stringify(fixedSeasonal) !== JSON.stringify(storedSeasonal)) {
        await storage.set(KEYS.seasonal, fixedSeasonal);
      }
      setSeasonal(fixedSeasonal);

      setFaqs(await loadOrSeed(KEYS.faqs, sampleFAQs));
      setTickets(await loadOrSeed(KEYS.tickets, sampleTickets));
      setPlatform(await loadOrSeed(KEYS.platform, samplePlatform));

      readyRef.current = true;
      setReady(true);
    })();
  }, []);

  const persist = async <T,>(key: string, value: T, setter: (v: T) => void) => {
    setter(value);
    await storage.set(key, value);
  };

  const updateListing = useCallback(async (id: string, patch: Partial<Listing>) => {
    const next = listings.map((l) => (l.id === id ? { ...l, ...patch } : l));
    await persist(KEYS.listings, next, setListings);
  }, [listings]);

  const addListing = useCallback(async (l: Listing) => {
    const next = [l, ...listings];
    await persist(KEYS.listings, next, setListings);
  }, [listings]);

  const deleteListing = useCallback(async (id: string) => {
    const next = listings.filter((l) => l.id !== id);
    await persist(KEYS.listings, next, setListings);
  }, [listings]);

  const addBooking = useCallback(async (b: Booking) => {
    const next = [b, ...bookings];
    await persist(KEYS.bookings, next, setBookings);
  }, [bookings]);

  const updateBooking = useCallback(async (id: string, patch: Partial<Booking>) => {
    const next = bookings.map((b) => (b.id === id ? { ...b, ...patch } : b));
    await persist(KEYS.bookings, next, setBookings);
  }, [bookings]);

  const addReview = useCallback(async (r: Review) => {
    const next = [r, ...reviews];
    await persist(KEYS.reviews, next, setReviews);
    // Recompute listing rating
    const forListing = next.filter((x) => x.listingId === r.listingId);
    const avg = forListing.reduce((s, x) => s + x.rating, 0) / forListing.length;
    const nextListings = listings.map((l) => (l.id === r.listingId ? { ...l, rating: Math.round(avg * 10) / 10, reviewCount: forListing.length } : l));
    await persist(KEYS.listings, nextListings, setListings);
  }, [reviews, listings]);

  const updateReview = useCallback(async (id: string, patch: Partial<Review>) => {
    const next = reviews.map((r) => (r.id === id ? { ...r, ...patch } : r));
    await persist(KEYS.reviews, next, setReviews);
    const listingId = next.find((r) => r.id === id)?.listingId;
    if (listingId) {
      const visible = next.filter((x) => x.listingId === listingId && !x.hidden);
      const avg = visible.length ? visible.reduce((s, x) => s + x.rating, 0) / visible.length : 0;
      const nextListings = listings.map((l) => (l.id === listingId ? { ...l, rating: Math.round(avg * 10) / 10, reviewCount: visible.length } : l));
      await persist(KEYS.listings, nextListings, setListings);
    }
  }, [reviews, listings]);

  const deleteReview = useCallback(async (id: string) => {
    const target = reviews.find((r) => r.id === id);
    const next = reviews.filter((r) => r.id !== id);
    await persist(KEYS.reviews, next, setReviews);
    if (target) {
      const visible = next.filter((x) => x.listingId === target.listingId && !x.hidden);
      const avg = visible.length ? visible.reduce((s, x) => s + x.rating, 0) / visible.length : 0;
      const nextListings = listings.map((l) => (l.id === target.listingId ? { ...l, rating: Math.round(avg * 10) / 10, reviewCount: visible.length } : l));
      await persist(KEYS.listings, nextListings, setListings);
    }
  }, [reviews, listings]);

  const addEvent = useCallback(async (e: EventItem) => {
    const next = [e, ...events];
    await persist(KEYS.events, next, setEvents);
  }, [events]);

  const updateEvent = useCallback(async (id: string, patch: Partial<EventItem>) => {
    const next = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
    await persist(KEYS.events, next, setEvents);
  }, [events]);

  const deleteEvent = useCallback(async (id: string) => {
    const next = events.filter((e) => e.id !== id);
    await persist(KEYS.events, next, setEvents);
  }, [events]);

  const addAnnouncement = useCallback(async (a: Announcement) => {
    const next = [a, ...announcements];
    await persist(KEYS.announcements, next, setAnnouncements);
  }, [announcements]);

  const addMessage = useCallback(async (m: Message) => {
    const next = [...messages, m];
    await persist(KEYS.messages, next, setMessages);
    const nextThreads = threads.map((t) =>
      t.id === m.threadId ? { ...t, lastMessage: m.text, updatedAt: m.createdAt } : t,
    );
    await persist(KEYS.threads, nextThreads, setThreads);
  }, [messages, threads]);

  const markNotificationRead = useCallback(async (id: string) => {
    const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    await persist(KEYS.notifications, next, setNotifications);
  }, [notifications]);

  const addNotification = useCallback(async (n: Notification) => {
    const next = [n, ...notifications];
    await persist(KEYS.notifications, next, setNotifications);
  }, [notifications]);

  const addAudit = useCallback(async (a: AuditEntry) => {
    const next = [a, ...audit];
    await persist(KEYS.audit, next, setAudit);
  }, [audit]);

  const addReport = useCallback(async (r: Report) => {
    const next = [r, ...reports];
    await persist(KEYS.reports, next, setReports);
  }, [reports]);

  const updateReport = useCallback(async (id: string, patch: Partial<Report>) => {
    const next = reports.map((r) => (r.id === id ? { ...r, ...patch } : r));
    await persist(KEYS.reports, next, setReports);
  }, [reports]);

  const updateVillage = useCallback(async (id: string, patch: Partial<Village>) => {
    const next = villages.map((v) => (v.id === id ? { ...v, ...patch } : v));
    await persist(KEYS.villages, next, setVillages);
  }, [villages]);

  const toggleWishlist = useCallback(async (id: string) => {
    const next = wishlist.includes(id) ? wishlist.filter((x) => x !== id) : [...wishlist, id];
    await persist(KEYS.wishlist, next, setWishlist);
  }, [wishlist]);

  const addPickup = useCallback(async (p: PickupRequest) => {
    const next = [p, ...pickups];
    await persist(KEYS.pickups, next, setPickups);
  }, [pickups]);

  const updatePickup = useCallback(async (id: string, patch: Partial<PickupRequest>) => {
    const next = pickups.map((p) => (p.id === id ? { ...p, ...patch } : p));
    await persist(KEYS.pickups, next, setPickups);
  }, [pickups]);

  const upsertArrival = useCallback(async (bookingId: string, patch: Partial<ArrivalInfo>) => {
    const exists = arrivals.find((a) => a.bookingId === bookingId);
    const next = exists
      ? arrivals.map((a) => (a.bookingId === bookingId ? { ...a, ...patch } : a))
      : [{ bookingId, ...patch }, ...arrivals];
    await persist(KEYS.arrivals, next, setArrivals);
  }, [arrivals]);

  const addResponsible = useCallback(async (g: ResponsibleGuide) => {
    const next = [g, ...responsible];
    await persist(KEYS.responsible, next, setResponsible);
  }, [responsible]);

  const updateResponsible = useCallback(async (id: string, patch: Partial<ResponsibleGuide>) => {
    const next = responsible.map((g) => (g.id === id ? { ...g, ...patch } : g));
    await persist(KEYS.responsible, next, setResponsible);
  }, [responsible]);

  const addFAQ = useCallback(async (f: FAQItem) => {
    const next = [...faqs, f];
    await persist(KEYS.faqs, next, setFaqs);
  }, [faqs]);

  const updateFAQ = useCallback(async (id: string, patch: Partial<FAQItem>) => {
    const next = faqs.map((f) => (f.id === id ? { ...f, ...patch } : f));
    await persist(KEYS.faqs, next, setFaqs);
  }, [faqs]);

  const deleteFAQ = useCallback(async (id: string) => {
    const next = faqs.filter((f) => f.id !== id);
    await persist(KEYS.faqs, next, setFaqs);
  }, [faqs]);

  const addTicket = useCallback(async (t: SupportTicket) => {
    const next = [t, ...tickets];
    await persist(KEYS.tickets, next, setTickets);
  }, [tickets]);

  const updateTicket = useCallback(async (id: string, patch: Partial<SupportTicket>) => {
    const next = tickets.map((t) => (t.id === id ? { ...t, ...patch } : t));
    await persist(KEYS.tickets, next, setTickets);
  }, [tickets]);

  const updatePlatform = useCallback(async (patch: Partial<PlatformConfig>) => {
    const next = { ...platform, ...patch };
    await persist(KEYS.platform, next, setPlatform);
  }, [platform]);

  const resetDemoData = useCallback(async () => {
    await storage.remove(KEYS.users);
    await storage.remove(KEYS.listings);
    await storage.remove(KEYS.bookings);
    await storage.remove(KEYS.reviews);
    await storage.remove(KEYS.events);
    await storage.remove(KEYS.announcements);
    await storage.remove(KEYS.threads);
    await storage.remove(KEYS.messages);
    await storage.remove(KEYS.notifications);
    await storage.remove(KEYS.audit);
    await storage.remove(KEYS.reports);
    await storage.remove(KEYS.villages);
    await storage.remove(KEYS.wishlist);
    await storage.remove(KEYS.trips);
    await storage.remove(KEYS.transport);
    await storage.remove(KEYS.pickups);
    await storage.remove(KEYS.arrivals);
    await storage.remove(KEYS.responsible);
    await storage.remove(KEYS.seasonal);
    await storage.remove(KEYS.filters);
    await storage.remove(KEYS.faqs);
    await storage.remove(KEYS.tickets);
    await storage.remove(KEYS.platform);
  }, []);

  return (
    <DataContext.Provider
      value={{
        listings, bookings, reviews, events, announcements, threads, messages, notifications,
        audit, reports, villages, wishlist, transport, pickups, arrivals, responsible, seasonal, ready,
        faqs, tickets, platform,
        updateListing, addListing, deleteListing, addBooking, updateBooking, addReview, updateReview, deleteReview,
        addEvent, updateEvent, deleteEvent, addAnnouncement, addMessage, markNotificationRead, addNotification,
        addAudit, addReport, updateReport, updateVillage, toggleWishlist,
        addPickup, updatePickup, upsertArrival, addResponsible, updateResponsible,
        addFAQ, updateFAQ, deleteFAQ, addTicket, updateTicket, updatePlatform, resetDemoData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
