import { lineKey } from '../schemas/orders';
import type { OrderItemOption, Product } from '../types';
import { priceLine } from './product-options';

/** One cart line: a product with a specific set of choices and kitchen note. */
export interface CartLine {
  /** Identity of the line (product + choices + note), see `lineKey`. */
  key: string;
  productId: string;
  name: string;
  /** Unit price including chosen options. */
  price: number;
  quantity: number;
  choices: string[];
  /** Human-readable summary of the choices, e.g. «كبير · جبنة إضافية». */
  optionsLabel: string;
  note?: string;
  imageUrl?: string | null;
}

/** A single-merchant cart, kept on the device. */
export interface Cart {
  businessId: string;
  businessName: string;
  businessSlug: string;
  lines: CartLine[];
}

export type CartBusiness = Omit<Cart, 'lines'>;

export function optionsLabel(options: readonly OrderItemOption[]): string {
  return options.map((o) => o.choice).join(' · ');
}

/** Builds a line for `product` with the given choices; throws on invalid choices (UI validates first). */
export function makeLine(product: Pick<Product, 'id' | 'name' | 'price' | 'options' | 'imageUrl'>, choices: string[] = [], note?: string, quantity = 1): CartLine {
  const priced = priceLine(product.price, product.options, choices);
  if (!priced.ok) throw new Error(priced.error.code);
  const cleanNote = note?.trim() || undefined;
  return {
    key: lineKey({ productId: product.id, choices, note: cleanNote }),
    productId: product.id,
    name: product.name,
    price: priced.unitPrice,
    quantity,
    choices: [...choices].sort(),
    optionsLabel: optionsLabel(priced.options),
    ...(cleanNote && { note: cleanNote }),
    imageUrl: product.imageUrl,
  };
}

/** Adds a line (merging with an identical one); a different merchant starts a new cart. */
export function addToCart(cart: Cart | null, business: CartBusiness, line: CartLine): { cart: Cart; replaced: boolean } {
  if (!cart || cart.businessId !== business.businessId) {
    return { cart: { ...business, lines: [line] }, replaced: Boolean(cart?.lines.length) };
  }
  const existing = cart.lines.find((l) => l.key === line.key);
  const lines = existing
    ? cart.lines.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l))
    : [...cart.lines, line];
  return { cart: { ...cart, lines }, replaced: false };
}

export function setLineQuantity(cart: Cart | null, key: string, quantity: number): Cart | null {
  if (!cart) return null;
  const lines = cart.lines.flatMap((l) => (l.key !== key ? [l] : quantity > 0 ? [{ ...l, quantity: Math.min(99, quantity) }] : []));
  return lines.length ? { ...cart, lines } : null;
}

export function cartSubtotal(cart: Cart | null): number {
  return cart?.lines.reduce((sum, l) => sum + l.price * l.quantity, 0) ?? 0;
}

export function cartCount(cart: Cart | null): number {
  return cart?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
}

/** Order payload lines for a cart. */
export function cartItems(cart: Cart): { productId: string; quantity: number; choices: string[]; note?: string }[] {
  return cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, choices: l.choices, ...(l.note && { note: l.note }) }));
}

/**
 * «اطلب مجدداً»: maps a past order line's option snapshot back to today's choice
 * ids. Returns null when a choice no longer exists (the item is skipped).
 */
export function choicesFromSnapshot(product: Pick<Product, 'options'>, snapshot: readonly OrderItemOption[]): string[] | null {
  const ids: string[] = [];
  for (const o of snapshot) {
    const choice = product.options.find((g) => g.name === o.group)?.choices.find((c) => c.name === o.choice);
    if (!choice) return null;
    ids.push(choice.id);
  }
  return ids;
}

/** Restores old (v1) carts saved before lines had keys and options. */
export function migrateCart(raw: unknown): Cart | null {
  const c = raw as Cart | null;
  if (!c || !Array.isArray(c.lines)) return null;
  const lines = c.lines.map((l) => ({
    ...l,
    choices: l.choices ?? [],
    optionsLabel: l.optionsLabel ?? '',
    key: l.key ?? lineKey({ productId: l.productId, choices: l.choices ?? [], note: l.note }),
  }));
  return lines.length ? { ...c, lines } : null;
}
