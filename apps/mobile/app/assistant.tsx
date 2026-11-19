import type { AssistantReply } from '@dari/contracts';
import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { LogoMark } from '@/components/brand';
import { T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { config } from '@/lib/config';
import { colors, fonts, radius } from '@/theme';

type Turn = { role: 'user' | 'assistant'; content: string; actions?: AssistantReply['actions'] };
const STARTERS = ['بدي مطعم فاتح هلق', 'احجزلي ملعب بكرا', 'في رحلة هالأسبوع؟', 'بدي شقة للإيجار', 'شو أخبار سلمية؟'];

/** CITY AI: conversational front door; answers are grounded in Dari's own results. */
export default function Assistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const res = await api.post<AssistantReply>('/assistant', { city: config.city, message, history: history.slice(-6) });
      setTurns((t) => [...t, { role: 'assistant', content: res.reply, actions: res.actions }]);
    } catch (err) {
      setTurns((t) => [...t, { role: 'assistant', content: errorMessage(err) }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.navy }} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {turns.length === 0 && (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
            <LogoMark size={64} />
            <T variant="display" style={{ color: colors.ivory }}>مساعد سلمية الذكي</T>
            <T style={{ color: '#F6F0E0B3', textAlign: 'center' }}>اسألني عن أي شي بالمدينة وبوصلك للخطوة التالية.</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {STARTERS.map((s) => (
                <Pressable key={s} onPress={() => void send(s)} style={{ borderWidth: 1, borderColor: '#EBD5964D', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <T style={{ color: colors.champagne, fontSize: 13 }}>{s}</T>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {turns.map((t, i) =>
          t.role === 'user' ? (
            <View key={i} style={{ alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 20, padding: 12, maxWidth: '85%' }}>
              <T style={{ color: colors.navy, fontFamily: fonts.medium }}>{t.content}</T>
            </View>
          ) : (
            <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '90%', gap: 8 }}>
              <View style={{ backgroundColor: '#FFFFFF1A', borderRadius: 20, padding: 12 }}>
                <T style={{ color: colors.ivory }}>{t.content}</T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {t.actions?.map((a) => (
                  <Pressable key={a.href + a.label} onPress={() => router.push(a.href as never)} style={{ backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
                    <T style={{ color: colors.navy, fontFamily: fonts.bold, fontSize: 13 }}>{a.label}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          ),
        )}
        {busy && <T style={{ color: colors.champagne }}>…</T>}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#0B1424', borderTopWidth: 1, borderTopColor: '#FFFFFF1A' }}>
        <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => void send(input)} placeholder="اكتب سؤالك…" placeholderTextColor="#6B6A68" maxLength={500} style={{ flex: 1, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 18, height: 48, fontFamily: fonts.regular, textAlign: 'right' }} />
        <Pressable onPress={() => void send(input)} disabled={busy || !input.trim()} accessibilityLabel="إرسال" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', opacity: busy || !input.trim() ? 0.5 : 1 }}>
          <T style={{ fontSize: 20, color: colors.navy }}>↑</T>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
