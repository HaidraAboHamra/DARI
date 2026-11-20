import { nextOrderStatuses, type Order, type Page, type SmartInsight } from '@dari/contracts';
import { itemSummary, money, ORDER_ACTION_LABEL, ORDER_STATUS_LABEL, timeAgo } from '@dari/contracts/i18n';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Badge, Button, Card, Chip, Empty, Loading, Screen, Section, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

const ACTIVE = new Set(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery']);
const SEVERITY = { critical: 'danger', warning: 'gold', info: 'neutral' } as const;

/** Merchant OS on the phone: live orders with one-tap status actions + smart alerts. */
export default function MerchantHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<'live' | 'all'>('live');
  const biz = useApi<{ name: string }>(`/merchant/businesses/${id}`);
  const orders = useApi<Page<Order>>(`/merchant/businesses/${id}/orders`, { limit: 50 }, { refetchInterval: 10_000 });
  const insights = useApi<SmartInsight[]>(`/merchant/businesses/${id}/smart-insights`);
  const list = (orders.data?.items ?? []).filter((o) => tab === 'all' || ACTIVE.has(o.status));
  const pending = orders.data?.items.filter((o) => o.status === 'pending').length ?? 0;

  const move = (o: Order, status: Order['status']) =>
    api.request(`/orders/${o.id}/status`, { method: 'PATCH', body: { status } }).then(() => orders.refetch()).catch((err) => Alert.alert('تعذّر', errorMessage(err)));

  return (
    <Screen refreshing={orders.isRefetching} onRefresh={() => void Promise.all([orders.refetch(), insights.refetch()])}>
      <Stack.Screen options={{ title: biz.data?.name ?? 'لوحة التاجر' }} />
      {!!insights.data?.length && (
        <Section title="تنبيهات ذكية">
          {insights.data.map((i) => (
            <Card key={i.kind} style={{ gap: 4 }}>
              <View style={styles.row}><Badge label={i.severity === 'critical' ? 'عاجل' : i.severity === 'warning' ? 'انتباه' : 'معلومة'} tone={SEVERITY[i.severity]} /><T variant="label" style={{ flex: 1 }}>{i.title}</T></View>
              <T variant="muted">{i.detail}</T>
            </Card>
          ))}
        </Section>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label={`الجارية${pending ? ` · ${pending} جديد` : ''}`} active={tab === 'live'} onPress={() => setTab('live')} />
        <Chip label="كل الطلبات" active={tab === 'all'} onPress={() => setTab('all')} />
      </View>
      {orders.isLoading ? <Loading /> : !list.length ? <Empty title="لا طلبات جارية" hint="الطلبات الجديدة تظهر هنا تلقائياً" /> : list.map((o) => (
        <Card key={o.id} style={{ gap: 6, borderColor: o.status === 'pending' ? colors.gold : colors.sand, borderWidth: o.status === 'pending' ? 2 : 1 }}>
          <View style={styles.row}>
            <T variant="label" style={{ flex: 1 }}>{o.number} · {o.customerName ?? 'زبون'}</T>
            <Badge label={ORDER_STATUS_LABEL[o.status]} tone={o.status === 'pending' ? 'gold' : 'neutral'} />
          </View>
          {o.items.map((i, index) => (
            <T key={index} style={{ fontSize: 14 }}>
              {itemSummary(i)}
              {i.note ? <T style={{ color: colors.goldDeep, fontSize: 14 }}> — «{i.note}»</T> : null}
            </T>
          ))}
          <T variant="small">{o.fulfillment === 'delivery' ? `توصيل${o.address ? ` · ${o.address.text}` : ''}` : 'استلام'} · {money(o.total, o.currency)} · {timeAgo(o.createdAt)}</T>
          {o.notes && <T variant="small" style={{ color: colors.goldDeep }}>ملاحظة: {o.notes}</T>}
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {nextOrderStatuses(o.status, 'merchant', o.fulfillment).map((s) => (
              <Button key={s} small title={ORDER_ACTION_LABEL[s] ?? ORDER_STATUS_LABEL[s]} variant={s === 'rejected' || s === 'cancelled' ? 'danger' : 'primary'} onPress={() => void move(o, s)} />
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
