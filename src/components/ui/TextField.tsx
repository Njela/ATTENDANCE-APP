import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { theme } from '../../theme/tokens';

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
};

export function TextField({ label, icon, secureToggle, secureTextEntry, style, ...rest }: Props) {
  const [hidden, setHidden] = React.useState(!!secureTextEntry);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {icon ? (
          <Ionicons name={icon} size={18} color={theme.colors.textMuted} style={styles.icon} />
        ) : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          {...rest}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={theme.colors.textMuted}
              style={styles.eye}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.lg },
  label: {
    fontSize: theme.font.micro,
    fontWeight: '600',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: theme.space.sm,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    backgroundColor: theme.colors.surface,
  },
  icon: { marginRight: theme.space.sm },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  eye: { padding: 4 },
});
