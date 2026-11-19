'use client';

import type { BusinessDetail, Product } from '@dari/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { track } from '@/components/analytics/track';
import { useCart } from '@/components/cart/cart-context';
import { buttonClass } from '@/components/ui/button';
import { money } from '@/lib/format';

export function Menu({ business, products }: { business: BusinessDetail; products: Product[] }) {
  const { add, cart, count, subtotal } = useCart();
  const [notice, setNotice] = useState<string | null>(null);
  const sections = Map.groupBy(products, (p) => p.section ?? 'المنتجات');
  const inThisCart = cart?.businessId === business.id;

  const onAdd = (p: Product) => {
    const outcome = add({ businessId: business.id, businessName: business.name, businessSlug: business.slug }, { productId: p.id, name: p.name, price: p.price });
    track({ name: 'cart.created', entityType: 'product', entityId: p.id });
    setNotice(outcome === 'replaced' ? 'بدأنا سلة جديدة من هذا المحل' : `أضيف «${p.name}»`);
    setTimeout(() => setNotice(null), 2200);
  };

  return (
    <div className="flex flex-col gap-6">
      {[...sections].map(([section, items]) => (
        <section key={section}>
          <h3 className="mb-2 font-display text-lg font-bold text-navy">{section}</h3>
          <ul className="card divide-y divide-sand/70">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{p.name}</p>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <p className="mt-1 font-semibold text-gold-deep">{money(p.price)}</p>
                </div>
                {business.acceptsOrders && (
                  <button
                    type="button"
                    onClick={() => onAdd(p)}
                    disabled={p.stock === 0}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-xl font-bold text-navy disabled:opacity-40"
                    aria-label={`أضف ${p.name} إلى السلة`}
                  >
                    +
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p role="status" aria-live="polite" className="sr-only">{notice}</p>
      {notice && <div className="fixed inset-x-4 bottom-36 z-40 mx-auto max-w-sm rounded-full bg-navy px-5 py-3 text-center text-sm text-champagne shadow-lg md:bottom-24">{notice}</div>}

      {inThisCart && count > 0 && (
        <Link href="/cart" className={buttonClass('night', 'lg', 'fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md justify-between md:bottom-6')}>
          <span>عرض السلة ({count})</span>
          <span>{money(subtotal)}</span>
        </Link>
      )}
    </div>
  );
}
