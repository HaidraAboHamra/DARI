import { type Article, type BusinessSummary, type CityEvent, type Page, VERTICAL_META, VERTICALS } from '@dari/contracts';
import { greeting } from '@dari/contracts/i18n';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark, ServiceTile } from '@/components/brand';
import { ArticleCard, BusinessCard, EventCard } from '@/components/cards';
import { Section, styles, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';
import { colors, fonts, radius, space } from '@/theme';

const SUGGESTIONS = ['صيدلية مناوبة هلق', 'مطعم فاتح هلق', 'بدي سباك', 'في شغل؟', 'بيت للإيجار'];
const ROUTE: Partial<Record<string, string>> = { news: '/news', jobs: '/jobs', events: '/events?kind=event', trips: '/events?kind=trip', property: '/property' };

/** «شو بدك اليوم؟» — the front door of the city. */
export default function Home() {
  const { user } = useAuth();
  const { count } = useCart();
  const [q, setQ] = useState('');
  const query = { city: config.city, limit: 4 };
  const businesses = useApi<Page<BusinessSummary>>('/businesses', { ...query, limit: 5 });
  const news = useApi<Page<Article>>('/news', query);
  const events = useApi<Page<CityEvent>>('/events', { ...query, limit: 3 });
  const search = (text: string) => text.trim() && router.push({ pathname: '/search', params: { q: text.trim() } });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.navy }}>
      <ScrollView style={{ backgroundColor: colors.ivory }} contentContainerStyle={{ paddingBottom: space(10) }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: colors.navy, padding: space(5), paddingTop: space(3), gap: space(3), borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <View style={styles.row}>
            <LogoMark size={34} />
            <T style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ivory, flex: 1 }}>داري</T>
            <Pressable onPress={() => router.push('/cart')} accessibilityLabel={`السلة (${count})`} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: '#EBD59666' }}>
              <T style={{ color: colors.champagne, fontSize: 13 }}>السلة {count ? `(${count})` : ''}</T>
            </Pressable>
          </View>
          <T style={{ color: '#EBD596CC', fontSize: 13 }}>{greeting()}{user?.name ? `، ${user.name}` : ''} 👋</T>
          <T style={{ fontFamily: fonts.display, fontSize: 34, color: colors.ivory, lineHeight: 46 }}>شو بدك <T style={{ fontFamily: fonts.display, fontSize: 34, color: colors.gold }}>اليوم؟</T></T>
          <View style={[styles.row, { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 2, borderColor: '#C9A24BB3', paddingStart: 18, paddingEnd: 6, height: 54 }]}>
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => search(q)} returnKeyType="search" placeholder="طعام، طبيب، سبّاك، وظيفة…" placeholderTextColor="#6B6A6899" style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, textAlign: 'right', color: colors.ink }} />
            <Pressable onPress={() => search(q)} accessibilityLabel="بحث" style={{ backgroundColor: colors.gold, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ color: colors.navy, fontSize: 18 }}>⌕</T>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => search(s)} style={{ borderWidth: 1, borderColor: '#EBD5964D', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 }}>
                <T style={{ color: colors.champagne, fontSize: 13 }}>{s}</T>
              </Pressable>
            ))}
          </ScrollView>
          <Link href="/assistant" asChild>
            <Pressable style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: '#EBD59666', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
              <T style={{ color: colors.champagne, fontFamily: fonts.bold, fontSize: 13 }}>✦ اسأل مساعد المدينة الذكي</T>
            </Pressable>
          </Link>
        </View>

        <View style={{ padding: space(4), gap: space(6) }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space(4) }}>
            {VERTICALS.map((v) => (
              <Pressable key={v} onPress={() => router.push((ROUTE[v] ?? `/explore/${v}`) as never)} style={{ width: '25%', alignItems: 'center', gap: 6 }}>
                <ServiceTile vertical={v} />
                <T style={{ fontSize: 12, fontFamily: fonts.medium }}>{VERTICAL_META[v].labelAr}</T>
              </Pressable>
            ))}
          </View>

          {!!news.data?.items.length && (
            <Section title="نبض المدينة">
              {news.data.items.map((a) => <ArticleCard key={a.id} article={a} />)}
            </Section>
          )}
          {!!events.data?.items.length && (
            <Section title="فعاليات ورحلات قادمة">
              {events.data.items.map((e) => <EventCard key={e.id} event={e} />)}
            </Section>
          )}
          {!!businesses.data?.items.length && (
            <Section title="الأعلى تقييماً">
              {businesses.data.items.map((b) => <BusinessCard key={b.id} business={b} />)}
            </Section>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
