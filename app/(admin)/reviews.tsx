import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/StarRating';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Filter = 'all' | 'visible' | 'hidden' | 'reported';

export default function AdminReviews() {
  const router = useRouter();
  const { users, user } = useAuth();
  const { reviews, listings, reports, updateReview, deleteReview, updateReport, addAudit } = useData();
  const { showAlert } = useAlert();
  const [filter, setFilter] = useState<Filter>('all');

  const openReportsFor = (reviewId: string) => reports.filter((r) => r.targetType === 'review' && r.targetId === reviewId && r.status === 'open');
  const filtered = reviews.filter((rv) => {
    if (filter === 'visible') return !rv.hidden;
    if (filter === 'hidden') return !!rv.hidden;
    if (filter === 'reported') return openReportsFor(rv.id).length > 0;
    return true;
  });

  const listingOf = (id: string) => listings.find((l) => l.id === id);
  const travelerOf = (id: string) => users.find((u) => u.id === id);
  const hostOf = (replyAuthorId: string) => users.find((u) => u.id === replyAuthorId);

  const hide = (id: string) => {
    showAlert('Hide review?', 'It will no longer appear publicly. The rating is recalculated.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', style: 'destructive', onPress: async () => {
        await updateReview(id, { hidden: true });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'hide_review', target: id, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const unhide = (id: string) => {
    showAlert('Restore review?', 'It will be publicly visible again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: async () => {
        await updateReview(id, { hidden: false });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'restore_review', target: id, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const remove = (id: string) => {
    showAlert('Delete review?', 'This cannot be undone. The listing rating is recalculated.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteReview(id);
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'delete_review', target: id, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const settleReport = (reviewId: string, status: 'resolved' | 'dismissed') => {
    showAlert(status === 'resolved' ? 'Mark report resolved?' : 'Dismiss report?', 'The report will be closed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        for (const r of openReportsFor(reviewId)) await updateReport(r.id, { status });
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: status === 'resolved' ? 'resolve_report' : 'dismiss_report', target: reviewId, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  return (
    <Screen back title="Review Moderation">
      <View style={styles.filters}>
        {(['all', 'visible', 'hidden', 'reported'] as Filter[]).map((f) => (
          <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} selected={filter === f} onPress={() => setFilter(f)} tone="brand" />
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const l = listingOf(item.listingId);
          const tv = travelerOf(item.travelerId);
          const flagged = openReportsFor(item.id);
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.travelerRow}>
                  <Avatar uri={tv?.photo} name={tv?.name} size={34} />
                  <View>
                    <Text style={styles.name}>{tv?.name || 'Unknown traveler'}</Text>
                    <Text style={styles.sub}>{item.createdAt.slice(0, 10)}</Text>
                  </View>
                </View>
                <StarRating value={item.rating} size={16} readOnly />
              </View>
              <Pressable onPress={() => l && router.push({ pathname: '/listing/[id]', params: { id: l.id } })}>
                <Text style={styles.listing}>{l?.title || item.listingId} →</Text>
              </Pressable>
              <Text style={styles.text}>{item.text}</Text>
              {item.hostReply ? (
                <View style={styles.replyBox}>
                  <MaterialIcons name="reply" size={14} color={colors.primary} />
                  <Text style={styles.replyText}><Text style={styles.replyAuthor}>{hostOf(item.hostReply.authorId)?.name || 'Host'}:</Text> {item.hostReply.text}</Text>
                </View>
              ) : null}
              <View style={styles.tagRow}>
                {item.hidden ? <Badge label="hidden" tone="danger" /> : <Badge label="visible" tone="success" />}
                {flagged.length ? <Badge label={`${flagged.length} open report(s)`} tone="warning" /> : null}
                {flagged[0] ? <Text style={styles.sub}>Reason: {flagged[0].reason}</Text> : null}
              </View>
              <View style={styles.actions}>
                {item.hidden ? <Button title="Restore" variant="secondary" onPress={() => unhide(item.id)} /> : <Button title="Hide" variant="ghost" onPress={() => hide(item.id)} />}
                <Button title="Delete" variant="danger" onPress={() => remove(item.id)} />
                {flagged.length ? (
                  <>
                    <Button title="Resolve report" onPress={() => settleReport(item.id, 'resolved')} />
                    <Button title="Dismiss" variant="ghost" onPress={() => settleReport(item.id, 'dismissed')} />
                  </>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="rate-review" title="No reviews here" message="Reviews matching this filter will appear here." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexWrap: 'wrap' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  travelerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  name: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted },
  listing: { ...typography.smallBold, color: colors.primary },
  text: { ...typography.body, color: colors.text },
  replyBox: { flexDirection: 'row', gap: 6, backgroundColor: colors.bgAlt, padding: spacing.sm, borderRadius: radius.md, alignItems: 'flex-start' },
  replyText: { ...typography.small, color: colors.text, flex: 1 },
  replyAuthor: { ...typography.smallBold, color: colors.text },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
});
