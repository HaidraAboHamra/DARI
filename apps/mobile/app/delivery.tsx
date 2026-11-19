import { DELIVERY_TASK_TYPES, type DeliveryTask, type DeliveryTaskType } from '@dari/contracts';
import { DELIVERY_STATUS_LABEL, DELIVERY_TYPE_LABEL, money, timeAgo } from '@dari/contracts/i18n';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Badge, Button, Card, Chip, ErrorText, Input, Screen, Section, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { usePaged } from '@/lib/query';

const TYPES = DELIVERY_TASK_TYPES.filter((t): t is Exclude<DeliveryTaskType, 'merchant_to_citizen'> => t !== 'merchant_to_citizen');

/** "Delivery for anything": a courier picks it up from the city board. */
export default function Delivery() {
  const { user } = useAuth();
  const mine = usePaged<DeliveryTask>(user ? '/deliveries' : null, {}, 10);
  const [type, setType] = useState<(typeof TYPES)[number]>('citizen_to_citizen');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [item, setItem] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    setError(null);
    try {
      await api.post('/deliveries', { citySlug: config.city, type, pickup: { text: pickup.trim() }, dropoff: { text: dropoff.trim() }, itemDescription: item.trim() });
      setPickup('');
      setDropoff('');
      setItem('');
      await mine.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()}>
      <Stack.Screen options={{ title: 'توصيل أي شي' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TYPES.map((t) => <Chip key={t} label={DELIVERY_TYPE_LABEL[t]} active={type === t} onPress={() => setType(t)} />)}
      </ScrollView>
      <Input label="من وين؟" value={pickup} onChangeText={setPickup} placeholder="عنوان الاستلام" />
      <Input label="لوين؟" value={dropoff} onChangeText={setDropoff} placeholder="عنوان التسليم" />
      <Input label="شو بدك نوصّل؟" value={item} onChangeText={setItem} placeholder="مثلاً: مفتاح البيت، أوراق، غرض من السوق" />
      <ErrorText message={error} />
      <Button title="اطلب مندوب" loading={busy} disabled={pickup.trim().length < 3 || dropoff.trim().length < 3 || item.trim().length < 2} onPress={() => void submit()} />
      {user && !!mine.items.length && (
        <Section title="طلبات التوصيل">
          {mine.items.map((t) => (
            <Card key={t.id} style={{ gap: 4 }}>
              <View style={styles.row}>
                <T variant="label" style={{ flex: 1 }}>{t.itemDescription ?? DELIVERY_TYPE_LABEL[t.type]}</T>
                <Badge label={DELIVERY_STATUS_LABEL[t.status]} tone={t.status === 'delivered' ? 'success' : t.status === 'requested' ? 'gold' : 'neutral'} />
              </View>
              <T variant="muted">{t.pickup.text} ← {t.dropoff.text}</T>
              <T variant="small">{money(t.fee)} · {timeAgo(t.createdAt)}</T>
            </Card>
          ))}
        </Section>
      )}
    </Screen>
  );
}
