import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { isCloudSyncEnabled, cloudHost } from '@/services/sync';
import { probeMediaBucket, type MediaStatus } from '@/services/uploads';
import { email as emailRule, hasErrors, numberField, required, type Errors } from '@/services/validation';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function AdminSystem() {
  const { platform, updatePlatform, resetDemoData, logAction, live } = useData();
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    serviceFeePct: String(platform.serviceFeePct),
    bookingNoticeDays: String(platform.bookingNoticeDays),
    supportEmail: platform.supportEmail,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [media, setMedia] = useState<MediaStatus>('unconfigured');
  const cloudSync = isCloudSyncEnabled();

  useEffect(() => {
    let alive = true;
    if (!cloudSync) { setMedia('unconfigured'); return; }
    setMedia('unreachable');
    void probeMediaBucket().then((s) => { if (alive) setMedia(s); });
    return () => { alive = false; };
  }, [cloudSync]);

  const save = async () => {
    const e: Errors = {};
    e.serviceFeePct = numberField(form.serviceFeePct, { label: 'Service fee', min: 0, max: 50 });
    e.bookingNoticeDays = numberField(form.bookingNoticeDays, { label: 'Booking notice', min: 0, max: 365, integer: true });
    e.supportEmail = required(form.supportEmail, 'Support email') || emailRule(form.supportEmail);
    setErrors(e);
    if (hasErrors(e)) return;
    const fee = Number(form.serviceFeePct);
    const notice = Number(form.bookingNoticeDays);
    await updatePlatform({ serviceFeePct: fee, bookingNoticeDays: notice, supportEmail: form.supportEmail.trim() });
    await logAction('platform_config_updated', 'platform config', `fee=${fee}%, notice=${notice} days`);
    showAlert('Settings saved', 'Platform configuration updated.');
  };

  const toggleMaintenance = async (v: boolean) => {
    await updatePlatform({ maintenanceMode: v });
    await logAction(v ? 'maintenance_enabled' : 'maintenance_disabled', 'platform');
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
            <Badge label={live ? 'live · tables' : cloudSync ? 'env set, tables off' : 'offline'} tone={live ? 'success' : 'warning'} />
          </View>
          {cloudSync ? (
            <Text style={styles.foot}>Project: {cloudHost()} — every device reads and writes the same tables, so changes appear on other phones within about a second. If a phone shows anything other than this host, that APK was built with different environment variables.</Text>
          ) : (
            <Text style={styles.foot}>No Supabase project is compiled into this build. Data stays on this device only — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY as EAS environment variables and rebuild.</Text>
          )}
          <View style={styles.rowLine}>
            <MaterialIcons name={media === 'ready' ? 'cloud-done' : 'cloud-off'} size={20} color={media === 'ready' ? colors.success : colors.warning} />
            <Text style={styles.rowText}>Device images (media bucket)</Text>
            <Badge
              label={media === 'ready' ? 'OK' : media === 'missing' ? 'needs schema_v3' : media === 'unconfigured' ? 'not configured' : 'unreachable'}
              tone={media === 'ready' ? 'success' : 'warning'}
            />
          </View>
          {media === 'missing' ? (
            <Text style={styles.foot}>Photos picked on a phone cannot upload yet — run supabase/schema_v3.sql in the SQL Editor to create the public “media” bucket and its policies.</Text>
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
