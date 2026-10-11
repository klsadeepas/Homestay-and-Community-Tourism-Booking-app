import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { email as validEmail, hasErrors, password as validPassword, required, type Errors } from '@/services/validation';
import { colors, radius, spacing, typography } from '@/constants/theme';

type Step = 'identify' | 'reset' | 'done';

export default function ForgotPassword() {
  const router = useRouter();
  const { users, ready, resetPassword } = useAuth();
  const { t } = useSettings();
  const [step, setStep] = useState<Step>('identify');
  const [email, setEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState<Errors>({});

  const onField = (key: string, setter: (v: string) => void) => (v: string) => {
    setter(v);
    if (errs[key]) setErrs((prev) => ({ ...prev, [key]: '', form: '' }));
  };

  const onContinue = () => {
    const next: Errors = { email: required(email, t('email')) || validEmail(email) };
    if (!next.email) {
      const clean = email.trim().toLowerCase();
      const found = users.find((u) => u.email.toLowerCase() === clean);
      if (!found) next.email = 'No account is registered with this email';
      else if (found.status === 'suspended') next.email = 'This account is suspended — contact support';
      else setAccountName(found.name || found.email);
    }
    setErrs(next);
    if (hasErrors(next)) return;
    setStep('reset');
  };

  const onReset = async () => {
    const next: Errors = {
      password: required(password, t('password')) || validPassword(password),
      confirm: required(confirm, 'Confirm password') || (confirm === password ? '' : 'The two passwords do not match'),
    };
    setErrs(next);
    if (hasErrors(next)) return;
    setLoading(true);
    const res = await resetPassword(email.trim(), password);
    setLoading(false);
    if (!res.ok) { setErrs({ form: res.error || 'Password reset failed' }); return; }
    setPassword('');
    setConfirm('');
    setStep('done');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {step === 'done' ? (
              <>
                <View style={styles.doneIcon}>
                  <MaterialIcons name="check-circle" size={34} color={colors.success} />
                </View>
                <Text style={styles.title}>Password updated</Text>
                <Text style={styles.sub}>
                  You can now sign in to {accountName || 'your account'} with the new password.
                </Text>
                <Button title={t('signIn')} onPress={() => router.replace('/(auth)/login')} fullWidth />
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('forgotPassword')}</Text>
                <Text style={styles.sub}>
                  {step === 'identify'
                    ? 'Enter the email you registered with to choose a new password.'
                    : `Choose a new password for ${accountName}.`}
                </Text>

                {step === 'identify' ? (
                  <Input
                    label={t('email')}
                    value={email}
                    onChangeText={onField('email', setEmail)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    error={errs.email}
                    helper={ready ? undefined : 'Loading accounts…'}
                  />
                ) : (
                  <>
                    <Input
                      label="New password"
                      value={password}
                      onChangeText={onField('password', setPassword)}
                      secureTextEntry
                      placeholder="At least 6 characters"
                      error={errs.password}
                    />
                    <Input
                      label="Confirm new password"
                      value={confirm}
                      onChangeText={onField('confirm', setConfirm)}
                      secureTextEntry
                      placeholder="Repeat the new password"
                      error={errs.confirm}
                    />
                  </>
                )}

                {errs.form ? <Text style={styles.err}>{errs.form}</Text> : null}

                <Button
                  title={step === 'identify' ? 'Continue' : 'Reset password'}
                  onPress={step === 'identify' ? onContinue : onReset}
                  loading={loading}
                  disabled={step === 'identify' ? !ready : false}
                  fullWidth
                />

                {step === 'identify' ? (
                  <View style={styles.row}>
                    <Text style={styles.muted}>{t('haveAccount')}</Text>
                    <Link href="/(auth)/login" asChild>
                      <Pressable><Text style={styles.link}>{t('signIn')}</Text></Pressable>
                    </Link>
                  </View>
                ) : (
                  <Pressable style={styles.changeEmail} onPress={() => { setErrs({}); setStep('identify'); }} accessibilityRole="button">
                    <Text style={styles.link}>Use a different email</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {step !== 'done' ? (
            <Text style={styles.notice}>
              This demo app has no mail server, so passwords are reset in-app instead of through an emailed link.
              Only the account owner should use this screen.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    gap: spacing.sm,
  },
  title: { ...typography.h2, color: colors.text },
  sub: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
  doneIcon: { alignSelf: 'center', marginBottom: spacing.sm },
  err: { color: colors.danger, ...typography.small, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  changeEmail: { alignSelf: 'center', marginTop: spacing.sm },
  muted: { color: colors.textMuted, ...typography.small },
  link: { color: colors.primary, ...typography.smallBold },
  notice: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', paddingHorizontal: spacing.sm },
});
