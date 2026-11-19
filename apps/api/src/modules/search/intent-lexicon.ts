import type { Intent, ListingPurpose, PropertyType, Vertical } from '@dari/contracts';

/**
 * Built-in dialect lexicon (Levantine + MSA), already in normalized form
 * (see normalizeArabic). Category-specific keywords come from the database
 * so operators can extend vocabulary without a deploy.
 */

/** Filler words that carry no search meaning. */
export const STOPWORDS = new Set([
  'بدي', 'بدنا', 'بدك', 'ابغي', 'اريد', 'نريد', 'عايز', 'ابي', 'شو', 'ايش', 'وين', 'فين', 'في', 'فيه', 'فيي',
  'يوجد', 'عندي', 'عندكم', 'لي', 'الي', 'اي', 'شي', 'من', 'علي', 'عن', 'مع', 'هل', 'كيف', 'لو', 'سمحت',
  'ممكن', 'رجاء', 'منيح', 'منيحه', 'كتير', 'شي', 'حدا', 'يلي', 'اللي', 'هاد', 'هيك', 'و', 'او', 'ب', 'ل',
  'بال', 'لل', 'يا', 'عم', 'دور', 'ادور', 'بدور', 'بحث', 'ابحث', 'جيب', 'جبلي', 'جيبلي', 'بسلميه', 'سلميه',
]);

export const URGENCY = new Set(['هلق', 'هلا', 'الان', 'حالا', 'فورا', 'مستعجل', 'ضروري', 'طوارئ', 'اسعاف', 'مناوب', 'مناوبه', 'اليوم']);
export const OPEN_NOW = new Set(['فاتح', 'فاتحه', 'مفتوح', 'مفتوحه', 'شغال', 'شغاله']);
export const CHEAP = new Set(['رخيص', 'رخيصه', 'ارخص', 'اقتصادي', 'اقتصاديه']);
export const NEAR = new Set(['قريب', 'قريبه', 'جنبي', 'حدي', 'حولي', 'قربي']);
export const QUALITY = new Set(['احسن', 'افضل', 'اطيب', 'مشهور', 'مشهوره']);

export interface IntentWord {
  intent: Intent;
  vertical: Vertical | null;
}

/** Words that reveal *what the user wants to do*, independent of category. */
export const INTENT_WORDS: ReadonlyMap<string, IntentWord> = new Map<string, IntentWord>([
  ...words(['احجز', 'احجزلي', 'حجز', 'موعد', 'مواعيد'], { intent: 'book', vertical: 'appointments' }),
  ...words(['فعاليه', 'فعاليات', 'حفله', 'حفلات', 'مباراه', 'معرض', 'مهرجان', 'ندوه'], { intent: 'attend', vertical: 'events' }),
  ...words(['رحله', 'رحلات', 'سفر', 'سياحه', 'جوله'], { intent: 'travel', vertical: 'trips' }),
  ...words(['شغل', 'وظيفه', 'وظايف', 'وظائف', 'توظيف', 'فرصه', 'دوام', 'عمل'], { intent: 'apply', vertical: 'jobs' }),
  ...words(['ايجار', 'للايجار', 'اجار', 'للبيع', 'عقار', 'عقارات', 'شقه', 'بيت', 'ارض', 'مزرعه'], { intent: 'property', vertical: 'property' }),
  ...words(['فندق', 'فنادق', 'اقامه', 'نزل', 'شاليه', 'استراحه'], { intent: 'stay', vertical: 'stays' }),
  ...words(['اخبار', 'خبر', 'صاير', 'اعلان', 'تنبيه'], { intent: 'information', vertical: 'news' }),
  ...words(['اشتري', 'اطلب', 'اطلبلي', 'توصيل', 'دليفري', 'ديلفري'], { intent: 'buy', vertical: null }),
]);

function words(list: string[], value: IntentWord): [string, IntentWord][] {
  return list.map((w) => [w, value]);
}

/** Words that refine a real-estate need into structured filters. */
export const PROPERTY_HINTS: ReadonlyMap<string, { purpose?: ListingPurpose; propertyType?: PropertyType }> = new Map([
  ['ايجار', { purpose: 'rent' }],
  ['للايجار', { purpose: 'rent' }],
  ['اجار', { purpose: 'rent' }],
  ['للبيع', { purpose: 'sale' }],
  ['بيع', { purpose: 'sale' }],
  ['شقه', { propertyType: 'apartment' }],
  ['بيت', { propertyType: 'house' }],
  ['منزل', { propertyType: 'house' }],
  ['ارض', { propertyType: 'land' }],
  ['محل', { propertyType: 'shop' }],
  ['مكتب', { propertyType: 'office' }],
  ['مزرعه', { propertyType: 'farm' }],
]);
