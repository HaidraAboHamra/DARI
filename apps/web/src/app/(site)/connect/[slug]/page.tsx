import type { BusinessDetail, Connection } from '@dari/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServiceTile } from '@/components/brand/service-icon';
import { ConnectButton } from '@/components/marketing/connect-button';
import { ButtonLink } from '@/components/ui/button';
import { api, apiOrNull } from '@/lib/api';
import { currentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'تابع النشاط' };

/** Landing page behind the merchant's QR code (Customer Connect, blueprint §8.2). */
export default async function ConnectPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug);
  const business = await apiOrNull<BusinessDetail>(`/businesses/by-slug/${encodeURIComponent(slug)}`);
  if (!business) notFound();
  const user = await currentUser();
  const connected = user ? (await api<Connection[]>('/me/connections')).some((c) => c.business.id === business.id) : false;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-6 text-center">
      <ServiceTile vertical={business.vertical} size="lg" />
      <h1 className="font-display text-3xl font-bold text-navy">{business.name}</h1>
      <p className="text-muted">تابع {business.name} على داري لتصلك العروض والخصومات أولاً بأول.</p>
      <ul className="card w-full p-5 text-start text-sm leading-loose">
        <li>✓ عروض وكوبونات خاصة بالمتابعين</li>
        <li>✓ لا نشارك رقم هاتفك مع النشاط</li>
        <li>✓ إلغاء المتابعة بضغطة من حسابك</li>
      </ul>
      {user ? <ConnectButton businessId={business.id} connected={connected} businessName={business.name} /> : <ButtonLink href={`/login?next=/connect/${encodeURIComponent(slug)}`} size="lg">سجّل الدخول للمتابعة</ButtonLink>}
      <ButtonLink href={`/b/${business.slug}`} variant="ghost">زيارة صفحة النشاط</ButtonLink>
    </div>
  );
}
