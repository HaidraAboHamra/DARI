'use client';

import type { ServiceRequestStatus } from '@dari/contracts';
import { useState, useTransition } from 'react';
import { acceptQuote, setServiceStatus } from '@/actions/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { SERVICE_NEXT_LABEL } from '@/lib/labels';

export function AcceptQuoteButton({ requestId, quoteId }: { requestId: string; quoteId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => setError((await acceptQuote(requestId, quoteId)).error ?? null))}>اختيار هذا العرض</Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="danger" disabled={pending} onClick={() => confirm('إلغاء الطلب؟') && start(async () => void (await setServiceStatus(requestId, 'cancelled', `/services/${requestId}`)))}>
      إلغاء الطلب
    </Button>
  );
}

/** Provider progress: one obvious next step, plus final price on completion. */
export function AdvanceServiceButton({ requestId, next, path }: { requestId: string; next: ServiceRequestStatus; path: string }) {
  const [pending, start] = useTransition();
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {next === 'completed' && <Input className="!w-36 !py-2" inputMode="numeric" placeholder="السعر النهائي" value={price} onChange={(e) => setPrice(e.target.value)} />}
      <Button size="sm" disabled={pending} onClick={() => start(async () => setError((await setServiceStatus(requestId, next, path, price ? Number(price.replace(/\D/g, '')) : undefined)).error ?? null))}>
        {SERVICE_NEXT_LABEL[next]}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
