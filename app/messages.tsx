import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function Messages() {
  const { user, users } = useAuth();
  const { threads, messages, addMessage } = useData();
  const { t } = useSettings();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const myThreads = threads.filter((th) => th.participants.includes(user?.id || ''));

  if (!activeThread) {
    return (
      <Screen title={t('messages')} back>
        <FlatList
          data={myThreads}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => {
            const otherId = item.participants.find((p) => p !== user?.id);
            const other = users.find((u) => u.id === otherId);
            return (
              <Pressable style={styles.thread} onPress={() => setActiveThread(item.id)}>
                <Avatar uri={other?.photo} name={other?.name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{other?.name}</Text>
                  <Text style={styles.last} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState icon="chat-bubble-outline" title={t('emptyNoMessages')} />}
        />
      </Screen>
    );
  }

  const thread = myThreads.find((th) => th.id === activeThread);
  const other = users.find((u) => u.id === thread?.participants.find((p) => p !== user?.id));
  const convo = messages.filter((m) => m.threadId === activeThread).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const send = async () => {
    if (!draft.trim() || !thread) return;
    await addMessage({
      id: `m-${Date.now()}`,
      threadId: thread.id,
      from: user!.id,
      to: thread.participants.find((p) => p !== user?.id) || '',
      text: draft.trim(),
      createdAt: new Date().toISOString(),
    });
    setDraft('');
  };

  return (
    <Screen title={other?.name || 'Chat'} back>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={convo}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => {
            const mine = item.from === user?.id;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{item.text}</Text>
              </View>
            );
          }}
        />
        <View style={styles.inputRow}>
          <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Message..." placeholderTextColor={colors.textSubtle} />
          <Pressable onPress={send} style={styles.send}><MaterialIcons name="send" size={22} color="#fff" /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thread: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  name: { ...typography.bodyBold, color: colors.text },
  last: { ...typography.small, color: colors.textMuted },
  bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radius.lg },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  bubbleText: { ...typography.body, color: colors.text },
  inputRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  input: { flex: 1, minHeight: 44, backgroundColor: colors.bgAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
