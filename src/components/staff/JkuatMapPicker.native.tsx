import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { JKUAT_CAMPUS } from '../../utils/jkuatCampus';
import { theme } from '../../theme/tokens';

type Props = {
  latitude: number;
  longitude: number;
  radiusM: number;
  onChange: (lat: number, lng: number) => void;
  /** Change when reopening the sheet so the map reloads with a fresh view. */
  layoutKey?: string;
};

/** Leaflet + Carto “light_all” tiles (OSM data via CARTO; no Google Maps). */
function buildPickerHtml(lat: number, lng: number, radiusM: number): string {
  const la = JSON.stringify(lat);
  const ln = JSON.stringify(lng);
  const r = JSON.stringify(radiusM);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="anonymous"></script>
  <style>
    html, body { margin:0; padding:0; height:100%; width:100%; }
    #map { height:100%; width:100%; }
    .leaflet-control-attribution { font-size:9px !important; max-width:100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var lat0 = ${la}, lng0 = ${ln}, r0 = ${r};
      var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([lat0, lng0], 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      var marker = L.marker([lat0, lng0], { draggable: true }).addTo(map);
      var circle = L.circle([lat0, lng0], {
        radius: r0,
        color: '#1a3c8f',
        weight: 2,
        fillColor: '#1a3c8f',
        fillOpacity: 0.2
      }).addTo(map);
      function emit() {
        var p = marker.getLatLng();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: p.lat, lng: p.lng }));
        }
      }
      marker.on('dragend', emit);
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        emit();
      });
      window.__setPickerPin = function (lat, lng, rad) {
        var ll = L.latLng(lat, lng);
        marker.setLatLng(ll);
        circle.setLatLng(ll);
        if (typeof rad === 'number' && rad > 0) circle.setRadius(rad);
        map.panTo(ll);
      };
      function relayout() {
        map.invalidateSize(true);
      }
      setTimeout(relayout, 50);
      setTimeout(relayout, 400);
    })();
  </script>
</body>
</html>`;
}

export function JkuatMapPicker({
  latitude,
  longitude,
  radiusM,
  onChange,
  layoutKey = 'map',
}: Props) {
  const webRef = useRef<WebView>(null);
  const webReady = useRef(false);

  const safeLat = useMemo(
    () => (Number.isFinite(latitude) ? latitude : JKUAT_CAMPUS.latitude),
    [latitude]
  );
  const safeLng = useMemo(
    () => (Number.isFinite(longitude) ? longitude : JKUAT_CAMPUS.longitude),
    [longitude]
  );
  const safeR = useMemo(() => (Number.isFinite(radiusM) && radiusM > 0 ? radiusM : 50), [radiusM]);

  const html = useMemo(
    () => buildPickerHtml(safeLat, safeLng, safeR),
    [safeLat, safeLng, safeR, layoutKey]
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const d = JSON.parse(e.nativeEvent.data) as { lat?: unknown; lng?: unknown };
        if (typeof d.lat === 'number' && typeof d.lng === 'number') {
          onChange(d.lat, d.lng);
        }
      } catch {
        /* ignore malformed */
      }
    },
    [onChange]
  );

  useEffect(() => {
    if (!webReady.current || !webRef.current) return;
    const js = `try{window.__setPickerPin(${Number(safeLat)},${Number(safeLng)},${Number(safeR)});}catch(_){};true;`;
    webRef.current.injectJavaScript(js);
  }, [safeLat, safeLng, safeR]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>Tap the map or drag the pin (OpenStreetMap via Leaflet + CARTO)</Text>
      <WebView
        key={layoutKey}
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://unpkg.com/' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          webReady.current = false;
        }}
        onLoadEnd={() => {
          webReady.current = true;
          webRef.current?.injectJavaScript(
            `try{window.__setPickerPin(${Number(safeLat)},${Number(safeLng)},${Number(safeR)});}catch(_){};true;`
          );
        }}
        nestedScrollEnabled
      />
      <Text style={styles.attribution}>
        Map data © OpenStreetMap contributors · Tiles © CARTO · Map library: Leaflet (open source).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.md },
  caption: {
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
    marginBottom: theme.space.sm,
  },
  web: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
  },
  attribution: {
    marginTop: 6,
    fontSize: 9,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
});
