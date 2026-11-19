import type { PropertyListing } from '@dari/contracts';
import { money, PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from '@dari/contracts/i18n';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { Badge, Button, Card, ErrorText, Input, Loading, Screen, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const listing = useApi<PropertyListing>(`/listings/${id}`);
  const [message, setMessage] = useState('');
  const [time, setTime] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!listing.data) return <Loading />;
  const l = listing.data;

  const request = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    setError(null);
    try {
      await api.post(`/listings/${l.id}/viewings`, { ...(message.trim() && { message: message.trim() }), ...(time.trim() && { preferredTime: time.trim() }) });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: PROPERTY_TYPE_LABEL[l.propertyType] }} />
      {l.images.length > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ borderRadius: 20 }}>
          {l.images.map((src) => <Image key={src} source={{ uri: src }} style={{ width: 340, height: 220, borderRadius: 20, marginEnd: 8 }} />)}
        </ScrollView>
      )}
      <View style={styles.row}>
        <Badge label={PURPOSE_LABEL[l.purpose]} tone="gold" />
        <Badge label={PROPERTY_TYPE_LABEL[l.propertyType]} />
        {l.isFeatured && <Badge label="مميز" tone="navy" />}
      </View>
      <T variant="display">{l.title}</T>
      <T variant="title" style={{ color: colors.goldDeep }}>{money(l.price)}{l.purpose === 'rent' ? ' / شهرياً' : ''}</T>
      <T variant="muted">{[l.areaName, l.rooms !== null && `${l.rooms} غرف`, l.sizeSqm && `${l.sizeSqm} م²`, l.officeName].filter(Boolean).join(' · ')}</T>
      <T>{l.description}</T>
      <Card style={{ gap: 12 }}>
        <T variant="title">اطلب معاينة</T>
        {sent ? <T style={{ color: colors.success }}>تم إرسال طلبك — سيتواصل معك المعلن قريباً.</T> : (
          <>
            <Input label="الوقت المناسب لك" value={time} onChangeText={setTime} placeholder="مثلاً: بعد الخامسة" />
            <Input label="رسالة" value={message} onChangeText={setMessage} multiline maxLength={1000} />
            <ErrorText message={error} />
            <Button title="إرسال طلب المعاينة" loading={busy} onPress={() => void request()} />
          </>
        )}
      </Card>
    </Screen>
  );
}
