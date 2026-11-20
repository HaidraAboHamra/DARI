import { type Article, type BusinessSummary, type CityEvent, type Page, VERTICAL_META, VERTICALS } from '@dari/contracts';
import { greeting } from '@dari/contracts/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark, ServiceTile } from '@/components/brand';
import { ArticleCard, BusinessCard, EventCard } from '@/components/cards';
import { ActiveOrderBanner } from '@/components/active-order';
import { Icon } from '@/components/icons';
import { IconButton, Section, styles, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';
import { colors, fonts, radius, space } from '@/theme';

const SUGGESTIONS = ['صيدلية مناوبة هلق', 'مطعم فاتح هلق', 'بدي سباك', 'في شغل؟', 'بيت للإيجار'];
/** The two most frequent tasks get big photo cards (Hick's law); the rest stay in the grid. */
const PRIMARY = [
  { title: 'اطلب أكل', subtitle: 'مطاعم، حلويات، قهوة', href: '/food', image: require('../../assets/cuisines/burgers.webp') },
  { title: 'توصيل أي شي', subtitle: 'غرض، أوراق، من محل لمحل', href: '/delivery', image: require('../../assets/cuisines/bakery.webp') },
] as const;
const ROUTE: Partial<Record<string, string>> = { food: '/food', news: '/news', jobs: '/jobs', events: '/events?kind=event', trips: '/events?kind=trip', property: '/property' };

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
            <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 34, color: colors.ivory, flex: 1 }}>داري</T>
            <IconButton icon="bag" label={`السلة (${count})`} tone="night" badge={count} onPress={() => router.push('/cart')} />
          </View>
          <T style={{ color: '#EBD596D9', fontSize: 14 }}>{greeting()}{user?.name ? `، ${user.name}` : ''} 👋</T>
          <T style={{ fontFamily: fonts.display, fontSize: 32, color: colors.ivory, lineHeight: 44 }}>شو بدك <T style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 44, color: colors.gold }}>اليوم؟</T></T>
          <View style={[styles.row, { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 2, borderColor: '#C9A24BB3', paddingStart: 18, paddingEnd: 5, height: 56 }]}>
            {/* The input fills the whole capsule height so any tap on it focuses. */}
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => search(q)} returnKeyType="search" placeholder="طعام، طبيب، سبّاك، وظيفة…" placeholderTextColor={colors.muted} style={{ flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.regular, fontSize: 16, textAlign: 'right', color: colors.ink }} />
            <Pressable onPress={() => search(q)} accessibilityRole="button" accessibilityLabel="بحث" style={{ backgroundColor: colors.gold, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="search" size={20} color={colors.navy} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => search(s)} style={{ borderWidth: 1, borderColor: '#EBD5964D', borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
                <T style={{ color: colors.champagne, fontSize: 14 }}>{s}</T>
              </Pressable>
            ))}
          </ScrollView>
          <Link href="/assistant" asChild>
            <Pressable style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: '#EBD59666', borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
              <T style={{ color: colors.champagne, fontFamily: fonts.bold, fontSize: 14 }}>✦ اسأل مساعد المدينة الذكي</T>
            </Pressable>
          </Link>
        </View>

        <View style={{ padding: space(4), gap: space(6) }}>
          <ActiveOrderBanner />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {PRIMARY.map((c) => (
              <Pressable key={c.href} onPress={() => router.push(c.href as never)} accessibilityRole="button" accessibilityLabel={c.title} style={({ pressed }) => ({ flex: 1, height: 132, borderRadius: 22, overflow: 'hidden', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <Image source={c.image} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" />
                <LinearGradient colors={['#0B142410', '#0B1424E0']} style={{ position: 'absolute', inset: 0 }} />
                <View style={{ flex: 1, justifyContent: 'flex-end', padding: 14 }}>
                  <T style={{ color: colors.ivory, fontFamily: fonts.display, fontSize: 20, lineHeight: 28 }}>{c.title}</T>
                  <T style={{ color: '#F6F0E0D9', fontSize: 13, lineHeight: 20 }}>{c.subtitle}</T>
                </View>
              </Pressable>
            ))}
          </View>

          <Section title="كل الخدمات">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space(4) }}>
              {VERTICALS.filter((v) => v !== 'food').map((v) => (
                <Pressable key={v} onPress={() => router.push((ROUTE[v] ?? `/explore/${v}`) as never)} accessibilityRole="button" style={{ width: '25%', alignItems: 'center', gap: 6, minHeight: 44 }}>
                  <ServiceTile vertical={v} />
                  <T style={{ fontSize: 13, lineHeight: 20, fontFamily: fonts.medium, textAlign: 'center' }}>{VERTICAL_META[v].labelAr}</T>
                </Pressable>
              ))}
            </View>
          </Section>

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
