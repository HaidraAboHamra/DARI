import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { buttonClass } from '@/components/ui/button';
import { BellIcon, PinIcon } from '@/components/ui/icons';
import { currentUser } from '@/lib/session';
import { CartButton } from './cart-button';
import { NavLink } from './nav-link';

const LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/explore', label: 'استكشف' },
  { href: '/news', label: 'أخبار' },
  { href: '/jobs', label: 'وظائف' },
  { href: '/delivery', label: 'توصيل' },
  { href: '/map', label: 'الخريطة' },
  { href: '/assistant', label: 'المساعد ✦' },
];

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-30 border-b border-sand/70 bg-ivory/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="داري — الرئيسية">
          <Logo />
        </Link>
        <span className="hidden items-center gap-1 text-sm text-muted sm:inline-flex">
          <PinIcon className="h-4 w-4 text-gold" /> سلمية
        </span>
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-ink/80 hover:text-navy" activeClassName="bg-white text-navy shadow-sm">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          {user && (
            <Link href="/account/notifications" className="grid h-10 w-10 place-items-center rounded-full text-navy hover:bg-sand/60" aria-label="الإشعارات">
              <BellIcon className="h-6 w-6" />
            </Link>
          )}
          <CartButton />
          {user ? (
            <Link href="/account" className={buttonClass('night', 'sm', 'hidden md:inline-flex')}>
              حسابي
            </Link>
          ) : (
            <Link href="/login" className={buttonClass('primary', 'sm')}>
              دخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
