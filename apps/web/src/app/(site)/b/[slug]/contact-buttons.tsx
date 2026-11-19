'use client';

import { track } from '@/components/analytics/track';
import { buttonClass } from '@/components/ui/button';
import { ChatIcon, PhoneIcon, PinIcon } from '@/components/ui/icons';

export function ContactButtons({ businessId, phone, whatsapp, location }: { businessId: string; phone: string | null; whatsapp: string | null; location: { lat: number; lng: number } | null }) {
  const t = (name: 'call.clicked' | 'whatsapp.clicked' | 'map.opened') => track({ name, entityType: 'business', entityId: businessId });
  return (
    <div className="flex flex-wrap gap-2">
      {phone && (
        <a href={`tel:${phone}`} onClick={() => t('call.clicked')} className={buttonClass('primary', 'md')}>
          <PhoneIcon className="h-5 w-5" /> اتصال
        </a>
      )}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace('+', '')}`} target="_blank" rel="noopener noreferrer" onClick={() => t('whatsapp.clicked')} className={buttonClass('secondary', 'md')}>
          <ChatIcon className="h-5 w-5" /> واتساب
        </a>
      )}
      {location && (
        <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" onClick={() => t('map.opened')} className={buttonClass('ghost', 'md')}>
          <PinIcon className="h-5 w-5" /> الموقع
        </a>
      )}
    </div>
  );
}
