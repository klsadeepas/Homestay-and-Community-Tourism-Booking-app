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
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tab = 'requests' | 'upcoming' | 'past';

export default function GuideBookings() {
  const router = useRouter();
  const { user, users } = useAuth();
  const { listings, bookings, updateBooking, addNotification } = useData();
  const { t, currency } = useSettings();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<Tab>('requests');

  const mineIds = new Set(listings.filter((l) => l.ownerId === user?.id).map((l) => l.id));
  const mine = bookings.filter((b) => mineIds.has(b.listingId));
  const groups: Record<Tab, typeof bookings> = {
    requests: mine.filter((b) => b.status === 'pending'),
    upcoming: mine.filter((b) => b.status === 'confirmed'),
    past: mine.filter((b) => ['completed','cancelled','declined'].includes(b.status)),
  };

  const decide = (id: string, next: 'confirmed' | 'declined') => {
    showAlert(next === 'confirmed' ? 'Accept participant?' : 'Decline booking?', '', [
      { text: t('cancel'), style: 'cancel' },
      { text: next === 'confirmed' ? t('accept') : t('decline'), onPress: async () => {
        const b = bookings.find((x) => x.id === id);
        await updateBooking(id, { status: next });
        if (b) await addNotification({ id: `n-${Date.now()}`, userId: b.travelerId, title: next === 'confirmed' ? 'Tour confirmed' : 'Tour declined', body: 'Your tour booking status changed.', read: false, createdAt: new Date().toISOString(), type: 'booking', link: `/booking/${b.id}` });
      }},
    ]);
  };

  return (
    <Screen title={t('bookings')}>
      <View style={styles.tabs}>
        {(['requests','upcoming','past'] as Tab[]).map((x) => (
          <Chip key={x} label={x.charAt(0).toUpperCase() + x.slice(1)} selected={tab === x} onPress={() => setTab(x)} />
        ))}
      </View>
      <FlatList
        data={groups[tab]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const tour = listings.find((x) => x.id === item.listingId);
          const traveler = users.find((u) => u.id === item.travelerId);
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{tour?.title}</Text>
                <Badge label={item.status} tone={item.status === 'confirmed' ? 'success' : item.status === 'pending' ? 'warning' : 'muted'} />
              </View>
              <Text style={styles.sub}>Participant: {traveler?.name}</Text>
              <Text style={styles.sub}>Date: {item.dateFrom} · Group {item.guests}</Text>
              {item.checkIn ? <Text style={styles.sub}>Attendance: {item.checkIn.replace('_',' ')}</Text> : null}
              <Text style={styles.total}>{formatPrice(item.totalLKR, currency)}</Text>
              {item.status === 'pending' ? (
                <View style={styles.actions}>
                  <Button title={t('decline')} variant="ghost" onPress={() => decide(item.id, 'declined')} />
                  <Button title={t('accept')} onPress={() => decide(item.id, 'confirmed')} />
                </View>
              ) : item.status === 'confirmed' ? (
                <View style={styles.actions}>
                  <Button title={t('attendance')} variant="secondary" onPress={() => router.push({ pathname: '/attendance/[id]', params: { id: tour!.id } })} />
                  <Button title="Message" variant="ghost" onPress={() => router.push('/messages')} />
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="event-busy" title="Nothing here yet" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm, flexWrap: 'wrap' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  total: { ...typography.bodyBold, color: colors.primary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
