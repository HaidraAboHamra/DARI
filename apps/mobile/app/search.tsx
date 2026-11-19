import { type SearchResponse, VERTICAL_META } from '@dari/contracts';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Hit } from '@/components/hits';
import { Badge, Button, Empty, Input, Loading, Screen, styles, T } from '@/components/ui';
import { config } from '@/lib/config';
import { useApi } from '@/lib/query';

const INTENT_LABEL: Record<string, string> = {
  discover: 'استكشاف', find: 'بحث', urgent: 'حاجة عاجلة', buy: 'شراء وطلب', book: 'حجز', attend: 'فعالية',
  travel: 'رحلة', apply: 'وظيفة', property: 'عقار', stay: 'إقامة', service: 'خدمة', information: 'معلومة',
};

export default function Search() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const q = params.q ?? '';
  const result = useApi<SearchResponse>(q ? '/search' : null, { q, city: config.city, limit: 20 });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'بحث' }} />
      <Input value={text} onChangeText={setText} onSubmitEditing={() => router.setParams({ q: text.trim() })} returnKeyType="search" placeholder="اكتب حاجتك بكلامك…" autoFocus={!q} />
      {result.isLoading && <Loading />}
      {result.data && (
        <>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            <T variant="muted">فهمنا أنك تبحث عن</T>
            <Badge label={INTENT_LABEL[result.data.intent.intent] ?? ''} tone="navy" />
            {result.data.intent.vertical && <Badge label={VERTICAL_META[result.data.intent.vertical].labelAr} tone="gold" />}
            {result.data.intent.urgency && <Badge label="الآن" tone="danger" />}
          </View>
          {result.data.total === 0 ? (
            <Empty title="ما لقينا شي مطابق بعد" hint="سجّلنا طلبك — كل بحث بدون نتيجة يساعدنا نضيف الخدمات الناقصة.">
              <Button title="اطلب «اشترِ لي» عبر التوصيل" variant="secondary" onPress={() => router.push('/delivery')} />
            </Empty>
          ) : (
            result.data.hits.map((hit) => <Hit key={`${hit.kind}-${hit.item.id}`} hit={hit} />)
          )}
        </>
      )}
    </Screen>
  );
}
