export const Palette = {
  // Brand Accents
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Dark Editorial Slate
  dark: {
    background: '#0B0F19',
    surface: '#111827',
    surfaceSubtle: '#1F293D',
    border: '#1F2937',
    borderFocus: '#374151',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accent: '#F59E0B',
  },
  // Calm Cream / Paper Light
  light: {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceSubtle: '#F3EFEA',
    border: '#E7E2D9',
    borderFocus: '#D5CDBF',
    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    accent: '#D97706',
  },
  // Sepia
  sepia: {
    background: '#F6EEDF',
    surface: '#EDE3D2',
    surfaceSubtle: '#E4D9C6',
    border: '#DBCFB8',
    textPrimary: '#433422',
    textSecondary: '#6B5A44',
    textMuted: '#96836B',
    accent: '#B45309',
  },
  // AMOLED Pitch Black
  amoled: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceSubtle: '#141414',
    border: '#222222',
    textPrimary: '#EEEEEE',
    textSecondary: '#9E9E9E',
    textMuted: '#616161',
    accent: '#F59E0B',
  },
  highlights: {
    yellow: '#FDE047',
    green: '#86EFAC',
    blue: '#93C5FD',
    pink: '#F472B6',
    purple: '#C084FC',
  },
};

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  sansExtraBold: 'Inter_800ExtraBold',
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemiBold: 'Newsreader_600SemiBold',
  serifBold: 'Newsreader_700Bold',
  serifItalic: 'Newsreader_400Regular_Italic',
};

export const Typography = {
  fonts: Fonts,
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
};
