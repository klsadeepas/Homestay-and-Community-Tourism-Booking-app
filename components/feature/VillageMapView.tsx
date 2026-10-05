import React from 'react';
import { Platform } from 'react-native';
import { MapVillagePin } from './mapHtml';
import VillageMapViewNative from './VillageMapView.native';
import VillageMapViewWeb from './VillageMapView.web';

export type { MapVillagePin };

export interface VillageMapViewProps {
  villages: MapVillagePin[];
  selectedVillageId?: string;
  onSelectVillage?: (villageId: string) => void;
  height?: number;
  style?: any;
  interactive?: boolean;
  zoom?: number;
  center?: { lat: number; lng: number };
}

export function VillageMapView(props: VillageMapViewProps) {
  if (Platform.OS === 'web') {
    return <VillageMapViewWeb {...props} />;
  }
  return <VillageMapViewNative {...props} />;
}

export default VillageMapView;
