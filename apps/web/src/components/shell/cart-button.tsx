'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart/cart-context';
import { BagIcon } from '@/components/ui/icons';

export function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full text-navy hover:bg-sand/60" aria-label={`السلة (${count})`}>
      <BagIcon className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-0.5 -left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy">
          {count}
        </span>
      )}
    </Link>
  );
}
