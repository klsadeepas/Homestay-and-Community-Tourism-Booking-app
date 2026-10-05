import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { PLACEHOLDER_BLURHASH, normalizeImageUrl } from '@/services/images';

interface Props {
  uri?: string;
  style?: ImageStyle | ViewStyle | (ImageStyle | ViewStyle)[];
  contentFit?: ImageContentFit;
  fallbackIcon?: keyof typeof MaterialIcons.glyphMap;
  accessibilityLabel?: string;
  rounded?: boolean;
}

export function SmartImage({ uri, style, contentFit = 'cover', fallbackIcon = 'landscape', accessibilityLabel, rounded }: Props) {
  const [failed, setFailed] = useState(false);
  const src = normalizeImageUrl(uri);
  const base: any[] = [styles.base, rounded ? { borderRadius: 999 } : null, style];

  if (!src || failed) {
    return (
      <View style={[...base, styles.fallback]} accessibilityLabel={accessibilityLabel}>
        <MaterialIcons name={fallbackIcon} size={28} color={colors.primaryLight} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={base as any}
      contentFit={contentFit}
      transition={200}
      placeholder={PLACEHOLDER_BLURHASH}
      onError={() => setFailed(true)}
      accessibilityLabel={accessibilityLabel}
      recyclingKey={src}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.bgAlt },
  fallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
});
