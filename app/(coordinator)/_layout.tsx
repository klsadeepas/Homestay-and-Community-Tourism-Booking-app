import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';

export default function CoordinatorLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  const tabBarStyle = {
    height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  };
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textSubtle, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: t('dashboard'), tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} /> }} />
      <Tabs.Screen name="approvals" options={{ title: t('approvals'), tabBarIcon: ({ color, size }) => <MaterialIcons name="verified" size={size} color={color} /> }} />
      <Tabs.Screen name="villages" options={{ title: t('villages'), tabBarIcon: ({ color, size }) => <MaterialIcons name="location-city" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
