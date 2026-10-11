import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { uploadMedia } from '@/services/uploads';
import { colors, radius, spacing, typography } from '@/constants/theme';

// Photos are picked from the phone's gallery/camera and uploaded to Supabase
// Storage, so the saved URL is one every other device can load.

const MAX_WIDTH = 1600;

async function shrink(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: 0.82, format: SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}

interface Props {
  label?: string;
  value: string;
  onChange: (uri: string) => void;
  folder?: string;
  error?: string;
  helper?: string;
  allowCamera?: boolean;
  containerStyle?: ViewStyle;
}

export function PhotoField({
  label, value, onChange, folder = 'general', error, helper, allowCamera, containerStyle,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const pick = async (source: 'library' | 'camera') => {
    setNotice('');
    const perms = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perms.granted) {
      setNotice(source === 'camera' ? 'Camera permission is off — allow it in phone settings to take a photo.' : 'Photo library permission is off — allow it in phone settings to pick a photo.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      exif: false,
    };
    const picked = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled || !picked.assets?.length) return;

    setBusy(true);
    const local = await shrink(picked.assets[0].uri);
    const res = await uploadMedia(local, folder);
    setBusy(false);
    if (res.url) {
      onChange(res.url);
      return;
    }
    // Keep the local image visible so the form still works offline, but make it
    // clear that it will not reach other devices.
    onChange(local);
    setNotice(`${res.error || 'The image could not be uploaded.'} It will only be visible on this phone.`);
  };

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.frame, error ? { borderColor: colors.danger } : null]}>
        <SmartImage uri={value} style={styles.preview} fallbackIcon="add-a-photo" accessibilityLabel={label || 'Photo'} />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.busyLabel}>Uploading…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => void pick('library')} disabled={busy} accessibilityRole="button">
          <MaterialIcons name="photo-library" size={18} color={colors.primary} />
          <Text style={styles.actionLabel}>Choose from device</Text>
        </Pressable>
        {allowCamera ? (
          <Pressable style={styles.action} onPress={() => void pick('camera')} disabled={busy} accessibilityRole="button">
            <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
            <Text style={styles.actionLabel}>Take photo</Text>
          </Pressable>
        ) : null}
        {value ? (
          <Pressable style={styles.action} onPress={() => { onChange(''); setNotice(''); }} disabled={busy} accessibilityRole="button">
            <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionLabel, { color: colors.danger }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.warn}>{notice}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.smallBold, color: colors.text, marginBottom: 6 },
  frame: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: 160 },
  busy: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.75)', flexDirection: 'row',
  },
  busyLabel: { ...typography.smallBold, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { ...typography.smallBold, color: colors.primary },
  error: { ...typography.caption, color: colors.danger, marginTop: 4 },
  warn: { ...typography.caption, color: colors.warning, marginTop: 4 },
  helper: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
