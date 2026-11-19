'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const FALLBACK_POLL_MS = 20_000;
const REFRESH_DEBOUNCE_MS = 400;

/**
 * Keeps the current screen fresh: listens to the user's live event stream (SSE)
 * and re-renders server data on each event, with a small toast. Falls back to
 * polling if the stream is unavailable.
 */
export function LiveUpdates() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    let failures = 0;
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };
    const source = new EventSource('/api/stream');
    source.addEventListener('ready', () => {
      failures = 0;
      if (poll) clearInterval(poll);
      poll = null;
    });
    source.addEventListener('message', (e) => {
      refresh();
      try {
        const event = JSON.parse((e as MessageEvent<string>).data) as { title?: string };
        if (event.title) {
          setToast(event.title);
          setTimeout(() => setToast(null), 4000);
        }
      } catch {
        /* ignore malformed */
      }
    });
    source.onerror = () => {
      failures += 1;
      if (failures >= 3 && !poll) poll = setInterval(() => document.visibilityState === 'visible' && router.refresh(), FALLBACK_POLL_MS);
    };
    return () => {
      source.close();
      if (poll) clearInterval(poll);
    };
  }, [router]);

  if (!toast) return null;
  return (
    <div role="status" className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-2xl bg-navy px-5 py-3 text-center text-sm font-semibold text-champagne shadow-xl">
      🔔 {toast}
    </div>
  );
}
