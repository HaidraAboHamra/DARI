/** Locale formatting shared by every client. Works on Hermes (React Native) too. */
const numberFormat = new Intl.NumberFormat('ar-SY');

export function money(amount: number, currency = 'SYP'): string {
  return `${numberFormat.format(amount)} ${currency === 'SYP' ? 'ل.س' : currency}`;
}

export function number(value: number): string {
  return numberFormat.format(value);
}

export function percent(value: number): string {
  return `${numberFormat.format(Math.round(value * 1000) / 10)}٪`;
}

const relative = typeof Intl.RelativeTimeFormat === 'function' ? new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }) : null;
const FALLBACK_UNIT: Record<string, string> = { year: 'سنة', month: 'شهر', week: 'أسبوع', day: 'يوم', hour: 'ساعة', minute: 'دقيقة' };

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      const value = Math.round(seconds / size);
      if (relative) return relative.format(value, unit);
      // Engines without RelativeTimeFormat (some Hermes builds).
      return value < 0 ? `قبل ${Math.abs(value)} ${FALLBACK_UNIT[unit]}` : `بعد ${value} ${FALLBACK_UNIT[unit]}`;
    }
  }
  return 'الآن';
}

export function greeting(date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Damascus' }).format(date));
  if (hour < 12) return 'صباح الخير';
  if (hour < 18) return 'نهارك سعيد';
  return 'مساء الخير';
}
