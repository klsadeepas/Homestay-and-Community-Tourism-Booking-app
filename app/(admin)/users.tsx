import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { Role } from '@/services/types';

const ROLES: Role[] = ['traveler','owner','guide','coordinator','admin'];

export default function AdminUsers() {
  const { users, user, updateUser } = useAuth();
  const { addAudit } = useData();
  const { showAlert } = useAlert();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');

  const filtered = users.filter((u) => {
    if (role !== 'all' && u.role !== role) return false;
    if (q && !(u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const suspend = (id: string, name: string) => {
    showAlert('Suspend account?', `Suspend ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
        await updateUser(id, { status: 'suspended' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'suspend_user', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const reinstate = (id: string, name: string) => {
    showAlert('Reinstate account?', `Reinstate ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reinstate', onPress: async () => {
        await updateUser(id, { status: 'active' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'reinstate_user', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const grantCoordinator = (id: string, name: string) => {
    showAlert('Grant coordinator access?', `Promote ${name} to Community Coordinator?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Grant', onPress: async () => {
        await updateUser(id, { role: 'coordinator', status: 'active' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'grant_coordinator', target: name, reason: 'Admin promotion', createdAt: new Date().toISOString() });
      }},
    ]);
  };

  return (
    <Screen title="Users">
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Input placeholder="Search by name or email" value={q} onChangeText={setQ} />
        <View style={styles.chips}>
          {(['all', ...ROLES] as const).map((r) => (
            <Pressable key={r} onPress={() => setRole(r as any)} style={[styles.chip, role === r && styles.chipActive]}>
              <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar uri={item.photo} name={item.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge label={item.role} tone="info" />
                <Badge label={item.status || 'active'} tone={item.status === 'suspended' ? 'danger' : item.status === 'pending' ? 'warning' : 'success'} />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              {item.status === 'suspended' ? <Button title="Reinstate" variant="secondary" onPress={() => reinstate(item.id, item.name)} /> :
                item.role !== 'admin' ? <Button title="Suspend" variant="ghost" onPress={() => suspend(item.id, item.name)} /> : null}
              {item.role === 'owner' || item.role === 'guide' ? <Button title="Grant Coord" variant="ghost" onPress={() => grantCoordinator(item.id, item.name)} /> : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, height: 32, borderRadius: radius.pill, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  name: { ...typography.bodyBold, color: colors.text },
  email: { ...typography.caption, color: colors.textMuted },
});
