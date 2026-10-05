import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { formatPrice } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tab = 'requests' | 'upcoming' | 'past';

export default function OwnerBookings() {
  const { user, users } = useAuth();
  const { listings, bookings, updateBooking, addNotification } = useData();
  const { t, currency } = useSettings();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<Tab>('requests');

  const mineListingIds = new Set(listings.filter((l) => l.ownerId === user?.id).map((l) => l.id));
  const mine = bookings.filter((b) => mineListingIds.has(b.listingId));

  const groups: Record<Tab, typeof bookings> = {
    requests: mine.filter((b) => b.status === 'pending'),
    upcoming: mine.filter((b) => b.status === 'confirmed'),
    past: mine.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'declined'),
  };

  const decide = (id: string, next: 'confirmed' | 'declined') => {
    showAlert(next === 'confirmed' ? 'Accept booking?' : 'Decline booking?', 'The traveler will be notified.', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: next === 'confirmed' ? t('accept') : t('decline'),
        onPress: async () => {
          const b = bookings.find((x) => x.id === id);
          await updateBooking(id, { status: next });
          if (b) {
            await addNotification({
              id: `n-${Date.now()}`,
              userId: b.travelerId,
              title: next === 'confirmed' ? 'Booking confirmed' : 'Booking declined',
              body: next === 'confirmed' ? 'Your host accepted the booking.' : 'Your host could not accept this booking.',
              read: false,
              createdAt: new Date().toISOString(),
              type: 'booking',
            });
          }
        },
      },
    ]);
  };

  return (
    <Screen title={t('bookings')}>
      <View style={styles.tabs}>
        {(['requests','upcoming','past'] as Tab[]).map((x) => (
          <Pressable key={x} onPress={() => setTab(x)} style={[styles.tab, tab === x && styles.tabActive]}>
            <Text style={[styles.tabText, tab === x && styles.tabTextActive]}>{x.charAt(0).toUpperCase() + x.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={groups[tab]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const l = listings.find((x) => x.id === item.listingId);
          const traveler = users.find((u) => u.id === item.travelerId);
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{l?.title}</Text>
                <Badge label={item.status} tone={item.status === 'confirmed' ? 'success' : item.status === 'pending' ? 'warning' : 'muted'} />
              </View>
              <Text style={styles.sub}>Traveler: {traveler?.name}</Text>
              <Text style={styles.sub}>Dates: {item.dateFrom}{item.dateFrom !== item.dateTo ? ` → ${item.dateTo}` : ''}</Text>
              <Text style={styles.sub}>Guests: {item.guests}</Text>
              {item.note ? <Text style={styles.note}>Note: {item.note}</Text> : null}
              <Text style={styles.total}>{formatPrice(item.totalLKR, currency)}</Text>
              {item.status === 'pending' ? (
                <View style={styles.actions}>
                  <Button title={t('decline')} variant="ghost" onPress={() => decide(item.id, 'declined')} />
                  <Button title={t('accept')} onPress={() => decide(item.id, 'confirmed')} />
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="event-busy" title="No bookings here yet" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  tab: { flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  note: { ...typography.small, color: colors.text, fontStyle: 'italic' },
  total: { ...typography.bodyBold, color: colors.primary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'flex-end' },
});
