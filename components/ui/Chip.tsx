import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  tone?: 'default' | 'brand';
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, icon, tone = 'default', style }: Props) {
  const base = tone === 'brand' ? styles.brand : styles.default;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        base,
        selected && (tone === 'brand' ? styles.brandSelected : styles.selected),
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {icon ? (
        <MaterialIcons name={icon} size={14} color={selected ? '#fff' : colors.text} />
      ) : null}
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, height: 36,
    borderRadius: radius.pill, borderWidth: 1,
  },
  default: { backgroundColor: colors.bgAlt, borderColor: colors.border },
  brand: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  brandSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.caption, color: colors.text, fontWeight: '600' },
  textSelected: { color: '#fff' },
});
