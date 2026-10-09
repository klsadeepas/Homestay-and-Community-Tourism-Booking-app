import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { SupportTicket } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

const CATEGORIES: SupportTicket['category'][] = ['booking', 'payment', 'host', 'guide', 'app', 'other'];
const CAT_LABELS: Record<string, string> = { booking: 'Bookings', payment: 'Payments', host: 'Hosts', guide: 'Guides', app: 'App help', other: 'Other' };

export default function Support() {
  const { user } = useAuth();
  const { faqs, tickets, addTicket } = useData();
  const { t } = useSettings();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'faq' | 'tickets'>('faq');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cat, setCat] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'booking' as SupportTicket['category'], message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const published = faqs.filter((f) => f.published).sort((a, b) => a.order - b.order);
  const cats = Array.from(new Set(published.map((f) => f.category)));
  const shownFaqs = published.filter((f) => cat === 'all' || f.category === cat);
  const mine = tickets.filter((tk) => tk.userId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const send = async () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = t('required');
    if (!form.message.trim()) e.message = t('required');
    setErrors(e);
    if (Object.keys(e).length) return;
    await addTicket({
      id: `tk-${Date.now()}`,
      userId: user!.id,
      subject: form.subject.trim(),
      category: form.category,
      message: form.message.trim(),
      status: 'open',
      priority: 'normal',
      createdAt: new Date().toISOString().slice(0, 10),
      replies: [],
    });
    setOpen(false);
    setForm({ subject: '', category: 'booking', message: '' });
    setTab('tickets');
    showAlert(t('ticketSent'), 'We usually reply within one business day (demo).');
  };

  const statusTone = (s: SupportTicket['status']) =>
    s === 'open' ? 'warning' : s === 'in_progress' ? 'info' : 'success';

  if (!user) {
    return (
      <Screen title={t('support')}>
        <EmptyState icon="support-agent" title={t('signIn')} message="Sign in to browse FAQs and contact support." />
      </Screen>
    );
  }

  return (
    <Screen back title={t('support')} right={<Pressable onPress={() => setOpen(true)} accessibilityLabel={t('newTicket')}><MaterialIcons name="add-comment" size={24} color={colors.primary} /></Pressable>}>
      <View style={styles.tabs}>
        <Chip label={t('faq')} selected={tab === 'faq'} onPress={() => setTab('faq')} tone="brand" />
        <Chip label={t('myTickets')} selected={tab === 'tickets'} onPress={() => setTab('tickets')} tone="brand" />
      </View>

      {tab === 'faq' ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label="All" selected={cat === 'all'} onPress={() => setCat('all')} />
            {cats.map((c) => (
              <Chip key={c} label={CAT_LABELS[c] || c} selected={cat === c} onPress={() => setCat(c)} />
            ))}
          </ScrollView>
          {shownFaqs.map((f) => {
            const isOpen = expanded === f.id;
            return (
              <Pressable key={f.id} style={styles.faqCard} onPress={() => setExpanded(isOpen ? null : f.id)}>
                <View style={styles.rowBetween}>
                  <Text style={styles.question}>{f.question}</Text>
                  <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={22} color={colors.textMuted} />
                </View>
                {isOpen ? <Text style={styles.answer}>{f.answer}</Text> : null}
              </Pressable>
            );
          })}
          <View style={styles.helpBox}>
            <MaterialIcons name="support-agent" size={20} color={colors.primary} />
            <Text style={styles.helpText}>{t('contactSupport')}</Text>
          </View>
          <Button title={t('newTicket')} onPress={() => setOpen(true)} fullWidth />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {mine.length === 0 ? (
            <EmptyState icon="inbox" title="No requests yet" message="Tap + to contact support." />
          ) : mine.map((tk) => (
            <View key={tk.id} style={styles.ticketCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.ticketSubject} numberOfLines={1}>{tk.subject}</Text>
                <Badge label={tk.status.replace('_', ' ')} tone={statusTone(tk.status)} />
              </View>
              <Text style={styles.sub}>{CAT_LABELS[tk.category] || tk.category} · {tk.createdAt}</Text>
              <Text style={styles.message} numberOfLines={2}>{tk.message}</Text>
              {tk.replies.length ? (
                <View style={styles.replyBox}>
                  <MaterialIcons name="reply" size={14} color={colors.primary} />
                  <Text style={styles.replyText} numberOfLines={2}><Text style={styles.replyAuthor}>{tk.replies[tk.replies.length - 1].from}:</Text> {tk.replies[tk.replies.length - 1].text}</Text>
                </View>
              ) : (
                <Text style={styles.sub}>Awaiting first reply…</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Screen back onBack={() => setOpen(false)} title={t('newTicket')}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Input label={`${t('subject')} *`} value={form.subject} onChangeText={(v) => setForm({ ...form, subject: v })} error={errors.subject} />
              <Text style={styles.label}>{t('category')}</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => (
                  <Chip key={c} label={CAT_LABELS[c]} selected={form.category === c} onPress={() => setForm({ ...form, category: c })} />
                ))}
              </View>
              <Input label={`${t('message')} *`} value={form.message} onChangeText={(v) => setForm({ ...form, message: v })} multiline numberOfLines={5} style={{ minHeight: 120, textAlignVertical: 'top' }} error={errors.message} />
              <Button title={t('send')} onPress={send} fullWidth />
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  faqCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  question: { ...typography.bodyBold, color: colors.text, flex: 1 },
  answer: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  helpBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bgAlt, padding: spacing.md, borderRadius: radius.lg, marginVertical: spacing.md },
  helpText: { ...typography.small, color: colors.text, flex: 1 },
  ticketCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 6 },
  ticketSubject: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.caption, color: colors.textMuted },
  message: { ...typography.small, color: colors.text },
  replyBox: { flexDirection: 'row', gap: 6, backgroundColor: colors.bgAlt, padding: spacing.sm, borderRadius: radius.md, alignItems: 'flex-start' },
  replyText: { ...typography.small, color: colors.text, flex: 1 },
  replyAuthor: { ...typography.smallBold, color: colors.text },
  label: { ...typography.smallBold, color: colors.text, marginBottom: 6 },
});
