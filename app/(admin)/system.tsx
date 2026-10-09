import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { isCloudSyncEnabled } from '@/services/sync';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function AdminSystem() {
  const { user } = useAuth();
  const { platform, updatePlatform, resetDemoData, addAudit } = useData();
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    serviceFeePct: String(platform.serviceFeePct),
    bookingNoticeDays: String(platform.bookingNoticeDays),
    supportEmail: platform.supportEmail,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cloudSync = isCloudSyncEnabled();

  const save = async () => {
    const e: Record<string, string> = {};
    const fee = Number(form.serviceFeePct);
    const notice = Number(form.bookingNoticeDays);
    if (Number.isNaN(fee) || fee < 0 || fee > 50) e.serviceFeePct = 'Enter 0–50';
    if (Number.isNaN(notice) || notice < 0) e.bookingNoticeDays = 'Enter 0 or more';
    if (!/^\S+@\S+\.\S+$/.test(form.supportEmail.trim())) e.supportEmail = 'Enter a valid email';
    setErrors(e);
    if (Object.keys(e).length) return;
    await updatePlatform({ serviceFeePct: fee, bookingNoticeDays: notice, supportEmail: form.supportEmail.trim() });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'update_platform', target: 'platform config', createdAt: new Date().toISOString() });
    showAlert('Settings saved', 'Platform configuration updated.');
  };

  const toggleMaintenance = async (v: boolean) => {
    await updatePlatform({ maintenanceMode: v });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: v ? 'enable_maintenance' : 'disable_maintenance', target: 'platform', createdAt: new Date().toISOString() });
  };

  const reset = () => {
    showAlert('Reset demo data?', 'All listings, bookings, reviews, events, users and settings return to seed values. Your admin session stays signed in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset everything', style: 'destructive', onPress: async () => {
        await resetDemoData();
        showAlert('Demo reset', 'Seed data restored.');
      }},
    ]);
  };

  return (
    <Screen back title="System Settings">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Platform configuration</Text>
          <Input label="Service fee (%)" value={form.serviceFeePct} onChangeText={(v) => setForm({ ...form, serviceFeePct: v })} keyboardType="numeric" error={errors.serviceFeePct} />
          <Input label="Minimum booking notice (days)" value={form.bookingNoticeDays} onChangeText={(v) => setForm({ ...form, bookingNoticeDays: v })} keyboardType="numeric" error={errors.bookingNoticeDays} />
          <Input label="Support email" value={form.supportEmail} onChangeText={(v) => setForm({ ...form, supportEmail: v })} keyboardType="email-address" autoCapitalize="none" error={errors.supportEmail} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Maintenance mode</Text>
              <Text style={styles.toggleHint}>Demo flag shown on the dashboard health panel.</Text>
            </View>
            <Switch value={platform.maintenanceMode} onValueChange={toggleMaintenance} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={platform.maintenanceMode ? colors.primary : '#fff'} />
          </View>
          <Button title="Save settings" onPress={save} fullWidth />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Integrations</Text>
          <View style={styles.rowLine}>
            <MaterialIcons name="check-circle" size={20} color={colors.success} />
            <Text style={styles.rowText}>Authentication & accounts</Text>
            <Badge label="OK" tone="success" />
          </View>
          <View style={styles.rowLine}>
            <MaterialIcons name={cloudSync ? 'cloud-done' : 'cloud-off'} size={20} color={cloudSync ? colors.success : colors.warning} />
            <Text style={styles.rowText}>Cloud database (Supabase)</Text>
            <Badge label={cloudSync ? 'synced' : 'offline'} tone={cloudSync ? 'success' : 'warning'} />
          </View>
          {cloudSync ? (
            <Text style={styles.foot}>App data syncs to the Supabase cloud; other devices see changes after restarting the app.</Text>
          ) : null}
          <View style={styles.rowLine}>
            <MaterialIcons name="info" size={20} color={colors.warning} />
            <Text style={styles.rowText}>Payments gateway</Text>
            <Badge label="demo" tone="warning" />
          </View>
          <View style={styles.rowLine}>
            <MaterialIcons name="info" size={20} color={colors.warning} />
            <Text style={styles.rowText}>Maps & location</Text>
            <Badge label="demo" tone="warning" />
          </View>
          <View style={styles.rowLine}>
            <MaterialIcons name="info" size={20} color={colors.warning} />
            <Text style={styles.rowText}>Exchange rates</Text>
            <Badge label="demo" tone="warning" />
          </View>
          <Text style={styles.foot}>External services are stubbed in this demo build; no live keys are configured.</Text>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.cardTitle, { color: colors.danger }]}>Danger zone</Text>
          <Text style={styles.foot}>Restores every dataset to its original seed state. Use when the demo data has been modified too much.</Text>
          <Button title="Reset demo data" variant="danger" onPress={reset} fullWidth />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  dangerCard: { borderColor: colors.danger },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleLabel: { ...typography.smallBold, color: colors.text },
  toggleHint: { ...typography.caption, color: colors.textMuted },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { ...typography.small, color: colors.text, flex: 1 },
  foot: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
});
