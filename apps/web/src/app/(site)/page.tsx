import type { Article, BusinessSummary, CityEvent, Job, Page } from '@dari/contracts';
import Link from 'next/link';
import { ArticleCard, JobCard } from '@/components/content/cards';
import { EventCard } from '@/components/content/event-card';
import { BusinessCard } from '@/components/directory/business-card';
import { SearchBar } from '@/components/directory/search-bar';
import { ServiceGrid } from '@/components/directory/service-grid';
import { SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { greeting } from '@/lib/format';

const more = (href: string) => (
  <Link href={href} className="text-sm font-semibold text-gold-deep hover:underline">
    عرض الكل
  </Link>
);

export default async function HomePage() {
  const query = { city: config.city, limit: 4 };
  const [businesses, news, jobs, events] = await Promise.all([
    api<Page<BusinessSummary>>('/businesses', { query: { ...query, limit: 6 }, revalidate: 60 }),
    api<Page<Article>>('/news', { query, revalidate: 60 }),
    api<Page<Job>>('/jobs', { query, revalidate: 60 }),
    api<Page<CityEvent>>('/events', { query, revalidate: 60 }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section className="night -mx-4 -mt-6 overflow-hidden px-4 pt-8 pb-10 text-ivory sm:mx-0 sm:mt-0 sm:rounded-[2rem] sm:px-10 sm:py-12">
        <p className="text-sm text-champagne/80">{greeting()} 👋</p>
        <h1 className="mt-1 font-display text-4xl font-bold leading-tight sm:text-5xl">
          شو بدك <span className="bg-clip-text text-transparent gold-gradient">اليوم؟</span>
        </h1>
        <p className="mt-2 max-w-xl text-ivory/70">اكتب حاجتك بكلامك — مطعم فاتح، صيدلية مناوبة، سبّاك قريب أو شغل جديد.</p>
        <div className="mt-6 max-w-2xl">
          <SearchBar tone="night" />
        </div>
      </section>

      <section aria-labelledby="services">
        <h2 id="services" className="sr-only">الخدمات</h2>
        <ServiceGrid />
      </section>

      <section>
        <SectionHeader title="نبض المدينة" action={more('/news')} />
        <div className="grid gap-3 md:grid-cols-2">
          {news.items.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      </section>

      {events.items.length > 0 && (
        <section>
          <SectionHeader title="فعاليات ورحلات قادمة" action={more('/events')} />
          <div className="grid gap-3 md:grid-cols-2">
            {events.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="الأعلى تقييماً" action={more('/explore')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.items.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="فرص عمل في سلمية" action={more('/jobs')} />
        <div className="grid gap-3 sm:grid-cols-2">
          {jobs.items.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </section>
    </div>
  );
}
