import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { colors, radius, spacing, typography } from '@/constants/theme';

const ICON: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  booking: 'event-available',
  message: 'chat',
  approval: 'verified',
  announcement: 'campaign',
  review: 'star-rate',
  arrival: 'login',
  pickup: 'directions-car',
  payment: 'payments',
};

export default function Notifications() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, markNotificationRead } = useData();
  const { t } = useSettings();

  const mine = useMemo(() => {
    return notifications
      .filter((n) => n.userId === user?.id)
      .filter((n) => {
        // Respect user preferences
        if ((n.type === 'booking' || n.type === 'payment' || n.type === 'arrival' || n.type === 'pickup') && user?.notifyBookings === false) return false;
        if (n.type === 'message' && user?.notifyMessages === false) return false;
        if (n.type === 'announcement' && user?.notifyAnnouncements === false) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, user]);

  const open = async (nId: string, link?: string) => {
    await markNotificationRead(nId);
    if (link) router.push(link as any);
  };

  return (
    <Screen title={t('notifications')} back>
      <View style={styles.hintBar}>
        <MaterialIcons name="info" size={14} color={colors.warning} />
        <Text style={styles.hintText}>In-app notifications only. Push delivery via FCM/APNs is not connected in this demo.</Text>
      </View>
      <FlatList
        data={mine}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item.id, item.link)} style={[styles.card, !item.read && styles.unread]} accessibilityLabel={item.title}>
            <View style={styles.icon}><MaterialIcons name={ICON[item.type] || 'notifications'} size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState icon="notifications-none" title="No notifications" message="Items matching your preferences will appear here." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hintBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.md },
  hintText: { ...typography.caption, color: colors.warning, flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  unread: { backgroundColor: '#FFF8E8' },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.bodyBold, color: colors.text },
  body: { ...typography.small, color: colors.textMuted },
  time: { ...typography.caption, color: colors.textSubtle, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
});
