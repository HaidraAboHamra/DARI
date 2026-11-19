import type { SVGProps } from 'react';

/** "Arches embracing a person" — the Dari mark (geometry from the brand file). */
export function LogoMark({ gradient = true, ...props }: SVGProps<SVGSVGElement> & { gradient?: boolean }) {
  const fill = gradient ? 'url(#dari-gold)' : 'currentColor';
  return (
    <svg viewBox="150 20 340 390" role="img" aria-label="داري" {...props}>
      <defs>
        <linearGradient id="dari-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8A6A24" />
          <stop offset=".25" stopColor="#F3DE9C" />
          <stop offset=".5" stopColor="#B8913A" />
          <stop offset=".75" stopColor="#F3DE9C" />
          <stop offset="1" stopColor="#8A6A24" />
        </linearGradient>
      </defs>
      <path d="M165.5 340L161 190A159 159 0 0 1 479 190L474.5 390L465.5 390L461 190A141 141 0 0 0 179 190L174.5 340Z" fill={fill} />
      <path d="M211.5 340L207 190A113 113 0 0 1 433 190L428.5 390L419.5 390L415 190A95 95 0 0 0 225 190L220.5 340Z" fill={fill} />
      <path d="M257.5 340L253 190A67 67 0 0 1 387 190L382.5 390L373.5 390L369 190A49 49 0 0 0 271 190L266.5 340Z" fill={fill} />
      <circle cx="320" cy="266" r="26" fill={fill} />
    </svg>
  );
}

/** The calligraphic "ي" that closes the wordmark. */
function Yaa(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 -55 70 112" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M62.2-47 59.8-40.1 59.4-30.2 58.7-21.3 57.8-13.3 56.6-6.1 55.1.1 53.4 5.5 51.5 10.1 49.5 13.8 47.3 16.6 45.1 18.6 43 19.9 41 20.6 39.1 20.7 37.1 20.5 35 20 32.7 20.5 30.4 20.8 28.2 20.8 25.9 20.4 23.6 19.7 21.3 18.7 19 17.3 16.8 15.6 14.6 13.5 12.6 11.1 10.7 8.5 9 5.6 7.4 2.5 6.1-.8 5-4.2 3-3.8 3.7-.1 4.4 3.5 5.3 7.1 6.3 10.6 7.5 14 8.9 17.3 10.5 20.5 12.4 23.5 14.5 26.4 17 29.1 19.9 31.6 23.1 33.8 26.7 35.6 30.7 37.1 35 38 39.5 37 43.8 35.4 47.7 33.1 51.1 30.2 54.1 26.7 56.5 22.8 58.6 18.4 60.3 13.5 61.8 8 63 1.9 64.1-4.9 64.9-12.4 65.5-20.8 66-29.9 66.2-39.9 65-43.9 63.8-47Z" />
      <circle cx="22" cy="48" r="6.5" />
      <circle cx="48" cy="48" r="6.5" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display font-bold leading-none ${className}`} aria-label="داري">
      <span aria-hidden="true">دار</span>
      <Yaa className="mx-[0.03em] inline-block h-[1.12em] w-[0.7em] translate-y-[0.3em] text-gold" />
    </span>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-7" />
      <Wordmark className="text-2xl text-navy" />
    </span>
  );
}
