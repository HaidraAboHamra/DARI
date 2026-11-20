import { VERTICAL_META, VERTICALS } from '@dari/contracts';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceTile } from '@/components/brand';
import { Card, Screen, styles, T } from '@/components/ui';
import { colors } from '@/theme';

const ROUTE: Partial<Record<string, string>> = { food: '/food', news: '/news', jobs: '/jobs', events: '/events?kind=event', trips: '/events?kind=trip', property: '/property' };
const EXTRA = [
  { title: 'اطلب خدمة واستلم عروض أسعار', href: '/services/new' },
  { title: 'توصيل لأي شي («اشترِ لي»)', href: '/delivery' },
  { title: 'مساعد المدينة الذكي ✦', href: '/assistant' },
];

export default function Explore() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Screen>
        <T variant="display">استكشف سلمية</T>
        {EXTRA.map((e) => (
          <Card key={e.href} onPress={() => router.push(e.href as never)} style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
            <T style={{ color: colors.champagne, fontSize: 16 }}>{e.title}</T>
          </Card>
        ))}
        {VERTICALS.map((v) => (
          <Card key={v} onPress={() => router.push((ROUTE[v] ?? `/explore/${v}`) as never)} style={[styles.row, { gap: 14 }] as never}>
            <ServiceTile vertical={v} />
            <View>
              <T variant="title">{VERTICAL_META[v].labelAr}</T>
              <T variant="muted">{VERTICAL_META[v].labelEn}</T>
            </View>
          </Card>
        ))}
      </Screen>
    </SafeAreaView>
  );
}
