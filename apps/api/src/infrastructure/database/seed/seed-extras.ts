import { DAILY } from './seed-data';
import type { CreateResourceInput } from '@dari/contracts';

type ResourceSeed = Omit<CreateResourceInput, 'weeklyHours'> & { business: string; weeklyHours?: CreateResourceInput['weeklyHours'] };

export const RESOURCES: ResourceSeed[] = [
  {
    business: 'عيادة د. أحمد الخطيب',
    name: 'كشف قلبية',
    kind: 'appointment',
    unit: 'slot',
    slotMinutes: 30,
    capacity: 1,
    price: 50_000,
    weeklyHours: [1, 2, 3, 4, 6].map((day) => ({ day, open: '16:00', close: '21:00' })),
  },
  { business: 'ملعب النجوم', name: 'ملعب خماسي', kind: 'court', unit: 'slot', slotMinutes: 60, capacity: 1, price: 120_000, weeklyHours: DAILY('14:00', '23:00'), autoConfirm: true },
  { business: 'فندق سلمية جراند', name: 'غرفة مزدوجة', kind: 'room', unit: 'night', capacity: 6, price: 350_000, autoConfirm: true },
  { business: 'فندق سلمية جراند', name: 'جناح عائلي', kind: 'room', unit: 'night', capacity: 2, price: 600_000 },
  { business: 'مزرعة السلام', name: 'المزرعة كاملة (يوم وليلة)', kind: 'farm', unit: 'night', capacity: 1, price: 900_000 },
];

export const EVENTS = [
  { kind: 'event' as const, title: 'أمسية الفنان في ساحة سلمية', description: 'أمسية موسيقية مفتوحة للعائلات مع فرق محلية وأكشاك طعام.', venue: 'ساحة المدينة', inDays: 6, hours: 3, capacity: 300, price: 25_000 },
  { kind: 'event' as const, title: 'معرض الحرف اليدوية', description: 'معرض لأعمال الحرفيين في سلمية وريفها: نحاسيات، تطريز، خزف.', venue: 'المركز الثقافي', inDays: 10, hours: 6, capacity: 500, price: 0 },
  { kind: 'trip' as const, title: 'رحلة إلى طرطوس', description: 'رحلة يوم كامل إلى شاطئ طرطوس وجزيرة أرواد. تشمل النقل والمرشد.', venue: 'انطلاق من ساحة سلمية 7:00 صباحاً', destination: 'طرطوس - أرواد', inDays: 9, hours: 14, capacity: 45, price: 250_000 },
  { kind: 'trip' as const, title: 'رحلة مصياف والقلعة', description: 'زيارة قلعة مصياف ومنتزهات المنطقة مع غداء جماعي.', venue: 'انطلاق من موقف المدينة', destination: 'مصياف', inDays: 13, hours: 10, capacity: 30, price: 150_000 },
];

export const LISTINGS = [
  { purpose: 'rent' as const, propertyType: 'apartment' as const, title: 'شقة للإيجار غرفتين وصالون', description: 'شقة مفروشة جزئياً، طابق ثاني، إطلالة جيدة، قريبة من الخدمات.', price: 1_500_000, area: 'center', rooms: 2, sizeSqm: 95 },
  { purpose: 'sale' as const, propertyType: 'house' as const, title: 'منزل مستقل للبيع مع حديقة', description: 'منزل عربي مستقل، ثلاث غرف، حديقة وأشجار زيتون، طابو أخضر.', price: 450_000_000, area: 'south', rooms: 3, sizeSqm: 180 },
  { purpose: 'sale' as const, propertyType: 'land' as const, title: 'أرض زراعية مع بئر', description: 'أرض زراعية مشجرة زيتون في الريف الشرقي، بئر ماء ومدخل نظامي.', price: 300_000_000, area: 'east', rooms: null, sizeSqm: 5000 },
  { purpose: 'rent' as const, propertyType: 'shop' as const, title: 'محل تجاري على الشارع الرئيسي', description: 'محل بواجهة زجاجية مناسب لمطعم أو صيدلية، مساحة واسعة.', price: 2_000_000, area: 'north', rooms: null, sizeSqm: 60 },
  { purpose: 'rent' as const, propertyType: 'farm' as const, title: 'مزرعة للإيجار السنوي', description: 'مزرعة مع بيت ريفي ومسبح، مناسبة للاستثمار السياحي الموسمي.', price: 12_000_000, area: 'west', rooms: 2, sizeSqm: 8000 },
];
