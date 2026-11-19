'use client';

import type { EntityType } from '@dari/contracts';
import type { ReactNode } from 'react';
import { track } from '@/components/analytics/track';

/** Attributes a click to the search that produced it (search → action funnel). */
export function ResultLink({ searchId, entityType, entityId, children }: { searchId: string; entityType: EntityType; entityId: string; children: ReactNode }) {
  return (
    <div onClickCapture={() => track({ name: 'search.result_clicked', searchId, entityType, entityId })}>{children}</div>
  );
}
