import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try { const raw = await AsyncStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  async remove(key: string): Promise<void> {
    try { await AsyncStorage.removeItem(key); } catch {}
  },
};

export const KEYS = {
  users: 'rs_users',
  listings: 'rs_listings',
  bookings: 'rs_bookings',
  reviews: 'rs_reviews',
  events: 'rs_events',
  announcements: 'rs_announcements',
  threads: 'rs_threads',
  messages: 'rs_messages',
  notifications: 'rs_notifications',
  audit: 'rs_audit',
  reports: 'rs_reports',
  villages: 'rs_villages',
  session: 'rs_session',
  settings: 'rs_settings',
  wishlist: 'rs_wishlist',
  trips: 'rs_trips',
  transport: 'rs_transport',
  pickups: 'rs_pickups',
  arrivals: 'rs_arrivals',
  responsible: 'rs_responsible',
  seasonal: 'rs_seasonal',
  filters: 'rs_filters',
  faqs: 'rs_faqs',
  tickets: 'rs_tickets',
  platform: 'rs_platform',
};
