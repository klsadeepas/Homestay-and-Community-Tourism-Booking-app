import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export function Stepper({ label, value, onChange, min = 0, max = 99 }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={6} style={styles.btn} accessibilityLabel={`Decrease ${label}`}>
          <MaterialIcons name="remove" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={6} style={styles.btn} accessibilityLabel={`Increase ${label}`}>
          <MaterialIcons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  label: { ...typography.body, color: colors.text, flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  btn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  value: { ...typography.bodyBold, color: colors.text, minWidth: 24, textAlign: 'center' },
});
