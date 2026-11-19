'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Re-fetches server data on an interval while the tab is visible.
 * Simple and cache-friendly for the pilot; a push channel (SSE/WebSocket fed by
 * the outbox) can replace it without touching the pages.
 */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === 'visible' && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
