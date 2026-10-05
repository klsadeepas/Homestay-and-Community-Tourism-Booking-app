import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface Props {
  label: string;
  tone?: Tone;
}

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: colors.accentSoft, fg: colors.warning },
  success: { bg: '#D1FAE5', fg: colors.success },
  warning: { bg: '#FEF3C7', fg: colors.warning },
  danger: { bg: '#FEE2E2', fg: colors.danger },
  info: { bg: '#DBEAFE', fg: colors.info },
  muted: { bg: colors.bgAlt, fg: colors.textMuted },
};

export function Badge({ label, tone = 'default' }: Props) {
  const c = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { ...typography.caption, fontWeight: '600' },
});
