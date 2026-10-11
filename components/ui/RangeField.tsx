import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface Props {
  label: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  suffix?: string;
  numeric?: boolean;
  errorMin?: string;
  errorMax?: string;
}

export function RangeField({ label, min, max, onMin, onMax, suffix, numeric, errorMin, errorMax }: Props) {
  const error = errorMin || errorMax;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.cell, errorMin ? { borderColor: colors.danger } : null]}>
          <TextInput
            value={min}
            onChangeText={onMin}
            keyboardType={numeric ? 'numeric' : 'default'}
            placeholder="Min"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />
          {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        </View>
        <Text style={styles.dash}>–</Text>
        <View style={[styles.cell, errorMax ? { borderColor: colors.danger } : null]}>
          <TextInput
            value={max}
            onChangeText={onMax}
            keyboardType={numeric ? 'numeric' : 'default'}
            placeholder="Max"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />
          {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.smallBold, color: colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cell: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44,
  },
  input: { flex: 1, color: colors.text, ...typography.body, paddingVertical: 0 },
  suffix: { ...typography.caption, color: colors.textMuted, marginLeft: 4 },
  dash: { color: colors.textMuted, ...typography.bodyBold },
  error: { ...typography.caption, color: colors.danger, marginTop: 4 },
});
