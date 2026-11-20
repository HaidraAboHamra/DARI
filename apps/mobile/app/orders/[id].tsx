import { type BusinessDetail, type CartLine, choicesFromSnapshot, makeLine, nextOrderStatuses, type Order, type OrderStatus, type Product } from '@dari/contracts';
import { itemSummary, money, ORDER_STATUS_LABEL, timeAgo } from '@dari/contracts/i18n';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { Button, Card, Loading, Screen, styles, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useApi } from '@/lib/query';
import { colors, fonts } from '@/theme';

const FLOW: Record<'delivery' | 'pickup', OrderStatus[]> = {
  delivery: ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
  pickup: ['pending', 'accepted', 'preparing', 'ready', 'picked_up'],
};
const FINISHED = new Set<OrderStatus>(['delivered', 'picked_up', 'cancelled', 'rejected']);

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();
  // Live tracking: refresh every 10s until the order reaches a final state (push notifies too).
  const order = useApi<Order>(`/orders/${id}`, undefined, { refetchInterval: (q) => (q.state.data && FINISHED.has(q.state.data.status) ? false : 10_000) });
  const menu = useApi<Product[]>(order.data && FINISHED.has(order.data.status) ? `/businesses/${order.data.businessId}/products` : null);
  const business = useApi<BusinessDetail>(order.data ? `/businesses/by-slug/${encodeURIComponent(order.data.businessSlug)}` : null);
  if (!order.data) return <Loading />;
  const o = order.data;
  const steps = FLOW[o.fulfillment];
  const reached = steps.indexOf(o.status);
  const canCancel = nextOrderStatuses(o.status, 'customer', o.fulfillment).includes('cancelled');

  const reorder = () => {
    const available = new Map((menu.data ?? []).filter((p) => p.isAvailable).map((p) => [p.id, p]));
    // Same items and choices at today's prices; lines whose choices no longer exist are skipped.
    const lines: CartLine[] = o.items.flatMap((i) => {
      const product = available.get(i.productId);
      const choices = product && choicesFromSnapshot(product, i.options);
      if (!product || !choices) return [];
      try {
        return [makeLine(product, choices, i.note ?? undefined, i.quantity)];
      } catch {
        return [];
      }
    });
    cart.replace({ businessId: o.businessId, businessName: o.businessName, businessSlug: o.businessSlug, lines });
    router.push('/cart');
  };

  return (
    <Screen refreshing={order.isRefetching} onRefresh={() => void order.refetch()}>
      <Stack.Screen options={{ title: o.number }} />
      <T variant="display">{o.businessName}</T>
      <T variant="muted">{timeAgo(o.createdAt)}</T>
      {!FINISHED.has(o.status) && business.data && (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.navy }}>
          <T style={{ color: colors.champagne, flex: 1 }}>{o.fulfillment === 'delivery' ? 'الوصول المتوقع' : 'جاهز للاستلام تقريباً'}</T>
          <T variant="title" style={{ color: colors.ivory }}>{eta(o, business.data.prepMinutes)}</T>
        </Card>
      )}
      <Card style={{ gap: 12 }}>
        {o.status === 'cancelled' || o.status === 'rejected' ? (
          <T variant="title" style={{ color: colors.danger, textAlign: 'center' }}>{ORDER_STATUS_LABEL[o.status]}</T>
        ) : (
          steps.map((s, i) => (
            <View key={s} style={styles.row}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= reached ? colors.gold : colors.white, borderWidth: i <= reached ? 0 : 1, borderColor: colors.sand }}>
                <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{i < reached ? '✓' : i + 1}</T>
              </View>
              <T style={{ fontFamily: i === reached ? fonts.bold : fonts.regular, color: i <= reached ? colors.navy : colors.muted }}>{ORDER_STATUS_LABEL[s]}</T>
            </View>
          ))
        )}
      </Card>
      <Card style={{ gap: 8 }}>
        {o.items.map((i, index) => (
          <View key={index} style={[styles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <T>{itemSummary(i)}</T>
              {i.note && <T variant="small" style={{ color: colors.goldDeep }}>«{i.note}»</T>}
            </View>
            <T>{money(i.lineTotal, o.currency)}</T>
          </View>
        ))}
        {o.discount > 0 && <View style={styles.row}><T style={{ flex: 1, color: colors.success }}>الخصم</T><T style={{ color: colors.success }}>− {money(o.discount, o.currency)}</T></View>}
        <View style={styles.row}><T variant="muted" style={{ flex: 1 }}>التوصيل</T><T>{money(o.deliveryFee, o.currency)}</T></View>
        <View style={styles.row}><T variant="label" style={{ flex: 1 }}>الإجمالي</T><T variant="label">{money(o.total, o.currency)}</T></View>
      </Card>
      {o.address && <T variant="muted">📍 {o.address.text}</T>}
      {canCancel && (
        <Button
          title="إلغاء الطلب"
          variant="danger"
          onPress={() =>
            Alert.alert('إلغاء الطلب', 'هل أنت متأكد؟', [
              { text: 'لا', style: 'cancel' },
              { text: 'نعم، إلغاء', style: 'destructive', onPress: () => void api.request(`/orders/${o.id}/status`, { method: 'PATCH', body: { status: 'cancelled' } }).then(() => order.refetch()) },
            ])
          }
        />
      )}
      {FINISHED.has(o.status) && !!menu.data?.length && <Button title="اطلب مجدداً" variant="secondary" onPress={reorder} />}
    </Screen>
  );
}

/** Expected time: order time + preparation (+ local delivery). */
function eta(o: Order, prepMinutes: number): string {
  const minutes = prepMinutes + (o.fulfillment === 'delivery' ? 15 : 0);
  const at = new Date(new Date(o.createdAt).getTime() + minutes * 60_000);
  return new Intl.DateTimeFormat('ar-SY', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Damascus' }).format(at);
}
