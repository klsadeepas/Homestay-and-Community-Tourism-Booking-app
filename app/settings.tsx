import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { Lang } from '@/constants/i18n';
import { Currency, DEMO_RATE_UPDATED_AT, LKR_PER_USD } from '@/services/currency';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function Settings() {
  const { language, currency, setLanguage, setCurrency, t } = useSettings();
  const { user, updateProfile } = useAuth();

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={value ? colors.primary : '#fff'} />
    </View>
  );

  return (
    <Screen title={t('settings')} back>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={styles.section}>{t('language')}</Text>
        <View style={styles.group}>
          {(['en','si'] as Lang[]).map((l) => (
            <Pressable key={l} onPress={() => setLanguage(l)} style={[styles.option, language === l && styles.optionActive]}>
              <MaterialIcons name={language === l ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={language === l ? colors.primary : colors.textMuted} />
              <Text style={styles.optLabel}>{l === 'en' ? 'English' : 'සිංහල (Sinhala)'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{t('currency')}</Text>
        <View style={styles.group}>
          {(['LKR','USD'] as Currency[]).map((c) => (
            <Pressable key={c} onPress={() => setCurrency(c)} style={[styles.option, currency === c && styles.optionActive]}>
              <MaterialIcons name={currency === c ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={currency === c ? colors.primary : colors.textMuted} />
              <Text style={styles.optLabel}>{c === 'LKR' ? 'LKR — Sri Lankan Rupees' : 'USD — US Dollars'}</Text>
            </Pressable>
          ))}
          <Text style={styles.hint}>
            Demo exchange rate: 1 USD = {LKR_PER_USD} LKR. Updated {DEMO_RATE_UPDATED_AT}. Live rate integration is not connected in this demo. All transactions settle in LKR.
          </Text>
        </View>

        <Text style={styles.section}>{t('notifications')}</Text>
        <View style={styles.group}>
          <Toggle label="Booking updates" value={!!user?.notifyBookings} onChange={(v) => updateProfile({ notifyBookings: v })} />
          <Toggle label="Messages" value={!!user?.notifyMessages} onChange={(v) => updateProfile({ notifyMessages: v })} />
          <Toggle label="Announcements" value={!!user?.notifyAnnouncements} onChange={(v) => updateProfile({ notifyAnnouncements: v })} />
        </View>

        <Text style={styles.section}>Integrations</Text>
        <View style={styles.group}>
          <View style={styles.row}><MaterialIcons name="payment" size={20} color={colors.warning} /><Text style={styles.rowLabel}>Payments</Text><Text style={styles.pill}>Not connected</Text></View>
          <View style={styles.row}><MaterialIcons name="map" size={20} color={colors.warning} /><Text style={styles.rowLabel}>Maps</Text><Text style={styles.pill}>Not connected</Text></View>
          <View style={styles.row}><MaterialIcons name="translate" size={20} color={colors.warning} /><Text style={styles.rowLabel}>Translation service</Text><Text style={styles.pill}>Not connected</Text></View>
          <View style={styles.row}><MaterialIcons name="attach-money" size={20} color={colors.warning} /><Text style={styles.rowLabel}>Exchange rates</Text><Text style={styles.pill}>Demo rate</Text></View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.smallBold, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.md },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionActive: { backgroundColor: colors.surfaceAlt },
  optLabel: { ...typography.body, color: colors.text, flex: 1 },
  hint: { ...typography.caption, color: colors.textMuted, padding: spacing.md, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },
  pill: { ...typography.caption, color: colors.warning, fontWeight: '700', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
});
