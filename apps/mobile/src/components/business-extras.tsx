import type { BusinessDetail, Connection, Page, Review } from '@dari/contracts';
import { timeAgo } from '@dari/contracts/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, Card, Section, Stars, styles, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/query';
import { colors, fonts } from '@/theme';

/** Runs an action that needs an account, refreshing data afterwards (or asks to log in). */
export function useRequireUser() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return (fn: () => Promise<unknown>) => (user ? void fn().then(() => qc.invalidateQueries()) : router.push('/login'));
}

export function FavoriteButton({ b, light }: { b: BusinessDetail; light?: boolean }) {
  const { user } = useAuth();
  const requireUser = useRequireUser();
  const favorite = useApi<{ favorite: boolean }>(user ? '/me/favorites/check' : null, { entityType: 'business', entityId: b.id });
  const on = favorite.data?.favorite ?? false;
  return (
    <Pressable
      accessibilityLabel={on ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
      onPress={() => requireUser(() => api.request('/me/favorites', { method: on ? 'DELETE' : 'PUT', body: { entityType: 'business', entityId: b.id } }))}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: light ? '#FFFFFFE6' : 'transparent', borderWidth: light ? 0 : 1, borderColor: '#EBD59666' }}
    >
      <Icon name={on ? 'heartFill' : 'heart'} size={20} color={on ? colors.danger : light ? colors.navy : colors.champagne} />
    </Pressable>
  );
}

export function ContactActions({ b }: { b: BusinessDetail }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap' }]}>
      {b.phone && <Button small title="اتصال" onPress={() => void Linking.openURL(`tel:${b.phone}`)} />}
      {b.whatsapp && <Button small title="واتساب" variant="secondary" onPress={() => void Linking.openURL(`https://wa.me/${b.whatsapp!.replace('+', '')}`)} />}
      {b.location && <Button small title="الموقع على الخريطة" variant="secondary" onPress={() => void Linking.openURL(`https://maps.google.com/?q=${b.location!.lat},${b.location!.lng}`)} />}
    </View>
  );
}

/** Customer Connect (opt-in to the merchant's offers). */
export function FollowButton({ b }: { b: BusinessDetail }) {
  const { user } = useAuth();
  const requireUser = useRequireUser();
  const connections = useApi<Connection[]>(user ? '/me/connections' : null);
  if (connections.data?.some((c) => c.business.id === b.id)) {
    return <T style={{ color: colors.success, fontFamily: fonts.bold }}>✓ أنت من متابعي {b.name}</T>;
  }
  return <Button title={`تابع ${b.name} واحصل على عروضه`} variant="secondary" onPress={() => requireUser(() => api.post(`/businesses/${b.id}/connect`))} />;
}

export function Reviews({ b }: { b: BusinessDetail }) {
  const { user } = useAuth();
  const requireUser = useRequireUser();
  const reviews = useApi<Page<Review>>(`/businesses/${b.id}/reviews`, { limit: 5 });
  return (
    <Section title={`التقييمات (${b.ratingCount})`}>
      {user && (
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <T variant="muted">قيّم تجربتك:</T>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} accessibilityLabel={`${n} نجوم`} onPress={() => requireUser(() => api.request(`/businesses/${b.id}/reviews/mine`, { method: 'PUT', body: { rating: n } }))}>
              <Icon name="star" size={26} color={colors.gold} />
            </Pressable>
          ))}
        </View>
      )}
      {reviews.data?.items.map((r) => (
        <Card key={r.id} style={{ gap: 4 }}>
          <View style={styles.row}>
            <T variant="label" style={{ flex: 1 }}>{r.authorName ?? 'زبون'}</T>
            <Stars value={r.rating} />
          </View>
          {r.body && <T>{r.body}</T>}
          <T variant="small">{timeAgo(r.createdAt)}</T>
        </Card>
      ))}
    </Section>
  );
}
