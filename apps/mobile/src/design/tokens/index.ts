export const spacing = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x8: 32,
  x10: 40,
  x12: 48,
  x16: 64,
} as const;

export const radius = {
  small: 6,
  control: 10,
  panel: 14,
  card: 18,
  hero: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.6 },
  screenTitle: { fontSize: 25, lineHeight: 31, fontWeight: '700' as const, letterSpacing: -0.4 },
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700' as const, letterSpacing: -0.3 },
  cardTitle: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.8 },
  nav: { fontSize: 11, lineHeight: 16, fontWeight: '600' as const },
} as const;

export const control = {
  minTouchTarget: 48,
  fieldHeight: 52,
  compactHeight: 44,
  pageHeaderHeight: 64,
  bottomNavigationHeight: 68,
  pageMaxWidth: 640,
} as const;

export const motion = {
  fast: 120,
  normal: 180,
  slow: 260,
} as const;

const lightColors = {
  background: '#F7F7F2',
  surface: '#FFFFFF',
  ink: '#193331',
  inkMuted: '#576D6B',
  primary: '#006F65',
  primarySoft: '#E6F3F0',
  accent: '#E46F5E',
  accentStrong: '#AF453A',
  sun: '#F5C75E',
  onWarm: '#23302D',
  success: '#237859',
  warning: '#956611',
  danger: '#B33A36',
  outline: '#E2E8E4',
  outlineStrong: '#718480',
  overlay: 'rgba(10, 26, 27, 0.52)',
} as const;

export type AppColors = Record<keyof typeof lightColors, string>;

const darkColors: AppColors = {
  background: '#101C1B',
  surface: '#1A2A29',
  ink: '#F5F6F1',
  inkMuted: '#B8C8C4',
  primary: '#87D7C8',
  primarySoft: '#20443D',
  accent: '#F2927F',
  accentStrong: '#FFAF9E',
  sun: '#E2BE63',
  onWarm: '#23302D',
  success: '#8CD9AD',
  warning: '#EBD081',
  danger: '#FFB1AA',
  outline: '#354B48',
  outlineStrong: '#7A9892',
  overlay: 'rgba(0, 0, 0, 0.68)',
};

export type AppColorScheme = 'light' | 'dark';

export type AppTheme = {
  colorScheme: AppColorScheme;
  colors: AppColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  control: typeof control;
  motion: typeof motion;
};

export const themes: Record<AppColorScheme, AppTheme> = {
  light: {
    colorScheme: 'light',
    colors: lightColors,
    spacing,
    radius,
    typography,
    control,
    motion,
  },
  dark: {
    colorScheme: 'dark',
    colors: darkColors,
    spacing,
    radius,
    typography,
    control,
    motion,
  },
};
