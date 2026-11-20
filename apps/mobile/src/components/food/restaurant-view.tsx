import { type BusinessDetail, type Coupon, localClock, makeLine, type Product } from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContactActions, FavoriteButton, FollowButton, Reviews } from '@/components/business-extras';
import { Icon } from '@/components/icons';
import { Card, Chip, Empty, Loading, T } from '@/components/ui';
import { useCart } from '@/lib/cart';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';
import { colors, fonts, radius, shadow } from '@/theme';
import { ItemSheet } from './item-sheet';
import { MenuRow, PopularCard } from './menu-item';
import { Photo } from './photo';
import { DeliveryFacts, offerLabel } from './restaurant-card';

const POPULAR = 'الأكثر طلباً';
const TABS_HEIGHT = 56;
const BAR_HEIGHT = 52;
const COVER_HEIGHT = 230;

function todayHours(b: BusinessDetail): string | null {
  const { day } = localClock(new Date(), 'Asia/Damascus');
  const slot = b.openingHours.find((h) => h.day === day);
  // Words instead of «a – b»: number ranges flip visually in right-to-left text.
  return slot ? `يفتح ${slot.open} · يغلق ${slot.close}` : null;
}

/** Restaurant / shop page: cover, facts, offers, sticky menu sections, item sheet, basket bar. */
export function RestaurantView({ b }: { b: BusinessDetail }) {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const products = useApi<Product[]>(`/businesses/${b.id}/products`);
  const offers = useApi<Coupon[]>(`/businesses/${b.id}/offers`);
  const [sheet, setSheet] = useState<Product | null>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Past the cover, the sticky bar turns into a compact header (back · name · share · favourite).
  const [compact, setCompact] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const menuTop = useRef(0);
  const sectionTop = useRef(new Map<string, number>());

  const all = products.data ?? [];
  const popular = useMemo(() => all.filter((p) => p.isPopular).slice(0, 10), [all]);
  const sections = useMemo(() => {
    const needle = q.trim();
    const shown = needle ? all.filter((p) => p.name.includes(needle) || p.description?.includes(needle) || p.section?.includes(needle)) : all;
    return [...Map.groupBy(shown, (p) => p.section ?? 'المنتجات')];
  }, [all, q]);
  const tabs = [...(popular.length && !q ? [POPULAR] : []), ...sections.map(([s]) => s)];
  const inCart = useMemo(() => {
    const counts = new Map<string, number>();
    if (cart.cart?.businessId === b.id) for (const l of cart.cart.lines) counts.set(l.productId, (counts.get(l.productId) ?? 0) + l.quantity);
    return counts;
  }, [cart.cart, b.id]);

  const canOrder = b.acceptsOrders;
  const business = { businessId: b.id, businessName: b.name, businessSlug: b.slug };
  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 1800);
  };
  const add = (p: Product, choices: string[] = [], note = '', quantity = 1) => {
    const outcome = cart.add(business, makeLine(p, choices, note, quantity));
    flash(outcome === 'replaced' ? 'بدأنا سلة جديدة من هذا المطعم' : `أضيف «${p.name}»`);
  };
  // Plain items go straight to the basket; items with options open the sheet.
  const quickAdd = (p: Product) => (p.options.length ? setSheet(p) : add(p));

  const jumpTo = (tab: string) => {
    const y = sectionTop.current.get(tab);
    if (y !== undefined) scroll.current?.scrollTo({ y: menuTop.current + y - TABS_HEIGHT - BAR_HEIGHT - insets.top, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    const isCompact = offset > COVER_HEIGHT - 20;
    if (isCompact !== compact) setCompact(isCompact);
    const y = offset - menuTop.current + TABS_HEIGHT + BAR_HEIGHT + insets.top + 8;
    let current: string | null = null;
    for (const tab of tabs) if ((sectionTop.current.get(tab) ?? Infinity) <= y) current = tab;
    if (current !== active) setActive(current);
  };

  const hours = todayHours(b);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/food'));
  const share = () => void Share.share({ message: `${b.name} على داري\n${config.webUrl}/b/${encodeURIComponent(b.slug)}` });
  const basket = cart.cart?.businessId === b.id && cart.count > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView ref={scroll} stickyHeaderIndices={[2]} onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: basket ? 120 : 40 }} keyboardShouldPersistTaps="handled">
        {/* 0 · Cover */}
        <View>
          <Photo uri={b.coverUrl} style={{ width: '100%', height: COVER_HEIGHT + insets.top }} glyphSize={72} />
          <LinearGradient colors={['#0B142499', '#0B142400', '#0B142400']} style={{ position: 'absolute', inset: 0 }} />
        </View>

        {/* 1 · Facts */}
        <View style={{ paddingHorizontal: 16, marginTop: -44, gap: 12 }}>
          <View style={[{ backgroundColor: colors.white, borderRadius: 24, padding: 16, gap: 10 }, shadow]}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Photo uri={b.logoUrl} style={{ width: 64, height: 64, borderRadius: 18 }} glyphSize={34} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="display" style={{ fontSize: 23, lineHeight: 32 }} numberOfLines={1}>{b.name}</T>
                <T variant="small" numberOfLines={1}>{[b.categoryName, b.areaName].filter(Boolean).join(' · ')}</T>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="star" size={16} color={colors.gold} />
                <T style={{ fontFamily: fonts.bold }}>{b.ratingAvg.toFixed(1)}</T>
                <T variant="small">({b.ratingCount} تقييم)</T>
              </View>
              <View style={{ backgroundColor: b.isOpen ? '#2F7D5B1F' : '#C4553D1F', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                <T style={{ fontSize: 12, fontFamily: fonts.bold, color: b.isOpen ? colors.success : colors.danger }}>{b.isOpen ? 'مفتوح الآن' : 'مغلق الآن'}{hours ? ` · ${hours}` : ''}</T>
              </View>
            </View>
            <DeliveryFacts b={b} />
          </View>

          {!!offers.data?.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {offers.data.map((o) => (
                <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EBD59640', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 300 }}>
                  <Icon name="tag" size={20} color={colors.goldDeep} />
                  <View>
                    <T style={{ fontFamily: fonts.bold, fontSize: 13.5 }} numberOfLines={1}>{offerLabel(o)}{o.minOrder ? ` · فوق ${money(o.minOrder)}` : ''}</T>
                    <T variant="small">استخدم الكود {o.code}</T>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, height: 46, gap: 8, borderWidth: 1, borderColor: colors.sand }}>
            <Icon name="search" size={17} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={`ابحث في قائمة ${b.name}`} placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: fonts.regular, textAlign: 'right' }} />
          </View>
        </View>

        {/* 2 · Sticky bar: compact header once scrolled, then the section tabs */}
        <View style={{ backgroundColor: colors.ivory, borderBottomWidth: 1, borderBottomColor: colors.sand, paddingTop: compact ? insets.top : 0 }}>
          {compact && (
            <View style={{ height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
              <Pressable onPress={goBack} accessibilityLabel="رجوع" hitSlop={8}>
                <Icon name="back" size={24} />
              </Pressable>
              <T variant="title" numberOfLines={1} style={{ flex: 1 }}>{b.name}</T>
              <Pressable onPress={share} accessibilityLabel="مشاركة" hitSlop={8}>
                <Icon name="share" size={20} />
              </Pressable>
              <FavoriteButton b={b} light />
            </View>
          )}
          <View style={{ height: TABS_HEIGHT, paddingTop: 10, paddingBottom: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {tabs.map((t) => <Chip key={t} label={t} active={active === t} onPress={() => jumpTo(t)} />)}
            </ScrollView>
          </View>
        </View>

        {/* 3 · Menu */}
        <View onLayout={(e) => (menuTop.current = e.nativeEvent.layout.y)} style={{ paddingHorizontal: 16, paddingTop: 14, gap: 18 }}>
          {products.isLoading ? (
            <Loading />
          ) : !all.length ? (
            <Empty title="القائمة قيد التحضير" />
          ) : (
            <>
              {popular.length > 0 && !q && (
                <View onLayout={(e) => sectionTop.current.set(POPULAR, e.nativeEvent.layout.y)} style={{ gap: 10 }}>
                  <T variant="title">🔥 {POPULAR}</T>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {popular.map((p) => <PopularCard key={p.id} p={p} onOpen={setSheet} onAdd={quickAdd} canOrder={canOrder} />)}
                  </ScrollView>
                </View>
              )}
              {sections.length === 0 && <Empty title={`لا نتائج لـ «${q}»`} />}
              {sections.map(([section, items]) => (
                <View key={section} onLayout={(e) => sectionTop.current.set(section, e.nativeEvent.layout.y)} style={{ gap: 10 }}>
                  <T variant="title">{section}</T>
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    {items.map((p, i) => (
                      <View key={p.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand }}>
                        <MenuRow p={p} onOpen={setSheet} onAdd={quickAdd} canOrder={canOrder} inCart={inCart.get(p.id) ?? 0} />
                      </View>
                    ))}
                  </Card>
                </View>
              ))}
            </>
          )}

          {/* 4 · About */}
          <View style={{ gap: 12, paddingTop: 8 }}>
            <T variant="title">عن {b.name}</T>
            {b.description && <T style={{ lineHeight: 24 }}>{b.description}</T>}
            {b.address && <T variant="muted">📍 {b.address}</T>}
            <ContactActions b={b} />
            <FollowButton b={b} />
          </View>
          <Reviews b={b} />
        </View>
      </ScrollView>

      {/* Floating actions over the cover (replaced by the compact header when scrolled) */}
      {!compact && (
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }} pointerEvents="box-none">
          <Pressable onPress={goBack} accessibilityLabel="رجوع" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFFE6', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={22} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={share} accessibilityLabel="مشاركة" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFFE6', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="share" size={19} />
            </Pressable>
            <FavoriteButton b={b} light />
          </View>
        </View>
      )}

      {toast && (
        <View style={{ position: 'absolute', top: insets.top + 60, left: 24, right: 24, backgroundColor: colors.navy, borderRadius: 16, padding: 12 }} pointerEvents="none">
          <T style={{ color: colors.champagne, textAlign: 'center' }}>{toast}</T>
        </View>
      )}

      {basket && (
        <Pressable onPress={() => router.push('/cart')} accessibilityRole="button" style={[{ position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16, height: 58, borderRadius: radius.pill, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 10 }, shadow]}>
          <View style={{ minWidth: 42, height: 42, borderRadius: 21, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
            <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{cart.count}</T>
          </View>
          <T style={{ flex: 1, color: colors.ivory, fontFamily: fonts.bold, fontSize: 16 }}>عرض السلة</T>
          <T style={{ color: colors.champagne, fontFamily: fonts.bold, paddingEnd: 12 }}>{money(cart.subtotal)}</T>
        </Pressable>
      )}

      <ItemSheet
        product={sheet}
        canOrder={canOrder}
        onClose={() => setSheet(null)}
        onAdd={(p, choices, note, quantity) => {
          add(p, choices, note, quantity);
          setSheet(null);
        }}
      />
    </View>
  );
}
