export const theme = {
  colors: {
    accent: '#1A3C8F',
    accentMuted: '#2E4A9E',
    surface: '#FFFFFF',
    surfaceAlt: '#F5F6FA',
    border: '#E8EAEF',
    text: '#111827',
    textMuted: '#6B7280',
    success: '#0D9488',
    successBg: '#CCFBF1',
    danger: '#B91C1C',
    dangerBg: '#FEE2E2',
    warning: '#C2410C',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 22 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    title: 22,
    subtitle: 15,
    body: 15,
    small: 12,
    micro: 10,
  },
} as const;

export type Theme = typeof theme;
