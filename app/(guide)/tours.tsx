import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { formatPrice } from '@/services/currency';
import { IMG, Listing } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function GuideTours() {
  const router = useRouter();
  const { user } = useAuth();
  const { listings, bookings, addListing, updateListing, deleteListing } = useData();
  const { t, currency } = useSettings();
  const { showAlert } = useAlert();

  const mine = listings.filter((l) => l.ownerId === user?.id && (l.type === 'tour' || l.type === 'experience'));

  const create = async (type: 'tour' | 'experience') => {
    const base: Listing = type === 'tour' ? {
      id: `l-${Date.now()}`, type: 'tour', ownerId: user!.id, villageId: 'v-sigiriya',
      title: 'New Tour Draft', description: 'Describe your tour.',
      photo: IMG.sunriseHike, pricePerUnitLKR: 3000, capacity: 8, rating: 0, reviewCount: 0,
      duration: '3 hours', difficulty: 'Easy', meetingPoint: 'TBD', included: [], excluded: [],
      status: 'draft', accessibility: { mobility: [], bathroom: [], food: [] },
    } : {
      id: `l-${Date.now()}`, type: 'experience', ownerId: user!.id, villageId: 'v-sigiriya',
      title: 'New Experience Draft', description: 'Describe your experience.',
      photo: IMG.craftWorkshop, pricePerUnitLKR: 2500, capacity: 6, rating: 0, reviewCount: 0,
      duration: '2 hours', experienceCategory: 'craft', meetingPoint: 'TBD', included: [], excluded: [],
      status: 'draft', accessibility: { mobility: [], bathroom: [], food: [] },
    };
    await addListing(base);
    showAlert('Draft created', 'Edit the details and submit for review.');
  };

  const submit = (id: string) => {
    showAlert('Submit for review?', 'Coordinators will review this listing.', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Submit', onPress: () => updateListing(id, { status: 'submitted' }) },
    ]);
  };

  const remove = (id: string) => {
    showAlert('Delete?', 'This cannot be undone.', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteListing(id) },
    ]);
  };

  const toggleInstant = (l: Listing) => {
    if (l.status !== 'approved') { showAlert('Not eligible', 'Instant booking is only available for approved listings.'); return; }
    const pending = bookings.filter((b) => b.listingId === l.id && b.status === 'pending').length;
    if (l.instantBooking && pending > 0) {
      showAlert('Pending requests exist', `Turning off Instant Book will not change ${pending} pending request(s). Continue?`, [
        { text: t('cancel'), style: 'cancel' },
        { text: 'Continue', onPress: () => updateListing(l.id, { instantBooking: false }) },
      ]);
      return;
    }
    updateListing(l.id, { instantBooking: !l.instantBooking });
  };

  return (
    <Screen title={t('tours')} right={<Pressable onPress={() => showAlert('Create', 'Pick a type', [
      { text: 'Tour', onPress: () => create('tour') },
      { text: 'Experience', onPress: () => create('experience') },
      { text: t('cancel'), style: 'cancel' },
    ])}><MaterialIcons name="add" size={24} color={colors.primary} /></Pressable>}>
      <FlatList
        data={mine}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <SmartImage uri={item.photo} style={styles.img} fallbackIcon="landscape" />
            <View style={{ padding: spacing.md, gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{item.title}</Text>
                <Badge label={item.status.replace('_',' ')} tone={item.status === 'approved' ? 'success' : item.status === 'draft' ? 'muted' : 'warning'} />
              </View>
              <Text style={styles.sub}>{item.type.toUpperCase()} · {item.duration}{item.difficulty ? ` · ${item.difficulty}` : ''}</Text>
              <Text style={styles.sub}>{formatPrice(item.pricePerUnitLKR, currency)} / person · up to {item.capacity}</Text>
              {item.status === 'needs_changes' && item.reviewReason ? (
                <View style={styles.reasonBox}>
                  <MaterialIcons name="info" size={14} color={colors.warning} />
                  <Text style={styles.reasonText}>Reason: {item.reviewReason}</Text>
                </View>
              ) : null}
              <View style={styles.toggleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <MaterialIcons name="flash-on" size={16} color={colors.success} />
                  <Text style={styles.toggleLabel}>Instant Book</Text>
                </View>
                <Switch value={!!item.instantBooking} onValueChange={() => toggleInstant(item)} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={item.instantBooking ? colors.primary : '#fff'} />
              </View>
              <View style={styles.actions}>
                <Button title={t('edit')} variant="secondary" onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id, edit: '1' } })} />
                {(item.status === 'draft' || item.status === 'needs_changes') ? <Button title={item.status === 'needs_changes' ? 'Resubmit' : 'Submit'} onPress={() => submit(item.id)} /> : null}
                {item.status === 'approved' ? <Button title={t('attendance')} variant="secondary" onPress={() => router.push({ pathname: '/attendance/[id]', params: { id: item.id } })} /> : null}
                <Button title={t('delete')} variant="ghost" onPress={() => remove(item.id)} />
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="hiking" title="No tours yet" message="Tap + to add a tour or experience." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md },
  img: { width: '100%', height: 160 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: spacing.sm, borderRadius: radius.md },
  reasonText: { ...typography.caption, color: colors.warning, flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  toggleLabel: { ...typography.smallBold, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
});
