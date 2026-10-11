import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { PhotoField } from '@/components/ui/PhotoField';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { csv, email as emailRule, hasErrors, password as passwordRule, phone as phoneRule, required, textLength, type Errors } from '@/services/validation';
import { colors, radius, spacing, typography } from '@/constants/theme';

type StatusFilter = 'all' | 'active' | 'pending' | 'suspended';
const WORD = /^[A-Za-zÀ-ɏ'’ -]{2,30}$/;

export default function AdminGuides() {
  const { users, updateUser, addUser } = useAuth();
  const { listings, logAction } = useData();
  const { showAlert } = useAlert();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', village: '', languages: '', experience: '', bio: '', photo: '' });
  const [errors, setErrors] = useState<Errors>({});

  const guides = users.filter((u) => u.role === 'guide');
  const filtered = guides.filter((g) => {
    if (status !== 'all' && (g.status || 'active') !== status) return false;
    if (q && !(g.name.toLowerCase().includes(q.toLowerCase()) || g.email.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const activityCount = (id: string) => listings.filter((l) => l.ownerId === id && (l.type === 'tour' || l.type === 'experience')).length;

  const validate = (): boolean => {
    const e: Errors = {};
    e.name = required(form.name, 'Name') || textLength(form.name, 'Name', 3, 80);
    e.email = required(form.email, 'Email') || emailRule(form.email);
    e.password = required(form.password, 'Password') || passwordRule(form.password, 6);
    e.phone = phoneRule(form.phone, 'Phone');
    e.village = textLength(form.village, 'Home village', 0, 80);
    e.languages = csv(form.languages, 'Languages', (item) => (WORD.test(item) ? '' : `"${item}" is not a valid language name.`));
    e.experience = textLength(form.experience, 'Experience', 0, 500);
    e.bio = textLength(form.bio, 'Bio', 0, 500);
    setErrors(e);
    return !hasErrors(e);
  };

  const save = async () => {
    if (!validate()) return;
    const res = await addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: 'guide',
      phone: form.phone.trim() || undefined,
      village: form.village.trim() || undefined,
      languagesSpoken: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
      experience: form.experience.trim() || undefined,
      bio: form.bio.trim() || undefined,
      photo: form.photo || undefined,
      status: 'active',
    });
    if (!res.ok) { setErrors({ email: res.error || 'Failed to add guide' }); return; }
    await logAction('guide_added', `${form.name.trim()} · ${form.email.trim()}`, form.village.trim() ? `village=${form.village.trim()}` : undefined);
    setOpen(false);
    setForm({ name: '', email: '', password: '', phone: '', village: '', languages: '', experience: '', bio: '', photo: '' });
    setErrors({});
    showAlert('Guide added', `${form.name.trim()} can now sign in with this email and password.`);
  };

  const approve = (id: string, name: string) => {
    showAlert('Approve guide?', `Approve ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        await updateUser(id, { status: 'active' });
        await logAction('guide_approved', name);
      }},
    ]);
  };

  const suspend = (id: string, name: string) => {
    showAlert('Suspend guide?', `Suspend ${name}? Their activities stay visible but they cannot be assigned new ones.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
        await updateUser(id, { status: 'suspended' });
        await logAction('guide_suspended', name);
      }},
    ]);
  };

  const reinstate = (id: string, name: string) => {
    showAlert('Reinstate guide?', `Reinstate ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reinstate', onPress: async () => {
        await updateUser(id, { status: 'active' });
        await logAction('guide_reinstated', name);
      }},
    ]);
  };

  return (
    <Screen back title="Local Guides" right={<Pressable onPress={() => { setErrors({}); setOpen(true); }} accessibilityLabel="Add guide"><MaterialIcons name="person-add" size={24} color={colors.primary} /></Pressable>}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
        <Input placeholder="Search by name or email" value={q} onChangeText={setQ} />
        <View style={styles.chipRow}>
          {(['all', 'active', 'pending', 'suspended'] as StatusFilter[]).map((s) => (
            <Chip key={s} label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} selected={status === s} onPress={() => setStatus(s)} tone="brand" />
          ))}
        </View>
        <Text style={styles.count}>{filtered.length} of {guides.length} guides</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar uri={item.photo} name={item.name} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Badge label={item.status || 'active'} tone={item.status === 'suspended' ? 'danger' : item.status === 'pending' ? 'warning' : 'success'} />
              </View>
              <Text style={styles.sub}>{item.email}</Text>
              {item.village ? <Text style={styles.sub}>Based in {item.village}</Text> : null}
              {(item.languagesSpoken || []).length ? (
                <View style={styles.tagRow}>
                  {(item.languagesSpoken || []).map((l) => <Badge key={l} label={l} tone="info" />)}
                </View>
              ) : null}
              {item.experience ? <Text style={styles.sub} numberOfLines={1}>{item.experience}</Text> : null}
              <Text style={styles.sub}>{activityCount(item.id)} activity(ies) assigned</Text>
              <View style={styles.actions}>
                {(item.status || 'active') === 'pending' ? <Button title="Approve" onPress={() => approve(item.id, item.name)} /> : null}
                {(item.status || 'active') === 'active' ? <Button title="Suspend" variant="ghost" onPress={() => suspend(item.id, item.name)} /> : null}
                {item.status === 'suspended' ? <Button title="Reinstate" variant="secondary" onPress={() => reinstate(item.id, item.name)} /> : null}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="hiking" title="No guides found" message="Tap the person icon to register a local guide." />}
      />

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen back onBack={() => setOpen(false)} title="Add local guide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Input label="Full name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} error={errors.name} />
              <Input label="Email *" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
              <Input label="Password *" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry error={errors.password} helper="Min 6 characters, no spaces; share with the guide" />
              <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" error={errors.phone} helper="e.g. 077 123 4567" />
              <Input label="Home village" value={form.village} onChangeText={(v) => setForm({ ...form, village: v })} error={errors.village} />
              <Input label="Languages spoken" value={form.languages} onChangeText={(v) => setForm({ ...form, languages: v })} error={errors.languages} helper="Comma separated, e.g. English, Sinhala" />
              <Input label="Experience" value={form.experience} onChangeText={(v) => setForm({ ...form, experience: v })} error={errors.experience} />
              <Input label="Bio" value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} error={errors.bio} />
              <PhotoField label="Guide photo" value={form.photo} onChange={(v) => setForm({ ...form, photo: v })} folder="profiles" allowCamera helper="Optional — choose from this phone so travelers can recognise the guide." />
              <View style={styles.actions}>
                <Button title="Cancel" variant="ghost" onPress={() => setOpen(false)} />
                <Button title="Add guide" onPress={save} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  count: { ...typography.caption, color: colors.textMuted },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, alignItems: 'flex-start' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
});
