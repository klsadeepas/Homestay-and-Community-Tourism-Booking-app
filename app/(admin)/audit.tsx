import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { isCloudSyncEnabled } from '@/services/sync';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function AdminAudit() {
  const { users } = useAuth();
  const { audit, live, refreshAll } = useData();
  return (
    <Screen title="Audit log">
      <FlatList
        data={audit}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <View style={styles.status}>
            <MaterialIcons name={live ? 'bolt' : 'wifi-off'} size={18} color={live ? colors.success : colors.warning} />
            <Text style={styles.statusText}>
              {live ? 'Live — every device writes to audit_log' : isCloudSyncEnabled() ? 'Connected to Supabase, but the tables are not installed yet' : 'This build has no database configured'}
            </Text>
            <Pressable onPress={() => void refreshAll()} hitSlop={8}>
              <MaterialIcons name="refresh" size={20} color={colors.primary} />
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const actor = users.find((u) => u.id === item.actorId);
          return (
            <View style={styles.row}>
              <MaterialIcons name="history" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.action.replace(/_/g, ' ')}</Text>
                <Text style={styles.sub}>By {actor?.name || item.actorId || 'unknown'} · {new Date(item.createdAt).toLocaleString()}</Text>
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
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  statusText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted },
  reason: { ...typography.caption, color: colors.text, fontStyle: 'italic', marginTop: 2 },
});
