import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, users } = useAuth();
  const { listings, bookings, reports, audit } = useData();
  const { t } = useSettings();

  const byRole = {
    traveler: users.filter((u) => u.role === 'traveler').length,
    owner: users.filter((u) => u.role === 'owner').length,
    guide: users.filter((u) => u.role === 'guide').length,
    coordinator: users.filter((u) => u.role === 'coordinator').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Avatar uri={user?.photo} name={user?.name} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>System Admin</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.stat}><Text style={styles.statL}>Total users</Text><Text style={styles.statV}>{users.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>Listings</Text><Text style={styles.statV}>{listings.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>Bookings</Text><Text style={styles.statV}>{bookings.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statL}>Open reports</Text><Text style={styles.statV}>{reports.filter((r) => r.status === 'open').length}</Text></View>
        </View>

        <Text style={styles.section}>Users by role</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {Object.entries(byRole).map(([k, v]) => (
            <View key={k} style={styles.row}>
              <MaterialIcons name="person" size={22} color={colors.primary} />
              <Text style={styles.rowTitle}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
              <Text style={styles.rowValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Platform health</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <View style={styles.row}><MaterialIcons name="check-circle" size={22} color={colors.success} /><Text style={styles.rowTitle}>Auth service</Text><Text style={styles.rowOk}>OK</Text></View>
          <View style={styles.row}><MaterialIcons name="info" size={22} color={colors.warning} /><Text style={styles.rowTitle}>Payments</Text><Text style={styles.rowWarn}>Not connected (demo)</Text></View>
          <View style={styles.row}><MaterialIcons name="info" size={22} color={colors.warning} /><Text style={styles.rowTitle}>Maps</Text><Text style={styles.rowWarn}>Not connected (demo)</Text></View>
          <View style={styles.row}><MaterialIcons name="info" size={22} color={colors.warning} /><Text style={styles.rowTitle}>Exchange rates</Text><Text style={styles.rowWarn}>Demo rate</Text></View>
        </View>

        <Text style={styles.section}>Recent audit</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {audit.slice(0, 3).map((a) => (
            <View key={a.id} style={styles.row}>
              <MaterialIcons name="history" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{a.action.replace('_',' ')}</Text>
                <Text style={styles.rowSub}>Target: {a.target}</Text>
              </View>
            </View>
          ))}
          <Pressable onPress={() => router.push('/(admin)/audit')}><Text style={styles.link}>View all audit entries →</Text></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  hello: { ...typography.small, color: colors.textMuted },
  name: { ...typography.h3, color: colors.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  stat: { flexBasis: '48%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  statL: { ...typography.caption, color: colors.textMuted },
  statV: { ...typography.h2, color: colors.primary },
  section: { ...typography.h3, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rowTitle: { ...typography.bodyBold, color: colors.text, flex: 1 },
  rowSub: { ...typography.caption, color: colors.textMuted },
  rowValue: { ...typography.bodyBold, color: colors.primary },
  rowOk: { ...typography.smallBold, color: colors.success },
  rowWarn: { ...typography.smallBold, color: colors.warning },
  link: { ...typography.smallBold, color: colors.primary, paddingVertical: spacing.sm },
});
