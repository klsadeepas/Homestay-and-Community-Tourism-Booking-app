import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

interface Props {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message?: string;
}

export function EmptyState({ icon = 'inbox', title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <MaterialIcons name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: spacing.xxl },
  circle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text, textAlign: 'center' },
  msg: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
});
