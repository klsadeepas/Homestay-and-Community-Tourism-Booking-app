import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function AdminAudit() {
  const { users } = useAuth();
  const { audit } = useData();
  return (
    <Screen title="Audit log">
      <FlatList
        data={audit}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const actor = users.find((u) => u.id === item.actorId);
          return (
            <View style={styles.row}>
              <MaterialIcons name="history" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.action.replace(/_/g, ' ')}</Text>
                <Text style={styles.sub}>By {actor?.name || 'unknown'} · {new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={styles.sub}>Target: {item.target}</Text>
                {item.reason ? <Text style={styles.reason}>Reason: {item.reason}</Text> : null}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted },
  reason: { ...typography.caption, color: colors.text, fontStyle: 'italic', marginTop: 2 },
});
