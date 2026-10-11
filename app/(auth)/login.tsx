import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { email as validEmail, required } from '@/services/validation';

const DEMO = [
  { label: 'Traveler', email: 'SampleTraveler@gmail.com', pw: '123root' },
  { label: 'Homestay Owner', email: 'SampleOwner@gmail.com', pw: '123root' },
  { label: 'Village Tour Guide', email: 'SampleGuide@gmail.com', pw: '123root' },
  { label: 'Community Coordinator', email: 'SampleCoordinator@gmail.com', pw: '123root' },
  { label: 'System Admin', email: 'mainadmin@gmail.com', pw: 'admin123' },
];

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { t } = useSettings();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState<{ email?: string; password?: string; form?: string }>({});

  const onField = (key: 'email' | 'password', setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (errs[key]) setErrs((prev) => ({ ...prev, [key]: '', form: '' }));
  };

  const onLogin = async () => {
    const next: { email?: string; password?: string } = {
      email: required(email, t('email')) || validEmail(email),
      password: required(password, t('password')),
    };
    setErrs(next);
    if (next.email || next.password) return;
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);
    if (!res.ok) { setErrs({ form: res.error || 'Sign in failed' }); return; }
    router.replace('/');
  };

  const quickFill = (e: string, p: string) => {
    setEmail(e); setPassword(p); setErrs({});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800' }}
              style={styles.heroImg}
              contentFit="cover"
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroText}>
              <Text style={styles.brand}>RootedStay</Text>
              <Text style={styles.tagline}>{t('tagline')}</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>{t('signIn')}</Text>
            <Input label={t('email')} value={email} onChangeText={onField('email', setEmail)} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" error={errs.email} />
            <Input label={t('password')} value={password} onChangeText={onField('password', setPassword)} secureTextEntry placeholder="••••••••" error={errs.password} />
            {errs.form ? <Text style={styles.err}>{errs.form}</Text> : null}
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgot} accessibilityRole="link">
                <Text style={styles.link}>{t('forgotPassword')}</Text>
              </Pressable>
            </Link>
            <Button title={t('signIn')} onPress={onLogin} loading={loading} fullWidth />
            <View style={styles.row}>
              <Text style={styles.muted}>{t('noAccount')}</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable><Text style={styles.link}>{t('createAccount')}</Text></Pressable>
              </Link>
            </View>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoHeader}>Demo accounts</Text>
            {DEMO.map((d) => (
              <Pressable key={d.email} style={styles.demoItem} onPress={() => quickFill(d.email, d.pw)}>
                <Text style={styles.demoLabel}>{d.label}</Text>
                <Text style={styles.demoCreds}>{d.email}</Text>
              </Pressable>
            ))}
            <Text style={styles.demoFoot}> </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { height: 220, borderRadius: radius.xl, overflow: 'hidden' },
  heroImg: { ...StyleSheet.absoluteFill, backgroundColor: colors.bgAlt },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(45,30,18,0.45)' },
  heroText: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  brand: { ...typography.h1, color: '#fff' },
  tagline: { ...typography.body, color: '#FDE8C4', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.sm,
  },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  err: { color: colors.danger, ...typography.small, marginBottom: 6 },
  forgot: { alignSelf: 'flex-end', marginTop: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.md },
  muted: { color: colors.textMuted, ...typography.small },
  link: { color: colors.primary, ...typography.smallBold },
  demoBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  demoHeader: { ...typography.smallBold, color: colors.text, marginBottom: spacing.sm },
  demoItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  demoLabel: { ...typography.smallBold, color: colors.primary },
  demoCreds: { ...typography.caption, color: colors.textMuted },
  demoFoot: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
});
