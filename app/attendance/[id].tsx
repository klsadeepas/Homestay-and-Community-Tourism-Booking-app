import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Status = 'booked' | 'checked_in' | 'no_show';

export default function Attendance() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, users } = useAuth();
  const { listings, bookings, updateBooking, addNotification } = useData();
  const { t } = useSettings();
  const { showAlert } = useAlert();

  const tour = listings.find((l) => l.id === id);
  const session = bookings.filter((b) => b.listingId === id && (b.status === 'confirmed' || b.status === 'completed'));

  if (!tour) return <Screen back title="Attendance"><Text style={{ padding: 20 }}>Tour not found.</Text></Screen>;
  if (tour.ownerId !== user?.id) return <Screen back title="Attendance"><Text style={{ padding: 20 }}>Only the assigned guide can manage attendance.</Text></Screen>;

  const setStatus = async (bookingId: string, status: Status) => {
    await updateBooking(bookingId, { checkIn: status });
  };

  const markCompleted = async () => {
    const earliest = session.reduce((m, b) => (b.dateFrom < m ? b.dateFrom : m), '9999-12-31');
    if (!session.length) { showAlert('No participants', 'Mark complete requires at least one confirmed participant.'); return; }
    if (earliest > new Date().toISOString().slice(0, 10)) {
      showAlert('Tour has not started', 'Mark complete is available once the tour date has arrived. Demo override continues anyway?', [
        { text: t('cancel'), style: 'cancel' },
        { text: 'Continue', onPress: () => complete() },
      ]);
      return;
    }
    complete();
  };

  const complete = async () => {
    for (const b of session) {
      await updateBooking(b.id, { status: 'completed', checkIn: b.checkIn || 'checked_in' });
      await addNotification({ id: `n-${Date.now()}-${b.id}`, userId: b.travelerId, title: 'Tour completed', body: `${tour.title} has been marked complete. You can now leave a review.`, read: false, createdAt: new Date().toISOString(), type: 'booking', link: `/booking/${b.id}` });
    }
    showAlert('Tour marked complete', 'Confirmed participants are now set to Completed and can leave reviews.');
  };

  return (
    <Screen back title={`${t('attendance')} — ${tour.title}`}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Session summary</Text>
          <Text style={styles.summarySub}>{session.length} confirmed participant{session.length === 1 ? '' : 's'} · capacity {tour.capacity}</Text>
          <Text style={styles.summarySub}>Meeting point: {tour.meetingPoint || '—'}</Text>
          <Button title={t('markCompleted')} onPress={markCompleted} style={{ marginTop: spacing.sm }} />
          <Text style={styles.hint}>Marking complete updates eligible bookings to Completed and lets travelers submit reviews.</Text>
        </View>

        <Text style={styles.heading}>Participants</Text>
        {session.length === 0 ? (
          <Text style={styles.empty}>No confirmed bookings yet.</Text>
        ) : session.map((b) => {
          const traveler = users.find((u) => u.id === b.travelerId);
          const checkIn = (b.checkIn || 'booked') as Status;
          return (
            <View key={b.id} style={styles.row}>
              <Avatar uri={traveler?.photo} name={traveler?.name} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{traveler?.name}</Text>
                <Text style={styles.rowSub}>{b.dateFrom} · {b.guests} participant{b.guests > 1 ? 's' : ''}</Text>
              </View>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Chip label="Booked" selected={checkIn === 'booked'} onPress={() => setStatus(b.id, 'booked')} />
                  <Chip label="Checked in" selected={checkIn === 'checked_in'} onPress={() => setStatus(b.id, 'checked_in')} />
                  <Chip label="No show" selected={checkIn === 'no_show'} onPress={() => setStatus(b.id, 'no_show')} />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg },
  summaryTitle: { ...typography.h3, color: colors.text },
  summarySub: { ...typography.small, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  heading: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  rowTitle: { ...typography.bodyBold, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted },
  empty: { ...typography.small, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
