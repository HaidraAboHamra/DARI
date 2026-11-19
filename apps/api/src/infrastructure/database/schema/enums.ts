import {
  APPLICATION_STATUSES,
  BOOKING_STATUSES,
  BOOKING_UNITS,
  COUPON_KINDS,
  EVENT_KINDS,
  FAVORITE_TYPES,
  LEAD_STATUSES,
  LISTING_PURPOSES,
  LISTING_STATUSES,
  PAYMENT_METHODS,
  PLAN_IDS,
  PROPERTY_TYPES,
  QUOTE_STATUSES,
  RESOURCE_KINDS,
  SERVICE_REQUEST_STATUSES,
  SERVICE_URGENCIES,
  TICKET_STATUSES,
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
export const resourceKindEnum = pgEnum('resource_kind', RESOURCE_KINDS);
export const bookingUnitEnum = pgEnum('booking_unit', BOOKING_UNITS);
export const bookingStatusEnum = pgEnum('booking_status', BOOKING_STATUSES);
export const serviceUrgencyEnum = pgEnum('service_urgency', SERVICE_URGENCIES);
export const serviceRequestStatusEnum = pgEnum('service_request_status', SERVICE_REQUEST_STATUSES);
export const quoteStatusEnum = pgEnum('quote_status', QUOTE_STATUSES);
export const eventKindEnum = pgEnum('event_kind', EVENT_KINDS);
export const ticketStatusEnum = pgEnum('ticket_status', TICKET_STATUSES);
export const listingPurposeEnum = pgEnum('listing_purpose', LISTING_PURPOSES);
export const propertyTypeEnum = pgEnum('property_type', PROPERTY_TYPES);
export const listingStatusEnum = pgEnum('listing_status', LISTING_STATUSES);
export const leadStatusEnum = pgEnum('lead_status', LEAD_STATUSES);
export const couponKindEnum = pgEnum('coupon_kind', COUPON_KINDS);
export const planEnum = pgEnum('plan_id', PLAN_IDS);
export const paymentMethodEnum = pgEnum('payment_method', PAYMENT_METHODS);
export const favoriteTypeEnum = pgEnum('favorite_type', FAVORITE_TYPES);
