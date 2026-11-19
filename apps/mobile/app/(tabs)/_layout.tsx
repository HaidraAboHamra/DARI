import { Platform } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '@/theme';

function Icon({ d, color, circle }: { d: string; color: string; circle?: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {circle && <Circle cx="12" cy="8" r="4" />}
      <Path d={d} />
    </Svg>
  );
}

const ICONS = {
  index: 'M4 21V10a8 8 0 0 1 16 0v11M10 21v-5h4v5',
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  orders: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  account: 'M4 21a8 8 0 0 1 16 0',
};

/** Thumb-reachable tabs, same structure as the design: الرئيسية، استكشف، طلباتي، حسابي. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
        // Native tab bars size themselves around the safe area; the web preview needs room for Arabic descenders.
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.sand, ...(Platform.OS === 'web' && { height: 62, paddingBottom: 6 }) },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ focused }) => <Icon d={ICONS.index} color={focused ? colors.gold : colors.muted} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'استكشف', tabBarIcon: ({ focused }) => <Icon d={ICONS.explore} color={focused ? colors.gold : colors.muted} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'طلباتي', tabBarIcon: ({ focused }) => <Icon d={ICONS.orders} color={focused ? colors.gold : colors.muted} /> }} />
      <Tabs.Screen name="account" options={{ title: 'حسابي', tabBarIcon: ({ focused }) => <Icon d={ICONS.account} circle color={focused ? colors.gold : colors.muted} /> }} />
    </Tabs>
  );
}
