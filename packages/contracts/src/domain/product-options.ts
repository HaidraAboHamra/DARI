import type { OrderItemOption, ProductOptionGroup } from '../types';

export type OptionSelectionError =
  | { code: 'UNKNOWN_CHOICE'; choiceId: string }
  | { code: 'TOO_FEW'; group: string; min: number }
  | { code: 'TOO_MANY'; group: string; max: number };

export type PricedLine =
  | { ok: true; unitPrice: number; options: OrderItemOption[] }
  | { ok: false; error: OptionSelectionError };

/**
 * Prices one order line from the product's option groups and the customer's
 * chosen choice ids. Shared by the server (authoritative) and the apps (live
 * totals), so both always agree.
 */
export function priceLine(basePrice: number, groups: readonly ProductOptionGroup[], chosen: readonly string[]): PricedLine {
  const picked = new Set(chosen);
  const known = new Set(groups.flatMap((g) => g.choices.map((c) => c.id)));
  for (const id of picked) if (!known.has(id)) return { ok: false, error: { code: 'UNKNOWN_CHOICE', choiceId: id } };

  const options: OrderItemOption[] = [];
  for (const group of groups) {
    const selected = group.choices.filter((c) => picked.has(c.id));
    if (selected.length < group.min) return { ok: false, error: { code: 'TOO_FEW', group: group.name, min: group.min } };
    if (selected.length > group.max) return { ok: false, error: { code: 'TOO_MANY', group: group.name, max: group.max } };
    for (const c of selected) options.push({ group: group.name, choice: c.name, price: c.price });
  }
  return { ok: true, unitPrice: basePrice + options.reduce((sum, o) => sum + o.price, 0), options };
}

/** Default selection: the first choice of every required single-pick group (e.g. size). */
export function defaultChoices(groups: readonly ProductOptionGroup[]): string[] {
  return groups.filter((g) => g.min >= 1).flatMap((g) => g.choices.slice(0, g.min).map((c) => c.id));
}

export function optionErrorMessage(error: OptionSelectionError): string {
  switch (error.code) {
    case 'UNKNOWN_CHOICE':
      return 'أحد الخيارات لم يعد متوفراً';
    case 'TOO_FEW':
      return error.min === 1 ? `اختر ${error.group}` : `اختر ${error.min} على الأقل من ${error.group}`;
    case 'TOO_MANY':
      return `الحد الأقصى ${error.max} من ${error.group}`;
  }
}
