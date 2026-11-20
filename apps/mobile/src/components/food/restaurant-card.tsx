import type { BusinessSummary, Coupon } from '@dari/contracts';
import { etaRange, money } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/icons';
import { T } from '@/components/ui';
import { colors, fonts, radius, shadow } from '@/theme';
import { Photo } from './photo';

const open = (b: BusinessSummary) => router.push(`/b/${encodeURIComponent(b.slug)}`);

export function offerLabel(c: Pick<Coupon, 'kind' | 'value'>): string {
  return c.kind === 'percent' ? `خصم ${c.value}%` : `خصم ${money(c.value)}`;
}

/** ETA · delivery fee · minimum order — the three numbers people decide on. */
export function DeliveryFacts({ b, light }: { b: BusinessSummary; light?: boolean }) {
  const color = light ? '#F6F0E0CC' : colors.muted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="clock" size={15} color={color} />
        <T style={{ fontSize: 12.5, color }}>{etaRange(b.prepMinutes)}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="bike" size={16} color={color} />
        <T style={{ fontSize: 12.5, color }}>{b.deliveryFee ? money(b.deliveryFee) : 'توصيل مجاني'}</T>
      </View>
      {b.minOrder > 0 && <T style={{ fontSize: 12.5, color }}>الحد الأدنى {money(b.minOrder)}</T>}
    </View>
  );
}

function Rating({ b }: { b: BusinessSummary }) {
  if (!b.ratingCount) return <T style={{ fontSize: 12.5, color: colors.success, fontFamily: fonts.bold }}>جديد</T>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name="star" size={14} color={colors.gold} />
      <T style={{ fontSize: 13, fontFamily: fonts.bold }}>{b.ratingAvg.toFixed(1)}</T>
      <T style={{ fontSize: 12, color: colors.muted }}>({b.ratingCount})</T>
    </View>
  );
}

/** Full-width restaurant card: cover photo, logo, rating, ETA, fee, offer. */
export function RestaurantCard({ b, offer }: { b: BusinessSummary; offer?: Coupon }) {
  return (
    <Pressable onPress={() => open(b)} accessibilityRole="button" accessibilityLabel={b.name} style={({ pressed }) => [{ backgroundColor: colors.white, borderRadius: radius.card, overflow: 'hidden', opacity: pressed ? 0.92 : 1 }, shadow]}>
      <View>
        <Photo uri={b.coverUrl} style={{ width: '100%', aspectRatio: 2.1 }} glyphSize={56} />
        {!b.isOpen && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: '#0B1424A6', alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ color: colors.ivory, fontFamily: fonts.bold }}>مغلق الآن · اطلب لاحقاً</T>
          </View>
        )}
        {offer && (
          <View style={{ position: 'absolute', top: 12, start: 12, backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="tag" size={13} color={colors.navy} />
            <T style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.navy }}>{offerLabel(offer)}</T>
          </View>
        )}
        {b.isFeatured && (
          <View style={{ position: 'absolute', top: 12, end: 12, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
            <T style={{ fontSize: 11.5, color: colors.champagne, fontFamily: fonts.bold }}>مميز</T>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' }}>
        <Photo uri={b.logoUrl} style={{ width: 52, height: 52, borderRadius: 14, marginTop: -34, borderWidth: 3, borderColor: colors.white }} glyphSize={28} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T variant="label" numberOfLines={1} style={{ flex: 1 }}>{b.name}</T>
            <Rating b={b} />
          </View>
          <T variant="small" numberOfLines={1}>{[b.categoryName, b.areaName].filter(Boolean).join(' · ')}</T>
          <DeliveryFacts b={b} />
        </View>
      </View>
    </Pressable>
  );
}

/** Small card for horizontal rails (e.g. «اطلب مجدداً»). */
export function RestaurantMini({ b, subtitle, onPress }: { b: BusinessSummary; subtitle?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress ?? (() => open(b))} style={{ width: 132, gap: 6 }} accessibilityRole="button" accessibilityLabel={b.name}>
      <Photo uri={b.coverUrl} style={{ width: 132, height: 88, borderRadius: 16 }} />
      <T variant="label" numberOfLines={1} style={{ fontSize: 14 }}>{b.name}</T>
      <T variant="small" numberOfLines={1}>{subtitle ?? etaRange(b.prepMinutes)}</T>
    </Pressable>
  );
}
