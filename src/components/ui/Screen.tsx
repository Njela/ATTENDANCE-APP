import React from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/tokens';

type Edge = 'top' | 'bottom' | 'left' | 'right';

type Props = ViewProps & {
  children: React.ReactNode;
  /** Safe-area edges; default top+bottom for full screens */
  edges?: readonly Edge[];
};

export function Screen({ children, style, edges = ['top', 'bottom'], ...rest }: Props) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges} {...rest}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
  },
});
