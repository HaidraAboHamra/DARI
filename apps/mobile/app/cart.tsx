import {
  type BusinessDetail,
  cartItems,
  type FulfillmentType,
  makeLine,
  type Order,
  type Product,
} from '@dari/contracts';
import { etaRange, money } from '@dari/contracts/i18n';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Photo } from '@/components/food/photo';
import { Icon } from '@/components/icons';
import {
  Button,
  Card,
  Chip,
  Empty,
  ErrorText,
  IconButton,
  Input,
  Screen,
  styles,
  T,
} from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { loadCheckoutPrefs, saveCheckoutPrefs } from '@/lib/prefs';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useApi } from '@/lib/query';
import { colors, fonts, radius } from '@/theme';

function newKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function CartScreen() {
  const { user } = useAuth();
  const { cart, subtotal, setQuantity, clear, add } = useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per checkout attempt: retries on flaky mobile networks never duplicate the order.
  const idempotencyKey = useMemo(newKey, [cart?.businessId]);
  // Repeat orders need no typing: last address and delivery method are remembered (UX study P0-5).
  useEffect(() => {
    void loadCheckoutPrefs().then((p) => {
      if (p.address) setAddress((current) => current || p.address!);
      if (p.fulfillment) setFulfillment(p.fulfillment);
    });
  }, []);
  const business = useApi<BusinessDetail>(
    cart ? `/businesses/by-slug/${encodeURIComponent(cart.businessSlug)}` : null,
  );
  const menu = useApi<Product[]>(business.data ? `/businesses/${business.data.id}/products` : null);

  // «أضف إلى طلبك»: popular one-tap items not already in the basket.
  const suggestions = useMemo(() => {
    const inCart = new Set(cart?.lines.map((l) => l.productId));
    return (menu.data ?? [])
      .filter((p) => !inCart.has(p.id) && p.options.every((g) => g.min === 0) && p.stock !== 0)
      .sort((a, b) => Number(b.isPopular) - Number(a.isPopular))
      .slice(0, 8);
  }, [menu.data, cart?.lines]);

  if (!cart) {
    return (
      <Screen>
        <Empty title="سلتك فارغة" hint="أضف أطباقك المفضلة من مطاعم سلمية">
          <Button title="تصفّح المطاعم" onPress={() => router.replace('/food')} />
        </Empty>
      </Screen>
    );
  }

  const b = business.data;
  const deliveryFee = fulfillment === 'delivery' ? (b?.deliveryFee ?? 0) : 0;
  const discount = coupon?.discount ?? 0;
  const total = subtotal - discount + deliveryFee;
  const minOrder = b?.minOrder ?? 0;
  const short = Math.max(0, minOrder - subtotal);

  const applyCoupon = async () => {
    setError(null);
    try {
      const res = await api.post<{ discount: number }>('/coupons/preview', {
        businessId: cart.businessId,
        code,
        subtotal,
      });
      setCoupon({ code: code.toUpperCase(), discount: res.discount });
    } catch (err) {
      setCoupon(null);
      setError(errorMessage(err));
    }
  };

  const submit = async () => {
    if (!user) return router.push('/login');
    if (fulfillment === 'delivery' && address.trim().length < 3)
      return setError('أدخل عنوان التوصيل');
    setBusy(true);
    setError(null);
    try {
      const order = await api.post<Order>(
        '/orders',
        {
          businessId: cart.businessId,
          fulfillment,
          items: cartItems(cart),
          ...(fulfillment === 'delivery' && { address: { text: address.trim() } }),
          ...(notes.trim() && { notes: notes.trim() }),
          ...(coupon && { couponCode: coupon.code }),
        },
        { 'idempotency-key': idempotencyKey },
      );
      saveCheckoutPrefs({ address: address.trim(), fulfillment });
      haptic.success();
      clear();
      router.replace(`/orders/${order.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'سلتك' }} />
      <Screen>
        {/* Restaurant */}
        <Pressable
          onPress={() => router.push(`/b/${encodeURIComponent(cart.businessSlug)}`)}
          style={[styles.row, { gap: 12 }]}
        >
          <Photo
            uri={b?.logoUrl}
            style={{ width: 48, height: 48, borderRadius: 14 }}
            glyphSize={26}
          />
          <View style={{ flex: 1 }}>
            <T variant="title" numberOfLines={1}>
              {cart.businessName}
            </T>
            {b && (
              <T variant="small">
                التوصيل خلال {etaRange(b.prepMinutes)}
                {b.isOpen ? '' : ' · مغلق الآن'}
              </T>
            )}
          </View>
          <IconButton
            icon="trash"
            label="إفراغ السلة"
            tone="plain"
            color={colors.danger}
            onPress={() =>
              confirmAction(
                'إفراغ السلة؟',
                `سيتم حذف كل أصناف ${cart.businessName}.`,
                'إفراغ',
                clear,
              )
            }
          />
        </Pressable>

        {/* Lines */}
        <Card style={{ padding: 0 }}>
          {cart.lines.map((l, i) => (
            <View
              key={l.key}
              style={[
                styles.row,
                {
                  padding: 12,
                  gap: 12,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.sand,
                  alignItems: 'flex-start',
                },
              ]}
            >
              <Photo
                uri={l.imageUrl}
                style={{ width: 58, height: 58, borderRadius: 14 }}
                glyphSize={24}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="label">{l.name}</T>
                {!!l.optionsLabel && (
                  <T variant="small" style={{ color: colors.ink }}>
                    {l.optionsLabel}
                  </T>
                )}
                {l.note && (
                  <T variant="small" style={{ color: colors.goldDeep }}>
                    «{l.note}»
                  </T>
                )}
                <T style={{ fontFamily: fonts.bold, marginTop: 2 }}>
                  {money(l.price * l.quantity)}
                </T>
              </View>
              <View style={[styles.row, { gap: 6 }]}>
                <Pressable
                  onPress={() => setQuantity(l.key, l.quantity - 1)}
                  style={qty(false)}
                  accessibilityLabel={l.quantity === 1 ? `حذف ${l.name}` : 'إنقاص'}
                >
                  {l.quantity === 1 ? (
                    <Icon name="trash" size={18} color={colors.danger} />
                  ) : (
                    <T style={{ fontSize: 20 }}>−</T>
                  )}
                </Pressable>
                <T style={{ minWidth: 22, textAlign: 'center', fontFamily: fonts.bold }}>
                  {l.quantity}
                </T>
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    setQuantity(l.key, l.quantity + 1);
                  }}
                  style={qty(true)}
                  accessibilityLabel="زيادة"
                >
                  <T style={{ fontSize: 20 }}>+</T>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>

        {/* Minimum order progress */}
        {short > 0 && (
          <View style={{ gap: 6 }}>
            <T style={{ fontFamily: fonts.medium }}>
              أضف {money(short)} للوصول إلى الحد الأدنى ({money(minOrder)})
            </T>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.sand,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.min(100, (subtotal / minOrder) * 100)}%`,
                  height: 8,
                  backgroundColor: colors.gold,
                }}
              />
            </View>
          </View>
        )}

        {/* Upsell */}
        {suggestions.length > 0 && (
          <View style={{ gap: 8 }}>
            <T variant="label">أضف إلى طلبك</T>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {suggestions.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    haptic.tap();
                    add(
                      {
                        businessId: cart.businessId,
                        businessName: cart.businessName,
                        businessSlug: cart.businessSlug,
                      },
                      makeLine(p),
                    );
                  }}
                  style={{ width: 120, gap: 4 }}
                  accessibilityLabel={`أضف ${p.name}`}
                >
                  <View>
                    <Photo
                      uri={p.imageUrl}
                      style={{ width: 120, height: 84, borderRadius: 14 }}
                      glyphSize={28}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        start: 6,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.white,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <T
                        style={{
                          fontFamily: fonts.bold,
                          color: colors.goldDeep,
                          fontSize: 18,
                          lineHeight: 22,
                        }}
                      >
                        +
                      </T>
                    </View>
                  </View>
                  <T numberOfLines={1} style={{ fontSize: 14 }}>
                    {p.name}
                  </T>
                  <T style={{ fontSize: 14, color: colors.goldDeep, fontFamily: fonts.bold }}>
                    {money(p.price)}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fulfillment */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip
            label="توصيل"
            active={fulfillment === 'delivery'}
            onPress={() => setFulfillment('delivery')}
          />
          <Chip
            label="استلام من المحل"
            active={fulfillment === 'pickup'}
            onPress={() => setFulfillment('pickup')}
          />
        </View>
        {fulfillment === 'delivery' && (
          <Input
            label="عنوان التوصيل"
            value={address}
            onChangeText={setAddress}
            placeholder="الحي، الشارع، أقرب معلم"
          />
        )}
        <Input
          label="ملاحظات للمطعم"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={500}
        />
        <View style={[styles.row, { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <Input
              label="كود خصم"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>
          <Button
            small
            title="تطبيق"
            variant="secondary"
            disabled={!code}
            onPress={() => void applyCoupon()}
            style={{ height: 48 }}
          />
        </View>

        {/* Payment + totals */}
        <Card style={{ gap: 8 }}>
          <View style={styles.row}>
            <Icon name="check" size={18} color={colors.success} />
            <T style={{ flex: 1, fontFamily: fonts.medium }}>الدفع نقداً عند الاستلام</T>
          </View>
          <Row label="المجموع" value={money(subtotal)} />
          {coupon && (
            <Row
              label={`الخصم (${coupon.code})`}
              value={`− ${money(discount)}`}
              color={colors.success}
            />
          )}
          {fulfillment === 'delivery' && (
            <Row label="التوصيل" value={deliveryFee ? money(deliveryFee) : 'مجاني'} />
          )}
          <View style={{ height: 1, backgroundColor: colors.sand }} />
          <Row label="الإجمالي" value={money(total)} bold />
        </Card>
        <ErrorText message={error} />
      </Screen>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.sand,
        }}
      >
        <Pressable
          disabled={busy || short > 0}
          onPress={() => void submit()}
          style={{
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: short > 0 ? colors.sand : colors.gold,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            opacity: busy ? 0.7 : 1,
          }}
          accessibilityRole="button"
        >
          <T style={{ fontFamily: fonts.bold, color: colors.navy, fontSize: 16 }}>
            {busy ? 'جارٍ الإرسال…' : short > 0 ? 'لم تصل للحد الأدنى بعد' : 'تأكيد الطلب'}
          </T>
          <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{money(total)}</T>
        </Pressable>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <T
        style={{
          flex: 1,
          color: color ?? (bold ? colors.navy : colors.muted),
          fontFamily: bold ? fonts.bold : fonts.regular,
        }}
      >
        {label}
      </T>
      <T style={{ color: color ?? colors.navy, fontFamily: bold ? fonts.bold : fonts.medium }}>
        {value}
      </T>
    </View>
  );
}

function qty(primary: boolean) {
  return {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: primary ? colors.gold : colors.white,
    borderWidth: primary ? 0 : 1,
    borderColor: colors.sand,
  };
}
