import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Chip } from '@/components/ui/Chip';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice, convertedNote, LKR_PER_USD, DEMO_RATE_UPDATED_AT } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Period = 'weekly' | 'monthly';

export default function Performance() {
  const { user } = useAuth();
  const { listings, bookings, reviews } = useData();
  const { t, currency } = useSettings();
  const [period, setPeriod] = useState<Period>('weekly');

  const myListingIds = useMemo(() => new Set(listings.filter((l) => l.ownerId === user?.id).map((l) => l.id)), [listings, user]);
  const myBookings = useMemo(() => bookings.filter((b) => myListingIds.has(b.listingId)), [bookings, myListingIds]);

  const windowDays = period === 'weekly' ? 7 : 30;
  const now = new Date();
  const buckets = Array.from({ length: period === 'weekly' ? 7 : 6 }).map((_, i) => {
    const end = new Date(now.getTime() - i * windowDays * 86400000);
    const start = new Date(end.getTime() - windowDays * 86400000);
    const inRange = (iso: string) => new Date(iso) >= start && new Date(iso) < end;
    const list = myBookings.filter((b) => inRange(b.createdAt) && (b.status === 'confirmed' || b.status === 'completed'));
    return {
      label: period === 'weekly' ? `W${i === 0 ? 'now' : -i}` : end.toLocaleString('en', { month: 'short' }),
      earnings: list.reduce((s, b) => s + b.totalLKR, 0),
      count: list.length,
    };
  }).reverse();

  const totalEarnings = buckets.reduce((s, b) => s + b.earnings, 0);
  const totalBookings = buckets.reduce((s, b) => s + b.count, 0);
  const periodLabel = period === 'weekly' ? 'Last 7 weeks' : 'Last 6 months';

  // Occupancy = booked-nights / available-nights (demo heuristic since availability not fully modeled)
  const availableUnits = Array.from(myListingIds).length;
  const availableNights = Math.max(1, availableUnits * windowDays * (period === 'weekly' ? 7 : 6));
  const bookedNights = myBookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((s, b) => s + Math.max(1, (new Date(b.dateTo).getTime() - new Date(b.dateFrom).getTime()) / 86400000 + 1), 0);
  const occupancy = Math.min(100, Math.round((bookedNights / availableNights) * 100));

  const listingReviews = reviews.filter((r) => myListingIds.has(r.listingId));
  const avgRating = listingReviews.length ? (listingReviews.reduce((s, r) => s + r.rating, 0) / listingReviews.length).toFixed(1) : '—';

  const chartMax = Math.max(1, ...buckets.map((b) => b.earnings));
  const width = Dimensions.get('window').width - spacing.lg * 2 - spacing.md * 2;
  const barWidth = Math.max(8, Math.floor(width / buckets.length) - 10);

  return (
    <Screen back title={t('performance')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}>
        <View style={styles.toggleRow}>
          <Chip label={t('weekly')} selected={period === 'weekly'} onPress={() => setPeriod('weekly')} />
          <Chip label={t('monthly')} selected={period === 'monthly'} onPress={() => setPeriod('monthly')} />
          <Text style={styles.periodMeta}>{periodLabel}</Text>
        </View>

        <View style={styles.statsGrid}>
          <Stat label={t('bookingCount')} value={`${totalBookings}`} tone={colors.primary} />
          <Stat label={t('occupancy')} value={`${occupancy}%`} tone={colors.success} />
          <Stat label={t('earnings')} value={formatPrice(totalEarnings, currency)} tone={colors.accent} wide />
          <Stat label={t('avgRating')} value={`${avgRating}${listingReviews.length ? ` (${listingReviews.length})` : ''}`} tone={colors.info} wide />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('earnings')} — {period === 'weekly' ? 'per week' : 'per month'}</Text>
          <View style={styles.chartRow}>
            {buckets.map((b, i) => {
              const h = (b.earnings / chartMax) * 140;
              return (
                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                  <View style={{ height: 140, justifyContent: 'flex-end' }}>
                    <View style={{ width: barWidth, height: Math.max(2, h), backgroundColor: colors.primary, borderRadius: 4 }} />
                  </View>
                  <Text style={styles.chartLabel}>{b.label}</Text>
                  <Text style={styles.chartValue}>{formatPrice(b.earnings, currency)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.chartFoot}>Stored in LKR. {currency === 'USD' ? `Demo rate 1 USD = ${LKR_PER_USD} LKR, updated ${DEMO_RATE_UPDATED_AT}.` : null}</Text>
        </View>

        <View style={styles.assumptionsCard}>
          <Text style={styles.assumptionsTitle}>How these numbers are derived</Text>
          <Text style={styles.assumptionsText}>
            • Earnings sum confirmed and completed booking totals stored in LKR.{'\n'}
            • Occupancy ≈ booked-nights ÷ (listings × period days). Full per-unit availability calendars are not modeled in this demo, so this is an estimate.{'\n'}
            • Average rating uses all reviews across your listings; empty periods show —.{'\n'}
            • Payment settlement, payouts, and refunds depend on external payment integration — not connected in this demo.
          </Text>
        </View>

        {convertedNote(currency) ? <Text style={styles.note}>{convertedNote(currency)}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, tone, wide }: { label: string; value: string; tone: string; wide?: boolean }) {
  return (
    <View style={[styles.stat, wide && { flexBasis: '48%' }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tone }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  periodMeta: { flex: 1, textAlign: 'right', ...typography.caption, color: colors.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '48%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statValue: { ...typography.h2, marginTop: 2 },
  chartCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  chartTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartLabel: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  chartValue: { ...typography.caption, color: colors.text, fontSize: 10 },
  chartFoot: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  assumptionsCard: { backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  assumptionsTitle: { ...typography.smallBold, color: colors.text, marginBottom: 4 },
  assumptionsText: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
