import type { Intent, Vertical } from './enums';

export interface VerticalMeta {
  readonly key: Vertical;
  readonly labelAr: string;
  readonly labelEn: string;
  /** Brand service color from the Dari app system. */
  readonly color: string;
  /** Intent a user most often has when browsing this vertical. */
  readonly primaryIntent: Intent;
}

export const VERTICAL_META: Readonly<Record<Vertical, VerticalMeta>> = {
  food: { key: 'food', labelAr: 'طعام', labelEn: 'Food', color: '#C9743C', primaryIntent: 'buy' },
  shopping: { key: 'shopping', labelAr: 'تسوق', labelEn: 'Shopping', color: '#B8913A', primaryIntent: 'buy' },
  services: { key: 'services', labelAr: 'خدمات', labelEn: 'Services', color: '#5A6B7B', primaryIntent: 'service' },
  health: { key: 'health', labelAr: 'صحة', labelEn: 'Health', color: '#2F8F83', primaryIntent: 'find' },
  appointments: { key: 'appointments', labelAr: 'مواعيد', labelEn: 'Appointments', color: '#4B6FB5', primaryIntent: 'book' },
  jobs: { key: 'jobs', labelAr: 'وظائف', labelEn: 'Jobs', color: '#3B5B9B', primaryIntent: 'apply' },
  news: { key: 'news', labelAr: 'أخبار', labelEn: 'News', color: '#7A4E8C', primaryIntent: 'information' },
  events: { key: 'events', labelAr: 'فعاليات', labelEn: 'Events', color: '#B5495B', primaryIntent: 'attend' },
  property: { key: 'property', labelAr: 'عقارات', labelEn: 'Property', color: '#6B7F3A', primaryIntent: 'property' },
  trips: { key: 'trips', labelAr: 'رحلات', labelEn: 'Trips', color: '#2A7FA0', primaryIntent: 'travel' },
  stays: { key: 'stays', labelAr: 'فنادق وإقامة', labelEn: 'Stays', color: '#8A6A24', primaryIntent: 'stay' },
};
