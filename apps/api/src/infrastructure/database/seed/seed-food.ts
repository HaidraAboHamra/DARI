import type { OpeningHours, ProductOptionGroupInput } from '@dari/contracts';
import { DAILY } from './seed-data';

/**
 * Demo food catalogue («داري للطعام»): restaurants with cover photos, logos,
 * prep times, minimum orders, and menus with photos and options.
 *
 * Photos are free-licence stock photos (Unsplash License) stored in
 * `apps/api/seed-media`; they illustrate the dish type, not a real kitchen.
 * Items without a fitting photo (e.g. كنافة) show the brand placeholder until
 * the merchant uploads a real one.
 */

export interface FoodItem {
  name: string;
  section: string;
  price: number;
  description?: string;
  photo?: string;
  options?: ProductOptionGroupInput[];
  featured?: boolean;
  stock?: number;
}

export interface FoodPlace {
  name: string;
  category: string;
  area: string;
  description: string;
  phone: string;
  hours: OpeningHours;
  rating: number;
  prepMinutes: number;
  minOrder: number;
  /** null = city default fee. */
  deliveryFee: number | null;
  cover: string;
  logo: string;
  items: FoodItem[];
  /** Public coupons shown on offer banners. */
  offers?: { code: string; title: string; kind: 'percent' | 'amount'; value: number; minOrder: number; maxDiscount?: number }[];
}

export const FOOD_CATEGORIES = [
  { slug: 'burgers', vertical: 'food' as const, nameAr: 'برغر', keywords: ['برغر', 'برجر', 'burger', 'همبرغر'] },
  { slug: 'healthy', vertical: 'food' as const, nameAr: 'أكل صحي', keywords: ['صحي', 'سلطه', 'دايت', 'بول', 'رجيم'] },
  { slug: 'asian', vertical: 'food' as const, nameAr: 'آسيوي', keywords: ['اسيوي', 'سوشي', 'نودلز', 'صيني', 'كاري'] },
  { slug: 'bakery', vertical: 'food' as const, nameAr: 'أفران ومعجنات', keywords: ['فرن', 'مناقيش', 'معجنات', 'فطاير', 'خبز', 'سمبوسك'] },
];

// ── Reusable option groups ────────────────────────────────────────────────
const pizzaSize = { id: 'size', name: 'الحجم', min: 1, max: 1, choices: [{ id: 'size-m', name: 'وسط', price: 0 }, { id: 'size-l', name: 'كبير', price: 12000 }, { id: 'size-xl', name: 'عائلي', price: 24000 }] };
const pizzaExtras = { id: 'extras', name: 'إضافات', min: 0, max: 3, choices: [{ id: 'x-cheese', name: 'جبنة إضافية', price: 5000 }, { id: 'x-mush', name: 'فطر', price: 4000 }, { id: 'x-olive', name: 'زيتون', price: 3000 }, { id: 'x-jalapeno', name: 'هالبينو', price: 3000 }] };
const grillSide = { id: 'side', name: 'الطبق الجانبي', min: 1, max: 1, choices: [{ id: 'side-fries', name: 'بطاطا مقلية', price: 0 }, { id: 'side-rice', name: 'رز', price: 0 }, { id: 'side-salad', name: 'سلطة', price: 0 }] };
const grillPortion = { id: 'portion', name: 'الكمية', min: 1, max: 1, choices: [{ id: 'p-half', name: 'نص كيلو', price: 0 }, { id: 'p-kilo', name: 'كيلو', price: 40000 }] };
const spice = { id: 'spice', name: 'الحرارة', min: 1, max: 1, choices: [{ id: 'spice-normal', name: 'عادي', price: 0 }, { id: 'spice-hot', name: 'حار', price: 0 }] };
const shawarmaSize = { id: 'size', name: 'الحجم', min: 1, max: 1, choices: [{ id: 'size-regular', name: 'عادي', price: 0 }, { id: 'size-double', name: 'دبل', price: 7000 }] };
const shawarmaExtras = { id: 'extras', name: 'إضافات', min: 0, max: 3, choices: [{ id: 'x-garlic', name: 'ثومية إضافية', price: 1500 }, { id: 'x-fries', name: 'بطاطا داخل السندويش', price: 2000 }, { id: 'x-cheese', name: 'جبنة', price: 3000 }] };
const burgerExtras = { id: 'extras', name: 'إضافات', min: 0, max: 4, choices: [{ id: 'x-cheddar', name: 'شيدر', price: 4000 }, { id: 'x-beef-bacon', name: 'لحم مقدد بقري', price: 7000 }, { id: 'x-egg', name: 'بيضة', price: 3000 }, { id: 'x-jalapeno', name: 'هالبينو', price: 2000 }] };
const burgerCombo = { id: 'combo', name: 'اجعلها وجبة', min: 0, max: 1, choices: [{ id: 'combo-meal', name: 'مع بطاطا ومشروب', price: 15000 }] };
const coffeeSize = { id: 'size', name: 'الحجم', min: 1, max: 1, choices: [{ id: 'size-s', name: 'صغير', price: 0 }, { id: 'size-m', name: 'وسط', price: 3000 }, { id: 'size-l', name: 'كبير', price: 6000 }] };
const milk = { id: 'milk', name: 'نوع الحليب', min: 1, max: 1, choices: [{ id: 'milk-regular', name: 'عادي', price: 0 }, { id: 'milk-oat', name: 'شوفان', price: 4000 }, { id: 'milk-almond', name: 'لوز', price: 4000 }] };
const sugar = { id: 'sugar', name: 'السكر', min: 1, max: 1, choices: [{ id: 'sugar-none', name: 'بدون', price: 0 }, { id: 'sugar-mid', name: 'وسط', price: 0 }, { id: 'sugar-extra', name: 'زيادة', price: 0 }] };
const juiceSize = { id: 'size', name: 'الحجم', min: 1, max: 1, choices: [{ id: 'size-m', name: 'وسط', price: 0 }, { id: 'size-l', name: 'كبير', price: 5000 }] };
const sweetWeight = (kilo: number) => ({ id: 'weight', name: 'الوزن', min: 1, max: 1, choices: [{ id: 'w-half', name: 'نص كيلو', price: 0 }, { id: 'w-kilo', name: 'كيلو', price: kilo }] });
const bowlProtein = { id: 'protein', name: 'بروتين إضافي', min: 0, max: 2, choices: [{ id: 'pr-chicken', name: 'دجاج مشوي', price: 9000 }, { id: 'pr-egg', name: 'بيض مسلوق', price: 4000 }, { id: 'pr-halloumi', name: 'حلوم', price: 7000 }] };
const dressing = { id: 'dressing', name: 'الصوص', min: 1, max: 1, choices: [{ id: 'dr-lemon', name: 'ليمون وزيت زيتون', price: 0 }, { id: 'dr-tahini', name: 'طحينة', price: 0 }, { id: 'dr-yogurt', name: 'لبن بالنعنع', price: 0 }] };

export const FOOD_PLACES: FoodPlace[] = [
  {
    name: 'مطعم الشام',
    category: 'restaurants',
    area: 'center',
    description: 'مأكولات شامية تقليدية، مشاوي على الفحم ومقبلات يومية. توصيل داخل سلمية.',
    phone: '+963944000101',
    hours: DAILY('10:00', '23:30'),
    rating: 4.8,
    prepMinutes: 25,
    minOrder: 0,
    deliveryFee: null,
    cover: 'cover_levant',
    logo: 'logo_levant',
    offers: [{ code: 'SHAM10', title: 'خصم 10% على طلبك من مطعم الشام', kind: 'percent', value: 10, minOrder: 50000, maxDiscount: 20000 }],
    items: [
      { name: 'حمص بطحينة', section: 'مقبلات', price: 12000, photo: 'hummus', description: 'حمص ناعم بطحينة وزيت زيتون وحبات حمص', featured: true },
      { name: 'فتة حمص', section: 'مقبلات', price: 18000, description: 'خبز محمص، حمص، لبن بالثوم وصنوبر' },
      { name: 'سلطة الشيف', section: 'مقبلات', price: 15000, photo: 'chef_salad', description: 'خضار موسمية، فواكه، جبنة بيضاء وصوص الشيف' },
      { name: 'مشاوي مشكلة', section: 'مشاوي', price: 95000, photo: 'mixed_grill', description: 'شيش طاووق، كباب، أوصال لحمة وخضار مشوية — لشخصين', featured: true, options: [grillSide] },
      { name: 'شيش طاووق', section: 'مشاوي', price: 45000, photo: 'shish_tawook', description: 'صدر دجاج متبل بالثوم والليمون على الفحم', options: [grillPortion, grillSide] },
      { name: 'كباب حلبي', section: 'مشاوي', price: 52000, photo: 'kebab', description: 'لحمة غنم مفرومة بالبهارات الحلبية', options: [grillPortion, grillSide] },
      { name: 'فروج مشوي', section: 'مشاوي', price: 75000, photo: 'grilled_chicken', description: 'دجاج متبل مشوي على الفحم مع ثومية', options: [grillSide] },
      { name: 'ريش غنم', section: 'مشاوي', price: 120000, photo: 'ribs', description: 'ريش غنم بلدي متبلة ومشوية ببطء' },
      { name: 'ستيك لحم عجل', section: 'أطباق رئيسية', price: 110000, photo: 'steak', description: 'شريحة عجل طرية مع صوص الفلفل', options: [grillSide] },
      { name: 'كبسة دجاج', section: 'أطباق رئيسية', price: 55000, photo: 'kabsa', description: 'رز بالبهارات مع فخذ دجاج محمر' },
    ],
  },
  {
    name: 'مطعم بيتزا إيطاليا',
    category: 'pizza',
    area: 'north',
    description: 'بيتزا بعجينة مخمّرة 48 ساعة على الحطب، وصفات إيطالية وسورية.',
    phone: '+963944000102',
    hours: DAILY('12:00', '01:00'),
    rating: 4.6,
    prepMinutes: 20,
    minOrder: 0,
    deliveryFee: null,
    cover: 'cover_pizza',
    logo: 'logo_pizza',
    offers: [{ code: 'FAMILY15', title: '15,000 ل.س خصم على طلبات العائلة', kind: 'amount', value: 15000, minOrder: 90000 }],
    items: [
      { name: 'بيتزا مارغريتا', section: 'بيتزا', price: 32000, photo: 'pizza_margherita', description: 'صلصة طماطم، موزاريلا، ريحان', featured: true, options: [pizzaSize, pizzaExtras] },
      { name: 'بيتزا خضار', section: 'بيتزا', price: 35000, photo: 'pizza_veggie', description: 'فليفلة، فطر، زيتون، بندورة كرزية', options: [pizzaSize, pizzaExtras] },
      { name: 'بيتزا دجاج باربكيو', section: 'بيتزا', price: 42000, photo: 'pizza_bbq_chicken', description: 'دجاج مدخن، بصل أحمر، صوص باربكيو', options: [pizzaSize, pizzaExtras] },
      { name: 'بيتزا أربع أجبان', section: 'بيتزا', price: 44000, photo: 'pizza_four_cheese', description: 'موزاريلا، شيدر، بارميزان، جبنة زرقاء', options: [pizzaSize, pizzaExtras] },
      { name: 'بيتزا سبانخ وريكوتا', section: 'بيتزا', price: 38000, photo: 'pizza_spinach', options: [pizzaSize, pizzaExtras] },
      { name: 'بيتزا لحمة', section: 'بيتزا', price: 45000, description: 'لحمة مفرومة، فليفلة، بصل', options: [pizzaSize, pizzaExtras] },
      { name: 'باستا بولونيز', section: 'باستا وسلطات', price: 36000, photo: 'pasta_bolognese' },
      { name: 'فيتوتشيني ألفريدو', section: 'باستا وسلطات', price: 38000, photo: 'pasta_alfredo', description: 'كريمة، بارميزان، دجاج اختياري', options: [{ id: 'add', name: 'إضافة', min: 0, max: 1, choices: [{ id: 'add-chicken', name: 'دجاج', price: 8000 }] }] },
      { name: 'سلطة سيزر', section: 'باستا وسلطات', price: 24000, photo: 'caesar_salad' },
      { name: 'تيراميسو', section: 'حلويات', price: 22000, photo: 'tiramisu' },
      { name: 'كولا', section: 'مشروبات', price: 6000, stock: 120 },
    ],
  },
  {
    name: 'شاورما الأصيل',
    category: 'shawarma',
    area: 'east',
    description: 'شاورما دجاج ولحمة على الطريقة السورية، بروستد وفلافل حتى الفجر.',
    phone: '+963944000103',
    hours: DAILY('11:00', '02:00'),
    rating: 4.5,
    prepMinutes: 15,
    minOrder: 0,
    deliveryFee: null,
    cover: 'cover_shawarma',
    logo: 'logo_shawarma',
    items: [
      { name: 'سندويش شاورما دجاج', section: 'سندويش', price: 15000, photo: 'shawarma_wrap', featured: true, options: [shawarmaSize, spice, shawarmaExtras] },
      { name: 'راب دجاج كرانشي', section: 'سندويش', price: 18000, photo: 'chicken_wrap', options: [spice, shawarmaExtras] },
      { name: 'سندويش فلافل', section: 'سندويش', price: 7000, photo: 'falafel', options: [spice] },
      { name: 'وجبة شاورما عربي', section: 'وجبات', price: 32000, photo: 'shawarma_arabi', description: 'شاورما مقطعة مع بطاطا وثومية ومخلل', featured: true, options: [spice] },
      { name: 'صحن شاورما مشكل', section: 'وجبات', price: 38000, photo: 'shawarma_plate' },
      { name: 'بروستد 4 قطع', section: 'وجبات', price: 48000, photo: 'broasted', description: 'مع بطاطا وكولسلو وثومية', options: [spice] },
      { name: 'كرسبي ستربس', section: 'وجبات', price: 36000, photo: 'crispy_strips' },
      { name: 'أجنحة حارة', section: 'وجبات', price: 30000, photo: 'wings' },
      { name: 'بطاطا مقلية', section: 'جانبي', price: 8000, photo: 'fries' },
      { name: 'بطاطا بالجبنة', section: 'جانبي', price: 14000, photo: 'loaded_fries' },
    ],
  },
  {
    name: 'برغر هاوس',
    category: 'burgers',
    area: 'center',
    description: 'برغر لحمة طازجة يومياً، خبز بريوش محلي وصوصات بيتية.',
    phone: '+963944000110',
    hours: DAILY('12:00', '01:00'),
    rating: 4.7,
    prepMinutes: 20,
    minOrder: 25000,
    deliveryFee: 7000,
    cover: 'cover_burger',
    logo: 'logo_burger',
    offers: [{ code: 'BURGER20', title: 'خصم 20% على البرغر — حتى 25,000', kind: 'percent', value: 20, minOrder: 50000, maxDiscount: 25000 }],
    items: [
      { name: 'كلاسيك برغر', section: 'برغر', price: 38000, photo: 'burger_classic', description: '150غ لحمة، خس، بندورة، صوص البيت', featured: true, options: [burgerExtras, burgerCombo] },
      { name: 'دبل تشيز برغر', section: 'برغر', price: 52000, photo: 'burger_double', description: 'قطعتان لحمة، شيدر مضاعف، بصل مكرمل', featured: true, options: [burgerExtras, burgerCombo] },
      { name: 'سموكي برغر', section: 'برغر', price: 48000, photo: 'burger_smoky', description: 'صوص مدخن، حلقات بصل، شيدر', options: [burgerExtras, burgerCombo] },
      { name: 'كرسبي تشكن برغر', section: 'برغر', price: 40000, photo: 'burger_crispy_chicken', options: [spice, burgerExtras, burgerCombo] },
      { name: 'وجبة برغر العائلة', section: 'وجبات', price: 150000, photo: 'burger_meal', description: '4 برغر كلاسيك، بطاطا كبيرة و4 مشروبات' },
      { name: 'وجبة برغر وبطاطا', section: 'وجبات', price: 50000, photo: 'burger_meal_2' },
      { name: 'بطاطا بالجبنة', section: 'جانبي', price: 15000, photo: 'loaded_fries' },
      { name: 'ميلك شيك شوكولا', section: 'مشروبات', price: 20000, photo: 'shake_chocolate' },
      { name: 'ميلك شيك أوريو', section: 'مشروبات', price: 22000, photo: 'shake_oreo' },
    ],
  },
  {
    name: 'حلويات ورد الشام',
    category: 'sweets',
    area: 'center',
    description: 'كنافة نابلسية، بقلاوة وحلويات عربية بالسمن البلدي، وبوظة يومية.',
    phone: '+963944000104',
    hours: DAILY('08:00', '23:00'),
    rating: 4.7,
    prepMinutes: 10,
    minOrder: 30000,
    deliveryFee: null,
    cover: 'cover_sweets',
    logo: 'logo_sweets',
    offers: [{ code: 'SWEET10', title: '10,000 ل.س خصم على علب الحلويات', kind: 'amount', value: 10000, minOrder: 100000 }],
    items: [
      { name: 'بقلاوة مشكلة', section: 'حلويات عربية', price: 60000, photo: 'baklava', featured: true, options: [sweetWeight(55000)] },
      { name: 'كنافة نابلسية', section: 'حلويات عربية', price: 45000, description: 'بالجبنة العكاوية والقطر', options: [sweetWeight(45000)] },
      { name: 'معمول تمر', section: 'حلويات عربية', price: 35000, options: [sweetWeight(35000)] },
      { name: 'بلورية', section: 'حلويات عربية', price: 55000, options: [sweetWeight(55000)] },
      { name: 'بوظة عربية', section: 'بوظة', price: 12000, photo: 'ice_cream', options: [{ id: 'scoops', name: 'عدد الطابات', min: 1, max: 1, choices: [{ id: 'sc-2', name: 'طابتين', price: 0 }, { id: 'sc-3', name: '3 طابات', price: 5000 }] }] },
      { name: 'شوكولا فاخرة', section: 'شوكولا', price: 40000, photo: 'chocolates', description: 'علبة 250غ تشكيلة' },
      { name: 'تشيز كيك توت', section: 'كيك', price: 20000, photo: 'cheesecake_berry' },
      { name: 'بانا كوتا فريز', section: 'كيك', price: 16000, photo: 'panna_cotta' },
      { name: 'كوكيز شوكولا', section: 'كيك', price: 15000, photo: 'cookies', description: '6 قطع' },
    ],
  },
  {
    name: 'كافيه السرايا',
    category: 'cafes',
    area: 'west',
    description: 'قهوة مختصة، عصائر طازجة، كريب وحلويات في جلسة هادئة.',
    phone: '+963944000105',
    hours: DAILY('09:00', '00:00'),
    rating: 4.4,
    prepMinutes: 10,
    minOrder: 0,
    deliveryFee: null,
    cover: 'cover_cafe',
    logo: 'logo_cafe',
    items: [
      { name: 'إسبريسو', section: 'قهوة', price: 8000, photo: 'espresso', options: [{ id: 'shots', name: 'الجرعة', min: 1, max: 1, choices: [{ id: 'shot-single', name: 'سينغل', price: 0 }, { id: 'shot-double', name: 'دبل', price: 4000 }] }, sugar] },
      { name: 'كابتشينو', section: 'قهوة', price: 14000, photo: 'cappuccino', featured: true, options: [coffeeSize, milk, sugar] },
      { name: 'آيس لاتيه', section: 'قهوة', price: 16000, photo: 'iced_latte', options: [coffeeSize, milk, sugar] },
      { name: 'عصير برتقال طازج', section: 'عصائر', price: 12000, photo: 'orange_juice', options: [juiceSize] },
      { name: 'سموذي فواكه', section: 'عصائر', price: 18000, photo: 'smoothie', options: [juiceSize] },
      { name: 'كريب بالبرتقال', section: 'حلويات', price: 20000, photo: 'crepe' },
      { name: 'تشيز كيك', section: 'حلويات', price: 18000, photo: 'cheesecake' },
    ],
  },
  {
    name: 'بيت النودلز',
    category: 'asian',
    area: 'north',
    description: 'أطباق آسيوية طازجة: نودلز، كاري، دمبلنغ وسوشي.',
    phone: '+963944000111',
    hours: DAILY('13:00', '23:30'),
    rating: 4.3,
    prepMinutes: 25,
    minOrder: 40000,
    deliveryFee: 8000,
    cover: 'cover_asian',
    logo: 'logo_asian',
    items: [
      { name: 'نودلز بالكاري', section: 'أطباق رئيسية', price: 42000, photo: 'curry_noodles', featured: true, options: [spice, { id: 'protein', name: 'البروتين', min: 1, max: 1, choices: [{ id: 'pr-chicken', name: 'دجاج', price: 0 }, { id: 'pr-shrimp', name: 'روبيان', price: 15000 }, { id: 'pr-veg', name: 'خضار', price: 0 }] }] },
      { name: 'كاري دجاج', section: 'أطباق رئيسية', price: 45000, photo: 'chicken_curry', options: [spice] },
      { name: 'دمبلنغ مشكل', section: 'مقبلات', price: 30000, photo: 'dumplings', description: '8 قطع على البخار' },
      { name: 'سوشي سلمون', section: 'سوشي', price: 55000, photo: 'sushi', description: '8 قطع نيغيري' },
    ],
  },
  {
    name: 'صحتين',
    category: 'healthy',
    area: 'south',
    description: 'سلطات وبولز صحية محسوبة السعرات، تحضير طازج عند الطلب.',
    phone: '+963944000112',
    hours: DAILY('10:00', '22:00'),
    rating: 4.6,
    prepMinutes: 15,
    minOrder: 20000,
    deliveryFee: null,
    cover: 'cover_healthy',
    logo: 'logo_healthy',
    offers: [{ code: 'HEALTHY15', title: 'خصم 15% على البولز والسلطات', kind: 'percent', value: 15, minOrder: 30000 }],
    items: [
      { name: 'بول دجاج مشوي', section: 'بولز', price: 38000, photo: 'bowl_chicken', description: 'دجاج، كينوا، أفوكادو، خضار — 520 سعرة', featured: true, options: [dressing, bowlProtein] },
      { name: 'بول خضار وحمص', section: 'بولز', price: 30000, photo: 'bowl_veggie', description: 'أفوكادو، حمص، بطاطا حلوة — 430 سعرة', options: [dressing, bowlProtein] },
      { name: 'سلطة يونانية', section: 'سلطات', price: 24000, photo: 'greek_salad', options: [dressing, bowlProtein] },
      { name: 'سلطة الشيف الصحية', section: 'سلطات', price: 26000, photo: 'chef_salad', options: [dressing, bowlProtein] },
    ],
  },
  {
    name: 'فرن الضيعة',
    category: 'bakery',
    area: 'east',
    description: 'مناقيش ومعجنات وخبز بلدي من الفرن على الحطب كل صباح.',
    phone: '+963944000113',
    hours: DAILY('06:00', '14:00'),
    rating: 4.8,
    prepMinutes: 15,
    minOrder: 0,
    deliveryFee: null,
    cover: 'cover_bakery',
    logo: 'logo_bakery',
    items: [
      { name: 'منقوشة زعتر', section: 'مناقيش', price: 5000, description: 'زعتر سلمية وزيت زيتون', featured: true, options: [{ id: 'add', name: 'إضافات', min: 0, max: 2, choices: [{ id: 'add-veg', name: 'خضار', price: 1500 }, { id: 'add-labneh', name: 'لبنة', price: 3000 }] }] },
      { name: 'منقوشة جبنة', section: 'مناقيش', price: 9000 },
      { name: 'لحم بعجين', section: 'مناقيش', price: 6000, description: 'القطعة' },
      { name: 'سمبوسك لحمة', section: 'معجنات', price: 18000, photo: 'sambousek', description: '6 قطع' },
      { name: 'توست جبنة', section: 'سندويش', price: 12000, photo: 'toast' },
      { name: 'بانيني دجاج', section: 'سندويش', price: 20000, photo: 'panini' },
      { name: 'خبز بلدي', section: 'خبز', price: 6000, photo: 'bread', description: 'رغيف كبير من الحطب' },
    ],
  },
];
