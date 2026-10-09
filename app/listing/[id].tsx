import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { StarRating } from '@/components/ui/StarRating';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { formatPrice } from '@/services/currency';
import { Booking, ScheduleSlot, TOUR_CATEGORIES, TourCategory, Listing } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

const EXPERIENCE_CATEGORIES = ['meal', 'cooking', 'workshop', 'farm', 'craft'] as const;

const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const todayStr = () => dateStr(new Date());
const addDays = (base: string, n: number) => dateStr(new Date(new Date(base).getTime() + n * 86400000));
const nightsBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ListingDetail() {
  const router = useRouter();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const {
    listings, villages, bookings, reviews, wishlist, toggleWishlist,
    addBooking, addNotification, updateListing, deleteListing, updateReview, addReport,
  } = useData();
  const { user, users } = useAuth();
  const { t, currency } = useSettings();
  const { showAlert } = useAlert();

  const listing = listings.find((l) => l.id === id);
  const isStaff = user?.role === 'admin' || user?.role === 'coordinator';
  const isOwner = !!user && !!listing && listing.ownerId === user.id;
  const canManage = isOwner || isStaff;
  const canView = !!listing && (isStaff || isOwner || listing.status === 'approved');
  const isHomestay = listing?.type === 'homestay';

  // Booking form state
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(addDays(todayStr(), 1));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [note, setNote] = useState('');
  const [slotId, setSlotId] = useState<string | null>(null);

  // Review interaction state
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Edit mode state
  const [editing, setEditing] = useState(edit === '1');
  const [eTitle, setETitle] = useState(listing?.title || '');
  const [eDesc, setEDesc] = useState(listing?.description || '');
  const [ePhoto, setEPhoto] = useState(listing?.photo || '');
  const [ePrice, setEPrice] = useState(String(listing?.pricePerUnitLKR ?? ''));
  const [eCapacity, setECapacity] = useState(String(listing?.capacity ?? ''));
  const [eRooms, setERooms] = useState(String(listing?.rooms ?? ''));
  const [eDuration, setEDuration] = useState(listing?.duration || '');
  const [eMeeting, setEMeeting] = useState(listing?.meetingPoint || '');
  const [eAmenities, setEAmenities] = useState((listing?.amenities || []).join(', '));
  const [eActivities, setEActivities] = useState((listing?.activities || []).join(', '));
  const [eIncluded, setEIncluded] = useState((listing?.included || []).join(', '));
  const [eExcluded, setEExcluded] = useState((listing?.excluded || []).join(', '));
  const [eRules, setERules] = useState((listing?.rules || []).join(', '));
  const [eBlocked, setEBlocked] = useState((listing?.blockedDates || []).join(', '));
  const [eTourCat, setETourCat] = useState<TourCategory | ''>(listing?.tourCategory || '');
  const [eExpCat, setEExpCat] = useState(listing?.experienceCategory || '');
  const [eSlots, setESlots] = useState<ScheduleSlot[]>(listing?.scheduleSlots || []);
  const [slotDate, setSlotDate] = useState(todayStr());
  const [slotTime, setSlotTime] = useState('09:00');
  const [slotCap, setSlotCap] = useState('10');

  if (!listing || !canView) {
    return (
      <Screen back title="Listing">
        <EmptyState icon="visibility-off" title="Not available" message="This listing does not exist or is not visible to your account." />
      </Screen>
    );
  }

  const village = villages.find((v) => v.id === listing.villageId);
  const host = users.find((u) => u.id === listing.ownerId);
  const saved = wishlist.includes(listing.id);

  const bookedGuestsOn = (date: string) =>
    bookings
      .filter((b) => b.listingId === listing.id && b.dateFrom === date && (b.status === 'pending' || b.status === 'confirmed'))
      .reduce((s, b) => s + b.guests, 0);

  const slotRemaining = (s: ScheduleSlot) => Math.max(0, s.capacity - bookedGuestsOn(s.date));

  const upcomingSlots = (listing.scheduleSlots || [])
    .filter((s) => s.date >= todayStr())
    .sort((a, b) => a.date.localeCompare(b.date));

  const visibleReviews = reviews
    .filter((r) => r.listingId === listing.id && (isStaff || !r.hidden))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const nights = isHomestay ? Math.max(0, nightsBetween(dateFrom, dateTo)) : 0;
  const totalLKR = isHomestay
    ? nights * listing.pricePerUnitLKR
    : guests * listing.pricePerUnitLKR;

  const submitBooking = async () => {
    if (!user) { showAlert('Sign in', 'Please sign in to book.'); return; }
    if (user.role !== 'traveler') { showAlert('Traveler account required', 'Only traveler accounts can make bookings.'); return; }
    if (!dateFrom) { showAlert('Pick a date', 'A start date is required.'); return; }
    if (isHomestay) {
      if (nights < 1) { showAlert('Check dates', 'Check-out must be after check-in.'); return; }
      const blocked = listing.blockedDates || [];
      for (let i = 0; i < nights; i++) {
        const d = addDays(dateFrom, i);
        if (blocked.includes(d)) { showAlert('Unavailable', `${listing.title} is not available on ${fmtDate(d)}.`); return; }
      }
      if (guests > listing.capacity) { showAlert('Too many guests', `Maximum capacity is ${listing.capacity}.`); return; }
    } else {
      if ((listing.blockedDates || []).includes(dateFrom)) { showAlert('Unavailable', `${listing.title} is not available on ${fmtDate(dateFrom)}.`); return; }
      const slot = slotId ? (listing.scheduleSlots || []).find((s) => s.id === slotId) : undefined;
      const cap = slot ? slot.capacity : listing.capacity;
      const already = bookedGuestsOn(dateFrom);
      if (guests > cap) { showAlert('Too many guests', `Maximum ${cap} per departure.`); return; }
      if (slot && already + guests > slot.capacity) { showAlert('Departure nearly full', `Only ${slotRemaining(slot)} spot(s) left on ${fmtDate(slot.date)}.`); return; }
      if (!slot && already + guests > listing.capacity) { showAlert('Nearly full', `Only ${Math.max(0, listing.capacity - already)} spot(s) left on ${fmtDate(dateFrom)}.`); return; }
    }
    const instant = !!listing.instantBooking;
    const booking: Booking = {
      id: `b-${Date.now()}`,
      listingId: listing.id,
      travelerId: user.id,
      dateFrom,
      dateTo: isHomestay ? dateTo : dateFrom,
      guests,
      rooms: isHomestay ? rooms : undefined,
      totalLKR,
      status: instant ? 'confirmed' : 'pending',
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      paymentStatus: 'unpaid',
      instantConfirmed: instant || undefined,
    };
    await addBooking(booking);
    await addNotification({
      id: `n-${Date.now()}`,
      userId: listing.ownerId,
      title: instant ? 'Instant booking confirmed' : 'New booking request',
      body: `${user.name} booked ${listing.title} (${fmtDate(dateFrom)}${isHomestay && dateTo !== dateFrom ? ` → ${fmtDate(dateTo)}` : ''}, ${guests} guest${guests > 1 ? 's' : ''}).`,
      read: false,
      createdAt: new Date().toISOString(),
      type: 'booking',
      link: `/booking/${booking.id}`,
    });
    router.push({ pathname: '/booking/[id]', params: { id: booking.id } });
  };

  const saveReply = async (reviewId: string) => {
    if (!replyText.trim()) { showAlert('Empty reply', 'Please write a response.'); return; }
    await updateReview(reviewId, { hostReply: { text: replyText.trim(), authorId: user!.id, createdAt: new Date().toISOString() } });
    setReplyFor(null);
    setReplyText('');
    showAlert('Reply posted', 'Your response is now visible on the review.');
  };

  const submitReport = async (reviewId: string) => {
    if (!reportReason.trim()) { showAlert('Add a reason', 'Please tell us what is wrong with this review.'); return; }
    await addReport({ id: `rep-${Date.now()}`, reporterId: user!.id, targetType: 'review', targetId: reviewId, reason: reportReason.trim(), status: 'open', createdAt: new Date().toISOString() });
    setReportFor(null);
    setReportReason('');
    showAlert('Reported', 'Our team will review this. Thank you.');
  };

  // ---------- Edit mode ----------
  const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const saveEdit = async () => {
    const price = Number(ePrice);
    const capacity = Number(eCapacity);
    if (!eTitle.trim() || !eDesc.trim()) { showAlert('Missing details', 'Title and description are required.'); return; }
    if (!price || price <= 0) { showAlert('Invalid price', 'Enter a price greater than zero.'); return; }
    if (!capacity || capacity <= 0) { showAlert('Invalid capacity', 'Enter a capacity greater than zero.'); return; }
    const patch: Partial<Listing> = {
      title: eTitle.trim(),
      description: eDesc.trim(),
      photo: ePhoto.trim() || listing.photo,
      pricePerUnitLKR: price,
      capacity,
      duration: eDuration.trim() || undefined,
      meetingPoint: eMeeting.trim() || undefined,
      amenities: parseList(eAmenities),
      activities: parseList(eActivities),
      included: parseList(eIncluded),
      excluded: parseList(eExcluded),
      rules: parseList(eRules),
      blockedDates: parseList(eBlocked),
      scheduleSlots: eSlots,
    };
    if (listing.type === 'tour') patch.tourCategory = (eTourCat || 'general') as TourCategory;
    if (listing.type === 'experience') patch.experienceCategory = (eExpCat || 'workshop') as Listing['experienceCategory'];
    if (listing.type === 'homestay') {
      const r = Number(eRooms);
      patch.rooms = r > 0 ? r : undefined;
      delete patch.meetingPoint;
    }
    await updateListing(listing.id, patch);
    showAlert('Saved', 'Listing details updated.');
  };

  const addSlot = () => {
    const cap = Number(slotCap);
    if (!slotDate || !slotTime || !cap || cap <= 0) { showAlert('Invalid slot', 'Date, time and capacity are required.'); return; }
    setESlots([...eSlots, { id: `ss-${Date.now()}`, date: slotDate, time: slotTime, capacity: cap }]);
  };

  const submitForReview = () => {
    showAlert('Submit for review?', 'Coordinators will review this listing before it goes live.', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Submit', onPress: async () => { await updateListing(listing.id, { status: 'submitted', reviewReason: undefined }); setEditing(false); } },
    ]);
  };

  const removeListing = () => {
    showAlert('Delete listing?', 'This cannot be undone.', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteListing(listing.id); router.back(); } },
    ]);
  };

  const statusTone: any = { draft: 'muted', submitted: 'warning', under_review: 'info', approved: 'success', needs_changes: 'warning', suspended: 'danger' };

  const headerRight = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {user?.role === 'traveler' ? (
        <Pressable onPress={() => toggleWishlist(listing.id)} hitSlop={8} accessibilityLabel="Save">
          <MaterialIcons name={saved ? 'favorite' : 'favorite-border'} size={24} color={saved ? colors.danger : colors.text} />
        </Pressable>
      ) : null}
      {canManage ? (
        <Pressable onPress={() => setEditing(!editing)} hitSlop={8} accessibilityLabel="Toggle edit">
          <MaterialIcons name={editing ? 'visibility' : 'edit'} size={22} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );

  if (editing && canManage) {
    return (
      <Screen back title={`Edit — ${listing.title}`} right={headerRight}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }} keyboardShouldPersistTaps="handled">
          <Input label="Title" value={eTitle} onChangeText={setETitle} />
          <Input label="Description" value={eDesc} onChangeText={setEDesc} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} />
          <Input label="Photo URL" value={ePhoto} onChangeText={setEPhoto} autoCapitalize="none" />
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}><Input label="Price (LKR)" value={ePrice} onChangeText={setEPrice} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Input label="Capacity" value={eCapacity} onChangeText={setECapacity} keyboardType="numeric" /></View>
          </View>
          {isHomestay ? (
            <Input label="Rooms" value={eRooms} onChangeText={setERooms} keyboardType="numeric" />
          ) : (
            <>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}><Input label="Duration" value={eDuration} onChangeText={setEDuration} placeholder="e.g. 3 hours" /></View>
                <View style={{ flex: 1 }}><Input label="Meeting point" value={eMeeting} onChangeText={setEMeeting} /></View>
              </View>
              {listing.type === 'tour' ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Tour category</Text>
                  <View style={styles.chipRow}>
                    {TOUR_CATEGORIES.map((c) => (
                      <Chip key={c} label={c} selected={eTourCat === c} onPress={() => setETourCat(c)} />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Experience category</Text>
                  <View style={styles.chipRow}>
                    {EXPERIENCE_CATEGORIES.map((c) => (
                      <Chip key={c} label={c} selected={eExpCat === c} onPress={() => setEExpCat(c)} />
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Schedule slots (upcoming departures)</Text>
                {eSlots.map((s) => (
                  <View key={s.id} style={styles.slotRow}>
                    <MaterialIcons name="event" size={16} color={colors.primary} />
                    <Text style={styles.slotText}>{fmtDate(s.date)} · {s.time} · {s.capacity} seats</Text>
                    <Pressable onPress={() => setESlots(eSlots.filter((x) => x.id !== s.id))} hitSlop={6}>
                      <MaterialIcons name="close" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}><Input label="Date" value={slotDate} onChangeText={setSlotDate} placeholder="YYYY-MM-DD" autoCapitalize="none" /></View>
                  <View style={{ flex: 1 }}><Input label="Time" value={slotTime} onChangeText={setSlotTime} placeholder="HH:MM" autoCapitalize="none" /></View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}><Input label="Seats" value={slotCap} onChangeText={setSlotCap} keyboardType="numeric" /></View>
                  <Button title="Add slot" variant="secondary" onPress={addSlot} />
                </View>
              </View>
            </>
          )}
          <Input label={isHomestay ? 'Amenities (comma separated)' : 'Activities (comma separated)'} value={isHomestay ? eAmenities : eActivities} onChangeText={isHomestay ? setEAmenities : setEActivities} />
          <Input label="Included (comma separated)" value={eIncluded} onChangeText={setEIncluded} />
          <Input label="Excluded (comma separated)" value={eExcluded} onChangeText={setEExcluded} />
          {isHomestay ? <Input label="House rules (comma separated)" value={eRules} onChangeText={setERules} /> : null}
          <Input label="Blocked dates (comma separated YYYY-MM-DD)" value={eBlocked} onChangeText={setEBlocked} autoCapitalize="none" />
          <View style={styles.editActions}>
            <Button title="Save changes" onPress={saveEdit} />
            {listing.status === 'draft' || listing.status === 'needs_changes' ? <Button title={listing.status === 'needs_changes' ? 'Resubmit for review' : 'Submit for review'} variant="secondary" onPress={submitForReview} /> : null}
            <Button title="Preview" variant="secondary" onPress={() => setEditing(false)} />
            <Button title={t('delete')} variant="danger" onPress={removeListing} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ---------- View mode ----------
  return (
    <Screen back title={listing.title} right={headerRight}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <SmartImage uri={listing.photo} style={styles.hero} fallbackIcon={isHomestay ? 'hotel' : 'landscape'} />
        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <View style={styles.badgeRow}>
              <Badge label={listing.type} tone="muted" />
              {listing.tourCategory ? <Badge label={listing.tourCategory} tone="info" /> : null}
              {listing.status !== 'approved' || isStaff ? <Badge label={listing.status.replace('_', ' ')} tone={statusTone[listing.status] || 'muted'} /> : null}
              {listing.instantBooking ? <Badge label={t('instantBook')} tone="success" /> : null}
            </View>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.title}>{listing.title}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons name="place" size={14} color={colors.textMuted} />
            <Text style={styles.sub}>{village?.name}{village ? ` · ${village.region}` : ''}</Text>
          </View>
          <View style={styles.metaRow}>
            <StarRating value={Math.round(listing.rating)} readOnly size={16} />
            <Text style={styles.sub}>{listing.rating.toFixed(1)} · {listing.reviewCount} review{listing.reviewCount === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.priceLine}>
            {formatPrice(listing.pricePerUnitLKR, currency)}
            <Text style={styles.priceUnit}> {isHomestay ? `/ ${t('perNight')}` : '/ person'}</Text>
          </Text>

          {listing.reviewReason && (isOwner || isStaff) ? (
            <View style={styles.reasonBox}>
              <MaterialIcons name="info" size={14} color={colors.warning} />
              <Text style={styles.reasonText}>Review note: {listing.reviewReason}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bodyText}>{listing.description}</Text>

          {/* Facts */}
          <View style={styles.card}>
            {isHomestay ? (
              <>
                <Fact icon="king-bed" label="Rooms" value={String(listing.rooms || '—')} />
                <Fact icon="group" label="Sleeps" value={`${listing.capacity} guests`} />
              </>
            ) : (
              <>
                <Fact icon="schedule" label="Duration" value={listing.duration || '—'} />
                {listing.difficulty ? <Fact icon="terrain" label="Difficulty" value={listing.difficulty} /> : null}
                <Fact icon="group" label="Group size" value={`Up to ${listing.capacity}`} />
                {listing.meetingPoint ? <Fact icon="place" label="Meeting point" value={listing.meetingPoint} /> : null}
              </>
            )}
          </View>

          {isHomestay && listing.amenities?.length ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>{t('amenities')}</Text>
              <View style={styles.chipRow}>{listing.amenities.map((a) => <Chip key={a} label={a} />)}</View>
            </View>
          ) : null}
          {!isHomestay && listing.activities?.length ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>Activities</Text>
              <View style={styles.chipRow}>{listing.activities.map((a) => <Chip key={a} label={a} />)}</View>
            </View>
          ) : null}

          {listing.included?.length || listing.excluded?.length ? (
            <View style={styles.twoColCards}>
              {listing.included?.length ? (
                <View style={[styles.card, styles.halfCard]}>
                  <Text style={styles.cardTitle}>Included</Text>
                  {listing.included.map((x) => (
                    <View key={x} style={styles.bulletRow}>
                      <MaterialIcons name="check-circle" size={14} color={colors.success} />
                      <Text style={styles.bulletText}>{x}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {listing.excluded?.length ? (
                <View style={[styles.card, styles.halfCard]}>
                  <Text style={styles.cardTitle}>Not included</Text>
                  {listing.excluded.map((x) => (
                    <View key={x} style={styles.bulletRow}>
                      <MaterialIcons name="cancel" size={14} color={colors.danger} />
                      <Text style={styles.bulletText}>{x}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {listing.rules?.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>House rules</Text>
              {listing.rules.map((x) => (
                <View key={x} style={styles.bulletRow}>
                  <MaterialIcons name="info" size={14} color={colors.primary} />
                  <Text style={styles.bulletText}>{x}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Schedule slots */}
          {!isHomestay && upcomingSlots.length ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>Upcoming departures</Text>
              {upcomingSlots.map((s) => {
                const remaining = slotRemaining(s);
                const selected = slotId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => { setSlotId(selected ? null : s.id); setDateFrom(s.date); }}
                    style={[styles.slotCard, selected && styles.slotCardSelected]}
                  >
                    <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={18} color={selected ? colors.primary : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotText}>{fmtDate(s.date)} at {s.time}</Text>
                      <Text style={styles.caption}>{remaining} of {s.capacity} seats left</Text>
                    </View>
                    {remaining === 0 ? <Badge label="Full" tone="danger" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Community benefit */}
          {listing.benefit ? (
            <View style={styles.benefitBox}>
              <View style={styles.benefitHeader}>
                <MaterialIcons name="volunteer-activism" size={16} color={colors.primary} />
                <Text style={styles.benefitTitle}>{t('communityBenefit')}</Text>
              </View>
              <Text style={styles.benefitText}>
                {listing.benefit.beneficiary === 'host' ? 'Supports the host family.' :
                 listing.benefit.beneficiary === 'guide' ? 'Supports local guides.' :
                 listing.benefit.beneficiary === 'project' ? `Supports ${listing.benefit.projectName || 'a community project'}.` :
                 'Supports the local community.'}
                {listing.benefit.percentage ? ` ${listing.benefit.percentage}% of each booking.` : ''}
                {listing.benefit.amountLKR ? ` ${formatPrice(listing.benefit.amountLKR, currency)} per booking.` : ''}
              </Text>
              {listing.benefit.note ? <Text style={styles.caption}>{listing.benefit.note}</Text> : null}
            </View>
          ) : null}

          {/* Host / guide */}
          <View style={styles.card}>
            <View style={styles.hostRow}>
              <Avatar uri={host?.photo} name={host?.name} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{host?.name || 'Host'}</Text>
                <Text style={styles.sub}>{listing.type === 'homestay' ? t('owner') : t('guide')}{host?.village ? ` · ${host.village}` : ''}</Text>
                {host?.languagesSpoken?.length ? <Text style={styles.caption}>Speaks: {host.languagesSpoken.join(', ')}</Text> : null}
              </View>
            </View>
            {user?.id && user.id !== listing.ownerId ? (
              <Button title={`Message ${listing.type === 'homestay' ? 'host' : 'guide'}`} variant="secondary" onPress={() => router.push('/messages')} />
            ) : null}
          </View>

          {/* Reviews */}
          <View style={styles.fieldGroup}>
            <Text style={styles.sectionTitle}>{t('reviews')} ({visibleReviews.length})</Text>
            {visibleReviews.length === 0 ? (
              <EmptyState icon="rate-review" title="No reviews yet" message="Reviews appear after completed bookings." />
            ) : (
              visibleReviews.map((r) => {
                const author = users.find((u) => u.id === r.travelerId);
                const canReply = canManage && !r.hostReply;
                const isReporter = user?.role === 'traveler' && r.travelerId !== user.id;
                return (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Avatar uri={author?.photo} name={author?.name} size={32} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewAuthor}>{author?.name || 'Traveler'}</Text>
                        <Text style={styles.caption}>{fmtDate(r.createdAt.slice(0, 10))}</Text>
                      </View>
                      <StarRating value={r.rating} readOnly size={14} />
                    </View>
                    <Text style={styles.bodyText}>{r.text}</Text>
                    {r.hidden ? <Badge label="Hidden from public" tone="danger" /> : null}
                    {r.hostReply ? (
                      <View style={styles.replyBox}>
                        <Text style={styles.replyLabel}>Response from {users.find((u) => u.id === r.hostReply?.authorId)?.name || 'host'}</Text>
                        <Text style={styles.replyText}>{r.hostReply.text}</Text>
                      </View>
                    ) : null}
                    <View style={styles.reviewActions}>
                      {canReply ? (
                        <Pressable onPress={() => { setReplyFor(replyFor === r.id ? null : r.id); setReportFor(null); }} hitSlop={6}>
                          <Text style={styles.linkText}>{replyFor === r.id ? 'Cancel' : 'Respond'}</Text>
                        </Pressable>
                      ) : null}
                      {isReporter ? (
                        <Pressable onPress={() => { setReportFor(reportFor === r.id ? null : r.id); setReplyFor(null); }} hitSlop={6}>
                          <Text style={[styles.linkText, { color: colors.danger }]}>{reportFor === r.id ? 'Cancel' : 'Report'}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {replyFor === r.id ? (
                      <View style={styles.inlineForm}>
                        <Input placeholder="Write a public response" value={replyText} onChangeText={setReplyText} multiline numberOfLines={2} style={{ minHeight: 56, textAlignVertical: 'top' }} />
                        <Button title="Post response" onPress={() => saveReply(r.id)} />
                      </View>
                    ) : null}
                    {reportFor === r.id ? (
                      <View style={styles.inlineForm}>
                        <Input placeholder="Reason for reporting" value={reportReason} onChangeText={setReportReason} multiline numberOfLines={2} style={{ minHeight: 56, textAlignVertical: 'top' }} />
                        <Button title="Submit report" variant="danger" onPress={() => submitReport(r.id)} />
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          {/* Booking form (travelers, approved listings) */}
          {user?.role === 'traveler' && listing.status === 'approved' ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{listing.instantBooking ? t('bookInstant') : t('bookRequest')}</Text>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Input label={isHomestay ? 'Check-in' : 'Date'} value={dateFrom} onChangeText={(v) => { setDateFrom(v); setSlotId(null); }} placeholder="YYYY-MM-DD" autoCapitalize="none" />
                </View>
                {isHomestay ? (
                  <View style={{ flex: 1 }}>
                    <Input label="Check-out" value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" autoCapitalize="none" />
                  </View>
                ) : null}
              </View>
              <Stepper label={t('guests')} value={guests} onChange={setGuests} min={1} max={listing.capacity} />
              {isHomestay ? <Stepper label="Rooms" value={rooms} onChange={setRooms} min={1} max={Math.max(1, listing.rooms || 1)} /> : null}
              <Input label="Note to host (optional)" value={note} onChangeText={setNote} multiline numberOfLines={2} style={{ minHeight: 56, textAlignVertical: 'top' }} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{isHomestay && nights < 1 ? '—' : formatPrice(totalLKR, currency)}</Text>
              </View>
              {isHomestay ? <Text style={styles.caption}>{nights} night{nights === 1 ? '' : 's'} × {formatPrice(listing.pricePerUnitLKR, currency)}</Text> : <Text style={styles.caption}>{guests} guest{guests === 1 ? '' : 's'} × {formatPrice(listing.pricePerUnitLKR, currency)}</Text>}
              <Button title={listing.instantBooking ? t('book') : t('bookRequest')} onPress={submitBooking} />
              <Text style={styles.caption}>{listing.instantBooking ? 'This listing confirms instantly.' : 'The host will confirm your request.'} Payment is collected after confirmation.</Text>
            </View>
          ) : null}

          {!user ? (
            <Button title="Sign in to book" onPress={() => router.push('/(auth)/login')} />
          ) : null}

          <Text style={styles.hint}>Transactions settle in LKR. Payment, map, and notification integrations are not connected in this demo.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Fact({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <MaterialIcons name={icon} size={18} color={colors.primary} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220 },
  body: { padding: spacing.lg, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  title: { ...typography.h2, color: colors.text, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sub: { ...typography.small, color: colors.textMuted },
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  priceLine: { ...typography.h3, color: colors.primary, marginTop: 2 },
  priceUnit: { ...typography.small, color: colors.textMuted, fontWeight: '400' },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  bodyText: { ...typography.body, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, marginTop: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  twoColCards: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfCard: { flex: 1, marginTop: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fieldGroup: { marginTop: spacing.sm, gap: spacing.sm },
  fieldLabel: { ...typography.smallBold, color: colors.text },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulletText: { ...typography.small, color: colors.text, flex: 1 },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  factLabel: { ...typography.small, color: colors.textMuted, flex: 1 },
  factValue: { ...typography.smallBold, color: colors.text },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: spacing.sm, borderRadius: radius.md },
  reasonText: { ...typography.caption, color: colors.warning, flex: 1 },
  benefitBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md, gap: 4, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  benefitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitTitle: { ...typography.smallBold, color: colors.primary },
  benefitText: { ...typography.small, color: colors.text },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  slotCardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  slotText: { ...typography.smallBold, color: colors.text },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAuthor: { ...typography.smallBold, color: colors.text },
  replyBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  replyLabel: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  replyText: { ...typography.small, color: colors.text },
  reviewActions: { flexDirection: 'row', gap: spacing.lg },
  linkText: { ...typography.smallBold, color: colors.primary },
  inlineForm: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  totalLabel: { ...typography.bodyBold, color: colors.text },
  totalValue: { ...typography.h3, color: colors.primary },
  editActions: { gap: spacing.sm, marginTop: spacing.md },
  hint: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.md, textAlign: 'center' },
});
