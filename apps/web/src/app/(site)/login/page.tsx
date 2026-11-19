import type { Metadata } from 'next';
import { LogoMark } from '@/components/brand/logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <div className="night flex flex-col items-center gap-3 rounded-[2rem] px-6 py-10 text-center text-ivory">
        <LogoMark className="h-20 w-18" />
        <h1 className="font-display text-3xl font-bold">أهلاً بك في داري</h1>
        <p className="text-ivory/70">سلمية بين إيديك — ادخل برقم موبايلك، بدون كلمة سر.</p>
      </div>
      <div className="card p-6">
        <LoginForm next={next ?? '/'} />
      </div>
    </div>
  );
}
