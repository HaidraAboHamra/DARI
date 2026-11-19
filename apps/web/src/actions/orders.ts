'use server';

import type { CreateOrderInput, Order, OrderStatus } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { type ActionState, toActionError } from '@/lib/action-result';
import { currentUser } from '@/lib/session';

export async function placeOrder(input: CreateOrderInput, idempotencyKey: string): Promise<{ order?: Order; error?: string; needsLogin?: boolean }> {
  if (!(await currentUser())) return { needsLogin: true };
  try {
    const order = await api<Order>('/orders', { method: 'POST', body: input, headers: { 'idempotency-key': idempotencyKey } });
    return { order };
  } catch (err) {
    return { error: toActionError(err).error ?? 'تعذر إرسال الطلب' };
  }
}

export async function changeOrderStatus(orderId: string, status: OrderStatus, path: string): Promise<ActionState> {
  try {
    await api(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
    revalidatePath(path);
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}
