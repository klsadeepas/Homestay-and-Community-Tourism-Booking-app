import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Role } from '@/services/types';
import { colors, radius, spacing, typography } from '@/constants/theme';

const ROLES: { value: Role; label: string; note: string }[] = [
  { value: 'traveler', label: 'Traveler', note: 'Book homestays and tours' },
  { value: 'owner', label: 'Homestay Owner', note: 'Host travelers (needs approval)' },
  { value: 'guide', label: 'Village Tour Guide', note: 'Lead tours (needs approval)' },
];

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { t } = useSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('traveler');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async () => {
    setErr('');
    if (!name || !email || !password) { setErr('Please fill in required fields'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setLoading(true);
    const res = await signUp({ name, email, phone, password, role });
    setLoading(false);
    if (!res.ok) { setErr(res.error || 'Registration failed'); return; }
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('createAccount')}</Text>
          <Text style={styles.sub}>Join the RootedStay community</Text>
          <View style={styles.card}>
            <Input label={t('name')} value={name} onChangeText={setName} placeholder="Jane Perera" />
            <Input label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+94 77 ..." />
            <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />

            <Text style={styles.label}>{t('role')}</Text>
            <View style={{ gap: spacing.sm }}>
              {ROLES.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={({ pressed }) => [styles.roleItem, role === r.value && styles.roleItemActive, { opacity: pressed ? 0.9 : 1 }]}
                >
                  <View style={[styles.radio, role === r.value && styles.radioActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleLabel}>{r.label}</Text>
                    <Text style={styles.roleNote}>{r.note}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={styles.notice}>
              Coordinators and System Admin are provisioned by administrators and are not available in public registration.
            </Text>

            {err ? <Text style={styles.err}>{err}</Text> : null}
            <Button title={t('createAccount')} onPress={onSubmit} loading={loading} fullWidth />
            <View style={styles.row}>
              <Text style={styles.muted}>{t('haveAccount')}</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable><Text style={styles.link}>{t('signIn')}</Text></Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  label: { ...typography.smallBold, color: colors.text, marginBottom: 4, marginTop: 4 },
  roleItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  roleItemActive: { borderColor: colors.primary, backgroundColor: '#FFF3E0' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  roleLabel: { ...typography.bodyBold, color: colors.text },
  roleNote: { ...typography.caption, color: colors.textMuted },
  notice: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  err: { color: colors.danger, ...typography.small },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  muted: { color: colors.textMuted, ...typography.small },
  link: { color: colors.primary, ...typography.smallBold },
});
