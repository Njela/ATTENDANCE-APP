import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../theme/tokens';

type Props = TouchableOpacityProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function PrimaryButton({
  title,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: Props) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.88}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : theme.colors.accent} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            variant === 'secondary' && styles.textSecondary,
            isGhost && styles.textGhost,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: theme.colors.accent },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.55 },
  text: { fontSize: theme.font.body, fontWeight: '600' },
  textPrimary: { color: '#fff' },
  textSecondary: { color: theme.colors.accent },
  textGhost: { color: theme.colors.textMuted, fontWeight: '500' },
});
