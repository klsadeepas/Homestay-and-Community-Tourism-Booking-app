import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '@/constants/theme';

interface Props {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  edges?: readonly Edge[];
  style?: ViewStyle;
}

export function Screen({ title, back, onBack, right, children, edges = ['top'], style }: Props) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {title || back || right ? (
        <View style={styles.header}>
          {back ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={{ minWidth: 24, alignItems: 'flex-end' }}>{right}</View>
        </View>
      ) : null}
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconBtn: { padding: 2 },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  body: { flex: 1 },
});
