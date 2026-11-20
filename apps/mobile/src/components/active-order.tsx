import type { Order, Page } from '@dari/contracts';
import { ORDER_STATUS_LABEL } from '@dari/contracts/i18n';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/icons';
import { T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors, fonts, radius } from '@/theme';

const LIVE = new Set(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery']);

/** «طلبك في الطريق»: the order in progress, one tap to tracking (UX study P1-8). */
export function ActiveOrderBanner() {
  const { user } = useAuth();
  const orders = useApi<Page<Order>>(user ? '/orders' : null, { limit: 5 }, { refetchInterval: 20_000 });
  const live = orders.data?.items.find((o) => LIVE.has(o.status));
  if (!live) return null;
  return (
    <Pressable
      onPress={() => router.push(`/orders/${live.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`طلبك من ${live.businessName}: ${ORDER_STATUS_LABEL[live.status]}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.gold, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12, opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bike" size={22} color={colors.champagne} />
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.bold, color: colors.navy }}>{ORDER_STATUS_LABEL[live.status]}</T>
        <T style={{ fontSize: 14, lineHeight: 22, color: colors.navy }}>طلبك من {live.businessName} · تتبّع الطلب</T>
      </View>
      <Icon name="chevron" size={20} color={colors.navy} />
    </Pressable>
  );
}
