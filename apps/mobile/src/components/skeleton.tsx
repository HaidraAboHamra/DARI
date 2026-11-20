import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, Easing, View } from 'react-native';
import { colors, radius } from '@/theme';

/** Soft pulsing placeholder: the layout appears instantly, content fills in (perceived speed). */
export function Bone({ width = '100%', height, round = 12 }: { width?: DimensionValue; height: number; round?: number }) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={{ width, height, borderRadius: round, backgroundColor: colors.sand, opacity: pulse }} />;
}

export function RestaurantCardSkeleton() {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.card, overflow: 'hidden' }} accessibilityLabel="جارٍ التحميل">
      <Bone height={170} round={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Bone width="55%" height={18} />
        <Bone width="35%" height={14} />
        <Bone width="70%" height={14} />
      </View>
    </View>
  );
}

export function MenuSkeleton() {
  return (
    <View style={{ gap: 12 }} accessibilityLabel="جارٍ تحميل القائمة">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: 18, padding: 14 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Bone width="60%" height={18} />
            <Bone width="90%" height={14} />
            <Bone width="30%" height={16} />
          </View>
          <Bone width={104} height={104} round={18} />
        </View>
      ))}
    </View>
  );
}
