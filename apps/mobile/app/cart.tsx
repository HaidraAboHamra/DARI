import type { FulfillmentType, Order } from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Chip, Empty, ErrorText, Input, Screen, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { colors, fonts } from '@/theme';

function newKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function CartScreen() {
  const { user } = useAuth();
  const { cart, subtotal, setQuantity, clear } = useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per checkout attempt: retries on flaky mobile networks never duplicate the order.
  const idempotencyKey = useMemo(newKey, [cart?.businessId]);

  if (!cart) return <Screen><Empty title="سلتك فارغة"><Button title="تصفّح المطاعم" onPress={() => router.replace('/explore/food')} /></Empty></Screen>;

  const applyCoupon = async () => {
    setError(null);
    try {
      const res = await api.post<{ discount: number }>('/coupons/preview', { businessId: cart.businessId, code, subtotal });
      setCoupon({ code: code.toUpperCase(), discount: res.discount });
    } catch (err) {
      setCoupon(null);
      setError(errorMessage(err));
    }
  };

  const submit = async () => {
    if (!user) return router.push('/login');
    if (fulfillment === 'delivery' && address.trim().length < 3) return setError('أدخل عنوان التوصيل');
    setBusy(true);
    setError(null);
    try {
      const order = await api.post<Order>(
        '/orders',
        {
          businessId: cart.businessId,
          fulfillment,
          items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          ...(fulfillment === 'delivery' && { address: { text: address.trim() } }),
          ...(notes.trim() && { notes: notes.trim() }),
          ...(coupon && { couponCode: coupon.code }),
        },
        { 'idempotency-key': idempotencyKey },
      );
      clear();
      router.replace(`/orders/${order.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card style={{ padding: 0 }}>
        <View style={[styles.row, { padding: 14 }]}>
          <T variant="title" style={{ flex: 1 }}>{cart.businessName}</T>
          <Pressable onPress={clear}><T style={{ color: colors.danger }}>إفراغ</T></Pressable>
        </View>
        {cart.lines.map((l) => (
          <View key={l.productId} style={[styles.row, { padding: 14, borderTopWidth: 1, borderTopColor: colors.sand }]}>
            <View style={{ flex: 1 }}>
              <T variant="label">{l.name}</T>
              <T variant="muted">{money(l.price)}</T>
            </View>
            <Pressable onPress={() => setQuantity(l.productId, l.quantity - 1)} style={qtyStyle(false)} accessibilityLabel="إنقاص"><T>−</T></Pressable>
            <T style={{ width: 24, textAlign: 'center', fontFamily: fonts.bold }}>{l.quantity}</T>
            <Pressable onPress={() => setQuantity(l.productId, l.quantity + 1)} style={qtyStyle(true)} accessibilityLabel="زيادة"><T>+</T></Pressable>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="توصيل" active={fulfillment === 'delivery'} onPress={() => setFulfillment('delivery')} />
        <Chip label="استلام من المحل" active={fulfillment === 'pickup'} onPress={() => setFulfillment('pickup')} />
      </View>
      {fulfillment === 'delivery' && <Input label="عنوان التوصيل" value={address} onChangeText={setAddress} placeholder="الحي، الشارع، أقرب معلم" />}
      <Input label="ملاحظات للمحل" value={notes} onChangeText={setNotes} multiline maxLength={500} />
      <View style={[styles.row, { alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}><Input label="كود خصم" value={code} onChangeText={setCode} autoCapitalize="characters" /></View>
        <Button small title="تطبيق" variant="secondary" disabled={!code} onPress={() => void applyCoupon()} style={{ height: 48 }} />
      </View>
      <Card style={{ gap: 6 }}>
        <View style={styles.row}><T variant="muted" style={{ flex: 1 }}>المجموع</T><T variant="label">{money(subtotal)}</T></View>
        {coupon && <View style={styles.row}><T style={{ flex: 1, color: colors.success }}>الخصم ({coupon.code})</T><T style={{ color: colors.success }}>− {money(coupon.discount)}</T></View>}
        {fulfillment === 'delivery' && <T variant="small">رسوم التوصيل تُحسب عند التأكيد</T>}
      </Card>
      <ErrorText message={error} />
      <Button title="تأكيد الطلب — الدفع عند الاستلام" loading={busy} onPress={() => void submit()} />
    </Screen>
  );
}

function qtyStyle(primary: boolean) {
  return { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: primary ? colors.gold : colors.white, borderWidth: primary ? 0 : 1, borderColor: colors.sand };
}
