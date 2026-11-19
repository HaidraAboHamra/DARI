import type { Favorite } from '@dari/contracts';
import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { ServiceGlyph } from '@/components/brand';
import { Card, Empty, Loading, Screen, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { useApi } from '@/lib/query';

/** Web hrefs (`/b/x`, `/property/id`, `/events/id`) map 1:1 onto app routes. */
export default function Favorites() {
  const loggedIn = useRequireLogin();
  const favs = useApi<Favorite[]>(loggedIn ? '/me/favorites' : null);
  return (
    <Screen refreshing={favs.isRefetching} onRefresh={() => void favs.refetch()}>
      <Stack.Screen options={{ title: 'المفضلة' }} />
      {favs.isLoading ? <Loading /> : !favs.data?.length ? <Empty title="لا شيء في المفضلة" hint="اضغط ♡ في أي صفحة لحفظها هنا" /> : favs.data.map((f) => (
        <Card key={`${f.entityType}:${f.entityId}`} onPress={() => router.push(f.href as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <ServiceGlyph vertical={f.vertical ?? (f.entityType === 'listing' ? 'property' : 'events')} size={32} />
          </View>
          <T variant="label" style={{ flex: 1 }}>{f.title}</T>
        </Card>
      ))}
    </Screen>
  );
}
