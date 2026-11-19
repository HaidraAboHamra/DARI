import { LogoMark } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="night flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-ivory">
      <LogoMark className="h-20 w-18" />
      <h1 className="font-display text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-ivory/70">ربما تغيّر الرابط أو لم يعد النشاط متاحاً.</p>
      <ButtonLink href="/">العودة للرئيسية</ButtonLink>
    </main>
  );
}
