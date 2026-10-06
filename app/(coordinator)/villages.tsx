import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function CoordinatorVillages() {
  const router = useRouter();
  const { villages } = useData();
  const { t } = useSettings();
  return (
    <Screen title={t('villages')}>
      <FlatList
        data={villages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/village/[id]', params: { id: item.id } })}>
            <Image source={{ uri: item.photo }} style={styles.img} contentFit="cover" />
            <View style={{ padding: spacing.md, flex: 1, gap: 2 }}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>{item.region}</Text>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md },
  img: { width: 90, height: 90, backgroundColor: colors.bgAlt },
  title: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted },
  desc: { ...typography.small, color: colors.textMuted },
});
