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

type Filter = 'all' | Booking['status'];
const FILTERS: Filter[] = ['all', 'pending', 'confirmed', 'declined', 'completed', 'cancelled'];

export default function AdminBookings() {
  const router = useRouter();
  const { users, user } = useAuth();
  const { bookings, listings, updateBooking, addAudit, addNotification } = useData();
  const { currency } = useSettings();
  const { showAlert } = useAlert();
  const [filter, setFilter] = useState<Filter>('all');

  const sorted = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = filter === 'all' ? sorted : sorted.filter((b) => b.status === filter);
  const listingOf = (id: string) => listings.find((l) => l.id === id);
  const travelerOf = (id: string) => users.find((u) => u.id === id);
  const count = (s: Booking['status']) => bookings.filter((b) => b.status === s).length;

  const act = (b: Booking, action: string, status: Booking['status'], message: string) => {
    showAlert(`${action} booking?`, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: status === 'declined' || status === 'cancelled' ? 'destructive' : undefined, onPress: async () => {
        await updateBooking(b.id, { status });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: `booking_${status}`, target: b.id, createdAt: new Date().toISOString() });
        await addNotification({
          id: `n-${Date.now()}`, userId: b.travelerId,
          title: `Booking ${status}`, body: `Your booking ${b.id} for ${listingOf(b.listingId)?.title || b.listingId} was ${status} by the platform team.`,
          type: 'booking', link: `/booking/${b.id}`, createdAt: new Date().toISOString(), read: false,
        });
      }},
    ]);
  };

  const statusTone = (s: Booking['status']) =>
    s === 'confirmed' || s === 'completed' ? 'success' : s === 'pending' ? 'warning' : 'danger';
  const payTone = (p?: Booking['paymentStatus']) =>
    p === 'paid' ? 'success' : p === 'refunded' ? 'muted' : p === 'failed' ? 'danger' : 'warning';

  return (
    <Screen back title="Booking Monitoring">
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statV}>{count('pending')}</Text><Text style={styles.statL}>Pending</Text></View>
        <View style={styles.stat}><Text style={styles.statV}>{count('confirmed')}</Text><Text style={styles.statL}>Confirmed</Text></View>
        <View style={styles.stat}><Text style={styles.statV}>{count('completed')}</Text><Text style={styles.statL}>Completed</Text></View>
        <View style={styles.stat}><Text style={styles.statV}>{count('cancelled')}</Text><Text style={styles.statL}>Cancelled</Text></View>
      </View>
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} selected={filter === f} onPress={() => setFilter(f)} tone="brand" />
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const l = listingOf(item.listingId);
          const tv = travelerOf(item.travelerId);
          return (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={1}>{l?.title || item.listingId}</Text>
                <Badge label={item.status} tone={statusTone(item.status)} />
              </View>
              <Text style={styles.sub}>{tv?.name || item.travelerId} · {item.dateFrom}{item.dateTo !== item.dateFrom ? ` → ${item.dateTo}` : ''} · {item.guests} guest(s)</Text>
              <View style={styles.tagRow}>
                <Text style={styles.total}>{formatPrice(item.totalLKR, currency)}</Text>
                <Badge label={item.paymentStatus ? item.paymentStatus.replace('_', ' ') : 'unpaid'} tone={payTone(item.paymentStatus)} />
                {item.instantConfirmed ? <Badge label="instant" tone="info" /> : null}
              </View>
              <View style={styles.actions}>
                <Button title="View" variant="ghost" onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })} />
                {item.status === 'pending' ? (
                  <>
                    <Button title="Confirm" onPress={() => act(item, 'Confirm', 'confirmed', 'The traveler will be asked to complete payment.')} />
                    <Button title="Decline" variant="danger" onPress={() => act(item, 'Decline', 'declined', 'The traveler will be notified.')} />
                  </>
                ) : null}
                {item.status === 'confirmed' ? (
                  <>
                    <Button title="Complete" onPress={() => act(item, 'Complete', 'completed', 'Marks the stay or activity as finished.')} />
                    <Button title="Cancel" variant="danger" onPress={() => act(item, 'Cancel', 'cancelled', 'The traveler will be notified.')} />
                  </>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<EmptyState icon="event-note" title="No bookings" message="Bookings matching this filter will appear here." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center' },
  statV: { ...typography.h3, color: colors.primary },
  statL: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexWrap: 'wrap' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  total: { ...typography.bodyBold, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
});
