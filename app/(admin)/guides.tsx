import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';

type StatusFilter = 'all' | 'active' | 'pending' | 'suspended';

export default function AdminGuides() {
  const { users, user, updateUser, addUser } = useAuth();
  const { listings, addAudit } = useData();
  const { showAlert } = useAlert();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', village: '', languages: '', experience: '', bio: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const guides = users.filter((u) => u.role === 'guide');
  const filtered = guides.filter((g) => {
    if (status !== 'all' && (g.status || 'active') !== status) return false;
    if (q && !(g.name.toLowerCase().includes(q.toLowerCase()) || g.email.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const activityCount = (id: string) => listings.filter((l) => l.ownerId === id && (l.type === 'tour' || l.type === 'experience')).length;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (!form.password.trim()) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
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
      status: 'active',
    });
    if (!res.ok) { setErrors({ email: res.error || 'Failed to add guide' }); return; }
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'add_guide', target: form.name.trim(), createdAt: new Date().toISOString() });
    setOpen(false);
    setForm({ name: '', email: '', password: '', phone: '', village: '', languages: '', experience: '', bio: '' });
  };

  const approve = (id: string, name: string) => {
    showAlert('Approve guide?', `Approve ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        await updateUser(id, { status: 'active' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'approve_guide', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const suspend = (id: string, name: string) => {
    showAlert('Suspend guide?', `Suspend ${name}? Their activities stay visible but they cannot be assigned new ones.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
        await updateUser(id, { status: 'suspended' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'suspend_guide', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const reinstate = (id: string, name: string) => {
    showAlert('Reinstate guide?', `Reinstate ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reinstate', onPress: async () => {
        await updateUser(id, { status: 'active' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'reinstate_guide', target: name, createdAt: new Date().toISOString() });
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
              <Input label="Password *" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry error={errors.password} helper="Min 6 characters; share with the guide" />
              <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
              <Input label="Home village" value={form.village} onChangeText={(v) => setForm({ ...form, village: v })} />
              <Input label="Languages spoken" value={form.languages} onChangeText={(v) => setForm({ ...form, languages: v })} helper="Comma separated, e.g. English, Sinhala" />
              <Input label="Experience" value={form.experience} onChangeText={(v) => setForm({ ...form, experience: v })} />
              <Input label="Bio" value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
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
