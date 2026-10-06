import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SmartImage } from '@/components/ui/SmartImage';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/services/currency';
import { Listing } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tab = 'pending' | 'approved' | 'suspended';

export default function Approvals() {
  const { user } = useAuth();
  const { listings, villages, updateListing, addAudit, addNotification } = useData();
  const { t, currency } = useSettings();
  const [tab, setTab] = useState<Tab>('pending');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [target, setTarget] = useState<{ listing: Listing; action: 'needs_changes' | 'suspended' } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');

  const assigned = new Set(user?.assignedVillages || []);
  const data = listings.filter((l) =>
    (!user?.assignedVillages || assigned.has(l.villageId)) && (
      tab === 'pending' ? (l.status === 'submitted' || l.status === 'under_review')
        : tab === 'approved' ? l.status === 'approved'
        : l.status === 'suspended' || l.status === 'needs_changes'
    )
  );

  const approve = async (l: Listing) => {
    await updateListing(l.id, { status: 'approved', reviewReason: undefined });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'approve_listing', target: l.title, createdAt: new Date().toISOString() });
    await addNotification({ id: `n-${Date.now()}`, userId: l.ownerId, title: 'Listing approved', body: `${l.title} is now live on RootedStay.`, read: false, createdAt: new Date().toISOString(), type: 'approval', link: `/listing/${l.id}` });
  };

  const openReasonFor = (l: Listing, action: 'needs_changes' | 'suspended') => {
    setTarget({ listing: l, action });
    setReason(''); setReasonErr(''); setReasonOpen(true);
  };

  const submitReason = async () => {
    if (!reason.trim()) { setReasonErr('A reason is required.'); return; }
    if (!target) return;
    const { listing, action } = target;
    await updateListing(listing.id, { status: action, reviewReason: reason.trim() });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: action === 'needs_changes' ? 'request_changes' : 'suspend_listing', target: listing.title, reason: reason.trim(), createdAt: new Date().toISOString() });
    await addNotification({ id: `n-${Date.now()}`, userId: listing.ownerId, title: action === 'needs_changes' ? 'Changes requested' : 'Listing suspended', body: `${listing.title}: ${reason.trim()}`, read: false, createdAt: new Date().toISOString(), type: 'approval', link: `/listing/${listing.id}` });
    setReasonOpen(false);
  };

  const reinstate = async (l: Listing) => {
    await updateListing(l.id, { status: 'approved', reviewReason: undefined });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'reinstate_listing', target: l.title, createdAt: new Date().toISOString() });
  };

  return (
    <Screen title={t('approvals')}>
      <View style={styles.tabs}>
        {(['pending','approved','suspended'] as Tab[]).map((x) => (
          <Chip key={x} label={x.charAt(0).toUpperCase() + x.slice(1)} selected={tab === x} onPress={() => setTab(x)} />
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const v = villages.find((x) => x.id === item.villageId);
          return (
            <View style={styles.card}>
              <SmartImage uri={item.photo} style={styles.img} fallbackIcon="landscape" />
              <View style={{ padding: spacing.md, gap: 4 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Badge label={item.status.replace('_',' ')} tone={item.status === 'approved' ? 'success' : item.status === 'suspended' ? 'danger' : 'warning'} />
                </View>
                <Text style={styles.sub}>{item.type.toUpperCase()} · {v?.name || 'Unknown village'} · {formatPrice(item.pricePerUnitLKR, currency)}</Text>
                <Text style={styles.sub} numberOfLines={2}>{item.description}</Text>
                {item.reviewReason ? <Text style={styles.reason}>Previous reason: {item.reviewReason}</Text> : null}
                {tab === 'pending' ? (
                  <View style={styles.actions}>
                    <Button title="Request changes" variant="ghost" onPress={() => openReasonFor(item, 'needs_changes')} />
                    <Button title={t('reject')} variant="danger" onPress={() => openReasonFor(item, 'suspended')} />
                    <Button title={t('approve')} onPress={() => approve(item)} />
                  </View>
                ) : tab === 'approved' ? (
                  <View style={styles.actions}>
                    <Button title="Suspend" variant="danger" onPress={() => openReasonFor(item, 'suspended')} />
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Button title="Reinstate" onPress={() => reinstate(item)} />
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="verified" title="Nothing here" />}
      />

      <Modal visible={reasonOpen} animationType="slide" onRequestClose={() => setReasonOpen(false)} transparent>
        <View style={styles.modalBack}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{target?.action === 'needs_changes' ? 'Request changes' : 'Reject / suspend'}</Text>
              <Text style={styles.modalSub}>A reason is required so the owner knows what to update. This will be stored in the audit log and sent to the owner.</Text>
              <Input label="Reason *" value={reason} onChangeText={setReason} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} error={reasonErr} />
              <View style={styles.modalActions}>
                <Button title={t('cancel')} variant="ghost" onPress={() => setReasonOpen(false)} />
                <Button title="Submit" onPress={submitReason} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md },
  img: { width: '100%', height: 140 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.small, color: colors.textMuted },
  reason: { ...typography.caption, color: colors.warning, fontStyle: 'italic', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSub: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
});
