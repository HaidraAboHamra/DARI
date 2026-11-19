import { type Intent, normalizeArabic, tokenizeArabic, type Vertical, VERTICAL_META } from '@dari/contracts';
import type { ListingPurpose, PropertyType } from '@dari/contracts';
import { CHEAP, INTENT_WORDS, NEAR, OPEN_NOW, PROPERTY_HINTS, QUALITY, STOPWORDS, TIME_WORDS, URGENCY } from './intent-lexicon';

export interface CategoryKeywords {
  id: string;
  vertical: Vertical;
  nameAr: string;
  keywords: string[];
}

export interface IntentResult {
  intent: Intent;
  vertical: Vertical | null;
  categoryIds: string[];
  confidence: number;
  /** Meaningful words left after removing fillers, signals and category words. */
  terms: string[];
  normalizedQuery: string;
  signals: { urgency: boolean; openNow: boolean; cheap: boolean; near: boolean; quality: boolean };
  property: { purpose?: ListingPurpose; propertyType?: PropertyType };
}

const MIN_PREFIX = 4;
const LEADING_PARTICLE = /^[وبفل]/;

/**
 * Turns free text ("بدي صيدلية مناوبة هلق") into a structured need
 * (Need = Find, vertical = health, urgency = now) — blueprint §13.3.
 * Pure and deterministic: no I/O, trivially unit-testable, swappable for an ML model.
 */
export class IntentClassifier {
  private readonly keywordIndex = new Map<string, CategoryKeywords[]>();

  constructor(categories: readonly CategoryKeywords[]) {
    for (const category of categories) {
      const keys = new Set([...tokenizeArabic(category.nameAr), ...category.keywords.flatMap((k) => tokenizeArabic(k))]);
      for (const key of keys) {
        if (key.length < 2) continue;
        const bucket = this.keywordIndex.get(key) ?? [];
        bucket.push(category);
        this.keywordIndex.set(key, bucket);
      }
    }
  }

  classify(query: string): IntentResult {
    const normalizedQuery = normalizeArabic(query);
    const tokens = tokenizeArabic(query);
    const signals = { urgency: false, openNow: false, cheap: false, near: false, quality: false };
    const matchedCategories = new Map<string, CategoryKeywords>();
    const intentVotes: { intent: Intent; vertical: Vertical | null }[] = [];
    const terms: string[] = [];
    const property: IntentResult['property'] = {};

    for (const raw of tokens) {
      const token = this.canonical(raw);
      Object.assign(property, PROPERTY_HINTS.get(token));
      if (URGENCY.has(token)) signals.urgency = true;
      else if (OPEN_NOW.has(token)) signals.openNow = true;
      else if (CHEAP.has(token)) signals.cheap = true;
      else if (NEAR.has(token)) signals.near = true;
      else if (QUALITY.has(token)) signals.quality = true;
      else if (STOPWORDS.has(token) || TIME_WORDS.has(token)) continue;
      else {
        const intentWord = INTENT_WORDS.get(token);
        const categories = this.lookupCategories(token);
        if (categories.length) categories.forEach((c) => matchedCategories.set(c.id, c));
        if (intentWord) intentVotes.push(intentWord);
        if (!categories.length && !intentWord) terms.push(token);
      }
    }

    const categories = [...matchedCategories.values()];
    const vertical = categories[0]?.vertical ?? intentVotes.find((v) => v.vertical)?.vertical ?? null;
    const intent = this.resolveIntent(vertical, intentVotes, signals, terms.length > 0);

    let confidence = 0.3;
    if (categories.length) confidence += 0.4;
    if (intentVotes.length) confidence += 0.2;
    if (signals.urgency || signals.openNow) confidence += 0.05;
    if (!categories.length && !intentVotes.length && terms.length) confidence = 0.35;

    return {
      intent,
      vertical,
      categoryIds: vertical ? categories.filter((c) => c.vertical === vertical).map((c) => c.id) : [],
      confidence: Math.min(Math.round(confidence * 100) / 100, 0.95),
      terms,
      normalizedQuery,
      signals,
      property,
    };
  }

  /**
   * Arabic glues conjunctions/prepositions to words ("ورخيص", "بالسلمية").
   * Strip one leading particle when the remainder is a known word.
   */
  private canonical(token: string): string {
    if (token.length <= 3 || !LEADING_PARTICLE.test(token) || this.isKnown(token)) return token;
    const stripped = token.slice(1);
    return this.isKnown(stripped) ? stripped : token;
  }

  private isKnown(token: string): boolean {
    return (
      URGENCY.has(token) ||
      OPEN_NOW.has(token) ||
      CHEAP.has(token) ||
      NEAR.has(token) ||
      QUALITY.has(token) ||
      STOPWORDS.has(token) ||
      TIME_WORDS.has(token) ||
      INTENT_WORDS.has(token) ||
      this.keywordIndex.has(token)
    );
  }

  private lookupCategories(token: string): CategoryKeywords[] {
    const exact = this.keywordIndex.get(token);
    if (exact) return exact;
    if (token.length < MIN_PREFIX) return [];
    // Tolerate plural/suffix variants: "صيدليات" → "صيدليه", "مطاعم" stays exact via keywords.
    for (const [key, cats] of this.keywordIndex) {
      if (key.length >= MIN_PREFIX && (token.startsWith(key) || key.startsWith(token))) return cats;
    }
    return [];
  }

  private resolveIntent(
    vertical: Vertical | null,
    votes: { intent: Intent; vertical: Vertical | null }[],
    signals: IntentResult['signals'],
    hasTerms: boolean,
  ): Intent {
    if (signals.urgency && (vertical === 'health' || vertical === 'services')) return 'urgent';
    // An explicit verb wins only when it agrees with the detected vertical
    // ("احجز ملعب" → book), so "مزرعة" (stays category) is not read as real estate.
    const agreeing = votes.filter((v) => v.intent !== 'buy' && (vertical === null || v.vertical === vertical));
    if (agreeing[0]) return agreeing[0].intent;
    if (vertical) return VERTICAL_META[vertical].primaryIntent;
    if (votes[0]) return votes[0].intent;
    if (signals.quality) return 'discover';
    return hasTerms ? 'find' : 'discover';
  }

}
