import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { generateMapHtml, MapVillagePin } from './mapHtml';
import { colors, radius } from '@/constants/theme';

export interface VillageMapViewProps {
  villages: MapVillagePin[];
  selectedVillageId?: string;
  onSelectVillage?: (villageId: string) => void;
  height?: number;
  style?: ViewStyle;
  interactive?: boolean;
  zoom?: number;
  center?: { lat: number; lng: number };
}

export function VillageMapView({
  villages,
  selectedVillageId,
  onSelectVillage,
  height = 320,
  style,
  interactive = true,
  zoom,
  center,
}: VillageMapViewProps) {
  const webViewRef = useRef<WebView | null>(null);

  const html = useMemo(() => {
    return generateMapHtml({
      villages,
      selectedVillageId,
      center,
      zoom,
      interactive,
    });
  }, [villages, selectedVillageId, center, zoom, interactive]);

  // When selectedVillageId changes, fly to it in the WebView
  useEffect(() => {
    if (selectedVillageId && webViewRef.current) {
      const js = `if (window.flyToVillage) { window.flyToVillage(${JSON.stringify(selectedVillageId)}); } true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [selectedVillageId]);

  const handleMessage = (event: any) => {
    try {
      const raw = event.nativeEvent.data;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data && data.type === 'SELECT_VILLAGE' && data.villageId) {
        onSelectVillage?.(data.villageId);
      }
    } catch {
      // Ignore parse error
    }
  };

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default VillageMapView;
