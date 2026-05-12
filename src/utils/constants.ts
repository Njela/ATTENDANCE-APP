import { theme } from '../theme/tokens';

export const SEMESTER_WEEKS = 14;

/** @deprecated use theme.colors */
export const COLORS = {
  primary: theme.colors.accent,
  white: '#FFFFFF',
  background: theme.colors.surfaceAlt,
  border: theme.colors.border,
  muted: theme.colors.textMuted,
  success: theme.colors.success,
  successBg: theme.colors.successBg,
  danger: theme.colors.danger,
  dangerBg: theme.colors.dangerBg,
  warning: theme.colors.warning,
  warningBorder: '#FBBF24',
} as const;

export { theme };
