import type { BookableResource, Booking, Slot } from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors, fonts } from '@/theme';
import { Button, Card, Chip, ErrorText, Input, T } from './ui';

const TZ = 'Asia/Damascus';
const dayLabel = new Intl.DateTimeFormat('ar-SY', { weekday: 'short', day: 'numeric', timeZone: TZ });
const timeLabel = new Intl.DateTimeFormat('ar-SY', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
const localDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

/** Slots for appointments/courts, date range for rooms/farms — same engine as the web. */
export function BookingWidget({ resources }: { resources: BookableResource[] }) {
  const { user } = useAuth();
  const [resourceId, setResourceId] = useState(resources[0]!.id);
  const resource = resources.find((r) => r.id === resourceId)!;
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => new Date(Date.now() + i * 86_400_000)), []);
  const [date, setDate] = useState(localDate(days[0]!));
  const [picked, setPicked] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(localDate(days[1]!));
  const [checkOut, setCheckOut] = useState(localDate(days[2]!));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slots = useApi<{ slots: Slot[] }>(resource.unit === 'slot' ? `/resources/${resource.id}/slots` : null, { date });
  const nights = useApi<{ nights: number; available: number; total: number }>(resource.unit === 'night' ? `/resources/${resource.id}/nights` : null, { checkIn, checkOut }, { retry: false });

  const book = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    setError(null);
    try {
      await api.post<Booking>('/bookings', resource.unit === 'slot' ? { resourceId, startsAt: picked } : { resourceId, checkIn, checkOut });
      router.push('/bookings');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      {resources.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {resources.map((r) => <Chip key={r.id} label={`${r.name} · ${money(r.price)}`} active={r.id === resourceId} onPress={() => { setResourceId(r.id); setPicked(null); }} />)}
        </ScrollView>
      )}
      {resource.unit === 'slot' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((d, i) => {
              const value = localDate(d);
              return <Chip key={value} label={i === 0 ? 'اليوم' : i === 1 ? 'بكرا' : dayLabel.format(d)} active={date === value} onPress={() => { setDate(value); setPicked(null); }} />;
            })}
          </ScrollView>
          {slots.isLoading ? (
            <T variant="muted">جارٍ تحميل المواعيد…</T>
          ) : !slots.data?.slots.length ? (
            <T variant="muted">لا مواعيد متاحة في هذا اليوم.</T>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {slots.data.slots.map((s) => {
                const active = picked === s.startsAt;
                return (
                  <Pressable
                    key={s.startsAt}
                    disabled={s.available < 1}
                    onPress={() => setPicked(s.startsAt)}
                    style={{ width: '31%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: active ? colors.gold : colors.sand, backgroundColor: active ? colors.gold : colors.white, opacity: s.available < 1 ? 0.35 : 1 }}
                  >
                    <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{timeLabel.format(new Date(s.startsAt))}</T>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Input label="الوصول" value={checkIn} onChangeText={setCheckIn} placeholder="YYYY-MM-DD" /></View>
            <View style={{ flex: 1 }}><Input label="المغادرة" value={checkOut} onChangeText={setCheckOut} placeholder="YYYY-MM-DD" /></View>
          </View>
          {nights.data && (
            <T>{nights.data.available > 0 ? `متاح · ${nights.data.nights} ليلة · ${money(nights.data.total)}` : 'غير متاح في هذه التواريخ'}</T>
          )}
        </View>
      )}
      <ErrorText message={error} />
      <Button
        title={resource.autoConfirm ? 'احجز الآن' : 'أرسل طلب الحجز'}
        loading={busy}
        disabled={resource.unit === 'slot' ? !picked : !nights.data?.available}
        onPress={() => void book()}
      />
    </Card>
  );
}
