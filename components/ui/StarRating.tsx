import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 24, readOnly }: Props) {
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityValue={{ now: value, min: 1, max: 5 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= value;
        if (readOnly) {
          return <MaterialIcons key={i} name="star" size={size} color={filled ? colors.accent : colors.border} />;
        }
        return (
          <Pressable key={i} onPress={() => onChange?.(idx)} hitSlop={6} accessibilityLabel={`${idx} star${idx > 1 ? 's' : ''}`}>
            <MaterialIcons name="star" size={size} color={filled ? colors.accent : colors.border} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
