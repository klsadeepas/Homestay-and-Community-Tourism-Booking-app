import { Role } from '@/services/types';

// ---------- IMAGE URLS (verified Unsplash with optimized params) ----------
export const IMG = {
  // Villages / landscapes
  ella: 'https://images.unsplash.com/photo-1546708973-b339540b5162?w=1200&auto=format&fit=crop&q=80',
  sigiriya: 'https://images.unsplash.com/photo-1580794749460-76f97b7180d8?w=1200&auto=format&fit=crop&q=80',
  hiriwadunna: 'https://images.unsplash.com/photo-1705730428836-b54e12aa8ea5?w=1200&auto=format&fit=crop&q=80',
  // Homestays / cottages
  hillHome: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
  gardenCottage: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&auto=format&fit=crop&q=80',
  paddyRooms: 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=1200&auto=format&fit=crop&q=80',
  // Tours / experiences
  sunriseHike: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80',
  villageTour: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=1200&auto=format&fit=crop&q=80',
  cookingClass: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&auto=format&fit=crop&q=80',
  craftWorkshop: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&auto=format&fit=crop&q=80',
  farmVisit: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&auto=format&fit=crop&q=80',
  // Events
  harvest: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
  lantern: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&auto=format&fit=crop&q=80',
  // Avatars
  avTraveler: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  avOwner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  avGuide: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&auto=format&fit=crop&q=80',
  avCoord: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  avAdmin: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=400&auto=format&fit=crop&q=80',
};

export const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export type SampleUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
  photo?: string;
  language?: 'en' | 'si';
  homeRegion?: string;
  interests?: string[];
  accessibility?: string[];
  dietary?: string[];
  village?: string;
  homestayName?: string;
  languagesSpoken?: string[];
  experience?: string;
  activities?: string[];
  assignedVillages?: string[];
  bio?: string;
  notifyBookings?: boolean;
  notifyMessages?: boolean;
  notifyAnnouncements?: boolean;
  pushEnabled?: boolean;
  status?: 'active' | 'pending' | 'suspended';
};

export const sampleUsers: SampleUser[] = [
  { id: 'u-trav-1', email: 'SampleTraveler@gmail.com', password: '123root', name: 'Sample Traveler', role: 'traveler', phone: '+94 71 234 5678', photo: IMG.avTraveler, language: 'en', homeRegion: 'Colombo', interests: ['Hiking', 'Culture', 'Food'], accessibility: [], dietary: ['Vegetarian'], notifyBookings: true, notifyMessages: true, notifyAnnouncements: true, pushEnabled: true, status: 'active' },
  { id: 'u-own-1', email: 'SampleOwner@gmail.com', password: '123root', name: 'Sample Owner', role: 'owner', phone: '+94 77 345 6789', photo: IMG.avOwner, language: 'en', village: 'Ella', homestayName: 'Hillside Home', bio: 'Family-run homestay with mountain views.', notifyBookings: true, notifyMessages: true, notifyAnnouncements: true, pushEnabled: true, status: 'active' },
  { id: 'u-gui-1', email: 'SampleGuide@gmail.com', password: '123root', name: 'Sample Guide', role: 'guide', phone: '+94 76 456 7890', photo: IMG.avGuide, language: 'en', village: 'Sigiriya', languagesSpoken: ['English', 'Sinhala', 'Tamil'], experience: '8 years leading cultural and nature tours.', activities: ['Nature Walks', 'Cultural Heritage', 'Cycling'], bio: 'Certified community guide, born and raised in Sigiriya.', notifyBookings: true, notifyMessages: true, notifyAnnouncements: true, pushEnabled: true, status: 'active' },
  { id: 'u-coord-1', email: 'SampleCoordinator@gmail.com', password: '123root', name: 'Sample Coordinator', role: 'coordinator', phone: '+94 75 567 8901', photo: IMG.avCoord, language: 'en', assignedVillages: ['v-ella','v-sigiriya','v-hiriwadunna'], bio: 'Supporting community-led tourism across three villages.', notifyBookings: true, notifyMessages: true, notifyAnnouncements: true, pushEnabled: true, status: 'active' },
  { id: 'u-admin-1', email: 'mainadmin@gmail.com', password: 'admin123', name: 'System Admin', role: 'admin', phone: '+94 70 111 2222', photo: IMG.avAdmin, language: 'en', bio: 'RootedStay platform administrator.', notifyBookings: true, notifyMessages: true, notifyAnnouncements: true, pushEnabled: true, status: 'active' },
];

export type Village = {
  id: string; name: string; region: string; description: string; photo: string;
  attractions: string[]; transport: string; etiquette: string;
  coordinates: { lat: number; lng: number };
};

export const sampleVillages: Village[] = [
  { id: 'v-ella', name: 'Ella', region: 'Uva Province', description: 'Misty mountain village famed for tea estates, waterfalls, and the Nine Arches Bridge.', photo: IMG.ella, attractions: ['Nine Arches Bridge', 'Little Adams Peak', 'Ravana Falls', 'Tea Plantations'], transport: 'Scenic train from Kandy. Tuk-tuks within village.', etiquette: 'Modest dress at temples. Ask before photographing residents.', coordinates: { lat: 6.8667, lng: 81.0466 } },
  { id: 'v-sigiriya', name: 'Sigiriya', region: 'Central Province', description: 'Home to the ancient rock fortress and surrounding paddy villages rich in heritage.', photo: IMG.sigiriya, attractions: ['Lion Rock', 'Pidurangala', 'Village Cycling', 'Minneriya Safari'], transport: 'Buses from Dambulla. Bicycles widely available.', etiquette: 'Remove shoes at religious sites. Keep voices low near monasteries.', coordinates: { lat: 7.9570, lng: 80.7603 } },
  { id: 'v-hiriwadunna', name: 'Hiriwadunna', region: 'North Central', description: 'Working farming community offering catamaran rides, bullock carts, and village lunches.', photo: IMG.hiriwadunna, attractions: ['Lake Catamaran', 'Village Cooking', 'Bullock Cart Rides', 'Rice Paddies'], transport: 'Reached from Habarana via tuk-tuk.', etiquette: 'Respect farming routines. Tipping local families is appreciated.', coordinates: { lat: 7.9833, lng: 80.6667 } },
];

export type AccessibilityDetails = {
  mobility: string[];
  bathroom: string[];
  food: string[];
  other?: string;
};
export type BenefitRecord = {
  beneficiary: 'host' | 'guide' | 'project' | 'community';
  projectName?: string;
  amountLKR?: number;
  percentage?: number;
  note?: string;
};

export type Listing = {
  id: string;
  type: 'homestay' | 'tour' | 'experience';
  ownerId: string;
  villageId: string;
  title: string;
  description: string;
  photo: string;
  pricePerUnitLKR: number;
  capacity: number;
  rooms?: number;
  rating: number;
  reviewCount: number;
  amenities?: string[];
  activities?: string[];
  duration?: string;
  difficulty?: 'Easy' | 'Moderate' | 'Challenging';
  meetingPoint?: string;
  rules?: string[];
  included?: string[];
  excluded?: string[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'needs_changes' | 'suspended';
  blockedDates?: string[];
  instantBooking?: boolean;
  accessibility?: AccessibilityDetails;
  benefit?: BenefitRecord;
  experienceCategory?: 'meal' | 'cooking' | 'workshop' | 'farm' | 'craft';
  seasonInfo?: string;
  coordinates?: { lat: number; lng: number };
  reviewReason?: string; // last coordinator reason, for 'needs_changes'/'suspended'
};

export const sampleListings: Listing[] = [
  {
    id: 'l-1', type: 'homestay', ownerId: 'u-own-1', villageId: 'v-ella',
    title: 'Hillside Home — Ella', description: 'Three-room family home overlooking tea slopes. Home-cooked meals and valley sunrises.',
    photo: IMG.hillHome, pricePerUnitLKR: 7500, capacity: 6, rooms: 3, rating: 4.8, reviewCount: 42,
    amenities: ['Wi-Fi', 'Hot Water', 'Breakfast', 'Mountain View'], rules: ['No smoking indoors', 'Quiet hours after 10 PM'],
    status: 'approved', blockedDates: [], instantBooking: true,
    accessibility: { mobility: ['step-free entrance'], bathroom: ['private'], food: ['Vegetarian', 'Vegan on request'], other: 'Ground floor rooms available.' },
    benefit: { beneficiary: 'host', note: 'Supports a 3-generation family and employs 2 local staff.' },
    coordinates: { lat: 6.8681, lng: 81.0472 },
  },
  {
    id: 'l-2', type: 'homestay', ownerId: 'u-own-1', villageId: 'v-ella',
    title: 'Garden Cottage — Ella', description: 'Private cottage in a flowering garden. Suited to couples and small families.',
    photo: IMG.gardenCottage, pricePerUnitLKR: 5500, capacity: 3, rooms: 1, rating: 4.6, reviewCount: 18,
    amenities: ['Wi-Fi', 'Garden', 'Breakfast'], rules: ['No pets', 'Check-in after 2 PM'], status: 'submitted',
    accessibility: { mobility: [], bathroom: ['shared'], food: ['Vegetarian'] },
    coordinates: { lat: 6.8650, lng: 81.0450 },
  },
  {
    id: 'l-3', type: 'tour', ownerId: 'u-gui-1', villageId: 'v-sigiriya',
    title: 'Pidurangala Sunrise Hike', description: 'Pre-dawn climb of Pidurangala for sweeping views of Lion Rock at sunrise.',
    photo: IMG.sunriseHike, pricePerUnitLKR: 3500, capacity: 10, rating: 4.9, reviewCount: 76,
    activities: ['Hiking', 'Photography'], duration: '4 hours', difficulty: 'Moderate',
    meetingPoint: 'Pidurangala Temple car park, 4:30 AM', included: ['Guide', 'Water', 'Entry fee'], excluded: ['Transport to meeting point'],
    status: 'approved', instantBooking: false,
    accessibility: { mobility: ['Not suitable for mobility aids'], bathroom: [], food: [] },
    benefit: { beneficiary: 'guide', note: 'Guided by local resident; sustains two guiding families.' },
    coordinates: { lat: 7.9589, lng: 80.7569 },
  },
  {
    id: 'l-4', type: 'tour', ownerId: 'u-gui-1', villageId: 'v-hiriwadunna',
    title: 'Hiriwadunna Village Experience', description: 'Bullock cart, catamaran ride, village cooking class and a traditional lunch.',
    photo: IMG.villageTour, pricePerUnitLKR: 4800, capacity: 12, rating: 4.7, reviewCount: 54,
    activities: ['Cultural', 'Food', 'Boating'], duration: '5 hours', difficulty: 'Easy',
    meetingPoint: 'Hiriwadunna Lake entrance', included: ['Lunch', 'All activities', 'Guide'], excluded: ['Tips'],
    status: 'approved', instantBooking: true,
    accessibility: { mobility: ['Uneven village paths'], bathroom: ['basic facilities'], food: ['Vegetarian', 'Halal on request'], other: 'Flexible pace available.' },
    benefit: { beneficiary: 'community', projectName: 'Hiriwadunna Lake Trust', percentage: 10, note: '10% of each booking supports the lake conservation group.' },
    coordinates: { lat: 7.9838, lng: 80.6672 },
  },
  {
    id: 'l-5', type: 'homestay', ownerId: 'u-own-1', villageId: 'v-sigiriya',
    title: 'Paddy View Rooms', description: 'Simple rooms edging the rice paddies. Great for cyclists and sunset photographers.',
    photo: IMG.paddyRooms, pricePerUnitLKR: 4200, capacity: 4, rooms: 2, rating: 4.4, reviewCount: 11,
    amenities: ['Wi-Fi', 'Bicycle Rental'], rules: ['No loud music'], status: 'under_review',
    coordinates: { lat: 7.9553, lng: 80.7592 },
  },
  {
    id: 'l-6', type: 'experience', ownerId: 'u-own-1', villageId: 'v-ella',
    title: 'Hillside Family Lunch', description: 'A home-cooked rice-and-curry lunch with the hosts, overlooking the tea valley.',
    photo: IMG.cookingClass, pricePerUnitLKR: 2500, capacity: 8, rating: 4.9, reviewCount: 22,
    duration: '2 hours', experienceCategory: 'meal', meetingPoint: 'Hillside Home — Ella',
    included: ['Meal', 'Tea', 'Family welcome'], excluded: ['Transport'],
    status: 'approved', instantBooking: true,
    accessibility: { mobility: ['step-free dining area'], bathroom: ['private'], food: ['Vegetarian', 'Vegan', 'Gluten-free on request'], other: 'Can accommodate most common dietary needs with notice.' },
    benefit: { beneficiary: 'host', note: 'Entirely hosted by the Hillside family.' },
    coordinates: { lat: 6.8681, lng: 81.0472 },
  },
  {
    id: 'l-7', type: 'experience', ownerId: 'u-gui-1', villageId: 'v-sigiriya',
    title: 'Mask-Painting Workshop', description: 'Learn traditional mask-painting from a village craftsperson. Take your mask home.',
    photo: IMG.craftWorkshop, pricePerUnitLKR: 3200, capacity: 6, rating: 4.7, reviewCount: 9,
    duration: '2.5 hours', experienceCategory: 'craft', meetingPoint: 'Craft hall near Sigiriya village',
    included: ['Materials', 'Guidance', 'Take-home mask'], excluded: ['Transport'],
    status: 'approved', instantBooking: false,
    accessibility: { mobility: ['step-free workshop'], bathroom: ['shared'], food: [] },
    benefit: { beneficiary: 'project', projectName: 'Sigiriya Craft Cooperative', percentage: 15, note: '15% supports the craft cooperative\'s youth training.' },
    coordinates: { lat: 7.9540, lng: 80.7600 },
  },
  {
    id: 'l-8', type: 'experience', ownerId: 'u-gui-1', villageId: 'v-hiriwadunna',
    title: 'Working Farm Visit', description: 'A guided visit to a working paddy and vegetable farm. Try hands-on tasks.',
    photo: IMG.farmVisit, pricePerUnitLKR: 2200, capacity: 10, rating: 4.6, reviewCount: 15,
    duration: '2 hours', experienceCategory: 'farm', meetingPoint: 'Farm gate, Hiriwadunna',
    included: ['Guide', 'Fresh snack'], excluded: ['Boots'],
    status: 'approved', instantBooking: true,
    accessibility: { mobility: ['Rough terrain, boots recommended'], bathroom: [], food: ['Vegetarian'] },
    benefit: { beneficiary: 'community', projectName: 'Hiriwadunna Youth Fund', amountLKR: 300, note: 'LKR 300 per booking to the youth fund.' },
    coordinates: { lat: 7.9825, lng: 80.6680 },
  },
];

export type Booking = {
  id: string;
  listingId: string;
  travelerId: string;
  dateFrom: string;
  dateTo: string;
  guests: number;
  rooms?: number;
  totalLKR: number;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
  note?: string;
  createdAt: string;
  checkIn?: 'booked' | 'checked_in' | 'no_show';
  paymentStatus?: 'unpaid' | 'processing' | 'paid' | 'failed' | 'refund_pending' | 'refunded';
  paymentMethod?: 'card_demo' | 'local_wallet_demo' | 'cash_on_arrival';
  paymentRef?: string;
  paidAt?: string;
  accessibilityRequest?: string;
  dietaryRequest?: string;
  instantConfirmed?: boolean;
};

const today = new Date();
const inDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

export const sampleBookings: Booking[] = [
  { id: 'b-1', listingId: 'l-1', travelerId: 'u-trav-1', dateFrom: inDays(5), dateTo: inDays(8), guests: 2, rooms: 1, totalLKR: 22500, status: 'confirmed', note: 'Vegetarian meals please.', createdAt: inDays(-3), checkIn: 'booked', paymentStatus: 'paid', paymentMethod: 'card_demo', paymentRef: 'RS-DEMO-1001', paidAt: inDays(-2), dietaryRequest: 'Vegetarian' },
  { id: 'b-2', listingId: 'l-3', travelerId: 'u-trav-1', dateFrom: inDays(6), dateTo: inDays(6), guests: 2, totalLKR: 7000, status: 'pending', note: 'First time hiking at dawn.', createdAt: inDays(-1), paymentStatus: 'unpaid' },
  { id: 'b-3', listingId: 'l-4', travelerId: 'u-trav-1', dateFrom: inDays(-10), dateTo: inDays(-10), guests: 3, totalLKR: 14400, status: 'completed', createdAt: inDays(-20), checkIn: 'checked_in', paymentStatus: 'paid', paymentMethod: 'card_demo', paymentRef: 'RS-DEMO-1000', paidAt: inDays(-11) },
];

export type Review = {
  id: string;
  listingId: string;
  travelerId: string;
  bookingId?: string;
  rating: number;
  text: string;
  createdAt: string;
};

export const sampleReviews: Review[] = [
  { id: 'r-1', listingId: 'l-1', travelerId: 'u-trav-1', rating: 5, text: 'Wonderful family and gorgeous views.', createdAt: inDays(-15) },
  { id: 'r-2', listingId: 'l-4', travelerId: 'u-trav-1', bookingId: 'b-3', rating: 5, text: 'Memorable village experience, beautifully done.', createdAt: inDays(-9) },
];

export type EventItem = {
  id: string;
  villageId: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  description: string;
  capacity: number;
  photo: string;
  status: 'draft' | 'published' | 'cancelled';
  audience?: 'all' | 'travelers' | 'residents' | 'owners' | 'guides';
  location?: string;
  type?: 'festival' | 'cultural' | 'market' | 'other';
  authorId?: string;
};

export const sampleEvents: EventItem[] = [
  { id: 'e-1', villageId: 'v-ella', title: 'Harvest Festival', dateFrom: inDays(14), dateTo: inDays(15), description: 'Two-day village celebration with traditional music, food stalls and tea tastings.', capacity: 200, photo: IMG.harvest, status: 'published', audience: 'all', location: 'Ella village square', type: 'festival', authorId: 'u-coord-1' },
  { id: 'e-2', villageId: 'v-sigiriya', title: 'Full Moon Lantern Walk', dateFrom: inDays(21), dateTo: inDays(21), description: 'Guided evening walk through paddy fields on Poya night.', capacity: 60, photo: IMG.lantern, status: 'published', audience: 'travelers', location: 'Pidurangala temple start', type: 'cultural', authorId: 'u-coord-1' },
];

export type Announcement = {
  id: string;
  villageId?: string;
  title: string;
  body: string;
  audience: 'all' | 'travelers' | 'owners' | 'guides';
  urgent: boolean;
  createdAt: string;
  authorId: string;
};

export const sampleAnnouncements: Announcement[] = [
  { id: 'a-1', villageId: 'v-ella', title: 'Monsoon advisory', body: 'Expect afternoon showers through the week. Carry rain gear on hikes.', audience: 'travelers', urgent: true, createdAt: inDays(-2), authorId: 'u-coord-1' },
  { id: 'a-2', title: 'New community guidelines published', body: 'Updated hosting and safety guidelines effective immediately.', audience: 'owners', urgent: false, createdAt: inDays(-5), authorId: 'u-coord-1' },
];

export type Message = { id: string; from: string; to: string; text: string; createdAt: string; threadId: string };
export type Thread = { id: string; participants: string[]; listingId?: string; bookingId?: string; lastMessage?: string; updatedAt: string };

export const sampleThreads: Thread[] = [
  { id: 't-1', participants: ['u-trav-1','u-own-1'], listingId: 'l-1', bookingId: 'b-1', lastMessage: 'See you on arrival day!', updatedAt: inDays(-1) },
  { id: 't-2', participants: ['u-trav-1','u-gui-1'], listingId: 'l-3', bookingId: 'b-2', lastMessage: 'What time should we meet?', updatedAt: inDays(0) },
];
export const sampleMessages: Message[] = [
  { id: 'm-1', threadId: 't-1', from: 'u-trav-1', to: 'u-own-1', text: 'Hello! Looking forward to our stay.', createdAt: inDays(-3) },
  { id: 'm-2', threadId: 't-1', from: 'u-own-1', to: 'u-trav-1', text: 'Welcome! See you on arrival day!', createdAt: inDays(-1) },
  { id: 'm-3', threadId: 't-2', from: 'u-trav-1', to: 'u-gui-1', text: 'What time should we meet?', createdAt: inDays(0) },
];

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type: 'booking' | 'message' | 'approval' | 'announcement' | 'review' | 'arrival' | 'pickup' | 'payment';
  link?: string;
};

export const sampleNotifications: Notification[] = [
  { id: 'n-1', userId: 'u-trav-1', title: 'Booking confirmed', body: 'Hillside Home — Ella is confirmed for your dates.', read: false, createdAt: inDays(-1), type: 'booking', link: '/booking/b-1' },
  { id: 'n-2', userId: 'u-own-1', title: 'New booking request', body: 'A traveler requested Garden Cottage.', read: false, createdAt: inDays(0), type: 'booking' },
  { id: 'n-3', userId: 'u-coord-1', title: 'New listing submitted', body: 'Paddy View Rooms submitted for review.', read: false, createdAt: inDays(0), type: 'approval' },
];

export type AuditEntry = { id: string; actorId: string; action: string; target: string; reason?: string; createdAt: string };
export const sampleAudit: AuditEntry[] = [
  { id: 'au-1', actorId: 'u-coord-1', action: 'approve_listing', target: 'Hillside Home — Ella', createdAt: inDays(-7) },
  { id: 'au-2', actorId: 'u-admin-1', action: 'grant_coordinator', target: 'Sample Coordinator', reason: 'Village assignment approved', createdAt: inDays(-30) },
];

export type Report = { id: string; reporterId: string; targetType: 'listing' | 'review' | 'user'; targetId: string; reason: string; status: 'open' | 'resolved' | 'dismissed'; createdAt: string };
export const sampleReports: Report[] = [
  { id: 'rep-1', reporterId: 'u-trav-1', targetType: 'listing', targetId: 'l-2', reason: 'Photos look outdated', status: 'open', createdAt: inDays(-4) },
];

// ---------- NEW ENTITIES ----------

export type TransportInfo = {
  id: string;
  villageId: string;
  name: string;
  mode: 'bus' | 'taxi' | 'tuk-tuk' | 'community' | 'other';
  operatingArea: string;
  contactMethod: string;
  availability: string;
  accessibility?: string;
  estFareLKR?: number;
  note?: string;
};
export const sampleTransport: TransportInfo[] = [
  { id: 'tr-1', villageId: 'v-ella', name: 'Ella Local Tuk-Tuks', mode: 'tuk-tuk', operatingArea: 'Within Ella village', contactMethod: 'Ask host — demo contact', availability: 'Daily, 6 AM – 10 PM', accessibility: 'Standard seats, no wheelchair access', estFareLKR: 300, note: 'Sample estimate only.' },
  { id: 'tr-2', villageId: 'v-ella', name: 'Kandy–Ella Train (SLR)', mode: 'other', operatingArea: 'Kandy ↔ Ella', contactMethod: 'Sri Lanka Railways', availability: 'Multiple daily departures', note: 'Scenic hill-country train. Verify schedule locally.' },
  { id: 'tr-3', villageId: 'v-sigiriya', name: 'Dambulla–Sigiriya Bus 15A', mode: 'bus', operatingArea: 'Dambulla ↔ Sigiriya', contactMethod: 'Local bus stand', availability: 'Every 30–60 min', estFareLKR: 60 },
  { id: 'tr-4', villageId: 'v-hiriwadunna', name: 'Habarana Tuk-Tuks', mode: 'tuk-tuk', operatingArea: 'Habarana ↔ Hiriwadunna', contactMethod: 'Negotiate on arrival', availability: 'Daytime', estFareLKR: 600 },
];

export type PickupRequest = {
  id: string;
  bookingId: string;
  travelerId: string;
  pickupFrom: string;
  dateTime: string;
  passengers: number;
  accessibility?: string;
  note?: string;
  status: 'requested' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  response?: string;
  responderId?: string;
  createdAt: string;
};
export const samplePickups: PickupRequest[] = [];

export type ArrivalInfo = {
  bookingId: string;
  travelerEta?: string;
  travelerMethod?: string;
  travelerNote?: string;
  travelerUpdatedAt?: string;
  hostCheckInWindow?: string;
  hostInstructions?: string;
  hostMeetingPoint?: string;
  hostContactMethod?: string;
  hostUpdatedAt?: string;
  acknowledged?: boolean;
};
export const sampleArrivals: ArrivalInfo[] = [
  { bookingId: 'b-1', hostCheckInWindow: '2:00 PM – 7:00 PM', hostInstructions: 'Head to the big tea bush at the lane entrance and call out — someone will come to greet you.', hostMeetingPoint: 'Hillside Home gate', hostContactMethod: 'In-app message', hostUpdatedAt: inDays(-2), acknowledged: false },
];

export type ResponsibleGuide = {
  id: string;
  villageId: string;
  topic: 'customs' | 'photography' | 'waste' | 'wildlife' | 'sacred' | 'respectful';
  title: string;
  body: string;
  status: 'draft' | 'submitted' | 'published' | 'needs_update';
  reviewedBy?: string;
  reviewedAt?: string;
  updatedAt: string;
};
export const sampleResponsible: ResponsibleGuide[] = [
  { id: 'rg-1', villageId: 'v-ella', topic: 'photography', title: 'Ask before photographing residents', body: 'Many Ella families welcome photos, but please ask first — especially at homes, workplaces, and small shrines.', status: 'published', reviewedBy: 'u-coord-1', reviewedAt: inDays(-20), updatedAt: inDays(-20) },
  { id: 'rg-2', villageId: 'v-ella', topic: 'waste', title: 'Carry a reusable bottle', body: 'Hillside streams can be fragile. Refill at your homestay instead of buying bottled water where possible.', status: 'published', reviewedBy: 'u-coord-1', reviewedAt: inDays(-15), updatedAt: inDays(-15) },
  { id: 'rg-3', villageId: 'v-sigiriya', topic: 'sacred', title: 'Dress modestly near shrines', body: 'Cover shoulders and knees when visiting the village temple and Pidurangala. Remove footwear at the inner shrine.', status: 'published', reviewedBy: 'u-coord-1', reviewedAt: inDays(-12), updatedAt: inDays(-12) },
  { id: 'rg-4', villageId: 'v-hiriwadunna', topic: 'customs', title: 'Respect farming routines', body: 'Early mornings are busy on the farm — avoid blocking paths and ask before stepping into paddies.', status: 'published', reviewedBy: 'u-coord-1', reviewedAt: inDays(-10), updatedAt: inDays(-10) },
  { id: 'rg-5', villageId: 'v-sigiriya', topic: 'wildlife', title: 'Keep distance from wild elephants', body: 'If you encounter wild elephants on safari, stay quiet, keep lights off, and follow your guide. Never approach.', status: 'submitted', updatedAt: inDays(-3) },
];

export type SeasonalHighlight = {
  id: string;
  villageId?: string;
  title: string;
  type: 'festival' | 'harvest' | 'weather' | 'seasonal';
  description: string;
  dateFrom?: string;
  dateTo?: string;
  recurring?: boolean;
  photo?: string;
};
export const sampleSeasonal: SeasonalHighlight[] = [
  { id: 's-1', villageId: 'v-ella', title: 'Tea picking season', type: 'seasonal', description: 'Lush, cool weather in the hills — ideal for tea estate walks.', recurring: true, dateFrom: '09-01', dateTo: '03-31', photo: IMG.ella },
  { id: 's-2', villageId: 'v-sigiriya', title: 'Dry season — rock climbs', type: 'weather', description: 'Clear mornings for Pidurangala and Lion Rock. Weather varies — check locally.', recurring: true, dateFrom: '12-01', dateTo: '03-31', photo: IMG.sigiriya },
  { id: 's-3', villageId: 'v-hiriwadunna', title: 'Rice harvest', type: 'harvest', description: 'Village lunches often feature freshly harvested rice.', recurring: true, dateFrom: '08-15', dateTo: '09-30', photo: IMG.hiriwadunna },
];
