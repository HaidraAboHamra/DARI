import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { LogoMark } from '@/components/brand';
import { Button, ErrorText, Input, Screen, styles, T } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { config } from '@/lib/config';
import { queryClient } from '@/lib/query';
import { switchServer } from '@/lib/server';
import { colors } from '@/theme';

/** Phone + one-time code. No passwords to forget. */
export default function Login() {
  const { requestCode, verifyCode } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen>
        <View style={[styles.night, { alignItems: 'center', gap: 10 }]}>
          <LogoMark size={72} />
          <T variant="display" style={{ color: colors.ivory }}>أهلاً بك في داري</T>
          <T style={{ color: '#F6F0E0B3', textAlign: 'center' }}>سلمية بين إيديك — ادخل برقم موبايلك.</T>
        </View>
        {!sent ? (
          <>
            <Input label="رقم الموبايل" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="09xx xxx xxx" />
            <ErrorText message={error} />
            <Button title="أرسل الرمز" loading={busy} disabled={phone.length < 9} onPress={() => run(async () => { await requestCode(phone); setSent(true); })} />
          </>
        ) : (
          <>
            <T variant="muted">أرسلنا رمزاً إلى {phone}</T>
            <Input label="رمز الدخول" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }} autoFocus />
            <ErrorText message={error} />
            <Button title="دخول" loading={busy} disabled={code.length !== 6} onPress={() => run(async () => { await verifyCode(phone, code); router.back(); })} />
            <Button title="تغيير الرقم" variant="ghost" onPress={() => { setSent(false); setCode(''); }} />
          </>
        )}
        {config.serverSwitch && <ServerSwitch />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Test builds only: point the app at the server under test. */
function ServerSwitch() {
  const [value, setValue] = useState(api.serverUrl);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      setStatus({ ok: true, text: `متصل بـ ${await switchServer(value)}` });
      void queryClient.invalidateQueries();
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : 'تعذر الاتصال' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8, marginTop: 24, padding: 12, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sand }}>
      <T variant="small">نسخة اختبار — عنوان الخادم</T>
      <Input value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.20:4000" style={{ textAlign: 'left' }} />
      <Button small variant="secondary" title="حفظ واختبار الاتصال" loading={busy} onPress={() => void save()} />
      {status && <T variant="small" style={{ color: status.ok ? colors.success : colors.danger }}>{status.text}</T>}
    </View>
  );
}
