export const colors = {
  // Warm earthy palette
  primary: '#8B5A2B',       // Warm clay brown
  primaryDark: '#5E3A1A',
  primaryLight: '#C98B5A',
  accent: '#D97706',        // Warm amber
  accentSoft: '#FDE68A',
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
  info: '#1D4ED8',

  // Surfaces
  bg: '#FBF7F1',            // Cream background
  bgAlt: '#F3EADA',
  surface: '#FFFFFF',
  surfaceAlt: '#F8EFDF',
  overlay: 'rgba(0,0,0,0.45)',

  // Text
  text: '#2D1E12',
  textMuted: '#6B5A48',
  textSubtle: '#9A8974',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#E6D5BC',
  borderStrong: '#C9B189',

  // Status
  pending: '#B45309',
  confirmed: '#15803D',
  declined: '#B91C1C',
  cancelled: '#6B5A48',
  completed: '#1D4ED8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  smallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
};
