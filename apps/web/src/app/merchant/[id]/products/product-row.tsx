'use client';

import type { Product } from '@dari/contracts';
import { useState, useTransition } from 'react';
import { deleteProduct, toggleProduct } from '@/actions/merchant';
import { Badge } from '@/components/ui/primitives';
import { money } from '@/lib/format';
import { ProductForm } from './product-form';

export function ProductRow({ businessId, product }: { businessId: string; product: Product }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  if (editing) {
    return (
      <li className="p-4">
        <ProductForm businessId={businessId} product={product} onDone={() => setEditing(false)} />
        <button type="button" className="mt-2 text-sm text-muted" onClick={() => setEditing(false)}>إلغاء</button>
      </li>
    );
  }
  return (
    <li className={`flex flex-wrap items-center gap-3 p-4 ${pending ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy">{product.name}</p>
        <p className="text-sm text-muted">{product.section ?? '—'}</p>
      </div>
      <span className="font-semibold">{money(product.price)}</span>
      {product.stock !== null && <Badge tone={product.stock === 0 ? 'danger' : product.stock < 10 ? 'gold' : 'neutral'}>مخزون {product.stock}</Badge>}
      <button
        type="button"
        onClick={() => start(() => toggleProduct(businessId, product.id, !product.isAvailable))}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isAvailable ? 'bg-success/10 text-success' : 'bg-sand text-muted'}`}
      >
        {product.isAvailable ? 'متوفر' : 'غير متوفر'}
      </button>
      <button type="button" className="text-sm font-semibold text-gold-deep" onClick={() => setEditing(true)}>تعديل</button>
      <button
        type="button"
        className="text-sm text-danger"
        onClick={() => confirm(`حذف «${product.name}»؟`) && start(() => deleteProduct(businessId, product.id))}
      >
        حذف
      </button>
    </li>
  );
}
