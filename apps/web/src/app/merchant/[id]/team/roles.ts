import type { BusinessRole } from '@dari/contracts';

export const ROLE_LABEL: Record<BusinessRole, string> = {
  owner: 'مالك',
  manager: 'مدير',
  cashier: 'كاشير',
  warehouse: 'مستودع',
  delivery: 'توصيل',
  marketing: 'تسويق',
  accountant: 'محاسب',
  viewer: 'مشاهد',
};
