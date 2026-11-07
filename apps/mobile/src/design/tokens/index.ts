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
  small: 8,
  control: 12,
  panel: 16,
  card: 20,
  hero: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '900' as const, letterSpacing: -0.5 },
  screenTitle: { fontSize: 26, lineHeight: 32, fontWeight: '900' as const, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 21, lineHeight: 28, fontWeight: '900' as const },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '800' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '900' as const, letterSpacing: 1.2 },
  nav: { fontSize: 12, lineHeight: 16, fontWeight: '800' as const },
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
  background: '#FFF7E8',
  surface: '#FFFFFF',
  ink: '#12312F',
  inkMuted: '#607174',
  primary: '#0F766E',
  primarySoft: '#DDF4EF',
  accent: '#FF665C',
  accentStrong: '#C9473E',
  sun: '#F6C84C',
  onWarm: '#12312F',
  success: '#2F855A',
  warning: '#B7791F',
  danger: '#C2413A',
  outline: '#D8DFDD',
  outlineStrong: '#7F918F',
  overlay: 'rgba(10, 26, 27, 0.48)',
} as const;

export type AppColors = Record<keyof typeof lightColors, string>;

const darkColors: AppColors = {
  background: '#0B1719',
  surface: '#15272A',
  ink: '#F8F3E9',
  inkMuted: '#A7B5B3',
  primary: '#69D3C8',
  primarySoft: '#173C39',
  accent: '#FF897D',
  accentStrong: '#FF9B91',
  sun: '#F7C65D',
  onWarm: '#15272A',
  success: '#75C996',
  warning: '#E1B455',
  danger: '#FF9189',
  outline: '#355054',
  outlineStrong: '#70898C',
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
