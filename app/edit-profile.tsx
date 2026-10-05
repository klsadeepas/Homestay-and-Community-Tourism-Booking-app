import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { colors, radius, spacing, typography } from '@/constants/theme';

const AVATAR_CHOICES = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400',
];

export default function EditProfile() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { t } = useSettings();
  const { showAlert } = useAlert();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photo, setPhoto] = useState(user?.photo || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [homeRegion, setHomeRegion] = useState(user?.homeRegion || '');
  const [interests, setInterests] = useState((user?.interests || []).join(', '));
  const [accessibility, setAccessibility] = useState((user?.accessibility || []).join(', '));
  const [village, setVillage] = useState(user?.village || '');
  const [homestayName, setHomestayName] = useState(user?.homestayName || '');
  const [languages, setLanguages] = useState((user?.languagesSpoken || []).join(', '));
  const [experience, setExperience] = useState(user?.experience || '');
  const [activities, setActivities] = useState((user?.activities || []).join(', '));
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const role = user?.role;

  const save = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (role === 'owner' && !village.trim()) e.village = 'Village is required';
    if (role === 'guide' && !village.trim()) e.village = 'Village is required';
    if (role === 'guide' && !languages.trim()) e.languages = 'List at least one language';
    setErrors(e);
    if (Object.keys(e).length) return;

    const patch: any = { name: name.trim(), phone: phone.trim(), photo, bio: bio.trim() };
    if (role === 'traveler') {
      patch.homeRegion = homeRegion.trim();
      patch.interests = interests.split(',').map((s) => s.trim()).filter(Boolean);
      patch.accessibility = accessibility.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (role === 'owner') {
      patch.village = village.trim();
      patch.homestayName = homestayName.trim();
    } else if (role === 'guide') {
      patch.village = village.trim();
      patch.languagesSpoken = languages.split(',').map((s) => s.trim()).filter(Boolean);
      patch.experience = experience.trim();
      patch.activities = activities.split(',').map((s) => s.trim()).filter(Boolean);
    }
    await updateProfile(patch);
    showAlert('Saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <Screen title={t('editProfile')} back>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarWrap}>
            <Avatar uri={photo} name={name} size={100} />
            <Pressable onPress={() => setShowPicker((v) => !v)} style={styles.photoBtn}>
              <MaterialIcons name="photo-camera" size={16} color="#fff" />
              <Text style={styles.photoBtnText}>{t('uploadPhoto')}</Text>
            </Pressable>
            {showPicker ? (
              <View style={styles.pickerRow}>
                {AVATAR_CHOICES.map((u) => (
                  <Pressable key={u} onPress={() => { setPhoto(u); setShowPicker(false); }} style={[styles.pickerItem, photo === u && styles.pickerItemActive]}>
                    <Avatar uri={u} size={56} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.caption}>Demo photo picker. Native file picker not connected.</Text>
          </View>

          <Text style={styles.section}>Personal</Text>
          <Input label={`${t('name')} *`} value={name} onChangeText={setName} error={errors.name} />
          <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Short bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />

          {role === 'traveler' ? (
            <>
              <Text style={styles.section}>Travel preferences</Text>
              <Input label="Home region" value={homeRegion} onChangeText={setHomeRegion} placeholder="e.g. Colombo" />
              <Input label="Interests (comma separated)" value={interests} onChangeText={setInterests} placeholder="Hiking, Culture, Food" />
              <Input label="Accessibility needs (optional)" value={accessibility} onChangeText={setAccessibility} placeholder="e.g. step-free rooms" />
            </>
          ) : null}

          {role === 'owner' ? (
            <>
              <Text style={styles.section}>Homestay details</Text>
              <Input label="Village *" value={village} onChangeText={setVillage} error={errors.village} />
              <Input label="Homestay name" value={homestayName} onChangeText={setHomestayName} />
            </>
          ) : null}

          {role === 'guide' ? (
            <>
              <Text style={styles.section}>Guiding details</Text>
              <Input label="Village *" value={village} onChangeText={setVillage} error={errors.village} />
              <Input label="Languages (comma separated) *" value={languages} onChangeText={setLanguages} error={errors.languages} placeholder="English, Sinhala" />
              <Input label="Experience" value={experience} onChangeText={setExperience} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
              <Input label="Activities offered (comma separated)" value={activities} onChangeText={setActivities} placeholder="Hiking, Cultural" />
            </>
          ) : null}

          {role === 'coordinator' ? (
            <>
              <Text style={styles.section}>Coordinator details</Text>
              <View style={styles.lockRow}>
                <MaterialIcons name="lock" size={18} color={colors.textMuted} />
                <Text style={styles.lockText}>Assigned villages are managed by administrators.</Text>
              </View>
              <Text style={styles.readonly}>{(user?.assignedVillages || []).join(', ') || '—'}</Text>
            </>
          ) : null}

          {role === 'admin' ? (
            <View style={styles.lockRow}>
              <MaterialIcons name="shield" size={18} color={colors.textMuted} />
              <Text style={styles.lockText}>Admin-only permissions and MFA are managed through secure provisioning.</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button title={t('cancel')} variant="ghost" onPress={() => router.back()} />
            <Button title={t('save')} onPress={save} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
  photoBtnText: { color: '#fff', ...typography.smallBold },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  pickerItem: { padding: 2, borderRadius: 32, borderWidth: 2, borderColor: 'transparent' },
  pickerItemActive: { borderColor: colors.primary },
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  section: { ...typography.smallBold, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  lockText: { ...typography.small, color: colors.textMuted, flex: 1 },
  readonly: { ...typography.body, color: colors.text, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, justifyContent: 'flex-end' },
});
