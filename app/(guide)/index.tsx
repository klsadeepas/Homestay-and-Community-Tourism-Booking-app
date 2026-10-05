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

export default function GuideDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { listings, bookings } = useData();
  const { t, currency } = useSettings();
  const myTours = listings.filter((l) => l.ownerId === user?.id && l.type === 'tour');
  const myIds = new Set(myTours.map((t) => t.id));
  const myBookings = bookings.filter((b) => myIds.has(b.listingId));
  const requests = myBookings.filter((b) => b.status === 'pending');
  const upcoming = myBookings.filter((b) => b.status === 'confirmed');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Avatar uri={user?.photo} name={user?.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Namaste</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')}><MaterialIcons name="notifications" size={24} color={colors.text} /></Pressable>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statL}>Tours</Text><Text style={styles.statV}>{myTours.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>Requests</Text><Text style={styles.statV}>{requests.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>Upcoming</Text><Text style={styles.statV}>{upcoming.length}</Text></View>
        </View>
        <Text style={styles.section}>Your tours</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {myTours.map((l) => (
            <Pressable key={l.id} style={styles.row} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}>
              <MaterialIcons name="hiking" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{l.title}</Text>
                <Text style={styles.rowSub}>{l.duration} · {l.difficulty} · {formatPrice(l.pricePerUnitLKR, currency)}</Text>
              </View>
              <Badge label={l.status.replace('_',' ')} tone={l.status === 'approved' ? 'success' : 'warning'} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>Attendance checklist</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {upcoming.length === 0 ? <Text style={styles.empty}>No upcoming tours.</Text> :
            upcoming.map((b) => {
              const tour = myTours.find((x) => x.id === b.listingId);
              return (
                <Pressable key={b.id} style={styles.row} onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })}>
                  <MaterialIcons name="checklist" size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{tour?.title}</Text>
                    <Text style={styles.rowSub}>{b.dateFrom} · {b.guests} participant{b.guests > 1 ? 's' : ''}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
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
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statL: { ...typography.caption, color: colors.textMuted },
  statV: { ...typography.h2, color: colors.primary },
  section: { ...typography.h3, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
