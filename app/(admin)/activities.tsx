import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { SmartImage } from '@/components/ui/SmartImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { formatPrice } from '@/services/currency';
import { IMG, Listing } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

type TypeFilter = 'all' | 'tour' | 'experience';
type StatusFilter = 'all' | Listing['status'];
const STATUSES: StatusFilter[] = ['all', 'draft', 'submitted', 'under_review', 'approved', 'needs_changes', 'suspended'];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdminActivities() {
  const router = useRouter();
  const { users, user } = useAuth();
  const { listings, bookings, villages, addListing, updateListing, deleteListing, addAudit } = useData();
  const { currency } = useSettings();
  const { showAlert } = useAlert();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [guidePicker, setGuidePicker] = useState<Listing | null>(null);
  const [pickedGuide, setPickedGuide] = useState('');

  const guides = users.filter((u) => u.role === 'guide');
  const activities = listings.filter((l) => l.type === 'tour' || l.type === 'experience');
  const filtered = activities.filter((l) => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  const guideOf = (l: Listing) => users.find((u) => u.id === l.ownerId);
  const villageOf = (l: Listing) => villages.find((v) => v.id === l.villageId);
  const nextSlot = (l: Listing) =>
    (l.scheduleSlots || []).filter((s) => s.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const bookingCount = (l: Listing) => bookings.filter((b) => b.listingId === l.id).length;

  const create = (type: 'tour' | 'experience') => {
    const owner = guides.find((g) => g.status === 'active') || guides[0];
    if (!owner) { showAlert('No guides', 'Add a local guide first, then assign activities.'); return; }
    const base: Listing = {
      id: `l-${Date.now()}`,
      type,
      ownerId: owner.id,
      villageId: villages[0]?.id || 'v-sigiriya',
      title: type === 'tour' ? 'New Tour Draft' : 'New Experience Draft',
      description: 'Describe the activity.',
      photo: type === 'tour' ? IMG.sunriseHike : IMG.craftWorkshop,
      pricePerUnitLKR: 3000,
      capacity: 8,
      rating: 0,
      reviewCount: 0,
      duration: '3 hours',
      meetingPoint: 'TBD',
      included: [],
      excluded: [],
      status: 'draft',
      accessibility: { mobility: [], bathroom: [], food: [] },
      scheduleSlots: [],
      ...(type === 'tour' ? { difficulty: 'Easy' as const } : { experienceCategory: 'craft' as const }),
    };
    addListing(base);
    addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'create_activity', target: base.title, reason: `type=${type}`, createdAt: new Date().toISOString() });
    router.push({ pathname: '/listing/[id]', params: { id: base.id, edit: '1' } });
  };

  const approve = (l: Listing) => {
    showAlert('Approve activity?', `"${l.title}" will appear in traveler discovery.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        await updateListing(l.id, { status: 'approved', reviewReason: undefined });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'approve_activity', target: l.title, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const suspend = (l: Listing) => {
    showAlert('Suspend activity?', `"${l.title}" will be hidden from travelers.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
        await updateListing(l.id, { status: 'suspended' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'suspend_activity', target: l.title, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const reinstate = (l: Listing) => {
    showAlert('Reinstate activity?', `"${l.title}" will return to approved status.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reinstate', onPress: async () => {
        await updateListing(l.id, { status: 'approved' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'reinstate_activity', target: l.title, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const remove = (l: Listing) => {
    showAlert('Delete activity?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteListing(l.id);
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'delete_activity', target: l.title, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const openGuidePicker = (l: Listing) => {
    setGuidePicker(l);
    setPickedGuide(l.ownerId);
  };

  const saveGuide = async () => {
    if (!guidePicker) return;
    const g = users.find((u) => u.id === pickedGuide);
    await updateListing(guidePicker.id, { ownerId: pickedGuide });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'assign_guide', target: guidePicker.title, reason: g?.name, createdAt: new Date().toISOString() });
    setGuidePicker(null);
  };

  const statusTone = (s: Listing['status']) =>
    s === 'approved' ? 'success' : s === 'suspended' ? 'danger' : s === 'draft' ? 'muted' : 'warning';

  return (
    <Screen back title="Community Activities" right={<Pressable onPress={() => showAlert('Create activity', 'Pick a type', [
      { text: 'Tour', onPress: () => create('tour') },
      { text: 'Experience', onPress: () => create('experience') },
      { text: 'Cancel', style: 'cancel' },
    ])} accessibilityLabel="Create activity"><MaterialIcons name="add" size={24} color={colors.primary} /></Pressable>}>
      <View style={styles.filters}>
        <View style={styles.chipRow}>
          {(['all', 'tour', 'experience'] as TypeFilter[]).map((f) => (
            <Chip key={f} label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'} selected={typeFilter === f} onPress={() => setTypeFilter(f)} tone="brand" />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUSES.map((s) => (
            <Chip key={s} label={s === 'all' ? 'Any status' : s.replace('_', ' ')} selected={statusFilter === s} onPress={() => setStatusFilter(s)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const g = guideOf(item);
          const v = villageOf(item);
          const slot = nextSlot(item);
          return (
            <View style={styles.card}>
              <SmartImage uri={item.photo} style={styles.img} fallbackIcon="hiking" />
              <View style={{ padding: spacing.md, gap: 6 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Badge label={item.status.replace('_', ' ')} tone={statusTone(item.status)} />
                </View>
                <Text style={styles.sub}>
                  {item.type.toUpperCase()}{item.tourCategory ? ` · ${item.tourCategory}` : ''}{item.experienceCategory ? ` · ${item.experienceCategory}` : ''} · {item.duration}
                </Text>
                <Text style={styles.sub}>{formatPrice(item.pricePerUnitLKR, currency)} / person · up to {item.capacity} · {bookingCount(item)} booking(s)</Text>
                <View style={styles.guideRow}>
                  <Avatar uri={g?.photo} name={g?.name} size={28} />
                  <Text style={styles.sub}>{g?.name || 'Unassigned'}{v ? ` · ${v.name}` : ''}</Text>
                  <Pressable onPress={() => openGuidePicker(item)} style={styles.guideLink}>
                    <MaterialIcons name="swap-horiz" size={16} color={colors.primary} />
                    <Text style={styles.guideLinkText}>Assign</Text>
                  </Pressable>
                </View>
                {slot ? (
                  <View style={styles.slotBox}>
                    <MaterialIcons name="event" size={14} color={colors.primary} />
                    <Text style={styles.sub}>Next departure: {slot.date} {slot.time} · {slot.capacity} seats</Text>
                  </View>
                ) : null}
                {item.status === 'needs_changes' && item.reviewReason ? (
                  <View style={styles.reasonBox}>
                    <MaterialIcons name="info" size={14} color={colors.warning} />
                    <Text style={styles.reasonText}>Reason: {item.reviewReason}</Text>
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Button title="Edit" variant="secondary" onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id, edit: '1' } })} />
                  {item.status === 'approved' ? <Button title="View" variant="ghost" onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })} /> : null}
                  {['submitted', 'under_review', 'needs_changes', 'draft'].includes(item.status) ? <Button title="Approve" onPress={() => approve(item)} /> : null}
                  {item.status === 'approved' ? <Button title="Suspend" variant="ghost" onPress={() => suspend(item)} /> : null}
                  {item.status === 'suspended' ? <Button title="Reinstate" onPress={() => reinstate(item)} /> : null}
                  <Button title="Delete" variant="danger" onPress={() => remove(item)} />
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="hiking" title="No activities found" message="Tap + to add a tour or experience." />}
      />

      <Modal visible={!!guidePicker} animationType="slide" onRequestClose={() => setGuidePicker(null)}>
        <Screen back onBack={() => setGuidePicker(null)} title="Assign guide">
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <Text style={styles.hint}>Choose the local guide responsible for “{guidePicker?.title}”.</Text>
            {guides.map((g) => (
              <Pressable key={g.id} style={[styles.guideOption, pickedGuide === g.id && styles.guideOptionActive]} onPress={() => setPickedGuide(g.id)}>
                <Avatar uri={g.photo} name={g.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideName}>{g.name}</Text>
                  <Text style={styles.sub}>{g.village || '—'}{(g.languagesSpoken || []).length ? ` · ${(g.languagesSpoken || []).join(', ')}` : ''}</Text>
                  <Badge label={g.status || 'active'} tone={g.status === 'suspended' ? 'danger' : g.status === 'pending' ? 'warning' : 'success'} />
                </View>
                <MaterialIcons name={pickedGuide === g.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={pickedGuide === g.id ? colors.primary : colors.textMuted} />
              </Pressable>
            ))}
            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={() => setGuidePicker(null)} />
              <Button title="Save" onPress={saveGuide} disabled={!pickedGuide} />
            </View>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md },
  img: { width: '100%', height: 150 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guideLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  guideLinkText: { ...typography.smallBold, color: colors.primary },
  slotBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgAlt, padding: spacing.sm, borderRadius: radius.md },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: spacing.sm, borderRadius: radius.md },
  reasonText: { ...typography.caption, color: colors.warning, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
  guideOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  guideOptionActive: { borderColor: colors.primary, backgroundColor: colors.bgAlt },
  guideName: { ...typography.bodyBold, color: colors.text },
});
