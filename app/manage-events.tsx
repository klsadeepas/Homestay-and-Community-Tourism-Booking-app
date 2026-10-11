import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateField } from '@/components/ui/DateField';
import { PhotoField } from '@/components/ui/PhotoField';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { EventItem } from '@/constants/sampleData';
import { hasErrors, numberField, required, textLength, type Errors } from '@/services/validation';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Status = 'all' | 'draft' | 'published' | 'cancelled';
const AUDIENCES: EventItem['audience'][] = ['all', 'travelers', 'residents', 'owners', 'guides'];
const EVENT_TYPES: NonNullable<EventItem['type']>[] = ['festival', 'cultural', 'market', 'other'];

export default function ManageEvents() {
  const router = useRouter();
  const { user } = useAuth();
  const { events, villages, addEvent, updateEvent, deleteEvent, logAction } = useData();
  const { t } = useSettings();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<Status>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const assigned = new Set(user?.role === 'admin' ? villages.map((v) => v.id) : (user?.assignedVillages || []));
  const mineEvents = events.filter((e) => assigned.has(e.villageId));
  const filtered = tab === 'all' ? mineEvents : mineEvents.filter((e) => e.status === tab);
  const liveToTravelers = (e: EventItem) => e.status === 'published' && (e.audience === 'all' || e.audience === 'travelers');
  const liveCount = mineEvents.filter(liveToTravelers).length;

  const [form, setForm] = useState<Partial<EventItem>>({
    audience: 'all', status: 'draft', capacity: 50, type: 'cultural',
  });

  const openNew = () => {
    setEditing(null);
    setForm({ audience: 'all', status: 'draft', capacity: 50, type: 'cultural', villageId: Array.from(assigned)[0] });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditing(e); setForm(e); setErrors({}); setOpen(true);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    e.title = required(form.title, 'Title') || textLength(form.title || '', 'Title', 4, 120);
    e.description = required(form.description, 'Description') || textLength(form.description || '', 'Description', 20, 1500);
    e.dateFrom = required(form.dateFrom, 'Start date');
    e.dateTo = form.dateTo && form.dateFrom && form.dateTo < form.dateFrom ? 'End date must be on or after the start date.' : '';
    e.capacity = numberField(form.capacity ?? '', { label: 'Capacity', min: 1, max: 100000, integer: true });
    e.villageId = required(form.villageId, 'Village');
    e.location = textLength(form.location || '', 'Location', 0, 120);
    e.photo = required(form.photo, 'Photo');
    setErrors(e);
    return !hasErrors(e);
  };

  const save = async (status: EventItem['status']) => {
    if (!validate()) return;
    const payload: EventItem = {
      id: editing?.id || `e-${Date.now()}`,
      villageId: form.villageId!,
      title: form.title!.trim(),
      description: form.description!.trim(),
      dateFrom: form.dateFrom!,
      dateTo: form.dateTo || form.dateFrom!,
      capacity: Number(form.capacity),
      photo: form.photo!,
      status,
      audience: form.audience || 'all',
      location: form.location?.trim() || undefined,
      type: form.type,
      authorId: user!.id,
    };
    if (editing) await updateEvent(payload.id, payload); else await addEvent(payload);
    await logAction(editing ? 'event_updated' : 'event_created', `${payload.title} · ${payload.dateFrom}${payload.dateTo !== payload.dateFrom ? ` → ${payload.dateTo}` : ''}`, `status=${status}`);
    setOpen(false);
  };

  const cancelEvent = (e: EventItem) => {
    showAlert('Cancel event?', 'Travelers will stop seeing it in discovery.', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Cancel event', style: 'destructive', onPress: async () => {
        await updateEvent(e.id, { status: 'cancelled' });
        await logAction('event_cancelled', e.title);
      }},
    ]);
  };

  const publish = (e: EventItem) => {
    showAlert('Publish event?', 'Travelers will see it in discovery.', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Publish', onPress: async () => {
        await updateEvent(e.id, { status: 'published' });
        await logAction('event_published', e.title, `audience=${e.audience}`);
      }},
    ]);
  };

  return (
    <Screen back title={t('manageEvents')} right={<Pressable onPress={openNew} accessibilityLabel="Create new event"><MaterialIcons name="add" size={24} color={colors.primary} /></Pressable>}>
      <View style={styles.tabs}>
        {(['all','draft','published','cancelled'] as Status[]).map((s) => (
          <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={tab === s} onPress={() => setTab(s)} />
        ))}
      </View>
      <Text style={styles.countLine}>{liveCount} live to travelers · {mineEvents.length - liveCount} hidden from travelers</Text>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {filtered.length === 0 ? <EmptyState icon="event" title="No events here" message="Tap + to create a new event." /> : filtered.map((e) => {
          const v = villages.find((x) => x.id === e.villageId);
          return (
            <View key={e.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{e.title}</Text>
                <Badge label={e.status} tone={e.status === 'published' ? 'success' : e.status === 'draft' ? 'muted' : 'danger'} />
              </View>
              {e.status === 'published' ? (
                liveToTravelers(e) ? (
                  <View style={styles.liveRow}>
                    <MaterialIcons name="visibility" size={16} color={colors.success} />
                    <Text style={styles.liveText}>Live — shown to travelers in discovery</Text>
                  </View>
                ) : (
                  <View style={[styles.liveRow, { borderColor: colors.border }]}>
                    <MaterialIcons name="visibility-off" size={16} color={colors.textMuted} />
                    <Text style={[styles.liveText, { color: colors.textMuted }]}>Hidden from travelers (audience: {e.audience})</Text>
                  </View>
                )
              ) : null}
              <Text style={styles.sub}>{v?.name} · {e.dateFrom}{e.dateFrom !== e.dateTo ? ` → ${e.dateTo}` : ''}</Text>
              <Text style={styles.sub}>Audience: {e.audience} · Capacity {e.capacity}</Text>
              <Text style={styles.desc} numberOfLines={2}>{e.description}</Text>
              <View style={styles.actions}>
                <Button title={t('edit')} variant="secondary" onPress={() => openEdit(e)} />
                {e.status === 'draft' ? <Button title="Publish" onPress={() => publish(e)} /> : null}
                {e.status === 'published' ? <Button title="Cancel event" variant="danger" onPress={() => cancelEvent(e)} /> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen back onBack={() => setOpen(false)} title={editing ? 'Edit event' : 'New event'}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Input label="Title *" value={form.title || ''} onChangeText={(v) => setForm({ ...form, title: v })} error={errors.title} />
              <Input label="Description *" value={form.description || ''} onChangeText={(v) => setForm({ ...form, description: v })} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} error={errors.description} />
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <DateField label="Start date *" value={form.dateFrom || ''} onChange={(v) => setForm({ ...form, dateFrom: v })} error={errors.dateFrom} title="Event start date" />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField label="End date" value={form.dateTo || ''} onChange={(v) => setForm({ ...form, dateTo: v })} minDate={form.dateFrom} error={errors.dateTo} title="Event end date" />
                </View>
              </View>
              <Input label="Location" value={form.location || ''} onChangeText={(v) => setForm({ ...form, location: v })} error={errors.location} />
              <Input label="Capacity *" value={String(form.capacity || '')} onChangeText={(v) => setForm({ ...form, capacity: Number(v) || 0 })} keyboardType="numeric" error={errors.capacity} />
              <PhotoField label="Photo *" value={form.photo || ''} onChange={(v) => setForm({ ...form, photo: v })} folder="events" error={errors.photo} allowCamera helper="Choose a picture from this phone — it uploads so every device can see it." />

              <Text style={styles.label}>Village *</Text>
              <View style={styles.chipRow}>
                {villages.filter((v) => assigned.has(v.id)).map((v) => (
                  <Chip key={v.id} label={v.name} selected={form.villageId === v.id} onPress={() => setForm({ ...form, villageId: v.id })} />
                ))}
              </View>
              {errors.villageId ? <Text style={styles.err}>{errors.villageId}</Text> : null}

              <Text style={styles.label}>Type</Text>
              <View style={styles.chipRow}>
                {EVENT_TYPES.map((tp) => (
                  <Chip key={tp} label={tp} selected={form.type === tp} onPress={() => setForm({ ...form, type: tp })} />
                ))}
              </View>

              <Text style={styles.label}>Audience</Text>
              <View style={styles.chipRow}>
                {AUDIENCES.map((a) => (
                  <Chip key={a} label={a!} selected={form.audience === a} onPress={() => setForm({ ...form, audience: a })} />
                ))}
              </View>
              <Text style={styles.hint}>Drafts stay hidden from traveler discovery. Published events appear only to the selected audience.</Text>

              <View style={styles.actions}>
                <Button title={t('cancel')} variant="ghost" onPress={() => setOpen(false)} />
                <Button title="Save as draft" variant="secondary" onPress={() => save('draft')} />
                <Button title="Publish" onPress={() => save('published')} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, flexWrap: 'wrap' },
  countLine: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: -spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.caption, color: colors.textMuted },
  desc: { ...typography.small, color: colors.text, marginTop: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.success, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  liveText: { ...typography.smallBold, color: colors.success, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' },
  label: { ...typography.smallBold, color: colors.text, marginTop: spacing.md, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm },
  err: { color: colors.danger, ...typography.caption, marginTop: 4 },
});
