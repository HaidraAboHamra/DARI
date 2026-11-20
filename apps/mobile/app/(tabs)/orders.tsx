import type { Order, Page } from '@dari/contracts';
import { money, ORDER_STATUS_LABEL, timeAgo } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, Empty, Loading, Screen, styles, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

export default function Orders() {
  const { user } = useAuth();
  const orders = useApi<Page<Order>>(user ? '/orders' : null, { limit: 30 }, { refetchInterval: 20_000 });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Screen refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()}>
        <T variant="display">طلباتي</T>
        {!user ? (
          <Empty title="سجّل دخولك لمتابعة طلباتك"><Button title="دخول" onPress={() => router.push('/login')} /></Empty>
        ) : orders.isLoading ? (
          <Loading />
        ) : !orders.data?.items.length ? (
          <Empty title="لا توجد طلبات بعد"><Button title="تصفّح المطاعم" onPress={() => router.push('/category/food')} /></Empty>
        ) : (
          orders.data.items.map((o) => (
            <Card key={o.id} onPress={() => router.push(`/orders/${o.id}`)} style={[styles.row, { justifyContent: 'space-between' }] as never}>
              <View style={{ flex: 1 }}>
                <T variant="label">{o.businessName}</T>
                <T variant="muted">{o.number} · {timeAgo(o.createdAt)}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={ORDER_STATUS_LABEL[o.status]} tone={o.status === 'delivered' || o.status === 'picked_up' ? 'success' : o.status === 'cancelled' || o.status === 'rejected' ? 'danger' : 'gold'} />
                <T variant="label" style={{ fontSize: 14 }}>{money(o.total, o.currency)}</T>
              </View>
            </Card>
          ))
        )}
        {user && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="حجوزاتي" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/bookings')} />
            <Button title="تذاكري" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/tickets')} />
            <Button title="خدماتي" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/services')} />
          </View>
        )}
      </Screen>
    </SafeAreaView>
  );
}
