import { type Article, type BusinessSummary, type CityEvent, type Job, type PropertyListing, VERTICAL_META } from '@dari/contracts';
import { EMPLOYMENT_LABEL, eventWhen, money, PROPERTY_TYPE_LABEL, PURPOSE_LABEL, timeAgo } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { colors } from '@/theme';
import { ServiceGlyph } from './brand';
import { Badge, Card, Stars, styles, T } from './ui';

export function BusinessCard({ business }: { business: BusinessSummary }) {
  const meta = VERTICAL_META[business.vertical];
  return (
    <Card onPress={() => router.push(`/b/${encodeURIComponent(business.slug)}`)} style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
      <View style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: `${meta.color}1F`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {business.logoUrl ? <Image source={{ uri: business.logoUrl }} style={{ width: 72, height: 72 }} /> : <ServiceGlyph vertical={business.vertical} size={40} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.row}>
          <T variant="label" numberOfLines={1} style={{ flex: 1 }}>{business.name}</T>
          {business.isFeatured ? <Badge label="مميز" tone="gold" /> : business.isVerified ? <Badge label="موثّق" tone="gold" /> : null}
        </View>
        <T variant="muted" numberOfLines={1}>{[business.categoryName ?? meta.labelAr, business.areaName].filter(Boolean).join(' · ')}</T>
        <View style={styles.row}>
          <Stars value={business.ratingAvg} count={business.ratingCount} />
          {business.acceptsOrders && <T variant="small" style={{ color: colors.success, marginStart: 'auto' }}>يستقبل طلبات</T>}
        </View>
      </View>
    </Card>
  );
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Card onPress={() => router.push(`/news/${encodeURIComponent(article.slug)}`)} style={{ gap: 4 }}>
      <T variant="small" style={{ color: VERTICAL_META.news.color }}>{article.category ?? 'أخبار'}{article.publishedAt ? ` · ${timeAgo(article.publishedAt)}` : ''}</T>
      <T variant="label" numberOfLines={2}>{article.title}</T>
      <T variant="muted" numberOfLines={2}>{article.summary}</T>
    </Card>
  );
}

export function JobCard({ job }: { job: Job }) {
  return (
    <Card onPress={() => router.push(`/jobs/${job.id}`)} style={{ gap: 4 }}>
      <View style={styles.row}>
        <T variant="label" style={{ flex: 1 }}>{job.title}</T>
        <Badge label={EMPLOYMENT_LABEL[job.employmentType]} />
      </View>
      <T variant="muted">{[job.businessName, job.areaName, timeAgo(job.publishedAt)].filter(Boolean).join(' · ')}</T>
      {job.salaryMin ? <T style={{ color: colors.goldDeep, fontSize: 13 }}>{money(job.salaryMin)}{job.salaryMax ? ` – ${money(job.salaryMax)}` : ''}</T> : null}
    </Card>
  );
}

export function EventCard({ event }: { event: CityEvent }) {
  const vertical = event.kind === 'trip' ? 'trips' : 'events';
  return (
    <Card onPress={() => router.push(`/events/${event.id}`)} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: `${VERTICAL_META[vertical].color}1F`, alignItems: 'center', justifyContent: 'center' }}>
        <ServiceGlyph vertical={vertical} size={34} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="small" style={{ color: VERTICAL_META[vertical].color }}>{eventWhen(event.startsAt)}</T>
        <T variant="label" numberOfLines={2}>{event.title}</T>
        <T variant="muted" numberOfLines={1}>{event.destination ?? event.venue}</T>
        <View style={styles.row}>
          <T style={{ color: colors.goldDeep, fontSize: 13 }}>{event.price ? money(event.price) : 'مجاني'}</T>
          <Badge label={event.seatsLeft ? `${event.seatsLeft} مقعد` : 'نفدت'} tone={event.seatsLeft ? 'neutral' : 'danger'} />
        </View>
      </View>
    </Card>
  );
}

export function ListingCard({ listing }: { listing: PropertyListing }) {
  return (
    <Card onPress={() => router.push(`/property/${listing.id}`)} style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ height: 150, backgroundColor: '#6B7F3A1A', alignItems: 'center', justifyContent: 'center' }}>
        {listing.images[0] ? <Image source={{ uri: listing.images[0] }} style={{ width: '100%', height: 150 }} /> : <ServiceGlyph vertical="property" size={56} />}
      </View>
      <View style={{ padding: 14, gap: 4 }}>
        <View style={styles.row}>
          <Badge label={PURPOSE_LABEL[listing.purpose]!} tone="navy" />
          {listing.isFeatured && <Badge label="مميز" tone="gold" />}
        </View>
        <T variant="title" style={{ color: colors.goldDeep }}>{money(listing.price)}{listing.purpose === 'rent' ? ' / شهرياً' : ''}</T>
        <T variant="label" numberOfLines={1}>{listing.title}</T>
        <T variant="muted">{[PROPERTY_TYPE_LABEL[listing.propertyType], listing.rooms ? `${listing.rooms} غرف` : null, listing.sizeSqm ? `${listing.sizeSqm} م²` : null, listing.areaName].filter(Boolean).join(' · ')}</T>
      </View>
    </Card>
  );
}
