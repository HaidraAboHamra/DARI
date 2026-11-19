'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { connectBusiness } from '@/actions/marketing';
import { Button } from '@/components/ui/button';

/** Customer Connect opt-in: explicit consent to receive this business' offers (blueprint §8.2). */
export function ConnectButton({ businessId, connected, businessName }: { businessId: string; connected: boolean; businessName: string }) {
  const [pending, start] = useTransition();
  const path = usePathname();
  if (connected) return <p className="text-sm font-semibold text-success">✓ أنت من زبائن {businessName} — تصلك عروضهم</p>;
  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" disabled={pending} onClick={() => start(() => connectBusiness(businessId, path))}>
        تابع {businessName} واحصل على عروضه
      </Button>
      <p className="text-xs text-muted">لن يرى النشاط رقم هاتفك. يمكنك إلغاء المتابعة في أي وقت.</p>
    </div>
  );
}
