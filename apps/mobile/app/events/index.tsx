import type { CityEvent, EventKind } from '@dari/contracts';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { EventCard } from '@/components/cards';
import { PagedItems } from '@/components/paged';
import { Chip, Screen } from '@/components/ui';
import { config } from '@/lib/config';
import { usePaged } from '@/lib/query';

export default function Events() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<EventKind | undefined>(params.kind === 'trip' || params.kind === 'event' ? params.kind : undefined);
  const list = usePaged<CityEvent>('/events', { city: config.city, kind });
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: kind === 'trip' ? 'رحلات' : kind === 'event' ? 'فعاليات' : 'فعاليات ورحلات' }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="الكل" active={!kind} onPress={() => setKind(undefined)} />
        <Chip label="فعاليات" active={kind === 'event'} onPress={() => setKind('event')} />
        <Chip label="رحلات" active={kind === 'trip'} onPress={() => setKind('trip')} />
      </View>
      <PagedItems list={list} empty="لا فعاليات قادمة" render={(e) => <EventCard key={e.id} event={e} />} />
    </Screen>
  );
}
