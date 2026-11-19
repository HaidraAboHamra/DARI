import type { SearchHit } from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { ArticleCard, BusinessCard, EventCard, JobCard, ListingCard } from './cards';
import { Card, styles, T } from './ui';
import { View } from 'react-native';
import { colors } from '@/theme';

/** Renders any universal-search hit with its own card. */
export function Hit({ hit }: { hit: SearchHit }) {
  switch (hit.kind) {
    case 'business':
      return <BusinessCard business={hit.item} />;
    case 'job':
      return <JobCard job={hit.item} />;
    case 'article':
      return <ArticleCard article={hit.item} />;
    case 'event':
      return <EventCard event={hit.item} />;
    case 'listing':
      return <ListingCard listing={hit.item} />;
    case 'product':
      return (
        <Card onPress={() => router.push(`/b/${encodeURIComponent(hit.item.businessSlug)}`)} style={styles.row as never}>
          <View style={{ flex: 1 }}>
            <T variant="label">{hit.item.name}</T>
            <T variant="muted">من {hit.item.businessName}</T>
          </View>
          <T style={{ color: colors.goldDeep }}>{money(hit.item.price)}</T>
        </Card>
      );
  }
}
