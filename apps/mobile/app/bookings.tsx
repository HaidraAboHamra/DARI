import { type Booking, nextBookingStatuses } from '@dari/contracts';
import { BOOKING_ACTION_LABEL, BOOKING_STATUS_LABEL, bookingWhen, money } from '@dari/contracts/i18n';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { PagedItems } from '@/components/paged';
import { Badge, Button, Card, Screen, styles, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { api } from '@/lib/api';
import { usePaged } from '@/lib/query';

const TONE = { pending: 'gold', confirmed: 'success', completed: 'navy', cancelled: 'danger', rejected: 'danger', no_show: 'danger' } as const;

export default function Bookings() {
  const loggedIn = useRequireLogin();
  const list = usePaged<Booking>(loggedIn ? '/bookings' : null, {}, 30);
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: 'حجوزاتي' }} />
      <PagedItems list={list} empty="لا حجوزات بعد" render={(b) => (
        <Card key={b.id} style={{ gap: 6 }}>
          <View style={styles.row}>
            <T variant="label" style={{ flex: 1 }}>{b.businessName}</T>
            <Badge label={BOOKING_STATUS_LABEL[b.status]} tone={TONE[b.status as keyof typeof TONE] ?? 'neutral'} />
          </View>
          <T variant="muted">{b.resourceName} · {bookingWhen(b)}</T>
          {b.total > 0 && <T variant="small">{money(b.total)} · {b.number}</T>}
          {nextBookingStatuses(b.status, 'customer', new Date(b.startsAt)).map((s) => (
            <Button key={s} small variant="danger" title={BOOKING_ACTION_LABEL[s]} onPress={() => void api.request(`/bookings/${b.id}/status`, { method: 'PATCH', body: { status: s } }).then(() => list.refetch())} />
          ))}
        </Card>
      )} />
    </Screen>
  );
}
