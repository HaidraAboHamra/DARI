import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'night';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gold text-navy hover:bg-[#d4b05c] shadow-[0_6px_16px_-8px_rgba(201,162,75,.8)]',
  secondary: 'border border-navy/80 text-navy hover:bg-navy hover:text-ivory',
  ghost: 'text-navy hover:bg-sand/60',
  danger: 'border border-danger/40 text-danger hover:bg-danger hover:text-white',
  night: 'bg-navy text-champagne hover:bg-navy-soft',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-7 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export function Button({
  variant,
  size,
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant,
  size,
  className = '',
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
