import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SmartImage } from '@/components/ui/SmartImage';
import { Booking, Listing } from '@/constants/sampleData';
import { colors, radius, spacing, typography, shadow } from '@/constants/theme';
import { formatPrice } from '@/services/currency';
import { useSettings } from '@/hooks/useSettings';
import { Badge } from '@/components/ui/Badge';

interface Props {
  booking: Booking;
  listing?: Listing;
  onPress?: () => void;
}

const toneByStatus: Record<Booking['status'], 'warning' | 'success' | 'danger' | 'muted' | 'info'> = {
  pending: 'warning', confirmed: 'success', declined: 'danger', cancelled: 'muted', completed: 'info',
};

export function BookingCard({ booking, listing, onPress }: Props) {
  const { currency } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
      accessibilityLabel={`Booking for ${listing?.title || 'listing'} ${booking.status}`}
    >
      <SmartImage uri={listing?.photo} style={styles.image} fallbackIcon="hotel" />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{listing?.title || 'Booking'}</Text>
        <Text style={styles.sub}>
          {booking.dateFrom} {booking.dateFrom !== booking.dateTo ? `→ ${booking.dateTo}` : ''}
        </Text>
        <Text style={styles.sub}>{booking.guests} guest{booking.guests > 1 ? 's' : ''}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.price}>{formatPrice(booking.totalLKR, currency)}</Text>
          <Badge label={booking.status} tone={toneByStatus[booking.status]} />
        </View>
        {booking.paymentStatus && booking.paymentStatus !== 'unpaid' ? (
          <Text style={styles.payLine}>Payment: {booking.paymentStatus.replace('_',' ')}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md, ...shadow.sm },
  image: { width: 110, height: 120 },
  body: { flex: 1, padding: spacing.md, gap: 2, justifyContent: 'space-between' },
  title: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.small, color: colors.textMuted },
  price: { ...typography.bodyBold, color: colors.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  payLine: { ...typography.caption, color: colors.info, marginTop: 2 },
});
