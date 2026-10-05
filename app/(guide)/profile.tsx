import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ProfileRows } from '@/app/(traveler)/profile';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { colors, spacing, typography } from '@/constants/theme';

export default function GuideProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useSettings();
  const { showAlert } = useAlert();
  const logout = () => {
    showAlert('Sign out?', '', [
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
          <Text style={styles.role}>Tour Guide · {user?.village}</Text>
          <Button title={t('editProfile')} variant="secondary" onPress={() => router.push('/edit-profile')} style={{ marginTop: spacing.md }} />
        </View>
        <Text style={styles.section}>Guiding</Text>
        <ProfileRows items={[
          { icon: 'hiking', label: 'My tours', onPress: () => router.push('/(guide)/tours') },
          { icon: 'event', label: 'Bookings', onPress: () => router.push('/(guide)/bookings') },
          { icon: 'chat', label: 'Messages', onPress: () => router.push('/messages') },
          { icon: 'star-rate', label: 'Reviews', onPress: () => showAlert('Reviews', 'Your tours average 4.8 stars across 130 reviews.') },
        ]} />
        <Text style={styles.section}>App</Text>
        <ProfileRows items={[
          { icon: 'notifications', label: 'Notifications', onPress: () => router.push('/notifications') },
          { icon: 'campaign', label: 'Announcements', onPress: () => router.push('/announcements') },
          { icon: 'tune', label: 'Settings', onPress: () => router.push('/settings') },
        ]} />
        <Button title={t('signOut')} variant="ghost" onPress={logout} style={{ marginTop: spacing.xl }} />
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
});
