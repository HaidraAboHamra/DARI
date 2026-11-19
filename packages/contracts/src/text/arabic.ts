const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const PUNCTUATION = /[\p{P}\p{S}]+/gu;
const WHITESPACE = /\s+/g;

const CHAR_MAP: Readonly<Record<string, string>> = {
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا',
  'ٱ': 'ا',
  'ة': 'ه',
  'ى': 'ي',
  'ؤ': 'و',
  'ئ': 'ي',
  'گ': 'ك',
  'ک': 'ك',
  'ی': 'ي',
};

const ARABIC_INDIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

function mapChar(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
    return String(code - ARABIC_INDIC_ZERO);
  }
  if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) {
    return String(code - PERSIAN_ZERO);
  }
  return CHAR_MAP[ch] ?? ch;
}

/**
 * Canonical form used for indexing and matching Arabic (MSA + Levantine dialect) text.
 * The same function runs at write time (indexing) and read time (querying),
 * so both sides always agree.
 */
export function normalizeArabic(input: string): string {
  return Array.from(input.normalize('NFKC').replace(DIACRITICS, ''))
    .map(mapChar)
    .join('')
    .toLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

const DEFINITE_ARTICLE = /^(وال|بال|كال|فال|لل|ال)(?=\S{2,})/;

/** Splits normalized text into tokens and strips the Arabic definite article. */
export function tokenizeArabic(input: string): string[] {
  const normalized = normalizeArabic(input);
  if (!normalized) return [];
  return normalized.split(' ').map((token) => token.replace(DEFINITE_ARTICLE, ''));
}

/** URL-safe slug that keeps Arabic letters (supported by every modern browser). */
export function slugify(input: string): string {
  return normalizeArabic(input)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const PLURAL_SUFFIXES = ['ات', 'ون', 'ين', 'ان'];

/**
 * Very light stemmer for matching (not linguistics): strips common plural/feminine
 * endings so "عائلة" matches "عائلات" and "صيدلية" matches "صيدليات".
 * Never shortens a word below 3 letters.
 */
export function stemArabic(token: string): string {
  if (token.length >= 5) {
    const suffix = PLURAL_SUFFIXES.find((s) => token.endsWith(s));
    if (suffix) return token.slice(0, -suffix.length);
  }
  if (token.length >= 4 && token.endsWith('ه')) return token.slice(0, -1);
  return token;
}
