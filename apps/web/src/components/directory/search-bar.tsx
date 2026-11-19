'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { SearchIcon } from '@/components/ui/icons';

const SUGGESTIONS = ['صيدلية مناوبة هلق', 'مطعم فاتح هلق', 'بدي سباك', 'في شغل؟', 'بيت للإيجار'];

/** Natural-language search box: users type needs ("بدي سباك قريب"), not keywords. */
export function SearchBar({ defaultValue = '', suggestions = true, tone = 'light' }: { defaultValue?: string; suggestions?: boolean; tone?: 'light' | 'night' }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  const go = (query: string) => {
    const trimmed = query.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(q);
  };

  return (
    <div className="w-full">
      <form onSubmit={submit} role="search" className="relative">
        <label htmlFor="q" className="sr-only">ابحث في داري</label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="طعام، طبيب، سبّاك، وظيفة…"
          enterKeyHint="search"
          autoComplete="off"
          className="h-14 w-full rounded-full border-2 border-gold/70 bg-white pe-14 ps-5 text-base text-ink shadow-[0_10px_30px_-18px_rgba(11,20,36,.5)] placeholder:text-muted/70 focus:border-gold focus:outline-none"
        />
        <button type="submit" aria-label="بحث" className="absolute end-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-full bg-gold text-navy">
          <SearchIcon className="h-5 w-5" />
        </button>
      </form>
      {suggestions && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => go(s)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${tone === 'night' ? 'border border-champagne/30 text-champagne hover:bg-white/10' : 'border border-sand bg-white text-ink/80 hover:border-gold'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
