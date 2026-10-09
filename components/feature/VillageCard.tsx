import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SmartImage } from '@/components/ui/SmartImage';
import { Village } from '@/constants/sampleData';
import { colors, radius, spacing, typography, shadow } from '@/constants/theme';

interface Props {
  village: Village;
  onPress?: () => void;
}

export function VillageCard({ village, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
      accessibilityLabel={`${village.name} village in ${village.region}`}
    >
      <SmartImage uri={village.photo} style={styles.image} fallbackIcon="landscape" />
      <View style={styles.overlay} />
      <View style={styles.body}>
        <Text style={styles.title}>{village.name}</Text>
        <Text style={styles.sub}>{village.region}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 220, height: 140, borderRadius: radius.lg, overflow: 'hidden', marginRight: spacing.md, ...shadow.sm },
  image: { ...StyleSheet.absoluteFill },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  body: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  title: { ...typography.h3, color: '#fff' },
  sub: { ...typography.small, color: '#F3EADA' },
});
