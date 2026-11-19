import type { BusinessRole } from '@dari/contracts';

/**
 * RBAC matrix for everything a member can do inside a business.
 * Keep this the only place that maps roles to capabilities.
 */
export const BUSINESS_PERMISSIONS = {
  'business.update': ['owner', 'manager'],
  'members.manage': ['owner'],
  'members.view': ['owner', 'manager'],
  'catalog.write': ['owner', 'manager', 'warehouse'],
  'orders.view': ['owner', 'manager', 'cashier', 'accountant', 'delivery', 'viewer'],
  'orders.manage': ['owner', 'manager', 'cashier'],
  'orders.dispatch': ['owner', 'manager', 'cashier', 'delivery'],
  'customers.view': ['owner', 'manager', 'marketing'],
  'jobs.write': ['owner', 'manager'],
  'analytics.view': ['owner', 'manager', 'accountant', 'marketing'],
  'bookings.manage': ['owner', 'manager', 'cashier'],
  'resources.write': ['owner', 'manager'],
  'services.respond': ['owner', 'manager', 'cashier', 'delivery'],
  'marketing.write': ['owner', 'manager', 'marketing'],
  'listings.write': ['owner', 'manager', 'marketing'],
  'events.manage': ['owner', 'manager', 'marketing', 'cashier'],
} as const satisfies Record<string, readonly BusinessRole[]>;

export type BusinessPermission = keyof typeof BUSINESS_PERMISSIONS;

export function roleAllows(role: BusinessRole, permission: BusinessPermission): boolean {
  return (BUSINESS_PERMISSIONS[permission] as readonly BusinessRole[]).includes(role);
}
