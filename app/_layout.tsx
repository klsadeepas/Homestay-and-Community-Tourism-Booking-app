// Powered by OnSpace.AI
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertProvider } from '@/template';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <DataProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FBF7F1' } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(traveler)" />
                <Stack.Screen name="(owner)" />
                <Stack.Screen name="(guide)" />
                <Stack.Screen name="(coordinator)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
                <Stack.Screen name="settings" />
                <Stack.Screen name="messages" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="announcements" />
                <Stack.Screen name="performance" />
                <Stack.Screen name="manage-events" />
                <Stack.Screen name="listing/[id]" />
                <Stack.Screen name="village/[id]" />
                <Stack.Screen name="booking/[id]" />
                <Stack.Screen name="pay/[id]" />
                <Stack.Screen name="attendance/[id]" />
              </Stack>
            </DataProvider>
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
