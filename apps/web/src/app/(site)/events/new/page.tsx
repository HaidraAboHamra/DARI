import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/primitives';
import { requireUser } from '@/lib/guards';
import { EventForm } from './event-form';

export const metadata: Metadata = { title: 'نظّم فعالية' };

export default async function NewEventPage() {
  await requireUser('/events/new');
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="نظّم فعالية أو رحلة" subtitle="مقاعد محدودة، تذاكر رقمية وتسجيل دخول بالـ QR" />
      <EventForm />
    </div>
  );
}
