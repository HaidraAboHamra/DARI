import { type BusinessDetail, type Coupon, PLANS, type Subscription } from '@dari/contracts';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { toggleCoupon } from '@/actions/marketing';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, SectionHeader, Stat } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { money, number, timeAgo } from '@/lib/format';
import { BroadcastForm, CouponForm } from './forms';

interface Broadcast { id: string; title: string; body: string; audienceCount: number; createdAt: string }

export default async function MarketingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [business, subscription, audience, couponsList, history] = await Promise.all([
    api<BusinessDetail>(`/merchant/businesses/${id}`),
    api<Subscription>(`/merchant/businesses/${id}/subscription`),
    api<{ consented: number }>(`/merchant/businesses/${id}/audience`).catch(() => ({ consented: 0 })),
    api<Coupon[]>(`/merchant/businesses/${id}/coupons`).catch(() => []),
    api<Broadcast[]>(`/merchant/businesses/${id}/broadcasts`).catch(() => []),
  ]);
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const joinUrl = `${origin}/connect/${encodeURIComponent(business.slug)}`;
  const qr = await QRCode.toString(joinUrl, { type: 'svg', margin: 1, color: { dark: '#0B1424', light: '#FFFFFF' } });
  const plan = PLANS[subscription.effectivePlan];

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="الباقة الحالية" value={plan.nameAr} hint={subscription.expiresAt ? `حتى ${new Date(subscription.expiresAt).toLocaleDateString('ar-SY')}` : 'بدون اشتراك'} />
        <Stat label="المنتجات" value={`${number(subscription.usage.products)} / ${number(plan.maxProducts)}`} />
        <Stat label="الموظفون" value={`${number(subscription.usage.members)} / ${number(plan.maxMembers)}`} />
        <Stat label="زبائن متابعون" value={number(audience.consented)} hint="Customer Connect" />
      </section>
      {subscription.effectivePlan === 'free' && (
        <p className="rounded-2xl bg-champagne/30 p-4 text-sm">الكوبونات والرسائل للزبائن متاحة في الباقات المدفوعة (من {money(PLANS.starter.monthlyPrice)} شهرياً). تواصل مع فريق داري للترقية.</p>
      )}

      <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="card flex flex-col items-center gap-3 p-5 text-center">
          <div className="w-44 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="رمز QR لمتابعة نشاطك" />
          <p className="font-semibold text-navy">اطبع الرمز وضعه على الطاولة أو الواجهة</p>
          <p className="break-all text-xs text-muted" dir="ltr">{joinUrl}</p>
        </div>
        <div className="card p-5">
          <SectionHeader title="رسالة لزبائنك" />
          <BroadcastForm businessId={id} audience={audience.consented} />
          {history.length > 0 && (
            <ul className="mt-4 divide-y divide-sand/70 text-sm">
              {history.map((b) => <li key={b.id} className="flex justify-between py-2"><span className="font-semibold">{b.title}</span><span className="text-muted">{b.audienceCount} زبون · {timeAgo(b.createdAt)}</span></li>)}
            </ul>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="الكوبونات والعروض" />
        {couponsList.length > 0 && (
          <ul className="card mb-4 divide-y divide-sand/70">
            {couponsList.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="rounded-full bg-navy px-3 py-1 font-mono font-bold text-champagne" dir="ltr">{c.code}</span>
                <span className="flex-1 font-semibold">{c.title} · {c.kind === 'percent' ? `${c.value}٪` : money(c.value)}</span>
                <span className="text-sm text-muted">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''} استخدام</span>
                <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'فعّال' : 'متوقف'}</Badge>
                <form action={toggleCoupon.bind(null, id, c.id, !c.isActive)}><SubmitButton size="sm" variant="ghost">{c.isActive ? 'إيقاف' : 'تفعيل'}</SubmitButton></form>
              </li>
            ))}
          </ul>
        )}
        <div className="card p-5"><CouponForm businessId={id} /></div>
      </section>
    </div>
  );
}
