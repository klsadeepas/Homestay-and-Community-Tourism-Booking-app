import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PhotoField } from '@/components/ui/PhotoField';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useAlert } from '@/template';
import { csv, hasErrors, phone as phoneRule, required, textLength, type Errors } from '@/services/validation';
import { colors, radius, spacing, typography } from '@/constants/theme';

const WORD = /^[A-Za-zÀ-ɏ'’ -]{2,30}$/;

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
  const [errors, setErrors] = useState<Errors>({});

  const role = user?.role;

  const save = async () => {
    const e: Errors = {};
    e.name = required(name, 'Name') || textLength(name, 'Name', 2, 80);
    e.phone = phoneRule(phone, 'Phone');
    e.bio = textLength(bio, 'Bio', 0, 500);
    if (role === 'owner') {
      e.village = required(village, 'Village') || textLength(village, 'Village', 2, 80);
      e.homestayName = textLength(homestayName, 'Homestay name', 0, 80);
    }
    if (role === 'guide') {
      e.village = required(village, 'Village') || textLength(village, 'Village', 2, 80);
      e.languages = required(languages, 'Languages') || csv(languages, 'Languages', (item) => (WORD.test(item) ? '' : `"${item}" is not a valid language name.`));
      e.experience = textLength(experience, 'Experience', 0, 800);
      e.activities = csv(activities, 'Activities', (item) => textLength(item, 'Activity', 2, 60));
    }
    if (role === 'traveler') {
      e.homeRegion = textLength(homeRegion, 'Home region', 0, 80);
      e.interests = csv(interests, 'Interests', (item) => textLength(item, 'Interest', 2, 40));
      e.accessibility = csv(accessibility, 'Accessibility needs', (item) => textLength(item, 'Need', 2, 60));
    }
    setErrors(e);
    if (hasErrors(e)) return;

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
            <Text style={styles.caption}>The image you choose is uploaded to the shared database, so hosts, guides and admins see the same photo.</Text>
          </View>

          <PhotoField label={`${t('photo')} — from this device`} value={photo} onChange={setPhoto} folder="profiles" allowCamera error={errors.photo} />

          <Text style={styles.section}>Personal</Text>
          <Input label={`${t('name')} *`} value={name} onChangeText={setName} error={errors.name} />
          <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} helper="e.g. 077 123 4567" />
          <Input label="Short bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} error={errors.bio} />

          {role === 'traveler' ? (
            <>
              <Text style={styles.section}>Travel preferences</Text>
              <Input label="Home region" value={homeRegion} onChangeText={setHomeRegion} placeholder="e.g. Colombo" error={errors.homeRegion} />
              <Input label="Interests (comma separated)" value={interests} onChangeText={setInterests} placeholder="Hiking, Culture, Food" error={errors.interests} />
              <Input label="Accessibility needs (optional)" value={accessibility} onChangeText={setAccessibility} placeholder="e.g. step-free rooms" error={errors.accessibility} />
            </>
          ) : null}

          {role === 'owner' ? (
            <>
              <Text style={styles.section}>Homestay details</Text>
              <Input label="Village *" value={village} onChangeText={setVillage} error={errors.village} />
              <Input label="Homestay name" value={homestayName} onChangeText={setHomestayName} error={errors.homestayName} />
            </>
          ) : null}

          {role === 'guide' ? (
            <>
              <Text style={styles.section}>Guiding details</Text>
              <Input label="Village *" value={village} onChangeText={setVillage} error={errors.village} />
              <Input label="Languages (comma separated) *" value={languages} onChangeText={setLanguages} error={errors.languages} placeholder="English, Sinhala" />
              <Input label="Experience" value={experience} onChangeText={setExperience} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} error={errors.experience} />
              <Input label="Activities offered (comma separated)" value={activities} onChangeText={setActivities} placeholder="Hiking, Cultural" error={errors.activities} />
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
  caption: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
  section: { ...typography.smallBold, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  lockText: { ...typography.small, color: colors.textMuted, flex: 1 },
  readonly: { ...typography.body, color: colors.text, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, justifyContent: 'flex-end' },
});
