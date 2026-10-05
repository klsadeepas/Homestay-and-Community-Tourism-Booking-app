import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function OwnerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { listings, bookings } = useData();
  const { t, currency } = useSettings();

  const myListings = listings.filter((l) => l.ownerId === user?.id);
  const myListingIds = new Set(myListings.map((l) => l.id));
  const myBookings = bookings.filter((b) => myListingIds.has(b.listingId));
  const requests = myBookings.filter((b) => b.status === 'pending');
  const upcoming = myBookings.filter((b) => b.status === 'confirmed');
  const totalEarnings = myBookings.filter((b) => b.status === 'completed' || b.status === 'confirmed').reduce((s, b) => s + b.totalLKR, 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Avatar uri={user?.photo} name={user?.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Welcome back</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} accessibilityLabel="Notifications"><MaterialIcons name="notifications" size={24} color={colors.text} /></Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Listings</Text><Text style={styles.statValue}>{myListings.length}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Requests</Text><Text style={styles.statValue}>{requests.length}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Upcoming</Text><Text style={styles.statValue}>{upcoming.length}</Text></View>
        </View>

        <Pressable onPress={() => router.push('/performance')} style={styles.earnings} accessibilityLabel="Open performance screen">
          <View style={{ flex: 1 }}>
            <Text style={styles.earningsLabel}>Total earnings (confirmed + completed)</Text>
            <Text style={styles.earningsValue}>{formatPrice(totalEarnings, currency)}</Text>
            <Text style={styles.earningsNote}>Stored in LKR. Displayed in {currency}. Tap for performance details →</Text>
          </View>
          <MaterialIcons name="trending-up" size={32} color="#FDE8C4" />
        </Pressable>

        <Text style={styles.section}>Listings status</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {myListings.map((l) => (
            <Pressable key={l.id} style={styles.row} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}>
              <MaterialIcons name={l.type === 'homestay' ? 'home' : l.type === 'tour' ? 'hiking' : 'restaurant'} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{l.title}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  <Text style={styles.rowSub}>{formatPrice(l.pricePerUnitLKR, currency)}</Text>
                  {l.instantBooking ? <Text style={styles.instantPill}>Instant</Text> : null}
                </View>
              </View>
              <Badge label={l.status.replace('_',' ')} tone={l.status === 'approved' ? 'success' : l.status === 'submitted' || l.status === 'under_review' ? 'warning' : 'muted'} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Recent booking requests</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {requests.length === 0 ? <Text style={styles.empty}>No pending requests.</Text> : requests.map((b) => {
            const l = myListings.find((x) => x.id === b.listingId);
            return (
              <Pressable key={b.id} style={styles.row} onPress={() => router.push('/(owner)/bookings')}>
                <MaterialIcons name="pending-actions" size={22} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{l?.title}</Text>
                  <Text style={styles.rowSub}>{b.dateFrom} · {b.guests} guest{b.guests > 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.rowPrice}>{formatPrice(b.totalLKR, currency)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  hello: { ...typography.small, color: colors.textMuted },
  name: { ...typography.h3, color: colors.text },
  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4 },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statValue: { ...typography.h2, color: colors.primary },
  earnings: { flexDirection: 'row', alignItems: 'center', margin: spacing.lg, backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  earningsLabel: { ...typography.small, color: '#FDE8C4' },
  earningsValue: { ...typography.h1, color: '#fff', marginTop: 4 },
  earningsNote: { ...typography.caption, color: '#FDE8C4', marginTop: 4 },
  section: { ...typography.h3, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted },
  rowPrice: { ...typography.smallBold, color: colors.primary },
  instantPill: { ...typography.caption, color: '#fff', backgroundColor: colors.success, paddingHorizontal: 6, borderRadius: radius.pill, fontWeight: '700', overflow: 'hidden' },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
