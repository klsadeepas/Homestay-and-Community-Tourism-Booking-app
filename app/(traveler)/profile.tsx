import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';

type RowItem = { icon: keyof typeof MaterialIcons.glyphMap; label: string; to?: string; onPress?: () => void };

export function ProfileRows({ items }: { items: RowItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((it, idx) => (
        <Pressable
          key={idx}
          onPress={it.onPress}
          style={({ pressed }) => [styles.row, idx !== items.length - 1 && styles.rowBorder, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name={it.icon} size={22} color={colors.primary} />
          <Text style={styles.rowLabel}>{it.label}</Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

export default function TravelerProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useSettings();
  const { showAlert } = useAlert();

  const logout = () => {
    showAlert('Sign out?', 'You will be returned to the sign in screen.', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <Screen title={t('profile')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.hero}>
          <Avatar uri={user?.photo} name={user?.name} size={88} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>Traveler</Text>
          <Button title={t('editProfile')} onPress={() => router.push('/edit-profile')} variant="secondary" style={{ marginTop: spacing.md }} />
        </View>

        <Text style={styles.section}>Personal</Text>
        <ProfileRows items={[
          { icon: 'favorite', label: 'Saved stays & tours', onPress: () => router.push('/(traveler)/trips') },
          { icon: 'event', label: 'My bookings', onPress: () => router.push('/(traveler)/bookings') },
          { icon: 'chat', label: t('messages'), onPress: () => router.push('/messages') },
          { icon: 'notifications', label: t('notifications'), onPress: () => router.push('/notifications') },
        ]}/>

        <Text style={styles.section}>App</Text>
        <ProfileRows items={[
          { icon: 'tune', label: t('settings'), onPress: () => router.push('/settings') },
          { icon: 'campaign', label: t('announcements'), onPress: () => router.push('/announcements') },
          { icon: 'support', label: 'Help & Support', onPress: () => showAlert('Support', 'Contact RootedStay support at support@rootedstay.lk') },
        ]}/>

        <Button title={t('signOut')} onPress={logout} variant="ghost" style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  name: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  email: { ...typography.small, color: colors.textMuted },
  role: { ...typography.caption, color: colors.primary, fontWeight: '700', marginTop: 4 },
  section: { ...typography.smallBold, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },
});
