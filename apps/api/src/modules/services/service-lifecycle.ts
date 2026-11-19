import type { ServiceRequestStatus } from '@dari/contracts';

/** Who may move a service request from one status to the next. */
const PROVIDER_STEPS: Partial<Record<ServiceRequestStatus, ServiceRequestStatus>> = {
  assigned: 'on_the_way',
  on_the_way: 'arrived',
  arrived: 'completed',
};

const CUSTOMER_CANCELLABLE: ReadonlySet<ServiceRequestStatus> = new Set(['open', 'assigned']);

export function providerCanMove(from: ServiceRequestStatus, to: ServiceRequestStatus): boolean {
  return PROVIDER_STEPS[from] === to;
}

export function customerCanCancel(from: ServiceRequestStatus): boolean {
  return CUSTOMER_CANCELLABLE.has(from);
}

export function nextProviderStep(from: ServiceRequestStatus): ServiceRequestStatus | null {
  return PROVIDER_STEPS[from] ?? null;
}
