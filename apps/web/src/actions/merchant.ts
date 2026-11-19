'use server';

import type { BusinessDetail, BusinessStatus, Vertical } from '@dari/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { type ActionState, int, str, toActionError } from '@/lib/action-result';
import { config } from '@/lib/config';

const DAILY = (open: string, close: string) => [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open, close }));

export async function registerBusiness(_: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const open = str(form, 'open');
    const close = str(form, 'close');
    const business = await api<BusinessDetail>('/businesses', {
      method: 'POST',
      body: {
        citySlug: config.city,
        name: str(form, 'name'),
        vertical: str(form, 'vertical') as Vertical,
        categoryId: str(form, 'categoryId'),
        areaId: str(form, 'areaId'),
        description: str(form, 'description'),
        phone: str(form, 'phone'),
        whatsapp: str(form, 'phone'),
        address: str(form, 'address'),
        openingHours: open && close ? DAILY(open, close) : undefined,
      },
    });
    id = business.id;
  } catch (err) {
    return toActionError(err);
  }
  redirect(`/merchant/${id}`);
}

export async function updateBusinessSettings(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/merchant/businesses/${businessId}`, {
      method: 'PATCH',
      body: {
        description: str(form, 'description'),
        phone: str(form, 'phone'),
        address: str(form, 'address'),
        acceptsOrders: form.get('acceptsOrders') === 'on',
        logoUrl: str(form, 'logoUrl'),
        coverUrl: str(form, 'coverUrl'),
        deliveryFee: int(form, 'deliveryFee') ?? null,
      },
    });
    revalidatePath(`/merchant/${businessId}`);
    return { ok: true, message: 'تم حفظ الإعدادات' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveProduct(businessId: string, productId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  const stockRaw = str(form, 'stock');
  const body = {
    name: str(form, 'name'),
    section: str(form, 'section'),
    description: str(form, 'description'),
    price: int(form, 'price'),
    imageUrl: str(form, 'imageUrl'),
    stock: stockRaw === undefined ? null : int(form, 'stock'),
    isAvailable: form.get('isAvailable') !== 'off',
  };
  try {
    await api(`/merchant/businesses/${businessId}/products${productId ? `/${productId}` : ''}`, {
      method: productId ? 'PATCH' : 'POST',
      body,
    });
    revalidatePath(`/merchant/${businessId}/products`);
    return { ok: true, message: productId ? 'تم التعديل' : 'تمت إضافة المنتج' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleProduct(businessId: string, productId: string, isAvailable: boolean): Promise<void> {
  await api(`/merchant/businesses/${businessId}/products/${productId}`, { method: 'PATCH', body: { isAvailable } });
  revalidatePath(`/merchant/${businessId}/products`);
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  await api(`/merchant/businesses/${businessId}/products/${productId}`, { method: 'DELETE' });
  revalidatePath(`/merchant/${businessId}/products`);
}

export async function addMember(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/merchant/businesses/${businessId}/members`, { method: 'POST', body: { phone: str(form, 'phone'), role: str(form, 'role') } });
    revalidatePath(`/merchant/${businessId}/team`);
    return { ok: true, message: 'تمت إضافة الموظف' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setBusinessStatus(businessId: string, status: BusinessStatus): Promise<void> {
  await api(`/admin/businesses/${businessId}/status`, { method: 'PATCH', body: { status } });
  revalidatePath('/admin');
}

export async function claimTask(taskId: string): Promise<ActionState> {
  try {
    await api(`/deliveries/${taskId}/claim`, { method: 'POST' });
    revalidatePath('/courier');
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateTask(taskId: string, status: 'picked_up' | 'delivered' | 'failed'): Promise<ActionState> {
  try {
    await api(`/deliveries/${taskId}/status`, { method: 'PATCH', body: { status } });
    revalidatePath('/courier');
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}
