/** Dari design tokens (same identity as the web: midnight navy, royal gold, warm ivory). */
export const colors = {
  navy: '#0B1424',
  navySoft: '#16233B',
  gold: '#C9A24B',
  goldDeep: '#8A6A24',
  champagne: '#EBD596',
  ivory: '#F6F0E0',
  sand: '#E8E1D2',
  ink: '#1F1E1D',
  muted: '#6B6A68',
  white: '#FFFFFF',
  success: '#2F7D5B',
  danger: '#C4553D',
} as const;

export const fonts = {
  display: 'ReemKufi_700Bold',
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;

export const radius = { card: 20, pill: 999, tile: 16 } as const;
export const space = (n: number) => n * 4;

export const shadow = {
  shadowColor: colors.navy,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
