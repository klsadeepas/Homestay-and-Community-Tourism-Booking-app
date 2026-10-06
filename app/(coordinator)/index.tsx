import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function CoordinatorDashboard() {
  const router = useRouter();
  const { user, users, updateUser } = useAuth();
  const { listings, reports, addAnnouncement, updateReport, addAudit, events, responsible } = useData();
  const { t } = useSettings();
  const { showAlert } = useAlert();

  const assigned = new Set(user?.assignedVillages || []);
  const myListings = listings.filter((l) => assigned.has(l.villageId));
  const pending = myListings.filter((l) => l.status === 'submitted' || l.status === 'under_review');
  const pendingUsers = users.filter((u) => (u.role === 'owner' || u.role === 'guide') && u.status === 'pending');
  const openReports = reports.filter((r) => r.status === 'open');
  const myEvents = events.filter((e) => assigned.has(e.villageId));
  const pendingGuides = responsible.filter((g) => g.status === 'submitted' && assigned.has(g.villageId));

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  const postAnnouncement = async () => {
    if (!annTitle || !annBody) { showAlert('Missing fields', 'Enter a title and body.'); return; }
    await addAnnouncement({ id: `a-${Date.now()}`, title: annTitle, body: annBody, audience: 'all', urgent: false, authorId: user!.id, createdAt: new Date().toISOString() });
    setAnnTitle(''); setAnnBody('');
    showAlert('Posted', 'Announcement visible to the community.');
  };

  const resolveReport = (id: string) => {
    showAlert('Resolve report?', '', [
      { text: t('cancel'), style: 'cancel' },
      { text: 'Resolve', onPress: async () => {
        await updateReport(id, { status: 'resolved' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'resolve_report', target: id, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const approveUser = (id: string, name: string) => {
    showAlert(`Approve ${name}?`, 'They will be able to create and manage listings.', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('approve'), onPress: async () => {
        await updateUser(id, { status: 'active' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'approve_user', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Avatar uri={user?.photo} name={user?.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Coordinator</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')}><MaterialIcons name="notifications" size={24} color={colors.text} /></Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statL}>Listing approvals</Text><Text style={styles.statV}>{pending.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>User approvals</Text><Text style={styles.statV}>{pendingUsers.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>Open reports</Text><Text style={styles.statV}>{openReports.length}</Text></View>
        </View>

        <View style={styles.quickRow}>
          <Button title={t('manageEvents')} variant="secondary" onPress={() => router.push('/manage-events')} />
          <Button title="Review queue" variant="secondary" onPress={() => router.push('/(coordinator)/approvals')} />
        </View>

        <Text style={styles.section}>Owner & guide approvals</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {pendingUsers.length === 0 ? <Text style={styles.empty}>No pending user approvals.</Text> : pendingUsers.map((u) => (
            <View key={u.id} style={styles.row}>
              <Avatar uri={u.photo} name={u.name} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{u.name}</Text>
                <Text style={styles.rowSub}>{u.role} · {u.email}</Text>
              </View>
              <Button title={t('approve')} onPress={() => approveUser(u.id, u.name)} />
            </View>
          ))}
        </View>

        <Text style={styles.section}>Open reports</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {openReports.length === 0 ? <Text style={styles.empty}>No open reports.</Text> : openReports.map((r) => (
            <View key={r.id} style={styles.row}>
              <MaterialIcons name="report" size={22} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.reason}</Text>
                <Text style={styles.rowSub}>Target: {r.targetType} · {r.targetId}</Text>
              </View>
              <Button title="Resolve" variant="secondary" onPress={() => resolveReport(r.id)} />
            </View>
          ))}
        </View>

        {pendingGuides.length > 0 ? (
          <>
            <Text style={styles.section}>Responsible travel review</Text>
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {pendingGuides.map((g) => (
                <View key={g.id} style={styles.row}>
                  <MaterialIcons name="rule" size={22} color={colors.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{g.title}</Text>
                    <Text style={styles.rowSub}>{g.topic}</Text>
                  </View>
                  <Pressable onPress={() => router.push({ pathname: '/village/[id]', params: { id: g.villageId } })}><Text style={styles.link}>Open</Text></Pressable>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.section}>Post announcement</Text>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Input placeholder="Title" value={annTitle} onChangeText={setAnnTitle} />
          <Input placeholder="Message" value={annBody} onChangeText={setAnnBody} multiline numberOfLines={3} style={{ minHeight: 90, textAlignVertical: 'top' }} />
          <Button title="Publish" onPress={postAnnouncement} />
        </View>

        <Text style={styles.section}>Village events</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {myEvents.slice(0, 4).map((e) => (
            <Pressable key={e.id} style={styles.row} onPress={() => router.push('/manage-events')}>
              <MaterialIcons name="event" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{e.title}</Text>
                <Text style={styles.rowSub}>{e.dateFrom} · {e.audience}</Text>
              </View>
              <Badge label={e.status} tone={e.status === 'published' ? 'success' : e.status === 'draft' ? 'muted' : 'danger'} />
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/manage-events')}><Text style={styles.link}>Open event manager →</Text></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  hello: { ...typography.small, color: colors.textMuted },
  name: { ...typography.h3, color: colors.text },
  stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statL: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  statV: { ...typography.h2, color: colors.primary },
  quickRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  section: { ...typography.h3, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  link: { ...typography.smallBold, color: colors.primary },
});
