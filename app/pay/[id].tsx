import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice, paymentReference, convertedNote } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Method = 'card_demo' | 'local_wallet_demo' | 'cash_on_arrival';

export default function Pay() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, listings, updateBooking, addNotification } = useData();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t, currency } = useSettings();
  const [method, setMethod] = useState<Method>('card_demo');
  const [simulating, setSimulating] = useState(false);
  const [outcome, setOutcome] = useState<'success' | 'fail'>('success');

  const booking = bookings.find((b) => b.id === id);
  if (!booking) return <Screen back title="Pay"><Text style={{ padding: 20 }}>Booking not found.</Text></Screen>;
  const listing = listings.find((l) => l.id === booking.listingId);
  if (booking.travelerId !== user?.id) return <Screen back title="Pay"><Text style={{ padding: 20 }}>Only the traveler can pay for this booking.</Text></Screen>;

  const paying = async () => {
    setSimulating(true);
    await updateBooking(booking.id, { paymentStatus: 'processing' });
    setTimeout(async () => {
      if (outcome === 'success') {
        const ref = paymentReference();
        await updateBooking(booking.id, { paymentStatus: 'paid', paymentMethod: method, paymentRef: ref, paidAt: new Date().toISOString() });
        await addNotification({ id: `n-${Date.now()}`, userId: listing!.ownerId, title: 'Payment received', body: `${listing?.title} paid in demo. Ref ${ref}.`, read: false, createdAt: new Date().toISOString(), type: 'payment', link: `/booking/${booking.id}` });
        await addNotification({ id: `n-${Date.now() + 1}`, userId: booking.travelerId, title: 'Payment successful', body: `Your demo payment for ${listing?.title} succeeded.`, read: false, createdAt: new Date().toISOString(), type: 'payment', link: `/booking/${booking.id}` });
        setSimulating(false);
        showAlert('Payment demo succeeded', 'This is a demo. No real transaction was made.', [
          { text: 'View receipt', onPress: () => router.replace({ pathname: '/booking/[id]', params: { id: booking.id } }) },
        ]);
      } else {
        await updateBooking(booking.id, { paymentStatus: 'failed' });
        setSimulating(false);
        showAlert('Payment demo failed', 'The booking remains unpaid. Try again or choose a different method.');
      }
    }, 1200);
  };

  return (
    <Screen back title="Payment (demo)">
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{listing?.title}</Text>
          <Text style={styles.summarySub}>{booking.dateFrom}{booking.dateFrom !== booking.dateTo ? ` → ${booking.dateTo}` : ''} · {booking.guests} guest{booking.guests > 1 ? 's' : ''}</Text>
          <Text style={styles.total}>Total: {formatPrice(booking.totalLKR, currency)}</Text>
          {convertedNote(currency) ? <Text style={styles.caption}>{convertedNote(currency)}</Text> : null}
        </View>

        <View style={styles.notice}>
          <MaterialIcons name="info" size={18} color={colors.warning} />
          <Text style={styles.noticeText}>Payment provider is not connected in this demo. Choose a labeled demo flow below. No card numbers are collected and no real charges will occur.</Text>
        </View>

        <Text style={styles.label}>Choose payment method</Text>
        <View style={styles.chipRow}>
          <Chip label="Card (demo)" icon="credit-card" selected={method === 'card_demo'} onPress={() => setMethod('card_demo')} />
          <Chip label="Local wallet (demo)" icon="account-balance-wallet" selected={method === 'local_wallet_demo'} onPress={() => setMethod('local_wallet_demo')} />
          <Chip label="Cash on arrival" icon="payments" selected={method === 'cash_on_arrival'} onPress={() => setMethod('cash_on_arrival')} />
        </View>
        <Text style={styles.caption}>Only payment methods the configured provider supports should appear here in production.</Text>

        <Text style={styles.label}>Simulated outcome</Text>
        <View style={styles.chipRow}>
          <Chip label="Succeed" selected={outcome === 'success'} onPress={() => setOutcome('success')} />
          <Chip label="Fail" selected={outcome === 'fail'} onPress={() => setOutcome('fail')} />
        </View>

        <Text style={styles.terms}>
          Cancellation terms: free cancellation up to 48 hours before the first date; later cancellations may incur fees per the host policy. Refunds are shown as "refund pending" until confirmed by the (currently unconfigured) payment provider.
        </Text>

        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          <Button title={simulating ? 'Processing…' : `${t('pay')} ${formatPrice(booking.totalLKR, currency)}`} onPress={paying} loading={simulating} />
        </View>

        <Text style={styles.footer}>Demo receipts and references are clearly labeled on the booking. Full card data is never collected or stored.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 4 },
  summaryTitle: { ...typography.h3, color: colors.text },
  summarySub: { ...typography.small, color: colors.textMuted },
  total: { ...typography.h2, color: colors.primary, marginTop: spacing.sm },
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  notice: { flexDirection: 'row', gap: spacing.sm, backgroundColor: '#FEF3C7', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  noticeText: { ...typography.small, color: colors.warning, flex: 1 },
  label: { ...typography.smallBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  terms: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end', marginTop: spacing.lg },
  footer: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.lg },
});
