import type { Article } from '@dari/contracts';
import { timeAgo } from '@dari/contracts/i18n';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, Share } from 'react-native';
import { Button, Loading, Screen, T } from '@/components/ui';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const article = useApi<Article>(`/news/${encodeURIComponent(slug ?? '')}`);
  if (!article.data) return <Loading />;
  const a = article.data;
  return (
    <Screen>
      <Stack.Screen options={{ title: a.category ?? 'أخبار' }} />
      {a.coverUrl && <Image source={{ uri: a.coverUrl }} style={{ height: 200, borderRadius: 20 }} />}
      <T variant="small" style={{ color: colors.goldDeep }}>{a.category ?? 'أخبار'}{a.publishedAt ? ` · ${timeAgo(a.publishedAt)}` : ''}</T>
      <T variant="display">{a.title}</T>
      <T variant="title" style={{ fontSize: 16, color: colors.muted }}>{a.summary}</T>
      {a.body.split(/\n{2,}/).map((p, i) => <T key={i} style={{ lineHeight: 26 }}>{p}</T>)}
      <Button title="مشاركة" variant="secondary" onPress={() => void Share.share({ message: `${a.title}\n${config.webUrl}/news/${encodeURIComponent(a.slug)}` })} />
    </Screen>
  );
}
