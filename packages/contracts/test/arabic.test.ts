import { describe, expect, it } from 'vitest';
import { normalizeArabic, slugify, stemArabic, tokenizeArabic } from '../src/text/arabic';

describe('normalizeArabic', () => {
  it('unifies alef, taa marbuta, yaa and strips diacritics/tatweel', () => {
    expect(normalizeArabic('أَحْمَد إبراهيم آمنة مكتبةٌ مستشفى')).toBe('احمد ابراهيم امنه مكتبه مستشفي');
    expect(normalizeArabic('مطعــــم')).toBe('مطعم');
  });

  it('converts Arabic-Indic digits and lowercases latin', () => {
    expect(normalizeArabic('شقة ٣ غرف PIZZA')).toBe('شقه 3 غرف pizza');
  });

  it('strips punctuation and collapses whitespace', () => {
    expect(normalizeArabic('  بدي، سبّاك!!   قريب؟ ')).toBe('بدي سباك قريب');
  });
});

describe('tokenizeArabic', () => {
  it('drops the definite article but keeps short words', () => {
    expect(tokenizeArabic('المطعم والصيدلية ال')).toEqual(['مطعم', 'صيدليه', 'ال']);
  });
  it('returns an empty list for blank input', () => {
    expect(tokenizeArabic('   ')).toEqual([]);
  });
});

describe('slugify', () => {
  it('produces dash separated slugs that keep Arabic', () => {
    expect(slugify('مطعم بيتزا إيطاليا!')).toBe('مطعم-بيتزا-ايطاليا');
  });
});

describe('stemArabic', () => {
  it.each([
    ['عائلات', 'عائل'],
    ['عائله', 'عائل'],
    ['صيدليات', 'صيدلي'],
    ['صيدليه', 'صيدلي'],
    ['مهندسين', 'مهندس'],
    ['بيت', 'بيت'],
    ['كره', 'كره'],
  ])('%s → %s', (input, expected) => {
    expect(stemArabic(input)).toBe(expected);
  });
});
