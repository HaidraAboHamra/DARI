'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({
  href,
  children,
  className,
  activeClassName,
  exact = href === '/',
}: {
  href: string;
  children: ReactNode;
  className: string;
  activeClassName: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`${className} ${active ? activeClassName : ''}`}>
      {children}
    </Link>
  );
}
