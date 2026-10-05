import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function Announcements() {
  const { announcements } = useData();
  const { user } = useAuth();
  const visible = announcements.filter((a) => a.audience === 'all' || a.audience === (user?.role === 'traveler' ? 'travelers' : user?.role === 'owner' ? 'owners' : user?.role === 'guide' ? 'guides' : 'all'));
  return (
    <Screen title="Announcements" back>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MaterialIcons name="campaign" size={20} color={item.urgent ? colors.danger : colors.primary} />
                <Text style={styles.title}>{item.title}</Text>
              </View>
              {item.urgent ? <Badge label="Urgent" tone="danger" /> : null}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>Audience: {item.audience} · {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="campaign" title="No announcements" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.bodyBold, color: colors.text, flex: 1 },
  body: { ...typography.small, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
});
