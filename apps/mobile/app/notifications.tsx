import { timeAgo } from '@dari/contracts/i18n';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Empty, Loading, Screen, styles, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { api } from '@/lib/api';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

interface Inbox {
  unread: number;
  items: { id: string; title: string; body: string; readAt: string | null; createdAt: string }[];
}

export default function Notifications() {
  const loggedIn = useRequireLogin();
  const inbox = useApi<Inbox>(loggedIn ? '/me/notifications' : null, { limit: 50 });
  return (
    <Screen refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()}>
      <Stack.Screen options={{ title: 'الإشعارات' }} />
      {inbox.isLoading ? <Loading /> : !inbox.data?.items.length ? <Empty title="لا إشعارات بعد" /> : (
        <>
          {inbox.data.unread > 0 && <Button title="تحديد الكل كمقروء" variant="secondary" small onPress={() => void api.post('/me/notifications/read', { ids: [] }).then(() => inbox.refetch())} />}
          {inbox.data.items.map((n) => (
            <Card key={n.id} style={[styles.row, { backgroundColor: n.readAt ? colors.white : '#EBD59626' }] as never}>
              {!n.readAt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />}
              <View style={{ flex: 1 }}>
                <T variant="label">{n.title}</T>
                <T variant="muted">{n.body} · {timeAgo(n.createdAt)}</T>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
