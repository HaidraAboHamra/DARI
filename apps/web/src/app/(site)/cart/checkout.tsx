'use client';

import type { FulfillmentType } from '@dari/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { previewCoupon } from '@/actions/marketing';
import { placeOrder } from '@/actions/orders';
import { track } from '@/components/analytics/track';
import { useCart } from '@/components/cart/cart-context';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, Field, FormError, Input, Textarea } from '@/components/ui/primitives';
import { money } from '@/lib/format';

export function Checkout() {
  const { cart, subtotal, setQuantity, clear } = useCart();
  const router = useRouter();
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number; title?: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // One key per checkout attempt: retries of the same submit never create duplicate orders.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [cart?.businessId]);

  if (!cart) {
    return (
      <EmptyState title="سلتك فارغة" hint="تصفح المطاعم والمتاجر وأضف ما تحتاجه.">
        <ButtonLink href="/explore/food">تصفّح المطاعم</ButtonLink>
      </EmptyState>
    );
  }

  const submit = () => {
    setError(null);
    if (fulfillment === 'delivery' && address.trim().length < 3) return setError('أدخل عنوان التوصيل');
    track({ name: 'checkout.started', entityType: 'business', entityId: cart.businessId });
    startTransition(async () => {
      const result = await placeOrder(
        {
          businessId: cart.businessId,
          fulfillment,
          items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          ...(fulfillment === 'delivery' && { address: { text: address.trim() } }),
          ...(notes.trim() && { notes: notes.trim() }),
          ...(coupon && { couponCode: coupon.code }),
        },
        idempotencyKey,
      );
      if (result.needsLogin) return router.push('/login?next=/cart');
      if (result.error || !result.order) return setError(result.error ?? 'تعذر إرسال الطلب');
      track({ name: 'order.created', entityType: 'order', entityId: result.order.id });
      clear();
      router.push(`/orders/${result.order.id}`);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="card divide-y divide-sand/70">
        <div className="flex items-center justify-between p-4">
          <Link href={`/b/${cart.businessSlug}`} className="font-display text-lg font-bold text-navy hover:underline">
            {cart.businessName}
          </Link>
          <button type="button" onClick={clear} className="text-sm text-danger">
            إفراغ السلة
          </button>
        </div>
        {cart.lines.map((line) => (
          <div key={line.productId} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-navy">{line.name}</p>
              <p className="text-sm text-muted">{money(line.price)}</p>
            </div>
            <div className="flex items-center gap-2" role="group" aria-label={`كمية ${line.name}`}>
              <button type="button" className="h-9 w-9 rounded-full border border-sand text-lg" onClick={() => setQuantity(line.productId, line.quantity - 1)} aria-label="إنقاص">−</button>
              <span className="w-6 text-center font-semibold tabular-nums">{line.quantity}</span>
              <button type="button" className="h-9 w-9 rounded-full bg-gold text-lg text-navy" onClick={() => setQuantity(line.productId, line.quantity + 1)} aria-label="زيادة">+</button>
            </div>
          </div>
        ))}
      </section>

      <aside className="card flex flex-col gap-4 p-5 lg:sticky lg:top-24 lg:self-start">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-sand/60 p-1" role="radiogroup" aria-label="طريقة الاستلام">
          {(['delivery', 'pickup'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={fulfillment === f}
              onClick={() => setFulfillment(f)}
              className={`rounded-full py-2 text-sm font-semibold ${fulfillment === f ? 'bg-white text-navy shadow' : 'text-muted'}`}
            >
              {f === 'delivery' ? 'توصيل' : 'استلام من المحل'}
            </button>
          ))}
        </div>
        {fulfillment === 'delivery' && (
          <Field label="عنوان التوصيل">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الحي، الشارع، أقرب معلم" />
          </Field>
        )}
        <Field label="ملاحظات للمحل">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="بدون بصل، الطابق الثاني…" maxLength={500} />
        </Field>
        <div className="flex gap-2">
          <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="كود الخصم" dir="ltr" className="!py-2 font-mono" />
          <Button
            size="sm"
            variant="secondary"
            disabled={!couponCode}
            onClick={async () => {
              const r = await previewCoupon(cart.businessId, couponCode, subtotal);
              if (r.error || r.discount === undefined) {
                setCoupon(null);
                setCouponError(r.error ?? 'الكوبون غير صالح');
              } else {
                setCoupon({ code: couponCode, discount: r.discount, title: r.title });
                setCouponError(null);
              }
            }}
          >
            تطبيق
          </Button>
        </div>
        {couponError && <p className="text-xs text-danger">{couponError}</p>}
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted">المجموع</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
          {coupon && <div className="flex justify-between text-success"><dt>{coupon.title ?? coupon.code}</dt><dd>− {money(coupon.discount)}</dd></div>}
          {fulfillment === 'delivery' && <div className="flex justify-between"><dt className="text-muted">التوصيل</dt><dd className="text-muted">يُحسب عند التأكيد</dd></div>}
        </dl>
        <FormError message={error} />
        <Button size="lg" onClick={submit} disabled={pending}>
          {pending ? 'جارٍ الإرسال…' : 'تأكيد الطلب — الدفع عند الاستلام'}
        </Button>
      </aside>
    </div>
  );
}
