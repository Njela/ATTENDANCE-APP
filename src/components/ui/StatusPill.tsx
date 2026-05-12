import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/tokens';

type Props = {
  status: 'present' | 'absent' | string;
  compact?: boolean;
};

export function StatusPill({ status, compact }: Props) {
  const isPresent = status === 'present';
  return (
    <View
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { backgroundColor: isPresent ? theme.colors.successBg : theme.colors.dangerBg },
      ]}
    >
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          { color: isPresent ? theme.colors.success : theme.colors.danger },
        ]}
      >
        {isPresent ? 'Present' : 'Absent'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillCompact: { paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '700' },
  textCompact: { fontSize: 9 },
});
