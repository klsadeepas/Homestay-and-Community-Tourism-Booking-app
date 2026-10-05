import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { RangeField } from '@/components/ui/RangeField';
import { Stepper } from '@/components/ui/Stepper';
import { ListingCard } from '@/components/feature/ListingCard';
import { VillageMapView } from '@/components/feature/VillageMapView';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { storage, KEYS } from '@/services/storage';
import { formatPrice } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

type ViewMode = 'list' | 'map';
type TypeFilter = 'all' | 'homestay' | 'tour' | 'experience';
type SortKey = 'popularity' | 'priceAsc' | 'priceDesc' | 'rating';

const AMENITIES = ['Wi-Fi', 'Breakfast', 'Hot Water', 'Garden', 'Bicycle Rental', 'Mountain View'];
const ACCESSIBILITY_OPTIONS = ['Step-free entrance', 'Private bathroom', 'Vegetarian', 'Vegan', 'Halal'];

type FiltersState = {
  query: string;
  type: TypeFilter;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
  guests: number;
  amenities: string[];
  access: string[];
  sort: SortKey;
};
const EMPTY: FiltersState = {
  query: '', type: 'all', dateFrom: '', dateTo: '', minPrice: '', maxPrice: '',
  guests: 1, amenities: [], access: [], sort: 'popularity',
};

export default function Search() {
  const router = useRouter();
  const { listings, villages, wishlist, toggleWishlist } = useData();
  const { t, currency } = useSettings();
  const [filters, setFilters] = useState<FiltersState>(EMPTY);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FiltersState>(EMPTY);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedVillageId, setSelectedVillageId] = useState<string | undefined>(undefined);

  // Persist filters across view toggles and detail navigation.
  useEffect(() => {
    (async () => {
      const stored = await storage.get<FiltersState>(KEYS.filters);
      if (stored) { setFilters(stored); setDraft(stored); }
    })();
  }, []);
  useEffect(() => { storage.set(KEYS.filters, filters); }, [filters]);

  const filtered = useMemo(() => {
    const base = listings.filter((l) => {
      if (l.status !== 'approved') return false;
      if (filters.type !== 'all' && l.type !== filters.type) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const village = villages.find((v) => v.id === l.villageId);
        if (!l.title.toLowerCase().includes(q) && !(village?.name.toLowerCase().includes(q))) return false;
      }
      if (filters.minPrice && l.pricePerUnitLKR < Number(filters.minPrice)) return false;
      if (filters.maxPrice && l.pricePerUnitLKR > Number(filters.maxPrice)) return false;
      if (filters.guests > l.capacity) return false;
      if (filters.amenities.length > 0) {
        const have = new Set((l.amenities || []).map((x) => x.toLowerCase()));
        for (const a of filters.amenities) if (!have.has(a.toLowerCase())) return false;
      }
      if (filters.access.length > 0) {
        const all = [
          ...(l.accessibility?.mobility || []),
          ...(l.accessibility?.bathroom || []),
          ...(l.accessibility?.food || []),
        ].map((x) => x.toLowerCase());
        for (const a of filters.access) if (!all.some((v) => v.includes(a.toLowerCase()))) return false;
      }
      return true;
    });
    const sorted = [...base];
    if (filters.sort === 'priceAsc') sorted.sort((a, b) => a.pricePerUnitLKR - b.pricePerUnitLKR);
    else if (filters.sort === 'priceDesc') sorted.sort((a, b) => b.pricePerUnitLKR - a.pricePerUnitLKR);
    else if (filters.sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    return sorted;
  }, [listings, villages, filters]);

  const mapVillagePins = useMemo(() => {
    return villages.map((v) => {
      const count = filtered.filter((l) => l.villageId === v.id).length;
      return {
        id: v.id,
        name: v.name,
        region: v.region,
        lat: v.coordinates.lat,
        lng: v.coordinates.lng,
        listingCount: count,
        photo: v.photo,
      };
    });
  }, [villages, filtered]);

  const activeFilterCount = (
    (filters.type !== 'all' ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.guests > 1 ? 1 : 0) +
    filters.amenities.length +
    filters.access.length +
    (filters.sort !== 'popularity' ? 1 : 0)
  );

  const openSheet = () => { setDraft(filters); setOpen(true); };
  const applyFilters = () => { setFilters(draft); setOpen(false); };
  const resetFilters = () => { setDraft(EMPTY); setFilters(EMPTY); };

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <Screen title={t('search')}>
      <View style={styles.topBar}>
        <Input placeholder={t('search_ph')} value={filters.query} onChangeText={(v) => setFilters({ ...filters, query: v })} containerStyle={{ marginBottom: 0, flex: 1 }} />
        <Pressable onPress={openSheet} style={styles.filterBtn} accessibilityLabel="Open filters">
          <MaterialIcons name="tune" size={20} color={colors.primary} />
          {activeFilterCount > 0 ? <View style={styles.dot}><Text style={styles.dotText}>{activeFilterCount}</Text></View> : null}
        </Pressable>
      </View>

      <View style={styles.chipsRow}>
        {(['all', 'homestay', 'tour', 'experience'] as TypeFilter[]).map((f) => (
          <Chip key={f} label={f === 'all' ? 'All' : f === 'homestay' ? 'Homestays' : f === 'tour' ? 'Tours' : 'Experiences'} selected={filters.type === f} onPress={() => setFilters({ ...filters, type: f })} />
        ))}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setView(view === 'list' ? 'map' : 'list')} style={styles.toggle} accessibilityLabel="Toggle map view">
          <MaterialIcons name={view === 'list' ? 'map' : 'list'} size={18} color={colors.primary} />
          <Text style={styles.toggleText}>{view === 'list' ? t('mapView') : t('listView')}</Text>
        </Pressable>
      </View>

      <View style={styles.resultBar}>
        <Text style={styles.resultCount}>{filtered.length} result{filtered.length === 1 ? '' : 's'}</Text>
        {activeFilterCount > 0 ? <Pressable onPress={resetFilters}><Text style={styles.clear}>Clear all</Text></Pressable> : null}
      </View>

      {view === 'map' ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={styles.mapCard}>
            <View style={styles.mapCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="map" size={20} color={colors.primary} />
                <Text style={styles.mapHeaderTitle}>Interactive Village Map</Text>
              </View>
              <Text style={styles.mapHeaderHint}>Tap a pin to explore stays</Text>
            </View>

            <VillageMapView
              villages={mapVillagePins}
              selectedVillageId={selectedVillageId}
              onSelectVillage={(vId) => setSelectedVillageId(vId === selectedVillageId ? undefined : vId)}
              height={290}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapChipsRow}>
              <Pressable
                onPress={() => setSelectedVillageId(undefined)}
                style={[styles.mapChip, !selectedVillageId && styles.mapChipActive]}
              >
                <Text style={[styles.mapChipText, !selectedVillageId && styles.mapChipTextActive]}>
                  All villages ({filtered.length})
                </Text>
              </Pressable>
              {villages.map((v) => {
                const count = filtered.filter((l) => l.villageId === v.id).length;
                const active = selectedVillageId === v.id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVillageId(active ? undefined : v.id)}
                    style={[styles.mapChip, active && styles.mapChipActive]}
                  >
                    <Text style={[styles.mapChipText, active && styles.mapChipTextActive]}>
                      {v.name} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {villages
            .filter((v) => !selectedVillageId || v.id === selectedVillageId)
            .map((v) => {
              const vListings = filtered.filter((l) => l.villageId === v.id);
              if (!vListings.length) return null;
              return (
                <View key={v.id} style={styles.villageGroup}>
                  <View style={styles.villageHeader}>
                    <MaterialIcons name="location-on" size={18} color={colors.primary} />
                    <Text style={styles.villageName}>{v.name}</Text>
                    <Text style={styles.villageMeta}>{v.coordinates.lat.toFixed(3)}, {v.coordinates.lng.toFixed(3)}</Text>
                  </View>
                  {vListings.map((l) => (
                    <Pressable key={l.id} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} style={styles.pinRow}>
                      <MaterialIcons name={l.type === 'homestay' ? 'home' : l.type === 'tour' ? 'hiking' : 'restaurant'} size={20} color={l.type === 'homestay' ? colors.primary : l.type === 'tour' ? colors.info : colors.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pinTitle}>{l.title}</Text>
                        <Text style={styles.pinSub}>{formatPrice(l.pricePerUnitLKR, currency)} · ★ {l.rating.toFixed(1)}{l.instantBooking ? ' · Instant' : ''}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              );
            })}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => {
            const village = villages.find((v) => v.id === item.villageId);
            return (
              <ListingCard
                listing={item}
                village={village}
                saved={wishlist.includes(item.id)}
                onSave={() => toggleWishlist(item.id)}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
              />
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No results. Try different filters or clear all.</Text>}
        />
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen title={t('filters')} back onBack={() => setOpen(false)} right={<Pressable onPress={() => setDraft(EMPTY)}><Text style={styles.sheetReset}>{t('reset')}</Text></Pressable>}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
            <Text style={styles.sheetSection}>{t('dateRange')}</Text>
            <RangeField label="From / To (YYYY-MM-DD)" min={draft.dateFrom} max={draft.dateTo} onMin={(v) => setDraft({ ...draft, dateFrom: v })} onMax={(v) => setDraft({ ...draft, dateTo: v })} />
            <Text style={styles.sheetHint}>Availability check runs at booking submission.</Text>

            <Text style={styles.sheetSection}>{t('priceRange')} (LKR)</Text>
            <RangeField label="Price range" min={draft.minPrice} max={draft.maxPrice} onMin={(v) => setDraft({ ...draft, minPrice: v })} onMax={(v) => setDraft({ ...draft, maxPrice: v })} numeric suffix="LKR" />

            <Text style={styles.sheetSection}>{t('guests')}</Text>
            <View style={styles.inset}>
              <Stepper label="Guests" value={draft.guests} onChange={(v) => setDraft({ ...draft, guests: v })} min={1} max={20} />
            </View>

            <Text style={styles.sheetSection}>{t('amenities')}</Text>
            <View style={styles.chipWrap}>
              {AMENITIES.map((a) => (
                <Chip key={a} label={a} selected={draft.amenities.includes(a)} onPress={() => setDraft({ ...draft, amenities: toggle(draft.amenities, a) })} />
              ))}
            </View>

            <Text style={styles.sheetSection}>{t('accessibility')}</Text>
            <View style={styles.chipWrap}>
              {ACCESSIBILITY_OPTIONS.map((a) => (
                <Chip key={a} label={a} selected={draft.access.includes(a)} onPress={() => setDraft({ ...draft, access: toggle(draft.access, a) })} />
              ))}
            </View>
            <Text style={styles.sheetHint}>Filters surface stated details only; confirm with host before booking.</Text>

            <Text style={styles.sheetSection}>{t('sortBy')}</Text>
            <View style={styles.chipWrap}>
              {([
                { k: 'popularity', l: t('sortPopularity') },
                { k: 'priceAsc', l: t('sortPriceAsc') },
                { k: 'priceDesc', l: t('sortPriceDesc') },
                { k: 'rating', l: t('sortRating') },
              ] as { k: SortKey; l: string }[]).map(({ k, l }) => (
                <Chip key={k} label={l} selected={draft.sort === k} onPress={() => setDraft({ ...draft, sort: k })} />
              ))}
            </View>
          </ScrollView>
          <View style={styles.sheetFoot}>
            <Button title={t('cancel')} variant="ghost" onPress={() => setOpen(false)} />
            <Button title={`${t('apply')} filters`} onPress={applyFilters} />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filterBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  toggleText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  resultBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  resultCount: { ...typography.smallBold, color: colors.text },
  clear: { ...typography.smallBold, color: colors.primary },
  mapFallback: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6 },
  mapTitle: { ...typography.h3, color: colors.text },
  mapSub: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  villageGroup: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm },
  villageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm },
  villageName: { ...typography.bodyBold, color: colors.text, flex: 1 },
  villageMeta: { ...typography.caption, color: colors.textMuted },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pinTitle: { ...typography.smallBold, color: colors.text },
  pinSub: { ...typography.caption, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, padding: spacing.xl },
  sheetSection: { ...typography.smallBold, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  sheetHint: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: -4, marginBottom: spacing.sm },
  sheetFoot: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, justifyContent: 'flex-end' },
  sheetReset: { ...typography.smallBold, color: colors.primary },
  inset: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mapCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  mapHeaderTitle: { ...typography.smallBold, color: colors.text },
  mapHeaderHint: { ...typography.caption, color: colors.textMuted },
  mapChipsRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, flexDirection: 'row' },
  mapChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  mapChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  mapChipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  mapChipTextActive: { color: '#FFFFFF' },
});
