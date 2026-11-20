import type { Product } from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { Pressable, View } from 'react-native';
import { T } from '@/components/ui';
import { colors, fonts, radius, shadow } from '@/theme';
import { PopularBadge } from './item-sheet';
import { Photo } from './photo';

/** «من» when options can raise the price. */
export function priceFrom(p: Product): string {
  const varies = p.options.some((g) => g.choices.some((c) => c.price > 0));
  return `${varies ? 'من ' : ''}${money(p.price)}`;
}

function AddButton({ p, onAdd, small }: { p: Product; onAdd: (p: Product) => void; small?: boolean }) {
  const size = small ? 32 : 36;
  return (
    <Pressable
      onPress={() => onAdd(p)}
      disabled={p.stock === 0}
      accessibilityLabel={`أضف ${p.name}`}
      hitSlop={6}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sand, opacity: p.stock === 0 ? 0.4 : 1 }, shadow]}
    >
      <T style={{ fontSize: small ? 20 : 22, lineHeight: small ? 24 : 26, color: colors.goldDeep, fontFamily: fonts.bold }}>+</T>
    </Pressable>
  );
}

/** Menu row: text + photo with a quick-add button (Talabat-style density, Dari look). */
export function MenuRow({ p, onOpen, onAdd, canOrder, inCart }: { p: Product; onOpen: (p: Product) => void; onAdd: (p: Product) => void; canOrder: boolean; inCart: number }) {
  const soldOut = p.stock === 0;
  return (
    <Pressable onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel={p.name} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 14, opacity: pressed ? 0.85 : soldOut ? 0.55 : 1 })}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {inCart > 0 && (
            <View style={{ backgroundColor: colors.gold, borderRadius: radius.pill, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
              <T style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.navy }}>{inCart}×</T>
            </View>
          )}
          <T variant="label" style={{ fontSize: 15.5 }}>{p.name}</T>
          {p.isPopular && <PopularBadge />}
        </View>
        {p.description && <T variant="muted" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 20 }}>{p.description}</T>}
        <T style={{ color: colors.navy, fontFamily: fonts.bold, marginTop: 'auto' }}>{soldOut ? 'نفدت الكمية' : priceFrom(p)}</T>
      </View>
      <View style={{ width: 104, height: 104 }}>
        <Photo uri={p.imageUrl} style={{ width: 104, height: 104, borderRadius: 18 }} glyphSize={36} />
        {canOrder && !soldOut && (
          <View style={{ position: 'absolute', bottom: -6, start: -6 }}>
            <AddButton p={p} onAdd={onAdd} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Card for the «الأكثر طلباً» rail. */
export function PopularCard({ p, onOpen, onAdd, canOrder }: { p: Product; onOpen: (p: Product) => void; onAdd: (p: Product) => void; canOrder: boolean }) {
  return (
    <Pressable onPress={() => onOpen(p)} style={{ width: 150, gap: 6 }} accessibilityRole="button" accessibilityLabel={p.name}>
      <View>
        <Photo uri={p.imageUrl} style={{ width: 150, height: 112, borderRadius: 18 }} glyphSize={36} />
        {canOrder && p.stock !== 0 && (
          <View style={{ position: 'absolute', bottom: 8, start: 8 }}>
            <AddButton p={p} onAdd={onAdd} small />
          </View>
        )}
      </View>
      <T variant="label" numberOfLines={1} style={{ fontSize: 14 }}>{p.name}</T>
      <T style={{ fontSize: 13, color: colors.goldDeep, fontFamily: fonts.bold }}>{priceFrom(p)}</T>
    </Pressable>
  );
}
