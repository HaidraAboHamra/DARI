import { type CityEvent, VERTICAL_META } from '@dari/contracts';
import Link from 'next/link';
import { ServiceGlyph } from '@/components/brand/service-icon';
import { Badge } from '@/components/ui/primitives';
import { money } from '@/lib/format';
import { eventWhen } from '@/lib/labels';

export function EventCard({ event }: { event: CityEvent }) {
  const vertical = event.kind === 'trip' ? 'trips' : 'events';
  const color = VERTICAL_META[vertical].color;
  return (
    <Link href={`/events/${event.id}`} className="card flex gap-4 p-4 transition-shadow hover:shadow-lg">
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${color}1F` }}>
        <ServiceGlyph vertical={vertical} className="h-9 w-9" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold" style={{ color }}>{eventWhen(event.startsAt)}</p>
        <h3 className="mt-0.5 line-clamp-2 font-bold text-navy">{event.title}</h3>
        <p className="truncate text-sm text-muted">{event.destination ?? event.venue}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-gold-deep">{event.price ? money(event.price) : 'مجاني'}</span>
          <Badge tone={event.seatsLeft === 0 ? 'danger' : event.seatsLeft < 10 ? 'gold' : 'neutral'}>
            {event.seatsLeft === 0 ? 'نفدت المقاعد' : `${event.seatsLeft} مقعد متاح`}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
