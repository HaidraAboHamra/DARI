import { type BookableResource, makeLine, type BusinessDetail, type Connection, type Coupon, isOpenAt, type Page, type Product, type Review, VERTICAL_META } from '@dari/contracts';
import { money, timeAgo } from '@dari/contracts/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { ServiceGlyph } from '@/components/brand';
import { BookingWidget } from '@/components/booking';
import { RestaurantView } from '@/components/food/restaurant-view';
import { Button, Card, Empty, Loading, Screen, Section, Stars, styles, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { pointQuery, useLocation } from '@/lib/location';
import { useApi } from '@/lib/query';
import { colors, fonts, radius } from '@/theme';

export default function BusinessPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const cart = useCart();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const { location } = useLocation();
  // With the customer's point the page carries their exact delivery fee and distance.
  const business = useApi<BusinessDetail>(`/businesses/by-slug/${encodeURIComponent(slug ?? '')}`, pointQuery(location));
  const id = business.data?.id ?? null;
  const products = useApi<Product[]>(id && `/businesses/${id}/products`);
  const resources = useApi<BookableResource[]>(id && `/businesses/${id}/resources`);
  const offers = useApi<Coupon[]>(id && `/businesses/${id}/offers`);
  const reviews = useApi<Page<Review>>(id && `/businesses/${id}/reviews`, { limit: 5 });
  const favorite = useApi<{ favorite: boolean }>(user && id ? '/me/favorites/check' : null, { entityType: 'business', entityId: id });
  const connections = useApi<Connection[]>(user ? '/me/connections' : null);

  if (business.isLoading) return <Loading />;
  const b = business.data;
  if (!b) return <Screen><Empty title="النشاط غير موجود" /></Screen>;
  // Restaurants and shops that take orders get the full ordering experience.
  if (b.acceptsOrders && (b.vertical === 'food' || b.vertical === 'shopping')) return <RestaurantView b={b} />;
  const open = isOpenAt(b.openingHours, new Date(), 'Asia/Damascus');
  const connected = connections.data?.some((c) => c.business.id === b.id) ?? false;
  const sections = Map.groupBy(products.data ?? [], (p) => p.section ?? 'المنتجات');

  const requireUser = (fn: () => Promise<unknown>) => (user ? void fn().then(() => qc.invalidateQueries()) : router.push('/login'));
  const add = (p: Product) => {
    const outcome = cart.add({ businessId: b.id, businessName: b.name, businessSlug: b.slug }, makeLine(p));
    setToast(outcome === 'replaced' ? 'بدأنا سلة جديدة من هذا المحل' : `أضيف «${p.name}»`);
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: b.name }} />
      <Screen>
        <View style={[styles.night, { gap: 10 }]}>
          <View style={[styles.row, { gap: 14 }]}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {b.logoUrl ? <Image source={{ uri: b.logoUrl }} style={{ width: 72, height: 72 }} /> : <ServiceGlyph vertical={b.vertical} size={44} color={colors.champagne} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="title" style={{ color: colors.ivory, fontSize: 24, lineHeight: 34 }}>{b.name}</T>
              <T style={{ color: '#F6F0E0B3', fontSize: 13 }}>{[b.categoryName ?? VERTICAL_META[b.vertical].labelAr, b.areaName].filter(Boolean).join(' · ')}</T>
              <View style={styles.row}>
                <T style={{ color: colors.ivory, fontSize: 13 }}>★ {b.ratingAvg.toFixed(1)} ({b.ratingCount})</T>
                {b.openingHours.length > 0 && <T style={{ color: open ? '#6EE7B7' : '#FDA4AF', fontSize: 13, fontFamily: fonts.bold }}>{open ? 'مفتوح الآن' : 'مغلق الآن'}</T>}
              </View>
            </View>
          </View>
          {b.description && <T style={{ color: '#F6F0E0D9' }}>{b.description}</T>}
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {b.phone && <Button small title="اتصال" onPress={() => void Linking.openURL(`tel:${b.phone}`)} />}
            {b.whatsapp && <Button small title="واتساب" variant="night" onPress={() => void Linking.openURL(`https://wa.me/${b.whatsapp!.replace('+', '')}`)} style={{ borderWidth: 1, borderColor: '#EBD59666' }} />}
            {b.location && <Button small title="الموقع" variant="night" onPress={() => void Linking.openURL(`https://maps.google.com/?q=${b.location!.lat},${b.location!.lng}`)} />}
            <Pressable
              accessibilityLabel="المفضلة"
              onPress={() => requireUser(() => api.request('/me/favorites', { method: favorite.data?.favorite ? 'DELETE' : 'PUT', body: { entityType: 'business', entityId: b.id } }))}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: favorite.data?.favorite ? colors.gold : 'transparent', borderWidth: 1, borderColor: '#EBD59666' }}
            >
              <T style={{ color: favorite.data?.favorite ? colors.navy : colors.champagne, fontSize: 18 }}>{favorite.data?.favorite ? '♥' : '♡'}</T>
            </Pressable>
          </View>
        </View>

        {offers.data?.map((o) => (
          <View key={o.id} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: colors.gold, backgroundColor: '#EBD59633', borderRadius: radius.card, padding: 14, gap: 4 }}>
            <T variant="label">🎁 {o.title}</T>
            <T variant="muted">{o.kind === 'percent' ? `خصم ${o.value}٪` : `خصم ${money(o.value)}`} · الكود: {o.code}</T>
          </View>
        ))}

        {connected ? (
          <T style={{ color: colors.success, fontFamily: fonts.bold }}>✓ أنت من متابعي {b.name}</T>
        ) : (
          <Button title={`تابع ${b.name} واحصل على عروضه`} variant="secondary" onPress={() => requireUser(() => api.post(`/businesses/${b.id}/connect`))} />
        )}

        {b.vertical === 'services' && b.categoryId && (
          <Button title="اطلب الخدمة واستلم عرض سعر" variant="night" onPress={() => router.push({ pathname: '/services/new', params: { category: b.categoryId!, target: b.id, name: b.name } })} />
        )}

        {!!resources.data?.length && (
          <Section title="احجز موعدك">
            <BookingWidget resources={resources.data} />
          </Section>
        )}

        {sections.size > 0 && (
          <Section title={b.acceptsOrders ? 'اطلب الآن' : 'القائمة والأسعار'}>
            {[...sections].map(([section, items]) => (
              <View key={section} style={{ gap: 8 }}>
                <T variant="label">{section}</T>
                <Card style={{ padding: 0 }}>
                  {items.map((p, i) => (
                    <View key={p.id} style={[styles.row, { padding: 14, gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand }]}>
                      {p.imageUrl && <Image source={{ uri: p.imageUrl }} style={{ width: 56, height: 56, borderRadius: 14 }} />}
                      <View style={{ flex: 1 }}>
                        <T variant="label">{p.name}</T>
                        {p.description && <T variant="muted" numberOfLines={2}>{p.description}</T>}
                        <T style={{ color: colors.goldDeep, fontFamily: fonts.bold }}>{money(p.price)}</T>
                      </View>
                      {b.acceptsOrders && (
                        <Pressable accessibilityLabel={`أضف ${p.name}`} disabled={p.stock === 0} onPress={() => add(p)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', opacity: p.stock === 0 ? 0.4 : 1 }}>
                          <T style={{ fontSize: 22, color: colors.navy, fontFamily: fonts.bold }}>+</T>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </Card>
              </View>
            ))}
          </Section>
        )}

        <Section title={`التقييمات (${b.ratingCount})`}>
          {user && (
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              <T variant="muted">قيّم تجربتك:</T>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} accessibilityLabel={`${n} نجوم`} onPress={() => requireUser(() => api.request(`/businesses/${b.id}/reviews/mine`, { method: 'PUT', body: { rating: n } }))}>
                  <T style={{ fontSize: 26, color: colors.gold }}>★</T>
                </Pressable>
              ))}
            </View>
          )}
          {reviews.data?.items.map((r) => (
            <Card key={r.id} style={{ gap: 4 }}>
              <View style={styles.row}>
                <T variant="label" style={{ flex: 1 }}>{r.authorName ?? 'زبون'}</T>
                <Stars value={r.rating} />
              </View>
              {r.body && <T>{r.body}</T>}
              <T variant="small">{timeAgo(r.createdAt)}</T>
            </Card>
          ))}
        </Section>
      </Screen>

      {toast && (
        <View style={{ position: 'absolute', top: 16, left: 16, right: 16, backgroundColor: colors.navy, borderRadius: 16, padding: 12 }}>
          <T style={{ color: colors.champagne, textAlign: 'center' }}>{toast}</T>
        </View>
      )}
      {cart.cart?.businessId === b.id && cart.count > 0 && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
          <Button variant="night" title={`عرض السلة (${cart.count}) · ${money(cart.subtotal)}`} onPress={() => router.push('/cart')} />
        </View>
      )}
    </View>
  );
}

