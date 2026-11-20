import { defaultChoices, optionErrorMessage, priceLine, type Product } from '@dari/contracts';
import { money } from '@dari/contracts/i18n';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { T } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { Photo } from './photo';

interface Props {
  product: Product | null;
  canOrder: boolean;
  onClose: () => void;
  onAdd: (product: Product, choices: string[], note: string, quantity: number) => void;
}

/** Bottom sheet to customize a dish: options, kitchen note, quantity, live total. */
export function ItemSheet({ product, canOrder, onClose, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [choices, setChoices] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    setChoices(defaultChoices(product.options));
    setNote('');
    setQuantity(1);
  }, [product]);

  if (!product) return null;
  const priced = priceLine(product.price, product.options, choices);
  const toggle = (groupId: string, choiceId: string) => {
    const group = product.options.find((g) => g.id === groupId)!;
    const inGroup = new Set(group.choices.map((c) => c.id));
    setChoices((current) => {
      if (group.max === 1) return [...current.filter((c) => !inGroup.has(c)), choiceId];
      if (current.includes(choiceId)) return current.filter((c) => c !== choiceId);
      return current.filter((c) => inGroup.has(c)).length < group.max ? [...current, choiceId] : current;
    });
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: '#0B142499' }} onPress={onClose} accessibilityLabel="إغلاق" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '90%', backgroundColor: colors.ivory, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <Photo uri={product.imageUrl} style={{ width: '100%', aspectRatio: 1.6 }} glyphSize={64} />
            <Pressable onPress={onClose} accessibilityLabel="إغلاق" style={{ position: 'absolute', top: 14, end: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFFE6', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={18} />
            </Pressable>
          </View>
          <View style={{ padding: 18, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T variant="display" style={{ fontSize: 24, lineHeight: 34, flex: 1 }}>{product.name}</T>
              {product.isPopular && <PopularBadge />}
            </View>
            {product.description && <T variant="muted" style={{ fontSize: 14.5, lineHeight: 22 }}>{product.description}</T>}
            <T style={{ color: colors.goldDeep, fontFamily: fonts.bold, fontSize: 16 }}>{money(product.price)}</T>
          </View>

          {product.options.map((g) => {
            const picked = g.choices.filter((c) => choices.includes(c.id)).length;
            const missing = g.min > 0 && picked < g.min;
            return (
              <View key={g.id} style={{ paddingHorizontal: 18, paddingVertical: 10, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T variant="label" style={{ flex: 1 }}>{g.name}</T>
                  <View style={{ backgroundColor: missing ? '#C4553D1F' : colors.sand, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <T style={{ fontSize: 11.5, color: missing ? colors.danger : colors.muted, fontFamily: fonts.medium }}>{g.min > 0 ? 'مطلوب' : g.max > 1 ? `اختياري · حتى ${g.max}` : 'اختياري'}</T>
                  </View>
                </View>
                <View style={{ backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden' }}>
                  {g.choices.map((c, i) => {
                    const on = choices.includes(c.id);
                    return (
                      <Pressable key={c.id} onPress={() => toggle(g.id, c.id)} accessibilityRole={g.max === 1 ? 'radio' : 'checkbox'} accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand }}>
                        <View style={{ width: 22, height: 22, borderRadius: g.max === 1 ? 11 : 6, borderWidth: 2, borderColor: on ? colors.gold : '#C9C2B2', backgroundColor: on ? colors.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {on && <Icon name="check" size={14} color={colors.navy} strokeWidth={2.6} />}
                        </View>
                        <T style={{ flex: 1, fontFamily: on ? fonts.bold : fonts.regular }}>{c.name}</T>
                        {c.price > 0 && <T style={{ color: colors.goldDeep, fontSize: 13.5 }}>+ {money(c.price)}</T>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <View style={{ paddingHorizontal: 18, paddingTop: 10, gap: 8 }}>
            <T variant="label">ملاحظة للمطبخ</T>
            <TextInput value={note} onChangeText={setNote} maxLength={200} placeholder="مثلاً: بدون بصل، صوص على جنب" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, textAlign: 'right', fontSize: 15 }} />
          </View>
        </ScrollView>

        {canOrder && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.sand }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Stepper label="إنقاص" sign="−" onPress={() => setQuantity((q) => Math.max(1, q - 1))} />
              <T style={{ fontFamily: fonts.bold, fontSize: 17, minWidth: 18, textAlign: 'center' }}>{quantity}</T>
              <Stepper label="زيادة" sign="+" onPress={() => setQuantity((q) => Math.min(99, q + 1))} />
            </View>
            <Pressable
              disabled={!priced.ok}
              onPress={() => priced.ok && onAdd(product, choices, note, quantity)}
              style={{ flex: 1, height: 52, borderRadius: radius.pill, backgroundColor: priced.ok ? colors.gold : colors.sand, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }}
              accessibilityRole="button"
            >
              <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{priced.ok ? 'أضف إلى السلة' : optionErrorMessage(priced.error)}</T>
              {priced.ok && <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{money(priced.unitPrice * quantity)}</T>}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Stepper({ sign, label, onPress }: { sign: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ fontSize: 20, fontFamily: fonts.bold }}>{sign}</T>
    </Pressable>
  );
}

export function PopularBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EBD59659', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Icon name="fire" size={12} color={colors.goldDeep} />
      <T style={{ fontSize: 11, color: colors.goldDeep, fontFamily: fonts.bold }}>الأكثر طلباً</T>
    </View>
  );
}
