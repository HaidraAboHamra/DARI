import type { Job } from '@dari/contracts';
import { EMPLOYMENT_LABEL, money, timeAgo } from '@dari/contracts/i18n';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { Badge, Button, Card, ErrorText, Input, Loading, Screen, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const job = useApi<Job>(`/jobs/${id}`);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!job.data) return <Loading />;
  const j = job.data;

  const apply = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    setError(null);
    try {
      await api.post(`/jobs/${j.id}/applications`, message.trim() ? { message: message.trim() } : {});
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'وظيفة' }} />
      <Badge label={EMPLOYMENT_LABEL[j.employmentType]} tone="gold" />
      <T variant="display">{j.title}</T>
      <T variant="muted">{[j.businessName, j.areaName, timeAgo(j.publishedAt)].filter(Boolean).join(' · ')}</T>
      {j.salaryMin ? <T variant="title" style={{ color: colors.goldDeep }}>{money(j.salaryMin)}{j.salaryMax ? ` – ${money(j.salaryMax)}` : ''}</T> : null}
      <T>{j.description}</T>
      {j.contactPhone && <Button title={`اتصل ${j.contactPhone}`} variant="secondary" onPress={() => void Linking.openURL(`tel:${j.contactPhone}`)} />}
      <Card style={{ gap: 12 }}>
        <T variant="title">قدّم على الوظيفة</T>
        {sent ? <T style={{ color: colors.success }}>تم إرسال طلبك مع رقم هاتفك لصاحب العمل.</T> : (
          <>
            <Input label="نبذة عنك (اختياري)" value={message} onChangeText={setMessage} multiline maxLength={2000} />
            <ErrorText message={error} />
            <Button title="إرسال الطلب" loading={busy} onPress={() => void apply()} />
          </>
        )}
      </Card>
    </Screen>
  );
}
