import type { OpeningHours, Vertical } from '@dari/contracts';

/**
 * Demo data for local development and pilots. Names are illustrative
 * placeholders, NOT verified real businesses (blueprint warns against
 * treating survey leads as facts).
 */

export const SALAMIYAH = {
  slug: 'salamiyah',
  nameAr: 'سلمية',
  nameEn: 'Salamiyah',
  config: { deliveryBaseFee: 5000, orderingVerticals: ['food', 'shopping', 'health'] },
};

export const AREAS = [
  { slug: 'center', nameAr: 'وسط المدينة', lat: 35.0113, lng: 37.0532 },
  { slug: 'north', nameAr: 'الحي الشمالي', lat: 35.0205, lng: 37.0521 },
  { slug: 'south', nameAr: 'الحي الجنوبي', lat: 35.0031, lng: 37.0547 },
  { slug: 'east', nameAr: 'الحي الشرقي', lat: 35.0119, lng: 37.0634 },
  { slug: 'west', nameAr: 'الحي الغربي', lat: 35.0107, lng: 37.0428 },
];

export const CATEGORIES: { slug: string; vertical: Vertical; nameAr: string; keywords: string[] }[] = [
  { slug: 'restaurants', vertical: 'food', nameAr: 'مطاعم', keywords: ['مطعم', 'اكل', 'غدا', 'عشا', 'فطور', 'جوعان'] },
  { slug: 'pizza', vertical: 'food', nameAr: 'بيتزا', keywords: ['بيتزا', 'pizza'] },
  { slug: 'shawarma', vertical: 'food', nameAr: 'شاورما وسندويش', keywords: ['شاورما', 'سندويش', 'فلافل', 'بروستد'] },
  { slug: 'sweets', vertical: 'food', nameAr: 'حلويات ومعجنات', keywords: ['حلويات', 'حلو', 'معجنات', 'كنافه', 'فطاير'] },
  { slug: 'cafes', vertical: 'food', nameAr: 'مقاهي', keywords: ['كافيه', 'قهوه', 'مقهي', 'عصير', 'عصاير'] },
  { slug: 'supermarkets', vertical: 'shopping', nameAr: 'سوبرماركت وبقالة', keywords: ['سوبرماركت', 'بقاليه', 'خضرة', 'خضار', 'فواكه', 'لحمة'] },
  { slug: 'electronics', vertical: 'shopping', nameAr: 'موبايلات وكمبيوتر', keywords: ['موبايل', 'جوال', 'لابتوب', 'كمبيوتر', 'شاحن'] },
  { slug: 'clothing', vertical: 'shopping', nameAr: 'ألبسة', keywords: ['البسه', 'ملابس', 'تيشرت', 'فستان', 'احذيه'] },
  { slug: 'plumbing', vertical: 'services', nameAr: 'سباكة', keywords: ['سباك', 'تمديدات', 'تسريب', 'مي'] },
  { slug: 'electrical', vertical: 'services', nameAr: 'كهرباء', keywords: ['كهربائي', 'كهربا', 'كهرباء', 'امبيرات', 'طاقه شمسيه'] },
  { slug: 'ac-repair', vertical: 'services', nameAr: 'تكييف وتبريد', keywords: ['تكييف', 'مكيف', 'براد', 'تبريد'] },
  { slug: 'cleaning', vertical: 'services', nameAr: 'تنظيف', keywords: ['تنظيف', 'تعزيل', 'سجاد'] },
  { slug: 'mechanics', vertical: 'services', nameAr: 'ميكانيك سيارات', keywords: ['ميكانيكي', 'سياره', 'كراج', 'بنشر'] },
  { slug: 'pharmacies', vertical: 'health', nameAr: 'صيدليات', keywords: ['صيدليه', 'دوا', 'ادويه', 'مناوبه'] },
  { slug: 'clinics', vertical: 'health', nameAr: 'عيادات وأطباء', keywords: ['طبيب', 'دكتور', 'عياده', 'اسنان', 'اطفال'] },
  { slug: 'labs', vertical: 'health', nameAr: 'مخابر وتحاليل', keywords: ['تحليل', 'تحاليل', 'مخبر'] },
  { slug: 'sports', vertical: 'appointments', nameAr: 'ملاعب ونوادي', keywords: ['ملعب', 'نادي', 'جيم', 'مسبح', 'كره'] },
  { slug: 'salons', vertical: 'appointments', nameAr: 'صالونات', keywords: ['حلاق', 'صالون', 'تجميل'] },
  { slug: 'hotels', vertical: 'stays', nameAr: 'فنادق', keywords: ['فندق', 'غرفه', 'اوتيل'] },
  { slug: 'farms', vertical: 'stays', nameAr: 'مزارع واستراحات', keywords: ['مزرعه', 'استراحه', 'شاليه', 'مسبح'] },
  { slug: 'real-estate-offices', vertical: 'property', nameAr: 'مكاتب عقارية', keywords: ['عقاري', 'مكتب عقاري', 'سمسار'] },
  { slug: 'travel-agencies', vertical: 'trips', nameAr: 'رحلات وسياحة', keywords: ['رحله', 'باص', 'سفر', 'حجز رحلات'] },
  { slug: 'events-venues', vertical: 'events', nameAr: 'صالات ومناسبات', keywords: ['صاله', 'عرس', 'حفله', 'مناسبات'] },
];

export const DAILY = (open: string, close: string): OpeningHours =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open, close }));

export interface SeedBusiness {
  name: string;
  category: string;
  area: string;
  description: string;
  phone: string;
  hours: OpeningHours;
  acceptsOrders?: boolean;
  rating?: number;
  products?: { name: string; price: number; section?: string; description?: string; stock?: number }[];
}

export const BUSINESSES: SeedBusiness[] = [
  {
    name: 'مطعم الشام',
    category: 'restaurants',
    area: 'center',
    description: 'مأكولات شامية تقليدية، مشاوي وفتات. توصيل داخل سلمية.',
    phone: '+963944000101',
    hours: DAILY('10:00', '23:30'),
    acceptsOrders: true,
    rating: 4.8,
    // Menu, photos and options: seed-food.ts
  },
  {
    name: 'مطعم بيتزا إيطاليا',
    category: 'pizza',
    area: 'north',
    description: 'بيتزا بعجينة مخمّرة على الفحم، وصفات إيطالية وسورية.',
    phone: '+963944000102',
    hours: DAILY('12:00', '01:00'),
    acceptsOrders: true,
    rating: 4.6,
    // Menu, photos and options: seed-food.ts
  },
  {
    name: 'شاورما الأصيل',
    category: 'shawarma',
    area: 'east',
    description: 'شاورما دجاج ولحمة على الطريقة السورية، بروستد وفلافل.',
    phone: '+963944000103',
    hours: DAILY('11:00', '02:00'),
    acceptsOrders: true,
    rating: 4.5,
    // Menu, photos and options: seed-food.ts
  },
  {
    name: 'حلويات ورد الشام',
    category: 'sweets',
    area: 'center',
    description: 'كنافة نابلسية، معمول، حلويات عربية بالسمن البلدي.',
    phone: '+963944000104',
    hours: DAILY('08:00', '23:00'),
    acceptsOrders: true,
    rating: 4.7,
    // Menu, photos and options: seed-food.ts
  },
  {
    name: 'كافيه السرايا',
    category: 'cafes',
    area: 'west',
    description: 'قهوة مختصة، عصائر طازجة وجلسة هادئة.',
    phone: '+963944000105',
    hours: DAILY('09:00', '00:00'),
    rating: 4.4,
  },
  {
    name: 'سوبرماركت المدينة',
    category: 'supermarkets',
    area: 'center',
    description: 'مواد غذائية، خضار وفواكه يومية، منظفات ومستلزمات منزلية.',
    phone: '+963944000106',
    hours: DAILY('07:00', '23:00'),
    acceptsOrders: true,
    rating: 4.3,
    products: [
      { name: 'ربطة خبز', price: 4000, section: 'مخبوزات', stock: 200 },
      { name: 'بندورة - كغ', price: 8000, section: 'خضار' },
      { name: 'زيت زيتون سلمية - لتر', price: 85000, section: 'زيوت', stock: 40 },
      { name: 'رز - 1 كغ', price: 16000, section: 'مواد غذائية', stock: 100 },
      { name: 'سائل جلي', price: 14000, section: 'منظفات', stock: 60 },
    ],
  },
  {
    name: 'متجر التقنية',
    category: 'electronics',
    area: 'north',
    description: 'موبايلات، لابتوبات، اكسسوارات وصيانة.',
    phone: '+963944000107',
    hours: DAILY('10:00', '21:00'),
    acceptsOrders: true,
    rating: 4.2,
    products: [
      { name: 'شاحن سريع 25 واط', price: 95000, section: 'اكسسوارات', stock: 25 },
      { name: 'سماعة بلوتوث', price: 180000, section: 'اكسسوارات', stock: 10 },
      { name: 'كفر موبايل', price: 35000, section: 'اكسسوارات', stock: 50 },
    ],
  },
  {
    name: 'محل الأناقة للألبسة',
    category: 'clothing',
    area: 'center',
    description: 'ألبسة رجالية ونسائية وأطفال.',
    phone: '+963944000108',
    hours: DAILY('10:00', '22:00'),
    rating: 4.1,
  },
  {
    name: 'أبو سامر للسباكة',
    category: 'plumbing',
    area: 'south',
    description: 'تمديدات صحية، كشف تسريب، تركيب سخانات. خدمة طوارئ.',
    phone: '+963944000109',
    hours: DAILY('07:00', '22:00'),
    rating: 4.6,
  },
  {
    name: 'ورشة النور للكهرباء',
    category: 'electrical',
    area: 'east',
    description: 'تمديدات كهربائية، طاقة شمسية، صيانة لوحات.',
    phone: '+963944000110',
    hours: DAILY('08:00', '20:00'),
    rating: 4.5,
  },
  {
    name: 'مركز التبريد الحديث',
    category: 'ac-repair',
    area: 'west',
    description: 'صيانة مكيفات وبرادات وغسالات.',
    phone: '+963944000111',
    hours: DAILY('08:00', '19:00'),
    rating: 4.3,
  },
  {
    name: 'صيدلية الشفاء',
    category: 'pharmacies',
    area: 'center',
    description: 'صيدلية مناوبة على مدار الساعة. أدوية ومستلزمات طبية.',
    phone: '+963944000112',
    hours: DAILY('00:00', '23:59'),
    acceptsOrders: true,
    rating: 4.9,
    products: [
      { name: 'بنادول 500 ملغ', price: 9000, section: 'مسكنات', stock: 80 },
      { name: 'كمامات طبية - علبة', price: 15000, section: 'مستلزمات', stock: 30 },
      { name: 'مقياس حرارة رقمي', price: 45000, section: 'أجهزة', stock: 12 },
    ],
  },
  {
    name: 'صيدلية الحياة',
    category: 'pharmacies',
    area: 'north',
    description: 'صيدلية ومستحضرات تجميل.',
    phone: '+963944000113',
    hours: DAILY('08:00', '22:00'),
    rating: 4.4,
  },
  {
    name: 'عيادة د. أحمد الخطيب',
    category: 'clinics',
    area: 'center',
    description: 'اختصاصي قلب وأوعية. مواعيد مسبقة.',
    phone: '+963944000114',
    hours: [1, 2, 3, 4, 6].map((day) => ({ day, open: '16:00', close: '21:00' })),
    rating: 4.8,
  },
  {
    name: 'مخبر الأمل للتحاليل',
    category: 'labs',
    area: 'west',
    description: 'تحاليل طبية شاملة، سحب عينات منزلي.',
    phone: '+963944000115',
    hours: DAILY('07:30', '20:00'),
    rating: 4.6,
  },
  {
    name: 'ملعب النجوم',
    category: 'sports',
    area: 'south',
    description: 'ملعب كرة قدم خماسي بعشب صناعي، حجز بالساعة.',
    phone: '+963944000116',
    hours: DAILY('14:00', '00:00'),
    rating: 4.5,
  },
  {
    name: 'فندق سلمية جراند',
    category: 'hotels',
    area: 'center',
    description: 'غرف مزدوجة وأجنحة، إفطار مجاني، موقف سيارات.',
    phone: '+963944000117',
    hours: DAILY('00:00', '23:59'),
    rating: 4.6,
  },
  {
    name: 'مزرعة السلام',
    category: 'farms',
    area: 'east',
    description: 'مزرعة للحجز اليومي مع مسبح ومنطقة شواء. مناسبة للعائلات.',
    phone: '+963944000118',
    hours: DAILY('09:00', '23:00'),
    rating: 4.7,
  },
  {
    name: 'مكتب الريان العقاري',
    category: 'real-estate-offices',
    area: 'north',
    description: 'بيع وإيجار بيوت وشقق وأراضٍ ومحلات في سلمية وريفها.',
    phone: '+963944000119',
    hours: DAILY('09:00', '19:00'),
    rating: 4.2,
  },
  {
    name: 'رحلات الوادي',
    category: 'travel-agencies',
    area: 'center',
    description: 'رحلات أسبوعية إلى طرطوس واللاذقية ومصياف.',
    phone: '+963944000120',
    hours: DAILY('09:00', '18:00'),
    rating: 4.4,
  },
];

export const JOBS = [
  { title: 'مهندس مدني', description: 'شركة البناء الحديث تطلب مهندساً مدنياً بخبرة سنتين للإشراف على مشاريع سكنية في سلمية.', employmentType: 'full_time', salaryMin: 2_500_000, salaryMax: 4_000_000 },
  { title: 'موظف مبيعات', description: 'مطلوب موظف مبيعات لمتجر إلكترونيات، دوام مسائي، خبرة بالموبايلات ميزة إضافية.', employmentType: 'part_time', salaryMin: 1_200_000, salaryMax: 1_800_000 },
  { title: 'محاسب', description: 'مكتب محاسبة يطلب محاسباً متمرساً على برامج المحاسبة وإعداد الميزانيات.', employmentType: 'full_time', salaryMin: 2_000_000, salaryMax: 3_000_000 },
  { title: 'مندوب توصيل', description: 'مطلوب مندوبو توصيل بدراجة نارية للعمل مع داري داخل سلمية. دخل حسب الطلبات.', employmentType: 'freelance', salaryMin: null, salaryMax: null },
  { title: 'عمال قطاف زيتون', description: 'موسم الزيتون: مطلوب عمال قطاف لمزارع في ريف سلمية الشرقي. أجر يومي.', employmentType: 'seasonal', salaryMin: 75_000, salaryMax: 100_000 },
  { title: 'مدرّس رياضيات', description: 'معهد تعليمي يطلب مدرّس رياضيات للمرحلة الثانوية، دوام مسائي.', employmentType: 'part_time', salaryMin: 1_000_000, salaryMax: 1_500_000 },
] as const;

export const ARTICLES = [
  { title: 'افتتاح مشروع جديد في سلمية لدعم الشباب', summary: 'مبادرة محلية لتأهيل الشباب في المهن الرقمية والحرفية بالتعاون مع فعاليات المدينة.', category: 'مجتمع' },
  { title: 'مهرجان سلمية الصيفي يعود هذا الأسبوع', summary: 'فعاليات فنية وثقافية وأسواق شعبية في ساحة المدينة على مدار ثلاثة أيام.', category: 'فعاليات' },
  { title: 'بدء موسم قطاف الزيتون في ريف سلمية', summary: 'المزارعون يبدأون القطاف وسط توقعات بموسم جيد، وفرص عمل موسمية متاحة.', category: 'اقتصاد' },
  { title: 'تحسين خدمات المياه في الأحياء الشرقية', summary: 'أعمال صيانة لشبكة المياه خلال الأسبوع الجاري مع جدول تقنين مؤقت.', category: 'خدمات' },
];
