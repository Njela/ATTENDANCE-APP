import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/tokens';

type Tab = 'checkin' | 'reports';

type Props = {
  active: Tab;
};

export function BottomTabBar({ active }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable
        style={styles.item}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'checkin' }}
        onPress={() => router.replace('/checkin')}
      >
        <Ionicons
          name={active === 'checkin' ? 'location' : 'location-outline'}
          size={22}
          color={active === 'checkin' ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            active === 'checkin' && { color: theme.colors.accent, fontWeight: '700' },
          ]}
        >
          Check-in
        </Text>
      </Pressable>
      <Pressable
        style={styles.item}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'reports' }}
        onPress={() => router.replace('/reports')}
      >
        <Ionicons
          name={active === 'reports' ? 'bar-chart' : 'bar-chart-outline'}
          size={22}
          color={active === 'reports' ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text
          style={[
            styles.label,
            active === 'reports' && { color: theme.colors.accent, fontWeight: '700' },
          ]}
        >
          Reports
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
});
