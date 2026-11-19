import { BagIcon, CompassIcon, HomeIcon, UserIcon } from '@/components/ui/icons';
import { NavLink } from './nav-link';

const ITEMS = [
  { href: '/', label: 'الرئيسية', Icon: HomeIcon },
  { href: '/explore', label: 'استكشف', Icon: CompassIcon },
  { href: '/orders', label: 'طلباتي', Icon: BagIcon },
  { href: '/account', label: 'حسابي', Icon: UserIcon },
];

/** Thumb-reachable navigation on phones (hidden on desktop). */
export function BottomNav() {
  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sand/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => (
          <li key={href}>
            <NavLink href={href} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted" activeClassName="!text-navy [&_svg]:text-gold">
              <Icon className="h-6 w-6" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
