'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState title="صار خطأ مؤقت" hint="تعذّر تحميل هذه الصفحة. حاول مرة ثانية بعد لحظات.">
      <Button onClick={reset}>إعادة المحاولة</Button>
    </EmptyState>
  );
}
