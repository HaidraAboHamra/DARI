import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, space } from '@/theme';

type Variant = 'display' | 'title' | 'body' | 'muted' | 'label' | 'small';

const TEXT: Record<Variant, object> = {
  display: { fontFamily: fonts.display, fontSize: 30, color: colors.navy, lineHeight: 42 },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.navy, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, lineHeight: 24 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 20 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.navy, lineHeight: 22 },
  small: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, lineHeight: 18 },
};

/** All text goes through this component so fonts and direction stay consistent. */
export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[TEXT[variant], { writingDirection: 'rtl' }, style]} />;
}

export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true }: { children: ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; padded?: boolean }) {
  const content = <View style={{ padding: padded ? space(4) : 0, gap: space(4), paddingBottom: space(10) }}>{children}</View>;
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.ivory }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.gold} /> : undefined}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'night' | 'danger' | 'ghost';
const BUTTON: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.gold, fg: colors.navy },
  secondary: { bg: 'transparent', fg: colors.navy, border: colors.navy },
  night: { bg: colors.navy, fg: colors.champagne },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.navy },
};

export function Button({ title, variant = 'primary', loading, small, style, ...props }: PressableProps & { title: string; variant?: ButtonVariant; loading?: boolean; small?: boolean; style?: ViewStyle }) {
  const v = BUTTON[variant];
  const disabled = props.disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderWidth: v.border ? 1 : 0, height: small ? 38 : 50, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : <T style={{ color: v.fg, fontFamily: fonts.bold, fontSize: small ? 13 : 15 }}>{title}</T>}
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'gold' | 'success' | 'danger' | 'navy' }) {
  const tones = {
    neutral: [colors.sand, colors.ink],
    gold: ['#EBD59680', colors.goldDeep],
    success: ['#2F7D5B1A', colors.success],
    danger: ['#C4553D1A', colors.danger],
    navy: [colors.navy, colors.champagne],
  } as const;
  const [bg, fg] = tones[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <T style={{ color: fg, fontFamily: fonts.bold, fontSize: 11 }}>{label}</T>
    </View>
  );
}

export function Input({ label, error, ...props }: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <T variant="label" style={{ fontSize: 14 }}>{label}</T>}
      <TextInput placeholderTextColor="#6B6A6899" {...props} style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} />
      {error && <T style={{ color: colors.danger, fontSize: 12 }}>{error}</T>}
    </View>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space(3) }}>
      <View style={styles.row}>
        <T variant="title" style={{ flex: 1 }}>{title}</T>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 32 }}>
      <T variant="label" style={{ textAlign: 'center', fontSize: 17 }}>{title}</T>
      {hint && <T variant="muted" style={{ textAlign: 'center' }}>{hint}</T>}
      {children}
    </Card>
  );
}

export function Loading() {
  return <ActivityIndicator style={{ marginTop: 48 }} color={colors.gold} size="large" />;
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={{ backgroundColor: '#C4553D1A', borderRadius: 14, padding: 12 }}>
      <T style={{ color: colors.danger, fontFamily: fonts.medium }}>{message}</T>
    </View>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  if (!value && !count) return <T variant="small">جديد</T>;
  return (
    <T variant="small" style={{ color: colors.ink }}>
      <T style={{ color: colors.gold }}>★ </T>
      {value.toFixed(1)}
      {count !== undefined ? ` (${count})` : ''}
    </T>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active ? { backgroundColor: colors.navy, borderColor: colors.navy } : null]}>
      <T style={{ fontSize: 13, color: active ? colors.champagne : colors.ink, fontFamily: fonts.medium }}>{label}</T>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: space(4), borderWidth: 1, borderColor: '#E8E1D2B3', ...shadow },
  button: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  input: { backgroundColor: colors.white, borderColor: colors.sand, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  night: { backgroundColor: colors.navy, borderRadius: 28, padding: space(5) },
});
