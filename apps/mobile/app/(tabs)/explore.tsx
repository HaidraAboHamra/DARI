import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityMapView } from '@/components/city-map-view';
import { useLocation } from '@/lib/location';
import { colors } from '@/theme';

/** «استكشف»: the live 3D map of Salamiyah — places, events, property and news. */
export default function ExploreTab() {
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.ivory }}>
      <CityMapView mode="explore" point={location?.point ?? null} onOpen={(href) => router.push(href as never)} />
    </View>
  );
}
