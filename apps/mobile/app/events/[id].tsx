import type { CityEvent, Ticket } from '@dari/contracts';
import { eventWhen, money } from '@dari/contracts/i18n';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Badge, Button, Card, ErrorText, Loading, Screen, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors, fonts } from '@/theme';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const event = useApi<CityEvent>(`/events/${id}`);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!event.data) return <Loading />;
  const e = event.data;
  const max = Math.min(e.seatsLeft, 20);

  const buy = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    setError(null);
    try {
      await api.post<Ticket>(`/events/${e.id}/tickets`, { quantity: qty });
      router.replace('/tickets');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={event.isRefetching} onRefresh={() => void event.refetch()}>
      <Stack.Screen options={{ title: e.kind === 'trip' ? 'رحلة' : 'فعالية' }} />
      {e.coverUrl && <Image source={{ uri: e.coverUrl }} style={{ height: 180, borderRadius: 20 }} />}
      <T variant="small" style={{ color: colors.goldDeep }}>{eventWhen(e.startsAt)}</T>
      <T variant="display">{e.title}</T>
      <T variant="muted">📍 {e.destination ? `${e.destination} · الانطلاق من ${e.venue}` : e.venue}{e.organizerName ? ` · ${e.organizerName}` : ''}</T>
      <T>{e.description}</T>
      <Card style={{ gap: 12 }}>
        <View style={styles.row}>
          <T variant="title" style={{ flex: 1 }}>{e.price ? money(e.price) : 'مجاني'}</T>
          <Badge label={e.seatsLeft ? `${e.seatsLeft} مقعد متبقٍ` : 'نفدت المقاعد'} tone={e.seatsLeft ? 'success' : 'danger'} />
        </View>
        {e.seatsLeft > 0 && (
          <>
            <View style={[styles.row, { justifyContent: 'center', gap: 16 }]}>
              <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={stepper} accessibilityLabel="إنقاص"><T>−</T></Pressable>
              <T style={{ fontFamily: fonts.bold, fontSize: 18 }}>{qty}</T>
              <Pressable onPress={() => setQty((q) => Math.min(max, q + 1))} style={stepper} accessibilityLabel="زيادة"><T>+</T></Pressable>
            </View>
            <ErrorText message={error} />
            <Button title={e.price ? `احجز ${qty} — ${money(e.price * qty)}` : `احجز ${qty} مجاناً`} loading={busy} onPress={() => void buy()} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const stepper = { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.sand, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.white };
