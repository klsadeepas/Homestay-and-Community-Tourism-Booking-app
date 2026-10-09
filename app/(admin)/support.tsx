import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useAlert } from '@/template';
import { FAQItem, SupportTicket } from '@/constants/sampleData';
import { colors, radius, spacing, typography } from '@/constants/theme';

const CAT_LABELS: Record<string, string> = { booking: 'Bookings', payment: 'Payments', host: 'Hosts', guide: 'Guides', app: 'App help', other: 'Other' };
const STATUSES: SupportTicket['status'][] = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminSupport() {
  const { users, user } = useAuth();
  const { tickets, faqs, updateTicket, addFAQ, updateFAQ, deleteFAQ, addAudit, addNotification } = useData();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'tickets' | 'faqs'>('tickets');
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicket['status']>('all');
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [faqOpen, setFaqOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'booking', order: '1' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sorted = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = statusFilter === 'all' ? sorted : sorted.filter((tk) => tk.status === statusFilter);
  const userOf = (id: string) => users.find((u) => u.id === id);

  const setStatus = async (tk: SupportTicket, status: SupportTicket['status']) => {
    await updateTicket(tk.id, { status });
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: `ticket_${status}`, target: tk.subject, createdAt: new Date().toISOString() });
    setActive({ ...tk, status });
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    const next = [...active.replies, { id: `tkr-${Date.now()}`, from: user?.name || 'Support', text: reply.trim(), createdAt: new Date().toISOString().slice(0, 10), staff: true }];
    const patch: Partial<SupportTicket> = { replies: next };
    if (active.status === 'open') patch.status = 'in_progress';
    await updateTicket(active.id, patch);
    await addNotification({ id: `n-${Date.now()}`, userId: active.userId, title: 'Support replied', body: `Support replied to "${active.subject}".`, type: 'announcement', link: '/support', createdAt: new Date().toISOString(), read: false });
    setActive({ ...active, ...patch });
    setReply('');
  };

  const openFaq = (f: FAQItem | null) => {
    setEditingFaq(f);
    setForm(f ? { question: f.question, answer: f.answer, category: f.category, order: String(f.order) } : { question: '', answer: '', category: 'booking', order: String(faqs.length + 1) });
    setErrors({});
    setFaqOpen(true);
  };

  const saveFaq = async () => {
    const e: Record<string, string> = {};
    if (!form.question.trim()) e.question = 'Question is required';
    if (!form.answer.trim()) e.answer = 'Answer is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload: FAQItem = {
      id: editingFaq?.id || `f-${Date.now()}`,
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category,
      published: editingFaq?.published ?? true,
      order: Number(form.order) || 1,
    };
    if (editingFaq) await updateFAQ(payload.id, payload); else await addFAQ(payload);
    await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: editingFaq ? 'update_faq' : 'create_faq', target: payload.question, createdAt: new Date().toISOString() });
    setFaqOpen(false);
  };

  const removeFaq = (f: FAQItem) => {
    showAlert('Delete FAQ?', `"${f.question}" will be removed from the help center.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteFAQ(f.id);
        await addAudit({ id: `au-${Date.now()}`, actorId: user!.id, action: 'delete_faq', target: f.question, createdAt: new Date().toISOString() });
      }},
    ]);
  };

  const statusTone = (s: SupportTicket['status']) =>
    s === 'open' ? 'warning' : s === 'in_progress' ? 'info' : 'success';
  const priorityTone = (p: SupportTicket['priority']) => p === 'high' ? 'danger' : p === 'normal' ? 'muted' : 'info';

  return (
    <Screen back title="Support Center" right={<Pressable onPress={() => (tab === 'faqs' ? openFaq(null) : setStatusFilter('all'))} accessibilityLabel={tab === 'faqs' ? 'Add FAQ' : 'Show all tickets'}>{tab === 'faqs' ? <MaterialIcons name="add" size={24} color={colors.primary} /> : <MaterialIcons name="filter-list" size={24} color={colors.primary} />}</Pressable>}>
      <View style={styles.tabs}>
        <Chip label="Tickets" selected={tab === 'tickets'} onPress={() => setTab('tickets')} tone="brand" />
        <Chip label="FAQs" selected={tab === 'faqs'} onPress={() => setTab('faqs')} tone="brand" />
      </View>

      {tab === 'tickets' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(['all', ...STATUSES] as const).map((s) => (
              <Chip key={s} label={s === 'all' ? 'All' : s.replace('_', ' ')} selected={statusFilter === s} onPress={() => setStatusFilter(s)} />
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
            {filtered.length === 0 ? <EmptyState icon="inbox" title="No tickets" message="Support requests will appear here." /> : filtered.map((tk) => {
              const u = userOf(tk.userId);
              return (
                <Pressable key={tk.id} style={styles.ticketCard} onPress={() => { setActive(tk); setReply(''); }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.subject} numberOfLines={1}>{tk.subject}</Text>
                    <Badge label={tk.status.replace('_', ' ')} tone={statusTone(tk.status)} />
                  </View>
                  <View style={styles.metaRow}>
                    <Avatar uri={u?.photo} name={u?.name} size={22} />
                    <Text style={styles.sub}>{u?.name || tk.userId}</Text>
                    <Badge label={CAT_LABELS[tk.category] || tk.category} tone="info" />
                    <Badge label={tk.priority} tone={priorityTone(tk.priority)} />
                  </View>
                  <Text style={styles.sub}>{tk.createdAt} · {tk.replies.length} repl{tk.replies.length === 1 ? 'y' : 'ies'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          {[...faqs].sort((a, b) => a.order - b.order).map((f) => (
            <View key={f.id} style={styles.faqCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.subject} numberOfLines={2}>{f.question}</Text>
                <Badge label={f.published ? 'live' : 'draft'} tone={f.published ? 'success' : 'muted'} />
              </View>
              <Text style={styles.sub}>{CAT_LABELS[f.category] || f.category} · order {f.order}</Text>
              <View style={styles.actions}>
                <Button title="Edit" variant="secondary" onPress={() => openFaq(f)} />
                <Button title={f.published ? 'Unpublish' : 'Publish'} variant="ghost" onPress={() => updateFAQ(f.id, { published: !f.published })} />
                <Button title="Delete" variant="danger" onPress={() => removeFaq(f)} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!active} animationType="slide" onRequestClose={() => setActive(null)}>
        <Screen back onBack={() => setActive(null)} title="Ticket thread">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            {active ? (
              <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
                <Text style={styles.subject}>{active.subject}</Text>
                <View style={styles.metaRow}>
                  <Badge label={CAT_LABELS[active.category] || active.category} tone="info" />
                  <Badge label={active.status.replace('_', ' ')} tone={statusTone(active.status)} />
                  <Badge label={`${active.priority} priority`} tone={priorityTone(active.priority)} />
                </View>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleAuthor}>{userOf(active.userId)?.name || 'User'} · {active.createdAt}</Text>
                  <Text style={styles.bubbleText}>{active.message}</Text>
                </View>
                {active.replies.map((r) => (
                  <View key={r.id} style={[styles.bubble, r.staff ? styles.staffBubble : null]}>
                    <Text style={styles.bubbleAuthor}>{r.from} · {r.createdAt}{r.staff ? ' · staff' : ''}</Text>
                    <Text style={styles.bubbleText}>{r.text}</Text>
                  </View>
                ))}
                {active.status !== 'closed' && active.status !== 'resolved' ? (
                  <View style={styles.replyForm}>
                    <Input placeholder="Write a reply…" value={reply} onChangeText={setReply} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />
                    <Button title="Send reply" onPress={sendReply} disabled={!reply.trim()} />
                  </View>
                ) : null}
                <View style={styles.actions}>
                  {active.status === 'open' ? <Button title="Start progress" variant="secondary" onPress={() => setStatus(active, 'in_progress')} /> : null}
                  {active.status === 'open' || active.status === 'in_progress' ? <Button title="Mark resolved" onPress={() => setStatus(active, 'resolved')} /> : null}
                  {active.status !== 'closed' ? <Button title="Close" variant="ghost" onPress={() => setStatus(active, 'closed')} /> : null}
                  {active.status === 'closed' || active.status === 'resolved' ? <Button title="Reopen" variant="ghost" onPress={() => setStatus(active, 'open')} /> : null}
                </View>
              </ScrollView>
            ) : null}
          </KeyboardAvoidingView>
        </Screen>
      </Modal>

      <Modal visible={faqOpen} animationType="slide" onRequestClose={() => setFaqOpen(false)}>
        <Screen back onBack={() => setFaqOpen(false)} title={editingFaq ? 'Edit FAQ' : 'New FAQ'}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Input label="Question *" value={form.question} onChangeText={(v) => setForm({ ...form, question: v })} error={errors.question} />
              <Input label="Answer *" value={form.answer} onChangeText={(v) => setForm({ ...form, answer: v })} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} error={errors.answer} />
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipRow}>
                {Object.entries(CAT_LABELS).map(([k, v]) => (
                  <Chip key={k} label={v} selected={form.category === k} onPress={() => setForm({ ...form, category: k })} />
                ))}
              </View>
              <Input label="Display order" value={form.order} onChangeText={(v) => setForm({ ...form, order: v })} keyboardType="numeric" />
              {editingFaq ? (
                <View style={styles.toggleRow}>
                  <Text style={styles.label}>Published</Text>
                  <Switch value={editingFaq.published} onValueChange={(v) => { const nf = { ...editingFaq, published: v }; setEditingFaq(nf); updateFAQ(nf.id, { published: v }); }} trackColor={{ false: colors.border, true: colors.primaryLight }} thumbColor={editingFaq.published ? colors.primary : '#fff'} />
                </View>
              ) : null}
              <View style={styles.actions}>
                <Button title="Cancel" variant="ghost" onPress={() => setFaqOpen(false)} />
                <Button title="Save FAQ" onPress={saveFaq} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  subject: { ...typography.bodyBold, color: colors.text, flex: 1 },
  sub: { ...typography.caption, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  ticketCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 6 },
  faqCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  bubble: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  staffBubble: { backgroundColor: colors.bgAlt, borderColor: colors.primaryLight },
  bubbleAuthor: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  bubbleText: { ...typography.body, color: colors.text },
  replyForm: { gap: spacing.sm, marginTop: spacing.md },
  label: { ...typography.smallBold, color: colors.text, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
});
