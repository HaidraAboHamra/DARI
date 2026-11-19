import { type Category, SERVICE_URGENCIES, type ServiceRequest, type ServiceUrgency } from '@dari/contracts';
import { URGENCY_LABEL } from '@dari/contracts/i18n';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, ErrorText, Input, Screen, T } from '@/components/ui';
import { useRequireLogin } from '@/hooks/use-require-login';
import { api, errorMessage } from '@/lib/api';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';

/** Provider OS entry: describe the problem → nearby providers send quotes. */
export default function NewServiceRequest() {
  useRequireLogin();
  const params = useLocalSearchParams<{ category?: string; target?: string; name?: string }>();
  const services = useApi<Category[]>('/categories', { vertical: 'services' });
  const [categoryId, setCategoryId] = useState(params.category);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [urgency, setUrgency] = useState<ServiceUrgency>('today');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!categoryId) return setError('اختر نوع الخدمة');
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<ServiceRequest>('/service-requests', {
        citySlug: config.city,
        categoryId,
        ...(params.target && { targetBusinessId: params.target }),
        description: description.trim(),
        address: address.trim(),
        // "Scheduled" needs a picker; mobile offers now/today and lets the provider agree the time.
        urgency,
      });
      router.replace(`/services/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: params.name ? `طلب من ${params.name}` : 'طلب خدمة' }} />
      {params.name ? <Card><T>سيُرسل طلبك مباشرة إلى <T variant="label">{params.name}</T>.</T></Card> : <T variant="muted">صف المشكلة، ويصلك أكثر من عرض سعر من مقدمي الخدمة في سلمية.</T>}
      <T variant="label">نوع الخدمة</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {services.data?.map((c) => <Chip key={c.id} label={c.nameAr} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />)}
      </ScrollView>
      <Input label="شو المشكلة؟" value={description} onChangeText={setDescription} multiline maxLength={2000} placeholder="مثلاً: تسريب مي تحت المجلى" />
      <Input label="العنوان" value={address} onChangeText={setAddress} placeholder="الحي، الشارع" />
      <T variant="label">متى؟</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SERVICE_URGENCIES.filter((u) => u !== 'scheduled').map((u) => <Chip key={u} label={URGENCY_LABEL[u]} active={urgency === u} onPress={() => setUrgency(u)} />)}
      </View>
      <ErrorText message={error} />
      <Button title="إرسال الطلب" loading={busy} disabled={description.trim().length < 5 || address.trim().length < 3} onPress={() => void submit()} />
    </Screen>
  );
}
