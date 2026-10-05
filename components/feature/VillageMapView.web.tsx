import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const html = useMemo(() => {
    return generateMapHtml({
      villages,
      selectedVillageId,
      center,
      zoom,
      interactive,
    });
  }, [villages, selectedVillageId, center, zoom, interactive]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data && data.type === 'SELECT_VILLAGE' && data.villageId) {
          onSelectVillage?.(data.villageId);
        }
      } catch {
        // Ignore unparseable messages from other extensions/sources
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelectVillage]);

  // When selectedVillageId changes, fly to it
  useEffect(() => {
    if (selectedVillageId && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type: 'FLY_TO', villageId: selectedVillageId }),
        '*'
      );
    }
  }, [selectedVillageId]);

  return (
    <View style={[styles.container, { height }, style]}>
      {/* Web standard iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: radius.lg,
        }}
        title="Interactive Village Map"
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
});

export default VillageMapView;
