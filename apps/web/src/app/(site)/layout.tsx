import type { ReactNode } from 'react';
import { BottomNav } from '@/components/shell/bottom-nav';
import { SiteHeader } from '@/components/shell/site-header';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 md:pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
