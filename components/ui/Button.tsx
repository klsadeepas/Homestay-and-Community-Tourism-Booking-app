import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, fullWidth }: Props) {
  const palette = (() => {
    switch (variant) {
      case 'secondary': return { bg: colors.bgAlt, text: colors.text, border: colors.border };
      case 'ghost': return { bg: 'transparent', text: colors.primary, border: 'transparent' };
      case 'danger': return { bg: colors.danger, text: '#fff', border: colors.danger };
      default: return { bg: colors.primary, text: colors.textOnPrimary, border: colors.primary };
    }
  })();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.text, { color: palette.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { ...typography.bodyBold },
});
