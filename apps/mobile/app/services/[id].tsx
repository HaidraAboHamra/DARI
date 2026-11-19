import type { ServiceRequest } from '@dari/contracts';
import { money, SERVICE_STATUS_LABEL, timeAgo, URGENCY_LABEL } from '@dari/contracts/i18n';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, View } from 'react-native';
import { Badge, Button, Card, Loading, Screen, Stars, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/query';
import { colors, fonts } from '@/theme';

const STEPS = ['open', 'assigned', 'on_the_way', 'arrived', 'completed'] as const;

export default function ServiceRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const req = useApi<ServiceRequest>(`/service-requests/${id}`, undefined, { refetchInterval: 15_000 });
  if (!req.data) return <Loading />;
  const r = req.data;
  const reached = STEPS.indexOf(r.status as (typeof STEPS)[number]);
  const quotes = r.quotes.filter((q) => q.status === 'pending').sort((a, b) => a.priceMin - b.priceMin);

  const act = (path: string, body: object, method: 'POST' | 'PATCH' = 'POST') =>
    api.request(path, { method, body }).then(() => req.refetch()).catch((err) => Alert.alert('تعذّر', errorMessage(err)));

  return (
    <Screen refreshing={req.isRefetching} onRefresh={() => void req.refetch()}>
      <Stack.Screen options={{ title: r.number }} />
      <T variant="display">{r.categoryName}</T>
      <T variant="muted">{URGENCY_LABEL[r.urgency]} · {r.address} · {timeAgo(r.createdAt)}</T>
      <T>{r.description}</T>
      <Card style={{ gap: 10 }}>
        {r.status === 'cancelled' ? <T variant="title" style={{ color: colors.danger, textAlign: 'center' }}>{SERVICE_STATUS_LABEL.cancelled}</T> : STEPS.map((s, i) => (
          <View key={s} style={styles.row}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i <= reached ? colors.gold : colors.sand, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontSize: 12, fontFamily: fonts.bold }}>{i < reached ? '✓' : i + 1}</T>
            </View>
            <T style={{ fontFamily: i === reached ? fonts.bold : fonts.regular, color: i <= reached ? colors.navy : colors.muted }}>{SERVICE_STATUS_LABEL[s]}</T>
          </View>
        ))}
      </Card>
      {r.provider && (
        <Card style={{ gap: 8 }}>
          <T variant="label">مقدم الخدمة: {r.provider.name}</T>
          {r.finalPrice !== null && <T>السعر النهائي: {money(r.finalPrice)}</T>}
          <View style={styles.row}>
            {r.provider.phone && <Button small title="اتصال" onPress={() => void Linking.openURL(`tel:${r.provider!.phone}`)} />}
            <Button small variant="secondary" title={r.status === 'completed' ? 'قيّم الخدمة' : 'الصفحة'} onPress={() => router.push(`/b/${encodeURIComponent(r.provider!.slug)}`)} />
          </View>
        </Card>
      )}
      {r.status === 'open' && (
        <>
          <T variant="title">عروض الأسعار ({quotes.length})</T>
          {!quotes.length && <T variant="muted">بانتظار عروض مقدمي الخدمة… ستصلك إشعارات.</T>}
          {quotes.map((q) => (
            <Card key={q.id} style={{ gap: 6 }}>
              <View style={styles.row}>
                <T variant="label" style={{ flex: 1 }}>{q.businessName}</T>
                <Stars value={q.ratingAvg} />
              </View>
              <T style={{ color: colors.goldDeep, fontFamily: fonts.bold }}>{q.priceMin === q.priceMax ? money(q.priceMin) : `${money(q.priceMin)} – ${money(q.priceMax)}`}</T>
              <T variant="muted">يصل خلال {q.etaMinutes} دقيقة{q.message ? ` · ${q.message}` : ''}</T>
              <Button small title="قبول العرض" onPress={() => void act(`/service-requests/${r.id}/quotes/${q.id}/accept`, {})} />
            </Card>
          ))}
        </>
      )}
      {(r.status === 'open' || r.status === 'assigned') && (
        <Button variant="danger" title="إلغاء الطلب" onPress={() => Alert.alert('إلغاء الطلب', 'هل أنت متأكد؟', [
          { text: 'لا', style: 'cancel' },
          { text: 'نعم', style: 'destructive', onPress: () => void act(`/service-requests/${r.id}/status`, { status: 'cancelled' }, 'PATCH') },
        ])} />
      )}
      {quotes.length === 0 && r.status === 'open' && <Badge label="سيُعاد التحديث تلقائياً" />}
    </Screen>
  );
}
