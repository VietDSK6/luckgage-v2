export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  control: 12,
  card: 20,
  hero: 28,
  pill: 999,
} as const;

const lightColors = {
  background: '#FFF8ED',
  surface: '#FFFFFF',
  ink: '#15272A',
  inkMuted: '#607174',
  primary: '#0F766E',
  primarySoft: '#DDF4EF',
  accent: '#F26B5E',
  sun: '#F7C65D',
  success: '#2F855A',
  warning: '#B7791F',
  danger: '#C2413A',
  outline: '#D8DFDD',
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
  sun: '#F7C65D',
  success: '#75C996',
  warning: '#E1B455',
  danger: '#FF9189',
  outline: '#355054',
};

export type AppColorScheme = 'light' | 'dark';

export type AppTheme = {
  colorScheme: AppColorScheme;
  colors: AppColors;
  spacing: typeof spacing;
  radius: typeof radius;
};

export const themes: Record<AppColorScheme, AppTheme> = {
  light: {
    colorScheme: 'light',
    colors: lightColors,
    spacing,
    radius,
  },
  dark: {
    colorScheme: 'dark',
    colors: darkColors,
    spacing,
    radius,
  },
};
