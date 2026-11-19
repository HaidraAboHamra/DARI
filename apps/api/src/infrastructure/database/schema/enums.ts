import {
  APPLICATION_STATUSES,
  BUSINESS_ROLES,
  BUSINESS_STATUSES,
  CONTENT_STATUSES,
  DELIVERY_STATUSES,
  DELIVERY_TASK_TYPES,
  EMPLOYMENT_TYPES,
  FULFILLMENT_TYPES,
  INTENTS,
  JOB_STATUSES,
  ORDER_STATUSES,
  PLATFORM_ROLES,
  VERTICALS,
} from '@dari/contracts';
import { pgEnum } from 'drizzle-orm/pg-core';

export const verticalEnum = pgEnum('vertical', VERTICALS);
export const businessStatusEnum = pgEnum('business_status', BUSINESS_STATUSES);
export const businessRoleEnum = pgEnum('business_role', BUSINESS_ROLES);
export const platformRoleEnum = pgEnum('platform_role', PLATFORM_ROLES);
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const fulfillmentEnum = pgEnum('fulfillment_type', FULFILLMENT_TYPES);
export const deliveryTypeEnum = pgEnum('delivery_task_type', DELIVERY_TASK_TYPES);
export const deliveryStatusEnum = pgEnum('delivery_status', DELIVERY_STATUSES);
export const employmentTypeEnum = pgEnum('employment_type', EMPLOYMENT_TYPES);
export const applicationStatusEnum = pgEnum('application_status', APPLICATION_STATUSES);
export const contentStatusEnum = pgEnum('content_status', CONTENT_STATUSES);
export const jobStatusEnum = pgEnum('job_status', JOB_STATUSES);
export const intentEnum = pgEnum('intent', INTENTS);
