import { describe, expect, it } from 'vitest';
import { money, timeAgo } from '../src/i18n/format';

describe('format', () => {
  it('formats Syrian pounds with Arabic digits', () => {
    expect(money(45000)).toBe('٤٥٬٠٠٠ ل.س');
  });

  it('renders relative Arabic time', () => {
    const now = Date.parse('2026-11-19T12:00:00Z');
    expect(timeAgo('2026-11-19T11:59:30Z', now)).toBe('الآن');
    expect(timeAgo('2026-11-19T10:00:00Z', now)).toBe('قبل ساعتين');
    expect(timeAgo('2026-11-18T12:00:00Z', now)).toBe('أمس');
  });
});
