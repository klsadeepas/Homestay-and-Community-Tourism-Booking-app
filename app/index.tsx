import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/constants/theme';

export default function Index() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  switch (user.role) {
    case 'traveler': return <Redirect href="/(traveler)" />;
    case 'owner': return <Redirect href="/(owner)" />;
    case 'guide': return <Redirect href="/(guide)" />;
    case 'coordinator': return <Redirect href="/manage-events" />;
    case 'admin': return <Redirect href="/(admin)" />;
    default: return <Redirect href="/(auth)/login" />;
  }
}
