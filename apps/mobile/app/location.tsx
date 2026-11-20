import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CityMapView } from '@/components/city-map-view';
import { Icon } from '@/components/icons';
import { Button, T } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useLocation } from '@/lib/location';
import { colors, fonts } from '@/theme';

/** Precise delivery point: GPS in one tap, then fine-tune the pin on the 3D map. */
export default function LocationPicker() {
  const { location, locate, setPoint, locating, denied } = useLocation();
  const [key, setKey] = useState(0);

  const useGps = async () => {
    const found = await locate();
    if (found) {
      haptic.select();
      setKey((k) => k + 1); // re-centre the map on the fresh GPS point
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Stack.Screen options={{ title: 'موقع التوصيل' }} />
      <View style={{ padding: 16, gap: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.sand }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="pin" size={20} color={colors.goldDeep} />
          <T style={{ flex: 1, fontFamily: fonts.bold }} numberOfLines={1}>{location ? location.label : 'لم يُحدد موقعك بعد'}</T>
        </View>
        <Button title={locating ? 'جارٍ تحديد موقعك…' : 'استخدم موقعي الحالي (GPS)'} variant="night" loading={locating} onPress={() => void useGps()} />
        {denied && <T style={{ color: colors.danger, fontSize: 14 }}>لم يُسمح بالوصول للموقع — يمكنك تحديده يدوياً على الخريطة أو تفعيله من إعدادات الجهاز.</T>}
      </View>
      <View style={{ flex: 1 }}>
        <CityMapView
          key={key}
          mode="pick"
          point={location?.point ?? null}
          onPicked={(point) => {
            haptic.success();
            // Back to where the user came from (cart, restaurant…); straight to food when opened directly.
            void setPoint(point).then(() => (router.canGoBack() ? router.back() : router.replace('/food')));
          }}
        />
      </View>
    </View>
  );
}
