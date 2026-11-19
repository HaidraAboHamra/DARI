import type { Article } from '@dari/contracts';
import { Stack } from 'expo-router';
import { ArticleCard } from '@/components/cards';
import { PagedItems } from '@/components/paged';
import { Screen } from '@/components/ui';
import { config } from '@/lib/config';
import { usePaged } from '@/lib/query';

export default function News() {
  const list = usePaged<Article>('/news', { city: config.city });
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: 'أخبار سلمية' }} />
      <PagedItems list={list} empty="لا أخبار بعد" render={(a) => <ArticleCard key={a.id} article={a} />} />
    </Screen>
  );
}
