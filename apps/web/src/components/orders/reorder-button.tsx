'use client';

import { type CartLine, choicesFromSnapshot, makeLine, type Order, type Product } from '@dari/contracts';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';

/** Recurring needs (blueprint §14.5): rebuild the cart from a past order at today's prices. */
export function ReorderButton({ order, menu }: { order: Order; menu: Product[] }) {
  const { replace } = useCart();
  const router = useRouter();
  const available = new Map(menu.filter((p) => p.isAvailable).map((p) => [p.id, p]));
  // Same items and choices at today's prices; lines whose choices no longer exist are skipped.
  const lines: CartLine[] = order.items.flatMap((i) => {
    const product = available.get(i.productId);
    const choices = product && choicesFromSnapshot(product, i.options);
    if (!product || !choices) return [];
    try {
      return [makeLine(product, choices, i.note ?? undefined, i.quantity)];
    } catch {
      return [];
    }
  });
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
