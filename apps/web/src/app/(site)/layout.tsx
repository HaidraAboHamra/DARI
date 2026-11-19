import type { ReactNode } from 'react';
import { BottomNav } from '@/components/shell/bottom-nav';
import { LiveUpdates } from '@/components/shell/live-updates';
import { SiteHeader } from '@/components/shell/site-header';
import { currentUser } from '@/lib/session';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  return (
    <>
      {user && <LiveUpdates />}
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 md:pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
