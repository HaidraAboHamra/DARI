import type { DeliveryStatus, DeliveryTaskType, EmploymentType, OrderStatus } from '@dari/contracts';

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
