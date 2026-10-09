import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice, LKR_PER_USD, DEMO_RATE_UPDATED_AT } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Segment = 'revenue' | 'destinations' | 'bookings';
const MONTH_MS = 30 * 86400000;

export default function AdminReports() {
  const { listings, bookings, reviews, villages, platform } = useData();
  const { currency } = useSettings();
  const [segment, setSegment] = useState<Segment>('revenue');

  const valid = useMemo(() => bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed'), [bookings]);
  const paid = useMemo(() => bookings.filter((b) => b.paymentStatus === 'paid'), [bookings]);
  const gross = paid.reduce((s, b) => s + b.totalLKR, 0);
  const fee = Math.round(gross * (platform.serviceFeePct / 100));

  const buckets = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const end = new Date(now.getTime() - i * MONTH_MS);
      const start = new Date(end.getTime() - MONTH_MS);
      const inRange = (iso: string) => { const d = new Date(iso); return d >= start && d < end; };
      const list = valid.filter((b) => inRange(b.createdAt));
      return {
        label: end.toLocaleString('en', { month: 'short' }),
        revenue: list.reduce((s, b) => s + b.totalLKR, 0),
        count: list.length,
      };
    }).reverse();
  }, [valid]);

  const chartMax = Math.max(1, ...buckets.map((b) => (segment === 'revenue' ? b.revenue : b.count)));
  const width = Dimensions.get('window').width - spacing.lg * 2 - spacing.md * 2;
  const barWidth = Math.max(8, Math.floor(width / buckets.length) - 10);

  const byVillage = villages.map((v) => {
    const vListings = listings.filter((l) => l.villageId === v.id);
    const ids = new Set(vListings.map((l) => l.id));
    const vb = valid.filter((b) => ids.has(b.listingId));
    const revenue = vb.reduce((s, b) => s + b.totalLKR, 0);
    const vReviews = reviews.filter((r) => ids.has(r.listingId) && !r.hidden);
    const avg = vReviews.length ? (vReviews.reduce((s, r) => s + r.rating, 0) / vReviews.length).toFixed(1) : '—';
    return { village: v, listings: vListings.length, bookings: vb.length, revenue, avgRating: avg, top: [...vListings].sort((a, b) => b.reviewCount - a.reviewCount)[0] };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxVillageRevenue = Math.max(1, ...byVillage.map((x) => x.revenue));
  const statusCounts = (['pending', 'confirmed', 'completed', 'declined', 'cancelled'] as const).map((s) => ({ status: s, count: bookings.filter((b) => b.status === s).length }));
  const maxStatus = Math.max(1, ...statusCounts.map((x) => x.count));
  const byType = (type: 'homestay' | 'tour' | 'experience') => {
    const ids = new Set(listings.filter((l) => l.type === type).map((l) => l.id));
    return valid.filter((b) => ids.has(b.listingId)).length;
  };
  const avgValue = valid.length ? Math.round(valid.reduce((s, b) => s + b.totalLKR, 0) / valid.length) : 0;

  return (
    <Screen back title="Reports & Analytics">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}>
        <View style={styles.segments}>
          {(['revenue', 'destinations', 'bookings'] as Segment[]).map((s) => (
            <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={segment === s} onPress={() => setSegment(s)} tone="brand" />
          ))}
        </View>

        {segment === 'revenue' ? (
          <>
            <View style={styles.statsGrid}>
              <Stat label="Gross collected" value={formatPrice(gross, currency)} tone={colors.primary} wide />
              <Stat label={`Platform fee (${platform.serviceFeePct}%)`} value={formatPrice(fee, currency)} tone={colors.accent} wide />
              <Stat label="Paid bookings" value={`${paid.length}`} tone={colors.success} />
              <Stat label="Avg booking value" value={formatPrice(avgValue, currency)} tone={colors.info} />
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Revenue — last 6 months</Text>
              <View style={styles.chartRow}>
                {buckets.map((b, i) => {
                  const h = (b.revenue / chartMax) * 140;
                  return (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                      <View style={{ height: 140, justifyContent: 'flex-end' }}>
                        <View style={{ width: barWidth, height: Math.max(2, h), backgroundColor: colors.primary, borderRadius: 4 }} />
                      </View>
                      <Text style={styles.chartLabel}>{b.label}</Text>
                      <Text style={styles.chartValue}>{formatPrice(b.revenue, currency)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment status</Text>
              {(['paid', 'unpaid', 'refund_pending', 'refunded', 'failed'] as const).map((p) => (
                <View key={p} style={styles.rowLine}>
                  <Text style={styles.rowText}>{p.replace('_', ' ')}</Text>
                  <Badge label={`${bookings.filter((b) => (b.paymentStatus || 'unpaid') === p).length}`} tone={p === 'paid' ? 'success' : p === 'failed' ? 'danger' : 'muted'} />
                </View>
              ))}
              <Text style={styles.foot}>Demo ledger only — no live payment gateway. {currency === 'USD' ? `Rate 1 USD = ${LKR_PER_USD} LKR (${DEMO_RATE_UPDATED_AT}).` : ''}</Text>
            </View>
          </>
        ) : null}

        {segment === 'destinations' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Popular destinations (by confirmed revenue)</Text>
            {byVillage.map((x) => (
              <View key={x.village.id} style={{ marginBottom: spacing.md }}>
                <View style={styles.rowLine}>
                  <MaterialIcons name="place" size={18} color={colors.primary} />
                  <Text style={styles.rowTextBold}>{x.village.name}</Text>
                  <Text style={styles.rowText}>{formatPrice(x.revenue, currency)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={{ height: 8, borderRadius: 4, width: `${Math.max(4, (x.revenue / maxVillageRevenue) * 100)}%`, backgroundColor: colors.primary }} />
                </View>
                <Text style={styles.foot}>{x.listings} listing(s) · {x.bookings} booking(s) · avg rating {x.avgRating}{x.top ? ` · top: ${x.top.title}` : ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {segment === 'bookings' ? (
          <>
            <View style={styles.statsGrid}>
              <Stat label="Total bookings" value={`${bookings.length}`} tone={colors.primary} />
              <Stat label="Completion rate" value={`${valid.length ? Math.round((bookings.filter((b) => b.status === 'completed').length / Math.max(1, bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'confirmed').length)) * 100) : 0}%`} tone={colors.success} />
              <Stat label="Homestay stays" value={`${byType('homestay')}`} tone={colors.info} />
              <Stat label="Tours & experiences" value={`${byType('tour') + byType('experience')}`} tone={colors.accent} />
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Bookings — last 6 months</Text>
              <View style={styles.chartRow}>
                {buckets.map((b, i) => {
                  const h = (b.count / chartMax) * 140;
                  return (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                      <View style={{ height: 140, justifyContent: 'flex-end' }}>
                        <View style={{ width: barWidth, height: Math.max(2, h), backgroundColor: colors.accent, borderRadius: 4 }} />
                      </View>
                      <Text style={styles.chartLabel}>{b.label}</Text>
                      <Text style={styles.chartValue}>{b.count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Booking status</Text>
              {statusCounts.map((x) => (
                <View key={x.status} style={{ marginBottom: spacing.sm }}>
                  <View style={styles.rowLine}>
                    <Text style={styles.rowText}>{x.status.charAt(0).toUpperCase() + x.status.slice(1)}</Text>
                    <Text style={styles.rowTextBold}>{x.count}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={{ height: 8, borderRadius: 4, width: `${Math.max(4, (x.count / maxStatus) * 100)}%`, backgroundColor: colors.primary }} />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
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
  segments: { flexDirection: 'row', gap: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '48%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statValue: { ...typography.h3, marginTop: 2 },
  chartCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  chartTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartLabel: { ...typography.caption, color: colors.textMuted, marginTop: 6 },
  chartValue: { ...typography.caption, color: colors.text, fontSize: 10 },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  cardTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { ...typography.small, color: colors.textMuted, flex: 1 },
  rowTextBold: { ...typography.smallBold, color: colors.text },
  track: { height: 8, backgroundColor: colors.bgAlt, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  foot: { ...typography.caption, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
});
