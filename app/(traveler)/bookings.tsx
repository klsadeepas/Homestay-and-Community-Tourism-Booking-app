import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { BookingCard } from '@/components/feature/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tab = 'pending' | 'upcoming' | 'completed' | 'cancelled';

export default function Bookings() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, listings } = useData();
  const { t } = useSettings();
  const [tab, setTab] = useState<Tab>('upcoming');

  const my = bookings.filter((b) => b.travelerId === user?.id);
  const by: Record<Tab, typeof bookings> = {
    pending: my.filter((b) => b.status === 'pending'),
    upcoming: my.filter((b) => b.status === 'confirmed'),
    completed: my.filter((b) => b.status === 'completed'),
    cancelled: my.filter((b) => b.status === 'cancelled' || b.status === 'declined'),
  };

  return (
    <Screen title={t('bookings')}>
      <View style={styles.tabs}>
        {(['pending','upcoming','completed','cancelled'] as Tab[]).map((x) => (
          <Pressable key={x} onPress={() => setTab(x)} style={[styles.tab, tab === x && styles.tabActive]}>
            <Text style={[styles.tabText, tab === x && styles.tabTextActive]}>{x.charAt(0).toUpperCase() + x.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={by[tab]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            listing={listings.find((l) => l.id === item.listingId)}
            onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={<EmptyState icon="event-busy" title={t('emptyNoBookings')} message="Explore stays and tours to make your first booking." />}
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
});
