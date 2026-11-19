import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoMark, Wordmark } from '@/components/brand/logo';
import { LiveUpdates } from '@/components/shell/live-updates';

export const metadata: Metadata = { title: { default: 'Merchant OS', template: '%s · Merchant OS' } };

/** The merchant console: same design system, denser "work" layout. */
export default function MerchantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <LiveUpdates />
      <header className="night text-ivory">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/merchant" className="flex items-center gap-2">
            <LogoMark className="h-8 w-7" />
            <Wordmark className="text-2xl text-ivory" />
          </Link>
          <span className="rounded-full border border-champagne/30 px-2.5 py-0.5 text-xs font-semibold text-champagne">Merchant OS</span>
          <Link href="/" className="ms-auto text-sm text-ivory/70 hover:text-ivory">العودة للتطبيق</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
