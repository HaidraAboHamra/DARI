import type { ServiceRequest } from '@dari/contracts';
import { SERVICE_STATUS_LABEL, timeAgo } from '@dari/contracts/i18n';
import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { PagedItems } from '@/components/paged';
import { Badge, Button, Card, Screen, styles, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { usePaged } from '@/lib/query';

export default function ServiceRequests() {
  const loggedIn = useRequireLogin();
  const list = usePaged<ServiceRequest>(loggedIn ? '/service-requests' : null, {}, 30);
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: 'طلبات الخدمة' }} />
      <Button title="طلب خدمة جديد" variant="night" onPress={() => router.push('/services/new')} />
      <PagedItems list={list} empty="لا طلبات بعد" render={(r) => (
        <Card key={r.id} onPress={() => router.push(`/services/${r.id}`)} style={{ gap: 4 }}>
          <View style={styles.row}>
            <T variant="label" style={{ flex: 1 }}>{r.categoryName}</T>
            <Badge label={SERVICE_STATUS_LABEL[r.status]} tone={r.status === 'open' ? 'gold' : r.status === 'cancelled' ? 'danger' : 'success'} />
          </View>
          <T variant="muted" numberOfLines={2}>{r.description}</T>
          <T variant="small">{r.status === 'open' ? `${r.quotes.length} عرض سعر · ` : ''}{timeAgo(r.createdAt)}</T>
        </Card>
      )} />
    </Screen>
  );
}
