import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StarRating } from '@/components/ui/StarRating';
import { Chip } from '@/components/ui/Chip';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { formatPrice, convertedNote } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function ListingDetail() {
  const router = useRouter();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { user, users } = useAuth();
  const { listings, villages, reviews, bookings, wishlist, toggleWishlist, addBooking, addNotification, updateListing, addReview, addAudit } = useData();
  const { t, currency } = useSettings();
  const { showAlert } = useAlert();

  const listing = listings.find((l) => l.id === id);
  const [editing, setEditing] = useState(edit === '1');
  const [draft, setDraft] = useState(listing);
  const [guests, setGuests] = useState('2');
  const [note, setNote] = useState('');
  const [dietary, setDietary] = useState('');
  const [access, setAccess] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [stars, setStars] = useState(5);
  const [chosenBooking, setChosenBooking] = useState<string | null>(null);

  if (!listing) return <Screen title="Listing" back><View style={{ padding: 20 }}><Text>Listing not found.</Text></View></Screen>;
  const village = villages.find((v) => v.id === listing.villageId);
  const owner = users.find((u) => u.id === listing.ownerId);
  const listingReviews = reviews.filter((r) => r.listingId === listing.id);
  const isMine = user?.id === listing.ownerId;
  const noteStr = convertedNote(currency);

  // Determine completed bookings eligible for review
  const myCompletedBookings = user?.role === 'traveler' ? bookings.filter((b) => b.travelerId === user?.id && b.listingId === listing.id && b.status === 'completed') : [];
  const alreadyReviewedBookingIds = new Set(reviews.filter((r) => r.bookingId).map((r) => r.bookingId!));
  const reviewableBookings = myCompletedBookings.filter((b) => !alreadyReviewedBookingIds.has(b.id));

  const checkConflict = (dateFrom: string, dateTo: string, g: number): string | null => {
    if (listing.type === 'tour' || listing.type === 'experience') {
      const sessionBookings = bookings.filter((b) => b.listingId === listing.id && b.dateFrom === dateFrom && (b.status === 'confirmed' || b.status === 'pending'));
      const taken = sessionBookings.reduce((s, b) => s + b.guests, 0);
      if (taken + g > listing.capacity) return 'Session capacity full for the chosen date.';
      return null;
    }
    const overlap = bookings.some((b) => b.listingId === listing.id && (b.status === 'confirmed') && !(dateTo < b.dateFrom || dateFrom > b.dateTo));
    if (overlap) return 'These dates overlap a confirmed booking.';
    return null;
  };

  const book = async () => {
    const g = parseInt(guests || '0', 10);
    if (!g || g < 1) { showAlert('Enter guests', 'Please enter the number of guests.'); return; }
    if (g > listing.capacity) { showAlert('Over capacity', `Max ${listing.capacity} guests.`); return; }
    const dateFrom = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const dateTo = listing.type === 'homestay' ? new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) : dateFrom;
    const conflict = checkConflict(dateFrom, dateTo, g);
    if (conflict) { showAlert('Not available', conflict); return; }

    const total = listing.pricePerUnitLKR * (listing.type === 'homestay' ? 3 : g);
    const willInstant = !!listing.instantBooking && listing.status === 'approved';
    const bookingId = `b-${Date.now()}`;
    const booking = {
      id: bookingId,
      listingId: listing.id,
      travelerId: user!.id,
      dateFrom, dateTo,
      guests: g,
      totalLKR: total,
      status: (willInstant ? 'confirmed' : 'pending') as any,
      note, dietaryRequest: dietary || undefined, accessibilityRequest: access || undefined,
      createdAt: new Date().toISOString(),
      instantConfirmed: willInstant,
      paymentStatus: 'unpaid' as const,
      checkIn: 'booked' as const,
    };
    await addBooking(booking);
    await addNotification({
      id: `n-${Date.now()}`,
      userId: listing.ownerId,
      title: willInstant ? 'New instant booking' : 'New booking request',
      body: `${user!.name} ${willInstant ? 'booked' : 'requested'} ${listing.title}`,
      read: false,
      createdAt: new Date().toISOString(),
      type: 'booking',
      link: `/booking/${bookingId}`,
    });
    showAlert(willInstant ? 'Booked' : 'Request sent', willInstant ? 'Your booking is confirmed. Payment and arrival details next.' : 'Your booking request was sent to the host.', [
      { text: 'OK', onPress: () => router.replace(`/booking/${bookingId}`) },
    ]);
  };

  const saveEdits = async () => {
    if (!draft) return;
    await updateListing(listing.id, {
      title: draft.title,
      description: draft.description,
      pricePerUnitLKR: Number(draft.pricePerUnitLKR) || listing.pricePerUnitLKR,
      capacity: Number(draft.capacity) || listing.capacity,
      instantBooking: !!draft.instantBooking,
      accessibility: draft.accessibility,
      benefit: draft.benefit,
      experienceCategory: draft.experienceCategory,
    });
    setEditing(false);
    showAlert('Saved', 'Listing updated.');
  };

  const postReview = async () => {
    if (!reviewText.trim()) { showAlert('Write something', 'Please add some text.'); return; }
    if (user?.role !== 'traveler') { showAlert('Not allowed', 'Only travelers can post reviews.'); return; }
    if (!chosenBooking) { showAlert('Select a booking', 'Select a completed booking to review.'); return; }
    if (alreadyReviewedBookingIds.has(chosenBooking)) { showAlert('Already reviewed', 'You already left a review for this booking.'); return; }
    await addReview({ id: `r-${Date.now()}`, listingId: listing.id, travelerId: user!.id, bookingId: chosenBooking, rating: stars, text: reviewText.trim(), createdAt: new Date().toISOString() });
    setReviewText(''); setChosenBooking(null);
    showAlert('Posted', 'Your review has been posted.');
  };

  const reportThis = () => {
    showAlert('Report listing?', 'Flag this listing for coordinator review.', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Report', onPress: async () => {
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'report_listing', target: listing.title, createdAt: new Date().toISOString() });
        showAlert('Reported', 'Thanks. Coordinators will review it.');
      }},
    ]);
  };

  const toggleInstant = () => {
    if (!draft) return;
    setDraft({ ...draft, instantBooking: !draft.instantBooking });
  };

  const acc = listing.accessibility;
  const hasAccess = !!acc && (acc.mobility.length + acc.bathroom.length + acc.food.length > 0 || acc.other);

  return (
    <Screen back title={listing.title} right={
      !isMine && user?.role === 'traveler' ? (
        <Pressable onPress={() => toggleWishlist(listing.id)} hitSlop={10}>
          <MaterialIcons name={wishlist.includes(listing.id) ? 'favorite' : 'favorite-border'} size={22} color={wishlist.includes(listing.id) ? colors.danger : colors.text} />
        </Pressable>
      ) : null
    }>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <SmartImage uri={listing.photo} style={styles.hero} fallbackIcon="landscape" />

        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{listing.title}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {listing.instantBooking ? <Badge label="Instant" tone="success" /> : null}
              <Badge label={listing.status.replace('_',' ')} tone={listing.status === 'approved' ? 'success' : 'warning'} />
            </View>
          </View>

          {listing.status === 'needs_changes' && listing.reviewReason && isMine ? (
            <View style={styles.reasonBox}>
              <MaterialIcons name="warning" size={16} color={colors.warning} />
              <Text style={styles.reasonText}>Coordinator asked for changes: {listing.reviewReason}</Text>
            </View>
          ) : null}

          {editing && draft ? (
            <>
              <Input label="Title" value={draft.title} onChangeText={(v) => setDraft({ ...draft, title: v })} />
              <Input label="Description" value={draft.description} onChangeText={(v) => setDraft({ ...draft, description: v })} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} />
              <Input label="Price (LKR)" value={String(draft.pricePerUnitLKR)} onChangeText={(v) => setDraft({ ...draft, pricePerUnitLKR: Number(v) || 0 })} keyboardType="numeric" />
              <Input label="Capacity" value={String(draft.capacity)} onChangeText={(v) => setDraft({ ...draft, capacity: Number(v) || 0 })} keyboardType="numeric" />

              <Text style={styles.editLabel}>Instant booking</Text>
              <Pressable onPress={toggleInstant} style={[styles.editToggle, draft.instantBooking && styles.editToggleOn]}>
                <MaterialIcons name="flash-on" size={16} color={draft.instantBooking ? '#fff' : colors.text} />
                <Text style={[styles.editToggleText, draft.instantBooking && { color: '#fff' }]}>{draft.instantBooking ? 'ON — eligible bookings auto-confirm' : 'OFF — all bookings require approval'}</Text>
              </Pressable>
              <Text style={styles.editHint}>Instant book only works on approved listings. Pending bookings are not affected when toggled off.</Text>

              <Text style={styles.editLabel}>Accessibility (mobility)</Text>
              <Input value={(draft.accessibility?.mobility || []).join(', ')} onChangeText={(v) => setDraft({ ...draft, accessibility: { ...(draft.accessibility || { mobility: [], bathroom: [], food: [] }), mobility: v.split(',').map((x) => x.trim()).filter(Boolean) } })} placeholder="e.g. step-free entrance, wide doorways" />
              <Text style={styles.editLabel}>Accessibility (bathroom)</Text>
              <Input value={(draft.accessibility?.bathroom || []).join(', ')} onChangeText={(v) => setDraft({ ...draft, accessibility: { ...(draft.accessibility || { mobility: [], bathroom: [], food: [] }), bathroom: v.split(',').map((x) => x.trim()).filter(Boolean) } })} placeholder="e.g. private, grab-bars" />
              <Text style={styles.editLabel}>Food & dietary</Text>
              <Input value={(draft.accessibility?.food || []).join(', ')} onChangeText={(v) => setDraft({ ...draft, accessibility: { ...(draft.accessibility || { mobility: [], bathroom: [], food: [] }), food: v.split(',').map((x) => x.trim()).filter(Boolean) } })} placeholder="e.g. Vegetarian, Vegan, Halal" />
              <Text style={styles.editLabel}>Other access & practical details</Text>
              <Input value={draft.accessibility?.other || ''} onChangeText={(v) => setDraft({ ...draft, accessibility: { ...(draft.accessibility || { mobility: [], bathroom: [], food: [] }), other: v } })} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />

              <Text style={styles.editLabel}>Community benefit — note</Text>
              <Input value={draft.benefit?.note || ''} onChangeText={(v) => setDraft({ ...draft, benefit: { beneficiary: draft.benefit?.beneficiary || 'host', ...(draft.benefit || {}), note: v } })} placeholder="How does this listing benefit the local community?" multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />

              <View style={styles.actions}>
                <Button title={t('cancel')} variant="ghost" onPress={() => { setEditing(false); setDraft(listing); }} />
                <Button title={t('save')} onPress={saveEdits} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.metaRow}><MaterialIcons name="place" size={16} color={colors.textMuted} /><Text style={styles.meta}>{village?.name}, {village?.region}</Text></View>
              <View style={styles.metaRow}><MaterialIcons name="star" size={16} color={colors.accent} /><Text style={styles.meta}>{listing.rating.toFixed(1)} · {listing.reviewCount} reviews</Text></View>
              <Text style={styles.price}>{formatPrice(listing.pricePerUnitLKR, currency)} <Text style={styles.perUnit}>/ {listing.type === 'homestay' ? 'night' : 'person'}</Text></Text>
              {noteStr ? <Text style={styles.note}>{noteStr}</Text> : null}
              <Text style={styles.desc}>{listing.description}</Text>

              {listing.instantBooking ? (
                <View style={styles.instantCard}>
                  <MaterialIcons name="flash-on" size={18} color={colors.success} />
                  <Text style={styles.instantText}>Instant Book — confirmed automatically when available.</Text>
                </View>
              ) : null}

              {listing.type === 'homestay' ? (
                <>
                  <Text style={styles.section}>Amenities</Text>
                  <View style={styles.chips}>{(listing.amenities || []).map((a) => <View key={a} style={styles.chip}><Text style={styles.chipText}>{a}</Text></View>)}</View>
                  <Text style={styles.section}>House rules</Text>
                  {(listing.rules || []).map((r) => <Text key={r} style={styles.bullet}>• {r}</Text>)}
                </>
              ) : (
                <>
                  <Text style={styles.section}>Details</Text>
                  <Text style={styles.bullet}>• Duration: {listing.duration}</Text>
                  {listing.difficulty ? <Text style={styles.bullet}>• Difficulty: {listing.difficulty}</Text> : null}
                  {listing.experienceCategory ? <Text style={styles.bullet}>• Category: {listing.experienceCategory}</Text> : null}
                  <Text style={styles.bullet}>• Meeting point: {listing.meetingPoint}</Text>
                  <Text style={styles.section}>Included</Text>
                  {(listing.included || []).map((r) => <Text key={r} style={styles.bullet}>• {r}</Text>)}
                  <Text style={styles.section}>Not included</Text>
                  {(listing.excluded || []).map((r) => <Text key={r} style={styles.bullet}>• {r}</Text>)}
                </>
              )}

              {hasAccess ? (
                <>
                  <Text style={styles.section}>Accessibility & practical details</Text>
                  {acc!.mobility.length ? <Text style={styles.bullet}>• Mobility: {acc!.mobility.join(', ')}</Text> : null}
                  {acc!.bathroom.length ? <Text style={styles.bullet}>• Bathroom: {acc!.bathroom.join(', ')}</Text> : null}
                  {acc!.food.length ? <Text style={styles.bullet}>• Food: {acc!.food.join(', ')}</Text> : null}
                  {acc!.other ? <Text style={styles.bullet}>• {acc!.other}</Text> : null}
                  <Text style={styles.caption}>Details are provided by the host. Confirm specific needs with the host before booking.</Text>
                </>
              ) : null}

              {listing.benefit ? (
                <>
                  <Text style={styles.section}>{t('communityBenefit')}</Text>
                  <View style={styles.benefitCard}>
                    <MaterialIcons name="volunteer-activism" size={18} color={colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.benefitTitle}>Beneficiary: {listing.benefit.beneficiary}{listing.benefit.projectName ? ` · ${listing.benefit.projectName}` : ''}</Text>
                      {listing.benefit.percentage ? <Text style={styles.benefitLine}>{listing.benefit.percentage}% of booking supports this.</Text> : null}
                      {listing.benefit.amountLKR ? <Text style={styles.benefitLine}>Fixed contribution: {formatPrice(listing.benefit.amountLKR, currency)} per booking.</Text> : null}
                      {listing.benefit.note ? <Text style={styles.benefitNote}>{listing.benefit.note}</Text> : null}
                      <Text style={styles.caption}>Verified traceable amounts only. Demo figures shown where live data is not connected.</Text>
                    </View>
                  </View>
                </>
              ) : null}

              <Text style={styles.section}>Hosted by</Text>
              <View style={styles.hostRow}>
                <Avatar uri={owner?.photo} name={owner?.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hostName}>{owner?.name}</Text>
                  <Text style={styles.hostSub}>{owner?.role === 'guide' ? 'Tour Guide' : owner?.role === 'owner' ? 'Homestay Owner' : 'Community Host'}</Text>
                </View>
                {!isMine ? <Button title="Message" variant="secondary" onPress={() => router.push('/messages')} /> : null}
              </View>

              {user?.role === 'traveler' && listing.status === 'approved' ? (
                <>
                  <Text style={styles.section}>{listing.instantBooking ? t('bookInstant') : t('bookRequest')}</Text>
                  <Input label="Guests" value={guests} onChangeText={setGuests} keyboardType="numeric" />
                  <Input label="Dietary needs (optional, private)" value={dietary} onChangeText={setDietary} placeholder="e.g. Vegetarian, nut allergy" />
                  <Input label="Accessibility needs (optional, private)" value={access} onChangeText={setAccess} placeholder="e.g. ground-floor room" />
                  <Input label="Note to host (optional)" value={note} onChangeText={setNote} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
                  <Button title={listing.instantBooking ? t('book') : t('bookRequest')} onPress={book} fullWidth />
                  <Text style={styles.note}>Cancellation and refund policies apply. Dietary and accessibility details are shared only with people who need them to fulfil the booking.</Text>
                </>
              ) : null}

              {isMine ? <Button title={t('edit')} variant="secondary" onPress={() => setEditing(true)} style={{ marginTop: spacing.md }} /> : null}

              <Text style={styles.section}>Reviews</Text>
              {listingReviews.length === 0 ? <Text style={styles.sub}>No reviews yet.</Text> : listingReviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <StarRating value={r.rating} readOnly size={14} />
                  <Text style={styles.reviewText}>{r.text}</Text>
                  <Text style={styles.reviewTime}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}

              {user?.role === 'traveler' && !isMine && reviewableBookings.length > 0 ? (
                <>
                  <Text style={styles.section}>{t('writeReview')}</Text>
                  <Text style={styles.caption}>One review per completed booking.</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: spacing.sm }}>
                    {reviewableBookings.map((b) => (
                      <Chip key={b.id} label={`Booking · ${b.dateFrom}`} selected={chosenBooking === b.id} onPress={() => setChosenBooking(b.id)} />
                    ))}
                  </View>
                  <StarRating value={stars} onChange={setStars} />
                  <Input placeholder="Share your experience" value={reviewText} onChangeText={setReviewText} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} containerStyle={{ marginTop: spacing.sm }} />
                  <Button title="Post review" onPress={postReview} />
                </>
              ) : user?.role === 'traveler' && !isMine && myCompletedBookings.length > 0 ? (
                <Text style={styles.caption}>You have already reviewed your completed booking(s) for this listing.</Text>
              ) : user?.role === 'traveler' && !isMine ? (
                <Text style={styles.caption}>Reviews are available after a booking is marked completed.</Text>
              ) : null}

              {!isMine ? (
                <Pressable onPress={reportThis} style={styles.reportRow}>
                  <MaterialIcons name="flag" size={16} color={colors.danger} />
                  <Text style={styles.report}>Report this listing</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 260 },
  body: { padding: spacing.lg, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { ...typography.h2, color: colors.text, flex: 1 },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: spacing.sm, borderRadius: radius.md },
  reasonText: { ...typography.small, color: colors.warning, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...typography.small, color: colors.textMuted },
  price: { ...typography.h2, color: colors.primary, marginTop: spacing.sm },
  perUnit: { ...typography.small, color: colors.textMuted, fontWeight: '400' },
  note: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  desc: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  instantCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', padding: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm },
  instantText: { ...typography.small, color: colors.success, flex: 1, fontWeight: '600' },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, backgroundColor: colors.accentSoft, borderRadius: radius.pill },
  chipText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  bullet: { ...typography.body, color: colors.text, marginBottom: 2 },
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  benefitCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: radius.md },
  benefitTitle: { ...typography.smallBold, color: colors.text },
  benefitLine: { ...typography.small, color: colors.text, marginTop: 2 },
  benefitNote: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  hostName: { ...typography.bodyBold, color: colors.text },
  hostSub: { ...typography.caption, color: colors.textMuted },
  reviewCard: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, gap: 4 },
  reviewText: { ...typography.small, color: colors.text },
  reviewTime: { ...typography.caption, color: colors.textMuted },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, alignSelf: 'center' },
  report: { ...typography.smallBold, color: colors.danger },
  sub: { ...typography.small, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.sm },
  editLabel: { ...typography.smallBold, color: colors.text, marginTop: spacing.sm, marginBottom: 6 },
  editToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  editToggleOn: { backgroundColor: colors.success, borderColor: colors.success },
  editToggleText: { ...typography.smallBold, color: colors.text },
  editHint: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
});
