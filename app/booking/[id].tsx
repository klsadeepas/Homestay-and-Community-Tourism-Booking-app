import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StarRating } from '@/components/ui/StarRating';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function BookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, listings, villages, transport, pickups, arrivals, reviews,
    updateBooking, addNotification, addPickup, updatePickup, upsertArrival, addReview } = useData();
  const { user, users } = useAuth();
  const { showAlert } = useAlert();
  const { t, currency } = useSettings();

  const booking = bookings.find((b) => b.id === id);
  if (!booking) return <Screen back title="Booking"><Text style={{ padding: 20 }}>Not found.</Text></Screen>;
  const listing = listings.find((l) => l.id === booking.listingId);
  const village = villages.find((v) => v.id === listing?.villageId);
  const owner = users.find((u) => u.id === listing?.ownerId);
  const traveler = users.find((u) => u.id === booking.travelerId);
  const arrival = arrivals.find((a) => a.bookingId === booking.id);
  const myPickups = pickups.filter((p) => p.bookingId === booking.id);
  const villageTransport = transport.filter((tr) => tr.villageId === listing?.villageId);
  const existingReview = reviews.find((r) => r.bookingId === booking.id);

  const canSeeDetails = user?.id === booking.travelerId || user?.id === listing?.ownerId;

  // Arrival state
  const [eta, setEta] = useState(arrival?.travelerEta || '');
  const [method, setMethod] = useState(arrival?.travelerMethod || '');
  const [arrNote, setArrNote] = useState(arrival?.travelerNote || '');
  const [hostWindow, setHostWindow] = useState(arrival?.hostCheckInWindow || '');
  const [hostInstr, setHostInstr] = useState(arrival?.hostInstructions || '');
  const [hostMeet, setHostMeet] = useState(arrival?.hostMeetingPoint || '');

  // Pickup state
  const [pFrom, setPFrom] = useState('');
  const [pWhen, setPWhen] = useState('');
  const [pPassengers, setPPassengers] = useState('2');
  const [pAccess, setPAccess] = useState('');
  const [pNote, setPNote] = useState('');

  // Review state
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const toneByStatus: any = { pending: 'warning', confirmed: 'success', declined: 'danger', cancelled: 'muted', completed: 'info' };
  const payTone: any = { paid: 'success', processing: 'warning', failed: 'danger', unpaid: 'muted', refund_pending: 'warning', refunded: 'info' };

  const cancelBooking = () => {
    showAlert('Cancel booking?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: async () => {
        await updateBooking(booking.id, { status: 'cancelled', paymentStatus: booking.paymentStatus === 'paid' ? 'refund_pending' : booking.paymentStatus });
        const otherId = user?.id === booking.travelerId ? listing?.ownerId : booking.travelerId;
        if (otherId) await addNotification({ id: `n-${Date.now()}`, userId: otherId, title: 'Booking cancelled', body: `${listing?.title} booking cancelled.`, read: false, createdAt: new Date().toISOString(), type: 'booking' });
      }},
    ]);
  };

  const saveTravelerArrival = async () => {
    await upsertArrival(booking.id, { travelerEta: eta, travelerMethod: method, travelerNote: arrNote, travelerUpdatedAt: new Date().toISOString() });
    if (listing?.ownerId) await addNotification({ id: `n-${Date.now()}`, userId: listing.ownerId, title: 'Arrival details updated', body: `${traveler?.name} shared estimated arrival.`, read: false, createdAt: new Date().toISOString(), type: 'arrival', link: `/booking/${booking.id}` });
    showAlert('Shared', 'Host has been notified. This is an estimate — not a booking change.');
  };
  const saveHostArrival = async () => {
    await upsertArrival(booking.id, { hostCheckInWindow: hostWindow, hostInstructions: hostInstr, hostMeetingPoint: hostMeet, hostUpdatedAt: new Date().toISOString(), acknowledged: true });
    await addNotification({ id: `n-${Date.now()}`, userId: booking.travelerId, title: 'Check-in instructions updated', body: `${owner?.name} confirmed check-in details.`, read: false, createdAt: new Date().toISOString(), type: 'arrival', link: `/booking/${booking.id}` });
    showAlert('Saved', 'Traveler notified of the check-in details.');
  };

  const submitPickup = async () => {
    if (!pFrom.trim() || !pWhen.trim()) { showAlert('Missing details', 'Pickup location and date/time are required.'); return; }
    const req = {
      id: `pk-${Date.now()}`,
      bookingId: booking.id,
      travelerId: user!.id,
      pickupFrom: pFrom.trim(),
      dateTime: pWhen.trim(),
      passengers: Math.max(1, Number(pPassengers) || 1),
      accessibility: pAccess || undefined,
      note: pNote || undefined,
      status: 'requested' as const,
      createdAt: new Date().toISOString(),
    };
    await addPickup(req);
    if (listing?.ownerId) await addNotification({ id: `n-${Date.now()}`, userId: listing.ownerId, title: 'Pickup requested', body: `${traveler?.name} asked for a pickup for ${listing.title}.`, read: false, createdAt: new Date().toISOString(), type: 'pickup', link: `/booking/${booking.id}` });
    setPFrom(''); setPWhen(''); setPPassengers('2'); setPAccess(''); setPNote('');
    showAlert('Pickup requested', 'Demo flow — no driver has been dispatched. The host or guide will respond in-app.');
  };

  const respondPickup = (pkId: string, status: 'accepted' | 'declined') => {
    showAlert(status === 'accepted' ? 'Accept pickup?' : 'Decline pickup?', '', [
      { text: t('cancel'), style: 'cancel' },
      { text: status === 'accepted' ? t('accept') : t('decline'), onPress: async () => {
        await updatePickup(pkId, { status, responderId: user!.id, response: status === 'accepted' ? 'We will coordinate on-site.' : 'Not able to arrange this time.' });
        await addNotification({ id: `n-${Date.now()}`, userId: booking.travelerId, title: `Pickup ${status}`, body: `Your pickup request was ${status}.`, read: false, createdAt: new Date().toISOString(), type: 'pickup', link: `/booking/${booking.id}` });
      }},
    ]);
  };

  const cancelPickup = (pkId: string) => {
    showAlert('Cancel pickup?', '', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Cancel pickup', style: 'destructive', onPress: () => updatePickup(pkId, { status: 'cancelled' }) },
    ]);
  };

  const postReview = async () => {
    if (!reviewText.trim()) { showAlert('Write something', 'Please add some text.'); return; }
    if (existingReview) { showAlert('Already reviewed', 'You have already left a review for this booking.'); return; }
    if (booking.status !== 'completed') { showAlert('Not eligible', 'Reviews are available after a booking is marked completed.'); return; }
    await addReview({ id: `r-${Date.now()}`, listingId: listing!.id, travelerId: user!.id, bookingId: booking.id, rating: stars, text: reviewText.trim(), createdAt: new Date().toISOString() });
    setReviewText('');
    showAlert('Thanks', 'Your review has been posted.');
  };

  return (
    <Screen back title="Booking">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <SmartImage uri={listing?.photo} style={styles.hero} fallbackIcon="hotel" />
        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{listing?.title}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Badge label={booking.status} tone={toneByStatus[booking.status]} />
              {booking.paymentStatus ? <Badge label={booking.paymentStatus.replace('_',' ')} tone={payTone[booking.paymentStatus] || 'muted'} /> : null}
            </View>
          </View>
          <Text style={styles.sub}>{village?.name} · {village?.region}</Text>

          <View style={styles.card}>
            <Row icon="calendar-today" label="Dates" value={`${booking.dateFrom}${booking.dateFrom !== booking.dateTo ? ` → ${booking.dateTo}` : ''}`} />
            <Row icon="group" label="Guests" value={`${booking.guests}`} />
            <Row icon="person" label="Traveler" value={canSeeDetails ? (traveler?.name || '—') : 'Private'} />
            <Row icon="support-agent" label="Host" value={owner?.name || '—'} />
            <Row icon="payments" label="Total" value={formatPrice(booking.totalLKR, currency)} />
            {booking.dietaryRequest && canSeeDetails ? <Row icon="restaurant" label="Dietary" value={booking.dietaryRequest} /> : null}
            {booking.accessibilityRequest && canSeeDetails ? <Row icon="accessible" label="Access needs" value={booking.accessibilityRequest} /> : null}
          </View>

          {booking.note && canSeeDetails ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Note from traveler</Text>
              <Text style={styles.noteText}>{booking.note}</Text>
            </View>
          ) : null}

          {/* Payment */}
          {canSeeDetails ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('paymentStatus')}</Text>
              <Text style={styles.sectionBody}>{(booking.paymentStatus || 'unpaid').replace('_',' ')}{booking.paymentRef ? ` · Ref ${booking.paymentRef}` : ''}</Text>
              {booking.paidAt ? <Text style={styles.caption}>Paid {new Date(booking.paidAt).toLocaleString()}</Text> : null}
              <Text style={styles.caption}>Payment integration is not connected in this demo. Only clearly labeled demo flows are available.</Text>
              {user?.id === booking.travelerId && (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed') ? (
                <Button title={t('payNow')} onPress={() => router.push({ pathname: '/pay/[id]', params: { id: booking.id } })} style={{ marginTop: spacing.sm }} />
              ) : null}
              {booking.paymentStatus === 'paid' ? (
                <View style={styles.receiptBox}>
                  <Text style={styles.receiptTitle}>Demo receipt</Text>
                  <Text style={styles.receiptLine}>Booking: {booking.id}</Text>
                  <Text style={styles.receiptLine}>Amount: {formatPrice(booking.totalLKR, 'LKR')} (stored). Displayed: {formatPrice(booking.totalLKR, currency)}</Text>
                  <Text style={styles.receiptLine}>Method: {booking.paymentMethod || 'card_demo'}</Text>
                  <Text style={styles.receiptLine}>Reference: {booking.paymentRef || '—'}</Text>
                  <Text style={styles.caption}>Demo reference. Real receipts require a configured provider.</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Arrival (homestay confirmed) */}
          {listing?.type === 'homestay' && (booking.status === 'confirmed' || booking.status === 'completed') && canSeeDetails ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('arrivalDetails')}</Text>
              {arrival?.hostCheckInWindow || arrival?.hostInstructions ? (
                <>
                  <Text style={styles.sectionBody}>Window: {arrival?.hostCheckInWindow || '—'}</Text>
                  <Text style={styles.sectionBody}>Meeting point: {arrival?.hostMeetingPoint || '—'}</Text>
                  <Text style={styles.sectionBody}>Instructions: {arrival?.hostInstructions || '—'}</Text>
                  <Text style={styles.caption}>Updated {arrival?.hostUpdatedAt ? new Date(arrival.hostUpdatedAt).toLocaleString() : '—'}</Text>
                </>
              ) : <Text style={styles.caption}>Host has not shared check-in instructions yet.</Text>}

              {user?.id === booking.travelerId ? (
                <>
                  <Text style={styles.subheading}>Share your estimated arrival</Text>
                  <Input label="Estimated arrival (date & time)" value={eta} onChangeText={setEta} placeholder="e.g. 2026-10-10 15:30" />
                  <Input label="Arrival method" value={method} onChangeText={setMethod} placeholder="e.g. Train from Kandy" />
                  <Input label="Note (optional)" value={arrNote} onChangeText={setArrNote} multiline numberOfLines={2} style={{ minHeight: 60, textAlignVertical: 'top' }} />
                  <Button title="Share arrival" onPress={saveTravelerArrival} />
                  <Text style={styles.caption}>This is an estimate. Not a booking change, payment, or pickup reservation.</Text>
                </>
              ) : null}

              {user?.id === listing?.ownerId ? (
                <>
                  <Text style={styles.subheading}>Confirm check-in instructions</Text>
                  <Input label="Check-in window" value={hostWindow} onChangeText={setHostWindow} placeholder="e.g. 2 PM – 7 PM" />
                  <Input label="Meeting point" value={hostMeet} onChangeText={setHostMeet} placeholder="Where to meet or who to call" />
                  <Input label="Instructions" value={hostInstr} onChangeText={setHostInstr} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
                  <Button title="Save & confirm" onPress={saveHostArrival} />
                  {arrival?.travelerEta ? (
                    <View style={styles.etaBox}>
                      <Text style={styles.sectionBody}>Traveler ETA: {arrival.travelerEta}</Text>
                      {arrival.travelerMethod ? <Text style={styles.sectionBody}>Method: {arrival.travelerMethod}</Text> : null}
                      {arrival.travelerNote ? <Text style={styles.sectionBody}>Note: {arrival.travelerNote}</Text> : null}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {/* Pickup */}
          {(booking.status === 'confirmed' || booking.status === 'completed') && canSeeDetails ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('pickup')}</Text>
              {myPickups.map((p) => (
                <View key={p.id} style={styles.pickupRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionBody}>{p.pickupFrom} → {listing?.title}</Text>
                    <Text style={styles.caption}>{p.dateTime} · {p.passengers} passenger{p.passengers > 1 ? 's' : ''}{p.accessibility ? ` · ${p.accessibility}` : ''}</Text>
                    {p.response ? <Text style={styles.caption}>Response: {p.response}</Text> : null}
                  </View>
                  <Badge label={p.status} tone={p.status === 'accepted' ? 'success' : p.status === 'declined' || p.status === 'cancelled' ? 'danger' : 'warning'} />
                </View>
              ))}
              {myPickups.map((p) => (
                user?.id === listing?.ownerId && p.status === 'requested' ? (
                  <View key={`actions-${p.id}`} style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                    <Button title={t('decline')} variant="ghost" onPress={() => respondPickup(p.id, 'declined')} />
                    <Button title={t('accept')} onPress={() => respondPickup(p.id, 'accepted')} />
                  </View>
                ) : user?.id === booking.travelerId && (p.status === 'requested' || p.status === 'accepted') ? (
                  <Button key={`actions-${p.id}`} title={p.status === 'accepted' ? 'Cancel accepted pickup' : 'Cancel request'} variant="ghost" onPress={() => cancelPickup(p.id)} />
                ) : null
              ))}

              {user?.id === booking.travelerId ? (
                <>
                  <Text style={styles.subheading}>Request a pickup</Text>
                  <Input label="Pickup from" value={pFrom} onChangeText={setPFrom} placeholder="Train station, airport, address" />
                  <Input label="Date & time" value={pWhen} onChangeText={setPWhen} placeholder="e.g. 2026-10-10 15:00" />
                  <Input label="Passengers" value={pPassengers} onChangeText={setPPassengers} keyboardType="numeric" />
                  <Input label="Accessibility needs" value={pAccess} onChangeText={setPAccess} />
                  <Input label="Note (optional)" value={pNote} onChangeText={setPNote} multiline numberOfLines={2} style={{ minHeight: 60, textAlignVertical: 'top' }} />
                  <Button title={t('requestPickup')} onPress={submitPickup} />
                  <Text style={styles.caption}>Demo flow — no vehicle is reserved and no driver is dispatched. The host/guide will respond in-app.</Text>
                </>
              ) : null}

              <Text style={styles.subheading}>Nearby transport info</Text>
              {villageTransport.length === 0 ? <Text style={styles.caption}>No transport entries available for this village in this demo.</Text> : villageTransport.map((tr) => (
                <View key={tr.id} style={styles.transportRow}>
                  <MaterialIcons name="directions-bus" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionBody}>{tr.name} <Text style={styles.caption}>({tr.mode})</Text></Text>
                    <Text style={styles.caption}>{tr.availability} · {tr.operatingArea}</Text>
                    {tr.estFareLKR ? <Text style={styles.caption}>Est. fare: {formatPrice(tr.estFareLKR, currency)} — demo estimate.</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Review after completed */}
          {user?.id === booking.travelerId && booking.status === 'completed' ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('writeReview')}</Text>
              {existingReview ? (
                <>
                  <StarRating value={existingReview.rating} readOnly />
                  <Text style={styles.sectionBody}>{existingReview.text}</Text>
                  <Text style={styles.caption}>You have already reviewed this booking.</Text>
                </>
              ) : (
                <>
                  <StarRating value={stars} onChange={setStars} />
                  <Input placeholder="Share your experience" value={reviewText} onChangeText={setReviewText} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} containerStyle={{ marginTop: spacing.sm }} />
                  <Button title="Post review" onPress={postReview} />
                  <Text style={styles.caption}>One review per completed booking. Local reviews are not externally verified.</Text>
                </>
              )}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title="Message" variant="secondary" onPress={() => router.push('/messages')} />
            {booking.status === 'pending' || booking.status === 'confirmed' ? (
              <Button title="Cancel booking" variant="danger" onPress={cancelBooking} />
            ) : null}
          </View>

          <Text style={styles.hint}>Transactions settle in LKR. Payment, map, exchange-rate, pickup, and notification integrations are not connected in this demo.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <MaterialIcons name={icon} size={18} color={colors.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 200 },
  body: { padding: spacing.lg, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h2, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 6, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  rowLabel: { ...typography.small, color: colors.textMuted, flex: 1 },
  rowValue: { ...typography.smallBold, color: colors.text },
  noteBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  noteLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  noteText: { ...typography.body, color: colors.text, marginTop: 4 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },
  subheading: { ...typography.smallBold, color: colors.text, marginTop: spacing.md },
  sectionBody: { ...typography.small, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  receiptBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, gap: 2, marginTop: spacing.sm },
  receiptTitle: { ...typography.smallBold, color: colors.text },
  receiptLine: { ...typography.caption, color: colors.text },
  etaBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' },
  hint: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center' },
});
