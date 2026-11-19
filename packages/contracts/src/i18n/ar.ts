/** Arabic UI copy shared by every client (web, mobile). */
import type { BookingStatus, DeliveryStatus, DeliveryTaskType, EmploymentType, OrderStatus } from '../enums';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'بانتظار القبول',
  accepted: 'مقبول',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل',
  picked_up: 'تم الاستلام',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

export const ORDER_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: 'قبول',
  rejected: 'رفض',
  preparing: 'بدء التحضير',
  ready: 'جاهز',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التوصيل',
  picked_up: 'تم الاستلام',
  cancelled: 'إلغاء',
};

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  requested: 'بانتظار مندوب',
  assigned: 'تم تعيين مندوب',
  picked_up: 'تم الاستلام',
  delivered: 'تم التسليم',
  cancelled: 'ملغاة',
  failed: 'تعذّر التسليم',
};

export const DELIVERY_TYPE_LABEL: Record<DeliveryTaskType, string> = {
  merchant_to_citizen: 'طلب من متجر',
  store_to_citizen: 'من متجر إليك',
  citizen_to_citizen: 'غرض من شخص لشخص',
  shop_to_shop: 'نقل بين محلين',
  buy_for_me: 'اشترِ لي',
  document: 'مستندات',
  event_logistics: 'مواد فعالية',
};

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  seasonal: 'موسمي',
  remote: 'عن بعد',
  internship: 'تدريب',
  freelance: 'عمل حر',
};

export const SEGMENT_LABEL: Record<string, string> = {
  vip: 'VIP',
  loyal: 'وفي',
  new: 'جديد',
  at_risk: 'مُعرّض للفقد',
  dormant: 'خامل',
  occasional: 'عرضي',
};


export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
  completed: 'مكتمل',
  no_show: 'لم يحضر',
};

export const BOOKING_ACTION_LABEL: Record<BookingStatus, string> = {
  pending: 'تعليق',
  confirmed: 'تأكيد',
  rejected: 'رفض',
  cancelled: 'إلغاء',
  completed: 'تم',
  no_show: 'لم يحضر',
};

const when = new Intl.DateTimeFormat('ar-SY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Damascus' });
const day = new Intl.DateTimeFormat('ar-SY', { dateStyle: 'medium', timeZone: 'Asia/Damascus' });

export function bookingWhen(b: { unit: 'slot' | 'night'; startsAt: string; endsAt: string }): string {
  return b.unit === 'slot' ? when.format(new Date(b.startsAt)) : `${day.format(new Date(b.startsAt))} ← ${day.format(new Date(b.endsAt))}`;
}

export const SERVICE_STATUS_LABEL: Record<string, string> = {
  open: 'بانتظار العروض',
  assigned: 'تم اختيار مقدم الخدمة',
  on_the_way: 'في الطريق',
  arrived: 'وصل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const SERVICE_NEXT_LABEL: Record<string, string> = {
  on_the_way: 'انطلقت إلى الزبون',
  arrived: 'وصلت',
  completed: 'تم إنجاز العمل',
};

export const URGENCY_LABEL: Record<string, string> = { now: 'الآن', today: 'اليوم', scheduled: 'بموعد' };

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: 'شقة',
  house: 'منزل',
  land: 'أرض',
  shop: 'محل',
  office: 'مكتب',
  farm: 'مزرعة',
};
export const PURPOSE_LABEL: Record<string, string> = { sale: 'للبيع', rent: 'للإيجار' };
export const LEAD_STATUS_LABEL: Record<string, string> = { new: 'جديد', contacted: 'تم التواصل', closed: 'مغلق' };

const eventDate = new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Damascus' });
export function eventWhen(iso: string): string {
  return eventDate.format(new Date(iso));
}
