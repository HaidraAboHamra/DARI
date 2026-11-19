'use client';

import type { FavoriteType } from '@dari/contracts';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/actions/marketing';
import { track } from '@/components/analytics/track';

export function FavoriteButton({ entityType, entityId, initial }: { entityType: FavoriteType; entityId: string; initial: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [pending, start] = useTransition();
  const path = usePathname();
  return (
    <button
      type="button"
      aria-pressed={favorite}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFavorite(!favorite);
          if (!favorite) track({ name: 'save.created', entityType: entityType === 'business' ? 'business' : entityType, entityId });
          setFavorite(await toggleFavorite(entityType, entityId, !favorite, path));
        })
      }
      className={`grid h-11 w-11 place-items-center rounded-full border text-xl ${favorite ? 'border-gold bg-gold text-navy' : 'border-champagne/40 text-champagne'}`}
      aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
    >
      {favorite ? '♥' : '♡'}
    </button>
  );
}
