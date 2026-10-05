import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function Trips() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, listings, villages, wishlist } = useData();
  const { t, currency } = useSettings();

  const confirmed = bookings.filter((b) => b.travelerId === user?.id && (b.status === 'confirmed' || b.status === 'pending'));
  const savedListings = listings.filter((l) => wishlist.includes(l.id));

  return (
    <Screen title={t('trips')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}>
        <View>
          <Text style={styles.section}>My itinerary</Text>
          {confirmed.length === 0 ? (
            <EmptyState icon="map" title="No upcoming trips" message="Confirmed stays and tours will show here." />
          ) : (
            confirmed
              .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))
              .map((b) => {
                const l = listings.find((x) => x.id === b.listingId);
                const v = villages.find((x) => x.id === l?.villageId);
                return (
                  <Pressable key={b.id} onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b.id } })} style={styles.item}>
                    <View style={styles.date}>
                      <Text style={styles.dateDay}>{new Date(b.dateFrom).getDate()}</Text>
                      <Text style={styles.dateMon}>{new Date(b.dateFrom).toLocaleString('en', { month: 'short' })}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{l?.title}</Text>
                      <Text style={styles.sub}>{v?.name} · {b.guests} guest{b.guests > 1 ? 's' : ''}</Text>
                      <Text style={styles.price}>{formatPrice(b.totalLKR, currency)}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                  </Pressable>
                );
              })
          )}
        </View>

        <View>
          <Text style={styles.section}>Saved</Text>
          {savedListings.length === 0 ? (
            <EmptyState icon="favorite-border" title="No saved items" message="Tap the heart on any listing to save it here." />
          ) : (
            savedListings.map((l) => {
              const v = villages.find((x) => x.id === l.villageId);
              return (
                <Pressable key={l.id} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} style={styles.item}>
                  <View style={styles.heartIcon}><MaterialIcons name="favorite" size={20} color={colors.danger} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{l.title}</Text>
                    <Text style={styles.sub}>{v?.name} · {formatPrice(l.pricePerUnitLKR, currency)}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                </Pressable>
              );
            })
          )}
        </View>

        <View>
          <Text style={styles.section}>Travel assistance (offline-friendly)</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}><MaterialIcons name="support-agent" size={20} color={colors.primary} /><Text style={styles.cardText}>Emergency: 119 Police · 110 Ambulance</Text></View>
            <View style={styles.cardRow}><MaterialIcons name="translate" size={20} color={colors.primary} /><Text style={styles.cardText}>Switch language in Settings for Sinhala.</Text></View>
            <View style={styles.cardRow}><MaterialIcons name="info" size={20} color={colors.primary} /><Text style={styles.cardText}>Confirmed booking details are cached locally.</Text></View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  date: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 18, fontWeight: '700', color: colors.primary },
  dateMon: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  heartIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.small, color: colors.textMuted },
  price: { ...typography.smallBold, color: colors.primary, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardText: { ...typography.small, color: colors.text, flex: 1 },
});
