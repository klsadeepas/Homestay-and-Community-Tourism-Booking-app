import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { formatPrice } from '@/services/currency';
import { Booking } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Filter = 'all' | NonNullable<Booking['paymentStatus']>;
const FILTERS: Filter[] = ['all', 'unpaid', 'processing', 'paid', 'failed', 'refund_pending', 'refunded'];
const METHODS: Record<string, string> = { card_demo: 'Card (demo)', local_wallet_demo: 'Local wallet (demo)', cash_on_arrival: 'Cash on arrival' };

export default function AdminPayments() {
  const router = useRouter();
  const { users, user } = useAuth();
  const { bookings, listings, platform, updateBooking, addAudit } = useData();
  const { currency } = useSettings();
  const { showAlert } = useAlert();
  const [filter, setFilter] = useState<Filter>('all');

  const sorted = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = filter === 'all' ? sorted : sorted.filter((b) => (b.paymentStatus || 'unpaid') === filter);
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const grossPaid = paidBookings.reduce((s, b) => s + b.totalLKR, 0);
  const feeEstimate = Math.round(grossPaid * (platform.serviceFeePct / 100));
  const refundPending = bookings.filter((b) => b.paymentStatus === 'refund_pending');
  const byMethod = (m: Booking['paymentMethod']) => paidBookings.filter((b) => b.paymentMethod === m);

  const listingOf = (id: string) => listings.find((l) => l.id === id);
  const travelerOf = (id: string) => users.find((u) => u.id === id);
  const payTone = (p?: Booking['paymentStatus']) =>
    p === 'paid' ? 'success' : p === 'refunded' ? 'muted' : p === 'failed' ? 'danger' : 'warning';

  const markPaid = (b: Booking) => {
    showAlert('Mark as paid?', `Records a demo payment of ${formatPrice(b.totalLKR, 'LKR')} for booking ${b.id}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark paid', onPress: async () => {
        await updateBooking(b.id, { paymentStatus: 'paid', paymentRef: `RS-DEMO-${Math.floor(1000 + Math.random() * 9000)}`, paidAt: new Date().toISOString() });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'mark_paid', target: b.id, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const markRefunded = (b: Booking) => {
    showAlert('Mark refunded?', `Booking ${b.id} will be marked as refunded (demo).`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Refunded', onPress: async () => {
        await updateBooking(b.id, { paymentStatus: 'refunded' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'mark_refunded', target: b.id, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  return (
    <Screen back title="Payment Monitoring">
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statV}>{formatPrice(grossPaid, currency)}</Text><Text style={styles.statL}>Collected (demo)</Text></View>
        <View style={styles.stat}><Text style={styles.statV}>{formatPrice(feeEstimate, currency)}</Text><Text style={styles.statL}>Fee est. ({platform.serviceFeePct}%)</Text></View>
        <View style={styles.stat}><Text style={[styles.statV, refundPending.length ? { color: colors.warning } : null]}>{refundPending.length}</Text><Text style={styles.statL}>Refunds pending</Text></View>
      </View>

      <View style={styles.methodCard}>
        <Text style={styles.methodTitle}>Paid by method</Text>
        {Object.entries(METHODS).map(([m, label]) => {
          const list = byMethod(m as Booking['paymentMethod']);
          const sum = list.reduce((s, b) => s + b.totalLKR, 0);
          return (
            <View key={m} style={styles.methodRow}>
              <Text style={styles.sub}>{label}</Text>
              <Text style={styles.sub}>{list.length} payment(s) · {formatPrice(sum, currency)}</Text>
            </View>
          );
        })}
        <View style={styles.methodRow}>
          <Text style={styles.sub}>Unpaid bookings</Text>
          <Text style={styles.sub}>{bookings.filter((b) => !b.paymentStatus || b.paymentStatus === 'unpaid').length} open</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : f.replace('_', ' ')} selected={filter === f} onPress={() => setFilter(f)} tone="brand" />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })}>
            <View style={styles.rowBetween}>
              <Text style={styles.title} numberOfLines={1}>{listingOf(item.listingId)?.title || item.listingId}</Text>
              <Badge label={item.paymentStatus ? item.paymentStatus.replace('_', ' ') : 'unpaid'} tone={payTone(item.paymentStatus)} />
            </View>
            <Text style={styles.sub}>{item.id} · {travelerOf(item.travelerId)?.name || item.travelerId}</Text>
            <View style={styles.tagRow}>
              <Text style={styles.total}>{formatPrice(item.totalLKR, currency)}</Text>
              {item.paymentMethod ? <Badge label={METHODS[item.paymentMethod]} tone="info" /> : <Badge label="no method" tone="muted" />}
            </View>
            {item.paymentRef ? <Text style={styles.sub}>Ref {item.paymentRef}{item.paidAt ? ` · paid ${item.paidAt.slice(0, 10)}` : ''}</Text> : null}
            <View style={styles.actions}>
              <Button title="View" variant="ghost" onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })} />
              {(!item.paymentStatus || item.paymentStatus === 'unpaid' || item.paymentStatus === 'processing' || item.paymentStatus === 'failed') ? <Button title="Mark paid" onPress={() => markPaid(item)} /> : null}
              {item.paymentStatus === 'refund_pending' ? <Button title="Mark refunded" variant="secondary" onPress={() => markRefunded(item)} /> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState icon="payments" title="No payments" message="Payments matching this filter will appear here." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center' },
  statV: { ...typography.bodyBold, color: colors.primary, textAlign: 'center' },
  statL: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  methodCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, margin: spacing.lg, marginBottom: 0, gap: 6 },
  methodTitle: { ...typography.smallBold, color: colors.text },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sub: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexWrap: 'wrap' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  total: { ...typography.bodyBold, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
});
