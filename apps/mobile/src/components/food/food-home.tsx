import type { BusinessSummary, Category, CityOffer, Order, Page } from '@dari/contracts';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '@/components/food/photo';
import { offerLabel, RestaurantCard, RestaurantMini } from '@/components/food/restaurant-card';
import { Icon } from '@/components/icons';
import { ActiveOrderBanner } from '@/components/active-order';
import { RestaurantCardSkeleton } from '@/components/skeleton';
import { Chip, Empty, IconButton, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { config } from '@/lib/config';
import { useApi, usePaged } from '@/lib/query';
import { colors, fonts, radius, shadow } from '@/theme';

const CUISINE_IMAGES: Record<string, number> = {
  restaurants: require('../../../assets/cuisines/restaurants.webp'),
  pizza: require('../../../assets/cuisines/pizza.webp'),
  shawarma: require('../../../assets/cuisines/shawarma.webp'),
  burgers: require('../../../assets/cuisines/burgers.webp'),
  sweets: require('../../../assets/cuisines/sweets.webp'),
  cafes: require('../../../assets/cuisines/cafes.webp'),
  healthy: require('../../../assets/cuisines/healthy.webp'),
  asian: require('../../../assets/cuisines/asian.webp'),
  bakery: require('../../../assets/cuisines/bakery.webp'),
};

type Sort = 'recommended' | 'fastest' | 'rating' | 'open' | 'offers';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'recommended', label: 'المقترح' },
  { id: 'open', label: 'مفتوح الآن' },
  { id: 'fastest', label: 'الأسرع' },
  { id: 'rating', label: 'الأعلى تقييماً' },
  { id: 'offers', label: 'عروض' },
];
const FINISHED = new Set(['delivered', 'picked_up']);

/** «داري للطعام»: the food marketplace home. */
export function FoodHome() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cart = useCart();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>('recommended');

  const categories = useApi<Category[]>('/categories', { vertical: 'food' });
  const offers = useApi<CityOffer[]>('/offers', { city: config.city, vertical: 'food' });
  const list = usePaged<BusinessSummary>('/businesses', { city: config.city, vertical: 'food', categoryId }, 50);
  const recent = useApi<Page<Order>>(user ? '/orders' : null, { limit: 20 });

  const offerBy = useMemo(() => new Map((offers.data ?? []).map((o) => [o.business.id, o.coupon])), [offers.data]);
  const restaurants = useMemo(() => {
    const items = list.items.filter((b) => b.acceptsOrders);
    // Open places first in every view, then the chosen order.
    const byOpen = (a: BusinessSummary, b: BusinessSummary) => Number(b.isOpen) - Number(a.isOpen);
    switch (sort) {
      case 'fastest':
        return [...items].sort((a, b) => byOpen(a, b) || a.prepMinutes - b.prepMinutes);
      case 'rating':
        return [...items].sort((a, b) => byOpen(a, b) || b.ratingAvg - a.ratingAvg);
      case 'open':
        return items.filter((b) => b.isOpen);
      case 'offers':
        return items.filter((b) => offerBy.has(b.id));
      default:
        return [...items].sort(byOpen);
    }
  }, [list.items, sort, offerBy]);

  // «اطلب مجدداً»: restaurants of recent completed orders (most recent first, unique).
  const again = useMemo(() => {
    const seen = new Set<string>();
    return (recent.data?.items ?? []).filter((o) => FINISHED.has(o.status) && !seen.has(o.businessId) && seen.add(o.businessId));
  }, [recent.data]);
  const byId = new Map(list.items.map((b) => [b.id, b]));

  const refresh = () => void Promise.all([list.refetch(), offers.refetch(), recent.refetch()]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <ScrollView refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={refresh} tintColor={colors.gold} />} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ backgroundColor: colors.navy, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T style={{ color: '#F6F0E0B3', fontSize: 13, lineHeight: 20 }}>التوصيل إلى</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="pin" size={16} color={colors.gold} />
                <T style={{ color: colors.ivory, fontFamily: fonts.bold }}>سلمية</T>
              </View>
            </View>
            <IconButton icon="bag" label={`السلة (${cart.count})`} tone="night" badge={cart.count} onPress={() => router.push('/cart')} />
          </View>
          <View style={{ gap: 2 }}>
            <T variant="display" style={{ color: colors.ivory, fontSize: 30, lineHeight: 42 }}>جوعان؟</T>
            <T style={{ color: '#F6F0E0CC', fontSize: 15 }}>أطيب مطاعم سلمية، لحد باب البيت</T>
          </View>
          {/* The whole capsule opens search (a 22px input inside a 48px pill was easy to miss). */}
          <Pressable onPress={() => router.push('/search')} accessibilityRole="search" accessibilityLabel="ابحث عن مطعم أو طبق" style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, height: 52, gap: 10 }}>
            <Icon name="search" size={20} color={colors.muted} />
            <T style={{ color: colors.muted }}>مطعم، طبق، أو مطبخ…</T>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <ActiveOrderBanner />
        </View>

        {/* Offers */}
        {!!offers.data?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 4 }}>
            {offers.data.map(({ coupon, business }) => (
              <Pressable key={coupon.id} onPress={() => router.push(`/b/${encodeURIComponent(business.slug)}`)} style={[{ width: 290, height: 150, borderRadius: 22, overflow: 'hidden' }, shadow]} accessibilityRole="button" accessibilityLabel={coupon.title}>
                <Photo uri={business.coverUrl} style={{ position: 'absolute', width: '100%', height: '100%' }} />
                <LinearGradient colors={['#0B142400', '#0B1424E6']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
                <View style={{ flex: 1, justifyContent: 'flex-end', padding: 14, gap: 4 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <T style={{ fontSize: 13, lineHeight: 20, fontFamily: fonts.bold, color: colors.navy }}>{offerLabel(coupon)}</T>
                  </View>
                  <T style={{ color: colors.ivory, fontFamily: fonts.bold, fontSize: 15 }} numberOfLines={1}>{coupon.title}</T>
                  <T style={{ color: colors.champagne, fontSize: 13, lineHeight: 20 }}>{business.name} · الكود {coupon.code}</T>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Cuisines */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 20 }}>
          {(categories.data ?? []).map((c) => {
            const active = categoryId === c.id;
            return (
              <Pressable key={c.id} onPress={() => setCategoryId(active ? undefined : c.id)} style={{ alignItems: 'center', gap: 6, width: 78 }} accessibilityRole="button" accessibilityState={{ selected: active }}>
                <View style={{ width: 68, height: 68, borderRadius: 34, padding: 3, borderWidth: 2, borderColor: active ? colors.gold : 'transparent' }}>
                  {CUISINE_IMAGES[c.slug] ? <Image source={CUISINE_IMAGES[c.slug]} style={{ width: '100%', height: '100%', borderRadius: 30 }} /> : <Photo uri={null} style={{ width: '100%', height: '100%', borderRadius: 30 }} glyphSize={28} />}
                </View>
                <T numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, textAlign: 'center', fontFamily: active ? fonts.bold : fonts.medium, color: active ? colors.navy : colors.ink }}>{c.nameAr}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Order again */}
        {again.length > 0 && (
          <View style={{ paddingTop: 22, gap: 10 }}>
            <T variant="title" style={{ paddingHorizontal: 16 }}>اطلب مجدداً</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {again.map((o) => {
                const b = byId.get(o.businessId);
                return b ? <RestaurantMini key={o.id} b={b} subtitle={`${o.items.length} أصناف · أعد الطلب`} onPress={() => router.push(`/orders/${o.id}`)} /> : null;
              })}
            </ScrollView>
          </View>
        )}

        {/* Sort / filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 22 }}>
          {SORTS.map((s) => <Chip key={s.id} label={s.label} active={sort === s.id} onPress={() => setSort(s.id)} />)}
        </ScrollView>

        {/* Restaurants */}
        <View style={{ padding: 16, gap: 16 }}>
          <T variant="title">{categoryId ? (categories.data?.find((c) => c.id === categoryId)?.nameAr ?? 'المطاعم') : 'كل المطاعم'} ({restaurants.length})</T>
          {list.isLoading ? [0, 1, 2].map((i) => <RestaurantCardSkeleton key={i} />) : restaurants.length === 0 ? <Empty title="لا مطاعم مطابقة الآن" hint="جرّب تصنيفاً آخر أو أزل الفلتر" /> : restaurants.map((b) => <RestaurantCard key={b.id} b={b} offer={offerBy.get(b.id)} />)}
        </View>
      </ScrollView>
    </View>
  );
}
