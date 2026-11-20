'use client';

import { type BusinessDetail, makeLine, type Product } from '@dari/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { track } from '@/components/analytics/track';
import { useCart } from '@/components/cart/cart-context';
import { OptionsDialog } from '@/components/cart/options-dialog';
import { buttonClass } from '@/components/ui/button';
import { money } from '@/lib/format';

export function Menu({ business, products }: { business: BusinessDetail; products: Product[] }) {
  const { add, cart, count, subtotal } = useCart();
  const [notice, setNotice] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const sections = Map.groupBy(products, (p) => p.section ?? 'المنتجات');
  const inThisCart = cart?.businessId === business.id;

  const addLine = (p: Product, choices: string[] = [], note = '', quantity = 1) => {
    const outcome = add({ businessId: business.id, businessName: business.name, businessSlug: business.slug }, makeLine(p, choices, note, quantity));
    track({ name: 'cart.created', entityType: 'product', entityId: p.id });
    setNotice(outcome === 'replaced' ? 'بدأنا سلة جديدة من هذا المحل' : `أضيف «${p.name}»`);
    setTimeout(() => setNotice(null), 2200);
  };
  // Products with options open the customizer; plain ones are added in one tap.
  const onAdd = (p: Product) => (p.options.length ? setCustomizing(p) : addLine(p));

  return (
    <div className="flex flex-col gap-6">
      {[...sections].map(([section, items]) => (
        <section key={section}>
          <h3 className="mb-2 font-display text-lg font-bold text-navy">{section}</h3>
          <ul className="card divide-y divide-sand/70">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" loading="lazy" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy">{p.name}</p>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <p className="mt-1 font-semibold text-gold-deep">
                    {p.options.some((g) => g.choices.some((c) => c.price > 0)) && 'من '}
                    {money(p.price)}
                    {p.isPopular && <span className="ms-2 rounded-full bg-champagne/40 px-2 py-0.5 text-xs text-gold-deep">الأكثر طلباً</span>}
                  </p>
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

      {customizing && (
        <OptionsDialog
          product={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={(choices, note, quantity) => {
            addLine(customizing, choices, note, quantity);
            setCustomizing(null);
          }}
        />
      )}
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
