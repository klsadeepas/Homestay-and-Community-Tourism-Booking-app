import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { SmartImage } from '@/components/ui/SmartImage';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { Listing } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tab = 'people' | 'listings';
type PeopleFilter = 'all' | 'pending' | 'active' | 'suspended';
type ListingFilter = 'all' | 'submitted' | 'under_review' | 'approved' | 'needs_changes' | 'suspended';

export default function AdminApprovals() {
  const router = useRouter();
  const { users, user, updateUser } = useAuth();
  const { listings, villages, updateListing, addAudit } = useData();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<Tab>('people');
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('pending');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('submitted');
  const [reasonFor, setReasonFor] = useState<Listing | null>(null);
  const [reason, setReason] = useState('');

  const hostsAndGuides = users.filter((u) => u.role === 'owner' || u.role === 'guide');
  const people = hostsAndGuides.filter((u) => peopleFilter === 'all' || (u.status || 'active') === peopleFilter);
  const pendingPeople = hostsAndGuides.filter((u) => (u.status || 'active') === 'pending').length;
  const pendingListings = listings.filter((l) => l.status === 'submitted' || l.status === 'under_review').length;
  const lFiltered = listings.filter((l) => listingFilter === 'all' || l.status === listingFilter);

  const approveUser = (id: string, name: string) => {
    showAlert('Approve account?', `Approve ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        await updateUser(id, { status: 'active' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'approve_account', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const rejectUser = (id: string, name: string) => {
    showAlert('Reject account?', `${name} will be suspended and cannot sign in.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        await updateUser(id, { status: 'suspended' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'reject_account', target: name, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const approveListing = (l: Listing) => {
    showAlert('Approve listing?', `"${l.title}" will appear in traveler discovery.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        await updateListing(l.id, { status: 'approved', reviewReason: undefined });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'approve_listing', target: l.title, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const openReason = (l: Listing) => { setReasonFor(l); setReason(l.reviewReason || ''); };
  const submitReason = async () => {
    if (!reasonFor || !reason.trim()) return;
    await updateListing(reasonFor.id, { status: 'needs_changes', reviewReason: reason.trim() });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'request_changes', target: reasonFor.title, reason: reason.trim(), createdAt: new Date().toISOString() });
    setReasonFor(null);
  };

  const suspendListing = (l: Listing) => {
    showAlert('Suspend listing?', `"${l.title}" will be hidden from travelers.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
        await updateListing(l.id, { status: 'suspended' });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'suspend_listing', target: l.title, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const userStatusTone = (s?: string) => s === 'suspended' ? 'danger' : s === 'pending' ? 'warning' : 'success';
  const listingStatusTone = (s: Listing['status']) =>
    s === 'approved' ? 'success' : s === 'suspended' ? 'danger' : s === 'draft' ? 'muted' : 'warning';

  return (
    <Screen back title="Approvals">
      <View style={styles.tabs}>
        <Chip label={`Hosts & Guides${pendingPeople ? ` (${pendingPeople})` : ''}`} selected={tab === 'people'} onPress={() => setTab('people')} tone="brand" />
        <Chip label={`Homestays & Activities${pendingListings ? ` (${pendingListings})` : ''}`} selected={tab === 'listings'} onPress={() => setTab('listings')} tone="brand" />
      </View>

      {tab === 'people' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(['pending', 'active', 'suspended', 'all'] as PeopleFilter[]).map((f) => (
              <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} selected={peopleFilter === f} onPress={() => setPeopleFilter(f)} />
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
            {people.length === 0 ? <EmptyState icon="how-to-reg" title="Nobody here" message="Accounts matching this filter will appear here." /> : people.map((u) => (
              <View key={u.id} style={styles.card}>
                <Avatar uri={u.photo} name={u.name} size={44} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name}>{u.name}</Text>
                    <Badge label={u.status || 'active'} tone={userStatusTone(u.status)} />
                  </View>
                  <Text style={styles.sub}>{u.email}</Text>
                  <View style={styles.tagRow}>
                    <Badge label={u.role} tone="info" />
                    {u.village ? <Text style={styles.sub}>· {u.village}</Text> : null}
                  </View>
                  {u.bio ? <Text style={styles.sub} numberOfLines={2}>{u.bio}</Text> : null}
                  <View style={styles.actions}>
                    {(u.status || 'active') === 'pending' ? (
                      <>
                        <Button title="Approve" onPress={() => approveUser(u.id, u.name)} />
                        <Button title="Reject" variant="danger" onPress={() => rejectUser(u.id, u.name)} />
                      </>
                    ) : null}
                    {(u.status || 'active') === 'active' ? <Button title="Suspend" variant="ghost" onPress={() => rejectUser(u.id, u.name)} /> : null}
                    {u.status === 'suspended' ? <Button title="Reinstate" variant="secondary" onPress={() => approveUser(u.id, u.name)} /> : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(['submitted', 'under_review', 'needs_changes', 'approved', 'suspended', 'all'] as ListingFilter[]).map((f) => (
              <Chip key={f} label={f === 'all' ? 'All' : f.replace('_', ' ')} selected={listingFilter === f} onPress={() => setListingFilter(f)} />
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
            {lFiltered.length === 0 ? <EmptyState icon="fact-check" title="Nothing here" message="Listings matching this filter will appear here." /> : lFiltered.map((l) => (
              <View key={l.id} style={styles.card}>
                <SmartImage uri={l.photo} style={styles.img} fallbackIcon="home" />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name} numberOfLines={1}>{l.title}</Text>
                    <Badge label={l.status.replace('_', ' ')} tone={listingStatusTone(l.status)} />
                  </View>
                  <Text style={styles.sub}>{l.type} · {villages.find((v) => v.id === l.villageId)?.name || l.villageId}</Text>
                  {l.status === 'needs_changes' && l.reviewReason ? (
                    <View style={styles.reasonBox}>
                      <MaterialIcons name="info" size={14} color={colors.warning} />
                      <Text style={styles.reasonText}>Reason: {l.reviewReason}</Text>
                    </View>
                  ) : null}
                  <View style={styles.actions}>
                    <Button title="View" variant="ghost" onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })} />
                    {l.status === 'submitted' || l.status === 'under_review' || l.status === 'needs_changes' ? (
                      <>
                        <Button title="Approve" onPress={() => approveListing(l)} />
                        <Button title="Needs changes" variant="secondary" onPress={() => openReason(l)} />
                      </>
                    ) : null}
                    {l.status === 'approved' ? <Button title="Suspend" variant="danger" onPress={() => suspendListing(l)} /> : null}
                    {l.status === 'suspended' ? <Button title="Reinstate" variant="secondary" onPress={() => approveListing(l)} /> : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <Modal visible={!!reasonFor} animationType="slide" onRequestClose={() => setReasonFor(null)}>
        <Screen back onBack={() => setReasonFor(null)} title="Request changes">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Text style={styles.hint}>Tell the host or guide what to fix before “{reasonFor?.title}” can be approved. The listing returns to their drafts as “needs changes”.</Text>
              <Input label="Reason *" value={reason} onChangeText={setReason} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} />
              <View style={styles.actions}>
                <Button title="Cancel" variant="ghost" onPress={() => setReasonFor(null)} />
                <Button title="Send request" onPress={submitReason} disabled={!reason.trim()} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  img: { width: 72, height: 72, borderRadius: radius.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: spacing.sm, borderRadius: radius.md },
  reasonText: { ...typography.caption, color: colors.warning, flex: 1 },
  hint: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
});
