'use client';

import type { DeliveryStatus } from '@dari/contracts';
import { useState, useTransition } from 'react';
import { claimTask, updateTask } from '@/actions/merchant';
import { Button } from '@/components/ui/button';

export function ClaimButton({ taskId }: { taskId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => setError((await claimTask(taskId)).error ?? null))}>
        استلام المهمة
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

const NEXT: Partial<Record<DeliveryStatus, { status: 'picked_up' | 'delivered'; label: string }>> = {
  assigned: { status: 'picked_up', label: 'تم الاستلام من المصدر' },
  picked_up: { status: 'delivered', label: 'تم التسليم' },
};

export function AdvanceButton({ taskId, status }: { taskId: string; status: DeliveryStatus }) {
  const [pending, start] = useTransition();
  const next = NEXT[status];
  if (!next) return null;
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => void (await updateTask(taskId, next.status)))}>
        {next.label}
      </Button>
      {status === 'picked_up' && (
        <Button size="sm" variant="danger" disabled={pending} onClick={() => confirm('تعذّر التسليم؟') && start(async () => void (await updateTask(taskId, 'failed')))}>
          تعذّر
        </Button>
      )}
    </div>
  );
}
