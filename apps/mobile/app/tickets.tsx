import type { Ticket } from '@dari/contracts';
import { eventWhen, money } from '@dari/contracts/i18n';
import { Stack } from 'expo-router';
import { Alert, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Badge, Button, Card, Empty, Loading, Screen, styles, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { api } from '@/lib/api';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

const STATUS = { active: ['صالحة', 'success'], checked_in: ['تم الدخول', 'navy'], cancelled: ['ملغاة', 'danger'] } as const;

/** Tickets with QR codes the organizer scans at the door (works offline once loaded). */
export default function Tickets() {
  const loggedIn = useRequireLogin();
  const tickets = useApi<Ticket[]>(loggedIn ? '/me/tickets' : null);
  return (
    <Screen refreshing={tickets.isRefetching} onRefresh={() => void tickets.refetch()}>
      <Stack.Screen options={{ title: 'تذاكري' }} />
      {tickets.isLoading ? <Loading /> : !tickets.data?.length ? <Empty title="لا تذاكر بعد" /> : tickets.data.map((t) => (
        <Card key={t.id} style={{ gap: 10, alignItems: 'center' }}>
          <View style={[styles.row, { alignSelf: 'stretch' }]}>
            <T variant="label" style={{ flex: 1 }}>{t.eventTitle}</T>
            <Badge label={STATUS[t.status][0]} tone={STATUS[t.status][1]} />
          </View>
          <T variant="muted" style={{ alignSelf: 'stretch' }}>{eventWhen(t.startsAt)} · {t.venue}</T>
          {t.status === 'active' && (
            <View style={{ padding: 12, backgroundColor: colors.white, borderRadius: 16 }}>
              <QRCode value={t.code} size={180} color={colors.navy} />
            </View>
          )}
          <T style={{ letterSpacing: 2, fontFamily: 'monospace' }}>{t.code}</T>
          <T variant="small">{t.quantity} × · {t.total ? money(t.total) : 'مجاني'}</T>
          {t.status === 'active' && (
            <Button small variant="ghost" title="إلغاء التذكرة" onPress={() => Alert.alert('إلغاء التذكرة', 'سيُعاد المقعد للحجز.', [
              { text: 'لا', style: 'cancel' },
              { text: 'إلغاء', style: 'destructive', onPress: () => void api.post(`/me/tickets/${t.id}/cancel`, {}).then(() => tickets.refetch()) },
            ])} />
          )}
        </Card>
      ))}
    </Screen>
  );
}
