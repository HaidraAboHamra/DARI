import type { DeliveryStatus, DeliveryTask, Page } from '@dari/contracts';
import { DELIVERY_STATUS_LABEL, DELIVERY_TYPE_LABEL, money, number, percent, timeAgo } from '@dari/contracts/i18n';
import { Stack } from 'expo-router';
import { Alert, Linking, View } from 'react-native';
import { Button, Card, Empty, Screen, Section, styles, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { api, errorMessage } from '@/lib/api';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

const NEXT: Partial<Record<DeliveryStatus, { status: 'picked_up' | 'delivered'; label: string }>> = {
  assigned: { status: 'picked_up', label: 'تم الاستلام من المصدر' },
  picked_up: { status: 'delivered', label: 'تم التسليم' },
};
interface Stats { delivered: number; earnings: number; averageMinutes: number | null; successRate: number | null }

/** Courier OS: live city board, atomic claim, status updates, weekly earnings. */
export default function Courier() {
  const loggedIn = useRequireLogin();
  const live = { refetchInterval: 15_000 };
  const board = useApi<Page<DeliveryTask>>(loggedIn ? '/deliveries/board' : null, { city: config.city, limit: 30 }, live);
  const mine = useApi<Page<DeliveryTask>>(loggedIn ? '/deliveries/assigned' : null, { limit: 30 }, live);
  const stats = useApi<Stats>(loggedIn ? '/deliveries/stats' : null, { days: 7 });
  const refresh = () => Promise.all([board.refetch(), mine.refetch(), stats.refetch()]);
  const run = (p: Promise<unknown>) => p.then(refresh).catch((err) => Alert.alert('تعذّر', errorMessage(err)));
  const active = mine.data?.items.filter((t) => t.status === 'assigned' || t.status === 'picked_up') ?? [];

  return (
    <Screen refreshing={board.isRefetching} onRefresh={() => void refresh()}>
      <Stack.Screen options={{ title: 'لوحة المندوب' }} />
      {stats.data && (
        <View style={[styles.night, { flexDirection: 'row', justifyContent: 'space-around', padding: 16, borderRadius: 20 }]}>
          <Stat label="أرباح ٧ أيام" value={money(stats.data.earnings)} />
          <Stat label="تسليمات" value={number(stats.data.delivered)} />
          <Stat label="نجاح" value={stats.data.successRate === null ? '—' : percent(stats.data.successRate)} />
        </View>
      )}
      <Section title={`مهامي الجارية (${active.length})`}>
        {!active.length ? <T variant="muted">لا مهام جارية — استلم مهمة من اللوحة.</T> : active.map((t) => {
          const next = NEXT[t.status];
          return (
            <TaskCard key={t.id} task={t}>
              <View style={styles.row}>
                {next && <Button small title={next.label} onPress={() => void run(api.request(`/deliveries/${t.id}/status`, { method: 'PATCH', body: { status: next.status } }))} style={{ flex: 1 }} />}
                {t.dropoff.contactPhone && <Button small variant="secondary" title="اتصال" onPress={() => void Linking.openURL(`tel:${t.dropoff.contactPhone}`)} />}
              </View>
            </TaskCard>
          );
        })}
      </Section>
      <Section title={`مهام متاحة (${board.data?.items.length ?? 0})`}>
        {!board.data?.items.length ? <Empty title="اللوحة فارغة الآن" /> : board.data.items.map((t) => (
          <TaskCard key={t.id} task={t}>
            <Button small title={`استلام المهمة · ${money(t.fee)}`} onPress={() => void run(api.post(`/deliveries/${t.id}/claim`, {}))} />
          </TaskCard>
        ))}
      </Section>
    </Screen>
  );
}

function TaskCard({ task, children }: { task: DeliveryTask; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 6 }}>
      <View style={styles.row}>
        <T variant="label" style={{ flex: 1 }}>{DELIVERY_TYPE_LABEL[task.type]}</T>
        <T style={{ color: colors.goldDeep }}>{money(task.fee)}</T>
      </View>
      <T>📦 {task.pickup.text}</T>
      <T>📍 {task.dropoff.text}</T>
      {task.itemDescription && <T variant="muted">{task.itemDescription}</T>}
      <T variant="small">{timeAgo(task.createdAt)} · {DELIVERY_STATUS_LABEL[task.status]}</T>
      {children}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <T variant="title" style={{ color: colors.champagne }}>{value}</T>
      <T variant="small" style={{ color: '#F6F0E0B3' }}>{label}</T>
    </View>
  );
}
