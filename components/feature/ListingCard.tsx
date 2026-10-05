import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Listing, Village } from '@/constants/sampleData';
import { colors, radius, spacing, typography, shadow } from '@/constants/theme';
import { formatPrice } from '@/services/currency';
import { useSettings } from '@/hooks/useSettings';

interface Props {
  listing: Listing;
  village?: Village;
  onPress?: () => void;
  onSave?: () => void;
  saved?: boolean;
}

const typeIcon: Record<Listing['type'], keyof typeof MaterialIcons.glyphMap> = {
  homestay: 'home-work',
  tour: 'hiking',
  experience: 'restaurant',
};

export function ListingCard({ listing, village, onPress, onSave, saved }: Props) {
  const { currency, t } = useSettings();
  const unit = listing.type === 'homestay' ? t('perNight') : 'per person';
  const hasAccess = (listing.accessibility?.mobility?.length || 0) + (listing.accessibility?.bathroom?.length || 0) > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] }]}
      accessibilityLabel={`${listing.title} in ${village?.name || ''}, ${listing.type}`}
    >
      <SmartImage uri={listing.photo} style={styles.image} fallbackIcon="landscape" />
      <View style={styles.badges}>
        {listing.instantBooking ? (
          <View style={[styles.badge, { backgroundColor: colors.success }]}>
            <MaterialIcons name="flash-on" size={12} color="#fff" />
            <Text style={styles.badgeText}>Instant</Text>
          </View>
        ) : null}
        {listing.type === 'experience' ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="restaurant" size={12} color="#fff" />
            <Text style={styles.badgeText}>Experience</Text>
          </View>
        ) : null}
      </View>
      {onSave ? (
        <Pressable onPress={onSave} style={styles.heart} hitSlop={10} accessibilityLabel={saved ? 'Remove from saved' : 'Save'}>
          <MaterialIcons name={saved ? 'favorite' : 'favorite-border'} size={22} color={saved ? colors.danger : '#fff'} />
        </Pressable>
      ) : null}
      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name={typeIcon[listing.type]} size={14} color={colors.primary} />
            <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
          </View>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color={colors.accent} />
            <Text style={styles.rating}>{listing.rating.toFixed(1)}</Text>
          </View>
        </View>
        {village ? <Text style={styles.sub} numberOfLines={1}>{village.name} · {village.region}</Text> : null}
        <View style={styles.rowBetween}>
          <Text style={styles.price}>{formatPrice(listing.pricePerUnitLKR, currency)}</Text>
          <Text style={styles.perUnit}>{unit}</Text>
        </View>
        {hasAccess ? (
          <View style={styles.accessRow}>
            <MaterialIcons name="accessible" size={12} color={colors.info} />
            <Text style={styles.accessText}>Accessibility details provided</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md, ...shadow.sm },
  image: { width: '100%', height: 180 },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  heart: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  price: { ...typography.bodyBold, color: colors.primary },
  perUnit: { ...typography.caption, color: colors.textMuted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rating: { ...typography.smallBold, color: colors.text },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  accessText: { ...typography.caption, color: colors.info },
});
