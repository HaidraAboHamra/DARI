'use client';

import type { Order, Product } from '@dari/contracts';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';

/** Recurring needs (blueprint §14.5): rebuild the cart from a past order at today's prices. */
export function ReorderButton({ order, menu }: { order: Order; menu: Product[] }) {
  const { replace } = useCart();
  const router = useRouter();
  const available = new Map(menu.filter((p) => p.isAvailable).map((p) => [p.id, p]));
  const lines = order.items.filter((i) => available.has(i.productId)).map((i) => ({ productId: i.productId, name: available.get(i.productId)!.name, price: available.get(i.productId)!.price, quantity: i.quantity }));
  if (!lines.length) return null;
  return (
    <Button
      variant="secondary"
      onClick={() => {
        replace({ businessId: order.businessId, businessName: order.businessName, businessSlug: order.businessSlug, lines });
        router.push('/cart');
      }}
    >
      اطلب مجدداً {lines.length < order.items.length && `(${lines.length} من ${order.items.length} متوفرة)`}
    </Button>
  );
}
