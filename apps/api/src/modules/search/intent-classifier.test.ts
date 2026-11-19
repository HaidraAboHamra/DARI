import { describe, expect, it } from 'vitest';
import { IntentClassifier } from './intent-classifier';

const classifier = new IntentClassifier([
  { id: 'restaurants', vertical: 'food', nameAr: 'مطاعم', keywords: ['مطعم', 'اكل', 'غدا', 'عشا'] },
  { id: 'pizza', vertical: 'food', nameAr: 'بيتزا', keywords: ['بيتزا', 'pizza'] },
  { id: 'pharmacy', vertical: 'health', nameAr: 'صيدليات', keywords: ['صيدليه', 'دوا', 'ادويه'] },
  { id: 'plumber', vertical: 'services', nameAr: 'سباكة', keywords: ['سباك', 'تمديدات'] },
  { id: 'sports', vertical: 'appointments', nameAr: 'ملاعب', keywords: ['ملعب'] },
  { id: 'farms', vertical: 'stays', nameAr: 'مزارع', keywords: ['مزرعه'] },
  { id: 'laptops', vertical: 'shopping', nameAr: 'كمبيوتر وموبايل', keywords: ['لابتوب', 'موبايل'] },
]);

describe('IntentClassifier', () => {
  it('understands an urgent pharmacy request in dialect', () => {
    const r = classifier.classify('بدي صيدلية مناوبة هلق');
    expect(r).toMatchObject({ intent: 'urgent', vertical: 'health', categoryIds: ['pharmacy'], terms: [] });
    expect(r.signals.urgency).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('extracts open-now and cheap signals for food', () => {
    const r = classifier.classify('بدي مطعم فاتح هلق ورخيص');
    expect(r.vertical).toBe('food');
    expect(r.intent).toBe('buy');
    expect(r.signals).toMatchObject({ openNow: true, cheap: true });
  });

  it('maps a service provider to the service intent', () => {
    const r = classifier.classify('بدي سباك قريب');
    expect(r).toMatchObject({ intent: 'service', vertical: 'services', categoryIds: ['plumber'] });
    expect(r.signals.near).toBe(true);
  });

  it('detects job, property, stay and news intents without categories', () => {
    expect(classifier.classify('في شغل مسائي؟')).toMatchObject({ intent: 'apply', vertical: 'jobs', terms: ['مسايي'] });
    expect(classifier.classify('بدي بيت للإيجار غرفتين')).toMatchObject({ intent: 'property', vertical: 'property' });
    expect(classifier.classify('احجزلي ملعب')).toMatchObject({ intent: 'book', vertical: 'appointments' });
    expect(classifier.classify('فندق ليلة الجمعة')).toMatchObject({ intent: 'stay', vertical: 'stays' });
    expect(classifier.classify('شو أخبار سلمية؟')).toMatchObject({ intent: 'information', vertical: 'news' });
  });

  it('keeps unknown words as search terms with low confidence', () => {
    const r = classifier.classify('غسيل سيارات متنقل');
    expect(r).toMatchObject({ intent: 'find', vertical: null, terms: ['غسيل', 'سيارات', 'متنقل'] });
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('tolerates plural forms through prefix matching', () => {
    expect(classifier.classify('صيدليات').categoryIds).toEqual(['pharmacy']);
  });

  it('lets a category override a conflicting generic intent word', () => {
    expect(classifier.classify('مزرعة للعائلة')).toMatchObject({ intent: 'stay', vertical: 'stays' });
  });

  it('keeps product terms next to a category', () => {
    const r = classifier.classify('مطعم بيتزا');
    expect(r.vertical).toBe('food');
    expect(r.categoryIds.sort()).toEqual(['pizza', 'restaurants']);
  });
});

describe('IntentClassifier property hints', () => {
  it('extracts purpose and property type', () => {
    expect(classifier.classify('بدي شقة للإيجار').property).toEqual({ purpose: 'rent', propertyType: 'apartment' });
    expect(classifier.classify('أرض للبيع').property).toEqual({ purpose: 'sale', propertyType: 'land' });
  });
});

describe('IntentClassifier time words', () => {
  it('treats time expressions as qualifiers, not search terms', () => {
    expect(classifier.classify('في رحلة هالأسبوع؟')).toMatchObject({ intent: 'travel', vertical: 'trips', terms: [] });
    expect(classifier.classify('احجزلي ملعب بكرا')).toMatchObject({ intent: 'book', terms: [] });
  });
});
