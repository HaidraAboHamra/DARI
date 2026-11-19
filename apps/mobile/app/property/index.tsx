import { type ListingPurpose, type PropertyListing, type PropertyType, PROPERTY_TYPES } from '@dari/contracts';
import { PROPERTY_TYPE_LABEL } from '@dari/contracts/i18n';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ListingCard } from '@/components/cards';
import { PagedItems } from '@/components/paged';
import { Chip, Screen } from '@/components/ui';
import { config } from '@/lib/config';
import { usePaged } from '@/lib/query';

export default function Property() {
  const [purpose, setPurpose] = useState<ListingPurpose | undefined>();
  const [type, setType] = useState<PropertyType | undefined>();
  const list = usePaged<PropertyListing>('/listings', { city: config.city, purpose, propertyType: type }, 18);
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: 'عقارات' }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="الكل" active={!purpose} onPress={() => setPurpose(undefined)} />
        <Chip label="للبيع" active={purpose === 'sale'} onPress={() => setPurpose('sale')} />
        <Chip label="للإيجار" active={purpose === 'rent'} onPress={() => setPurpose('rent')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="كل الأنواع" active={!type} onPress={() => setType(undefined)} />
        {PROPERTY_TYPES.map((t) => <Chip key={t} label={PROPERTY_TYPE_LABEL[t]} active={type === t} onPress={() => setType(t)} />)}
      </ScrollView>
      <PagedItems list={list} empty="لا عروض مطابقة" render={(l) => <ListingCard key={l.id} listing={l} />} />
    </Screen>
  );
}
