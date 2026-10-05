import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { ListingCard } from '@/components/feature/ListingCard';
import { VillageMapView } from '@/components/feature/VillageMapView';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/services/currency';
import { ResponsibleGuide } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

const TOPICS: ResponsibleGuide['topic'][] = ['customs','photography','waste','wildlife','sacred','respectful'];

export default function VillageDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { villages, listings, events, transport, responsible, seasonal, bookings,
    updateVillage, addResponsible, updateResponsible, addAudit } = useData();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { t, currency } = useSettings();
  const village = villages.find((v) => v.id === id);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(village?.description || '');
  const [guideOpen, setGuideOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<ResponsibleGuide | null>(null);
  const [gForm, setGForm] = useState<Partial<ResponsibleGuide>>({ topic: 'customs' });

  const canEdit = user?.role === 'coordinator' || user?.role === 'admin';
  const assigned = new Set(user?.assignedVillages || []);
  const canEditThisVillage = user?.role === 'admin' || (user?.role === 'coordinator' && assigned.has(id as string));

  if (!village) return <Screen back title="Village"><Text style={{ padding: 20 }}>Not found.</Text></Screen>;

  const villageListings = listings.filter((l) => l.villageId === village.id && l.status === 'approved');
  const homestays = villageListings.filter((l) => l.type === 'homestay');
  const tours = villageListings.filter((l) => l.type === 'tour');
  const experiences = villageListings.filter((l) => l.type === 'experience');
  const villageEvents = events.filter((e) => e.villageId === village.id && e.status === 'published');
  const villageTransport = transport.filter((tr) => tr.villageId === village.id);
  const villageSeasonal = seasonal.filter((s) => !s.villageId || s.villageId === village.id);
  const publishedGuides = responsible.filter((g) => g.villageId === village.id && g.status === 'published');
  const draftGuides = responsible.filter((g) => g.villageId === village.id && g.status !== 'published');

  // Benefit summary across village listings and bookings
  const villageListingIds = new Set(villageListings.map((l) => l.id));
  const completedBookings = bookings.filter((b) => villageListingIds.has(b.listingId) && b.status === 'completed');
  const providersInvolved = new Set(villageListings.map((l) => l.ownerId));
  const traceableContributions = villageListings
    .filter((l) => l.benefit && (l.benefit.amountLKR || l.benefit.percentage))
    .map((l) => {
      const listingCompleted = completedBookings.filter((b) => b.listingId === l.id);
      const base = l.benefit!.amountLKR ? l.benefit!.amountLKR * listingCompleted.length
        : (l.benefit!.percentage! / 100) * listingCompleted.reduce((s, b) => s + b.totalLKR, 0);
      return { title: l.title, project: l.benefit!.projectName || l.benefit!.beneficiary, lkr: base };
    });
  const totalContribution = traceableContributions.reduce((s, c) => s + c.lkr, 0);

  const save = async () => {
    await updateVillage(village.id, { description: desc });
    setEditing(false);
    showAlert('Saved', 'Village profile updated.');
  };

  const openGuideNew = () => {
    setEditingGuide(null);
    setGForm({ topic: 'customs', villageId: village.id, status: 'draft' });
    setGuideOpen(true);
  };
  const openGuideEdit = (g: ResponsibleGuide) => {
    setEditingGuide(g); setGForm(g); setGuideOpen(true);
  };
  const saveGuide = async (status: ResponsibleGuide['status']) => {
    if (!gForm.title?.trim() || !gForm.body?.trim()) { showAlert('Missing', 'Title and body are required.'); return; }
    const payload: ResponsibleGuide = {
      id: editingGuide?.id || `rg-${Date.now()}`,
      villageId: village.id,
      topic: (gForm.topic as any) || 'customs',
      title: gForm.title!.trim(),
      body: gForm.body!.trim(),
      status,
      reviewedBy: status === 'published' ? user!.id : editingGuide?.reviewedBy,
      reviewedAt: status === 'published' ? new Date().toISOString() : editingGuide?.reviewedAt,
      updatedAt: new Date().toISOString(),
    };
    if (editingGuide) await updateResponsible(payload.id, payload);
    else await addResponsible(payload);
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'responsible_update', target: payload.title, reason: `status=${status}`, createdAt: new Date().toISOString() });
    setGuideOpen(false);
  };

  const flagGuide = (g: ResponsibleGuide) => {
    showAlert('Flag for review?', 'This marks the guidance as needing an update by a local reviewer.', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Flag', onPress: () => updateResponsible(g.id, { status: 'needs_update' }) },
    ]);
  };

  return (
    <Screen back title={village.name}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <SmartImage uri={village.photo} style={styles.hero} fallbackIcon="landscape" />
        <View style={styles.body}>
          <Text style={styles.title}>{village.name}</Text>
          <Text style={styles.region}>{village.region}</Text>
          {editing ? (
            <>
              <Input value={desc} onChangeText={setDesc} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} />
              <View style={styles.actions}>
                <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
                <Button title="Save" onPress={save} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.desc}>{village.description}</Text>
              {canEditThisVillage ? <Button title="Edit village profile" variant="secondary" onPress={() => setEditing(true)} /> : null}
            </>
          )}

          <Text style={styles.section}>Attractions</Text>
          {village.attractions.map((a) => (
            <View key={a} style={styles.item}><MaterialIcons name="place" size={16} color={colors.primary} /><Text style={styles.itemText}>{a}</Text></View>
          ))}

          <Text style={styles.section}>Map location</Text>
          <View style={styles.mapWrapper}>
            <VillageMapView
              villages={[{
                id: village.id,
                name: village.name,
                region: village.region,
                lat: village.coordinates.lat,
                lng: village.coordinates.lng,
                listingCount: villageListings.length,
                photo: village.photo,
              }]}
              selectedVillageId={village.id}
              center={{ lat: village.coordinates.lat, lng: village.coordinates.lng }}
              zoom={13}
              height={220}
            />
            <View style={styles.mapCoordBar}>
              <MaterialIcons name="location-on" size={16} color={colors.primary} />
              <Text style={styles.mapCoordText}>
                {village.name} · {village.coordinates.lat.toFixed(4)}, {village.coordinates.lng.toFixed(4)}
              </Text>
            </View>
          </View>

          {/* Transport */}
          <Text style={styles.section}>{t('transport')}</Text>
          <Text style={styles.body2}>{village.transport}</Text>
          {villageTransport.map((tr) => (
            <View key={tr.id} style={styles.transportCard}>
              <MaterialIcons name={tr.mode === 'bus' ? 'directions-bus' : tr.mode === 'taxi' ? 'local-taxi' : tr.mode === 'tuk-tuk' ? 'electric-rickshaw' : 'directions'} size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.transportName}>{tr.name}</Text>
                <Text style={styles.caption}>{tr.operatingArea} · {tr.availability}</Text>
                <Text style={styles.caption}>Contact: {tr.contactMethod}</Text>
                {tr.estFareLKR ? <Text style={styles.caption}>Estimated fare: {formatPrice(tr.estFareLKR, currency)} (demo estimate).</Text> : null}
                {tr.accessibility ? <Text style={styles.caption}>Access: {tr.accessibility}</Text> : null}
              </View>
            </View>
          ))}
          <Text style={styles.caption}>Transport details are sample data unless marked otherwise. Confirm locally.</Text>

          {/* Responsible travel */}
          <View style={styles.sectionHead}>
            <Text style={styles.section}>{t('responsibleTravel')}</Text>
            {canEditThisVillage ? <Pressable onPress={openGuideNew}><MaterialIcons name="add" size={22} color={colors.primary} /></Pressable> : null}
          </View>
          {publishedGuides.length === 0 ? (
            <Text style={styles.caption}>No locally reviewed guidance for this village yet. Travelers should ask hosts for current practices.</Text>
          ) : publishedGuides.map((g) => (
            <View key={g.id} style={styles.guideCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <MaterialIcons name="rule" size={16} color={colors.primary} />
                  <Text style={styles.guideTitle}>{g.title}</Text>
                </View>
                <Badge label={g.topic} tone="info" />
              </View>
              <Text style={styles.guideBody}>{g.body}</Text>
              <Text style={styles.caption}>Reviewed {g.reviewedAt ? new Date(g.reviewedAt).toLocaleDateString() : '—'} by a local coordinator.</Text>
              <View style={styles.guideFoot}>
                {canEditThisVillage ? <Pressable onPress={() => openGuideEdit(g)}><Text style={styles.link}>Edit</Text></Pressable> : null}
                <Pressable onPress={() => flagGuide(g)}><Text style={styles.linkDanger}>Flag as outdated</Text></Pressable>
              </View>
            </View>
          ))}
          {canEditThisVillage && draftGuides.length > 0 ? (
            <>
              <Text style={styles.subheading}>Drafts & flags (coordinator)</Text>
              {draftGuides.map((g) => (
                <Pressable key={g.id} style={styles.draftRow} onPress={() => openGuideEdit(g)}>
                  <MaterialIcons name="edit-note" size={16} color={colors.warning} />
                  <Text style={{ flex: 1, ...typography.small, color: colors.text }}>{g.title}</Text>
                  <Badge label={g.status.replace('_',' ')} tone={g.status === 'submitted' ? 'warning' : 'muted'} />
                </Pressable>
              ))}
            </>
          ) : null}

          {/* Community benefit */}
          <Text style={styles.section}>{t('communityBenefit')}</Text>
          <View style={styles.benefitSummary}>
            <Row label="Completed bookings" value={`${completedBookings.length}`} />
            <Row label="Local providers involved" value={`${providersInvolved.size}`} />
            <Row label="Traceable contributions" value={formatPrice(totalContribution, currency)} />
            <Text style={styles.caption}>Figures are derived from recorded listing-level benefit records only. We do not estimate a "local share" from gross booking value. Demo data where live records are missing.</Text>
          </View>

          {/* Seasonal + Events */}
          <Text style={styles.section}>{t('seasonal')}</Text>
          {villageSeasonal.map((s) => (
            <View key={s.id} style={styles.seasonCard}>
              <Text style={styles.seasonTag}>{s.type.toUpperCase()}{s.recurring ? ' · recurring' : ''}</Text>
              <Text style={styles.transportName}>{s.title}</Text>
              <Text style={styles.caption}>{s.description}</Text>
              {s.dateFrom ? <Text style={styles.caption}>Typical window: {s.dateFrom}{s.dateTo ? ` – ${s.dateTo}` : ''}. Dates vary year to year.</Text> : null}
            </View>
          ))}
          {villageEvents.map((e) => (
            <View key={e.id} style={styles.seasonCard}>
              <Text style={styles.seasonTag}>EVENT · {e.audience}</Text>
              <Text style={styles.transportName}>{e.title}</Text>
              <Text style={styles.caption}>{e.dateFrom}{e.dateTo && e.dateTo !== e.dateFrom ? ` – ${e.dateTo}` : ''} · capacity {e.capacity}</Text>
              <Text style={styles.caption}>{e.description}</Text>
            </View>
          ))}

          <Text style={styles.section}>Stays, tours & experiences</Text>
          {homestays.map((l) => <ListingCard key={l.id} listing={l} village={village} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} />)}
          {tours.map((l) => <ListingCard key={l.id} listing={l} village={village} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} />)}
          {experiences.map((l) => <ListingCard key={l.id} listing={l} village={village} onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} />)}

          <Text style={styles.section}>Visitor etiquette</Text>
          <Text style={styles.body2}>{village.etiquette}</Text>
        </View>
      </ScrollView>

      <Modal visible={guideOpen} animationType="slide" onRequestClose={() => setGuideOpen(false)}>
        <Screen back onBack={() => setGuideOpen(false)} title={editingGuide ? 'Edit guidance' : 'New guidance'}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Text style={styles.subheading}>Topic</Text>
              <View style={styles.chipRow}>
                {TOPICS.map((tp) => (
                  <Chip key={tp} label={tp} selected={gForm.topic === tp} onPress={() => setGForm({ ...gForm, topic: tp })} />
                ))}
              </View>
              <Input label="Title *" value={gForm.title || ''} onChangeText={(v) => setGForm({ ...gForm, title: v })} />
              <Input label="Body *" value={gForm.body || ''} onChangeText={(v) => setGForm({ ...gForm, body: v })} multiline numberOfLines={5} style={{ minHeight: 120, textAlignVertical: 'top' }} />
              <Text style={styles.caption}>Only publish items reviewed by an authorized local coordinator for this village.</Text>
              <View style={styles.actions}>
                <Button title={t('cancel')} variant="ghost" onPress={() => setGuideOpen(false)} />
                <Button title="Save draft" variant="secondary" onPress={() => saveGuide('draft')} />
                <Button title="Publish" onPress={() => saveGuide('published')} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
      <Text style={{ ...typography.small, color: colors.textMuted, flex: 1 }}>{label}</Text>
      <Text style={{ ...typography.smallBold, color: colors.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 240 },
  body: { padding: spacing.lg, gap: 6 },
  title: { ...typography.h1, color: colors.text },
  region: { ...typography.small, color: colors.textMuted },
  desc: { ...typography.body, color: colors.text, marginVertical: spacing.sm },
  body2: { ...typography.body, color: colors.text },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subheading: { ...typography.smallBold, color: colors.text, marginTop: spacing.md, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  itemText: { ...typography.body, color: colors.text },
  mapBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', gap: 4 },
  mapWrapper: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  mapCoordBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.border },
  mapCoordText: { ...typography.caption, color: colors.textMuted },
  mapTitle: { ...typography.smallBold, color: colors.text },
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  transportCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  transportName: { ...typography.bodyBold, color: colors.text },
  guideCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, gap: 6 },
  guideTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  guideBody: { ...typography.small, color: colors.text },
  guideFoot: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  link: { ...typography.smallBold, color: colors.primary },
  linkDanger: { ...typography.smallBold, color: colors.danger },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, marginBottom: 6 },
  benefitSummary: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  seasonCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, gap: 2 },
  seasonTag: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.md, flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
