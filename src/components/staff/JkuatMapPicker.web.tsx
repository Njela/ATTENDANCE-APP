import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/tokens';

type Props = {
  latitude: number;
  longitude: number;
  radiusM: number;
  onChange: (lat: number, lng: number) => void;
  layoutKey?: string;
};

/** Web: no WebView map in this bundle; use lat/lng fields (phone build uses Leaflet + OSM). */
export function JkuatMapPicker(_props: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        On web, enter latitude and longitude manually. On Android and iOS, the lecturer map uses
        Leaflet with OpenStreetMap-based tiles (CARTO light_all) — no Google Maps.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  text: { color: theme.colors.textMuted, fontSize: theme.font.small, lineHeight: 20 },
});
