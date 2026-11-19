import type { Membership } from '@dari/contracts';
import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServiceTile } from '@/components/brand';
import { Badge, Button, Card, Empty, Screen, Section, styles, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors } from '@/theme';

const LINKS = [
  { href: '/notifications', label: 'الإشعارات' },
  { href: '/bookings', label: 'حجوزاتي' },
  { href: '/tickets', label: 'تذاكري' },
  { href: '/services', label: 'طلبات الخدمات' },
  { href: '/delivery', label: 'طلبات التوصيل' },
  { href: '/favorites', label: 'المفضلة' },
];

export default function Account() {
  const { user, logout } = useAuth();
  const memberships = useApi<Membership[]>(user ? '/me/businesses' : null);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Screen>
        {!user ? (
          <Empty title="أهلاً بك في داري" hint="ادخل برقم موبايلك — بدون كلمة سر.">
            <Button title="تسجيل الدخول" onPress={() => router.push('/login')} />
          </Empty>
        ) : (
          <>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <T variant="display">{user.name ?? 'حسابي'}</T>
                <T variant="muted">{user.phone}</T>
              </View>
              {user.role !== 'citizen' && <Badge label={user.role} tone="navy" />}
            </View>
            <Card style={{ padding: 0 }}>
              {[...LINKS, ...(user.role === 'courier' || user.role === 'admin' ? [{ href: '/courier', label: 'لوحة المندوب' }] : [])].map((l, i) => (
                <Pressable key={l.href} onPress={() => router.push(l.href as never)} style={{ padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand }}>
                  <T variant="label">{l.label}</T>
                </Pressable>
              ))}
            </Card>
            {!!memberships.data?.length && (
              <Section title="أنشطتي التجارية — Merchant OS">
                {memberships.data.map((m) => (
                  <Card key={m.business.id} onPress={() => router.push(`/merchant/${m.business.id}`)} style={[styles.row, { gap: 12 }] as never}>
                    <ServiceTile vertical={m.business.vertical} size={44} />
                    <T variant="label" style={{ flex: 1 }}>{m.business.name}</T>
                    <Badge label={m.role} />
                  </Card>
                ))}
              </Section>
            )}
            <Button
              title="تسجيل الخروج"
              variant="danger"
              onPress={() =>
                Alert.alert('تسجيل الخروج', 'هل تريد الخروج من حسابك؟', [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'خروج', style: 'destructive', onPress: () => void logout() },
                ])
              }
            />
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
