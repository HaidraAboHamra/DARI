import { type BusinessSummary, type Category, type Page, type Vertical, VERTICAL_META, VERTICALS } from '@dari/contracts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { BusinessCard } from '@/components/cards';
import { Button, Chip, Empty, Loading, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

export default function VerticalList() {
  const { vertical: raw } = useLocalSearchParams<{ vertical: string }>();
  const vertical = (VERTICALS as readonly string[]).includes(raw ?? '') ? (raw as Vertical) : 'food';
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const categories = useApi<Category[]>('/categories', { vertical });
  const list = useInfiniteQuery({
    queryKey: ['businesses', vertical, categoryId],
    queryFn: ({ pageParam }) => api.get<Page<BusinessSummary>>('/businesses', { city: config.city, vertical, categoryId, cursor: pageParam, limit: 12 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: VERTICAL_META[vertical].labelAr }} />
      {vertical === 'services' && <Button title="صف المشكلة واستلم عروض أسعار" variant="night" onPress={() => router.push('/services/new')} />}
      {!!categories.data?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="الكل" active={!categoryId} onPress={() => setCategoryId(undefined)} />
          {categories.data.map((c) => <Chip key={c.id} label={c.nameAr} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
        </ScrollView>
      )}
      {list.isLoading ? <Loading /> : items.length === 0 ? <Empty title="لا يوجد نشاطات هنا بعد" /> : items.map((b) => <BusinessCard key={b.id} business={b} />)}
      {list.hasNextPage && <Button title="المزيد" variant="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} style={{ borderColor: colors.navy }} />}
    </Screen>
  );
}
