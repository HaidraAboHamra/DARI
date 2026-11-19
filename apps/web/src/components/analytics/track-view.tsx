'use client';

import type { AnalyticsEventName, EntityType } from '@dari/contracts';
import { useEffect } from 'react';
import { track } from './track';

/** Drop into a server-rendered page to record a view once. */
export function TrackView({ name, entityType, entityId }: { name: AnalyticsEventName; entityType: EntityType; entityId: string }) {
  useEffect(() => track({ name, entityType, entityId }), [name, entityType, entityId]);
  return null;
}
