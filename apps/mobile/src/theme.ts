/** Dari design tokens (same identity as the web: midnight navy, royal gold, warm ivory). */
export const colors = {
  navy: '#0B1424',
  navySoft: '#16233B',
  gold: '#C9A24B',
  /** Gold for text/icons on light backgrounds (5.5:1 on ivory). `gold` is for fills only. */
  goldDeep: '#7A5C1C',
  champagne: '#EBD596',
  ivory: '#F6F0E0',
  sand: '#E8E1D2',
  ink: '#1F1E1D',
  muted: '#5E5D5B',
  white: '#FFFFFF',
  success: '#286C4E',
  danger: '#B0432C',
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

/**
 * Type scale (UX study §4): Arabic glyphs read smaller than Latin at the same size,
 * so body text is 16 with ~1.6 line height and nothing goes below 13.
 */
export const type = {
  caption: { fontSize: 13, lineHeight: 20 },
  small: { fontSize: 14, lineHeight: 22 },
  body: { fontSize: 16, lineHeight: 26 },
  title: { fontSize: 20, lineHeight: 30 },
  display: { fontSize: 28, lineHeight: 40 },
} as const;

/** Minimum touch target (Apple HIG 44pt, WCAG 2.5.5). */
export const touch = 44;
