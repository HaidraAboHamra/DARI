'use client';

import { addToCart, type Cart, type CartBusiness, cartCount, type CartLine, cartSubtotal, migrateCart, setLineQuantity } from '@dari/contracts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type { Cart, CartLine };

interface CartApi {
  cart: Cart | null;
  count: number;
  subtotal: number;
  add(business: CartBusiness, line: CartLine): 'added' | 'replaced';
  setQuantity(key: string, quantity: number): void;
  replace(cart: Cart): void;
  clear(): void;
}

const STORAGE_KEY = 'dari.cart.v1';
const CartContext = createContext<CartApi | null>(null);

function load(): Cart | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrateCart(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function persist(cart: Cart | null): void {
  try {
    if (cart && cart.lines.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — cart still works in memory */
  }
}

/** Single-merchant cart kept on the device; rules live in @dari/contracts (shared with the app). */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => setCart(load()), []);
  useEffect(() => persist(cart), [cart]);

  const add = useCallback<CartApi['add']>((business, line) => {
    let outcome: 'added' | 'replaced' = 'added';
    setCart((current) => {
      const next = addToCart(current, business, line);
      if (next.replaced) outcome = 'replaced';
      return next.cart;
    });
    return outcome;
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => setCart((current) => setLineQuantity(current, key, quantity)), []);
  const clear = useCallback(() => setCart(null), []);
  const replace = useCallback((next: Cart) => setCart(next.lines.length ? next : null), []);

  const value = useMemo<CartApi>(
    () => ({ cart, count: cartCount(cart), subtotal: cartSubtotal(cart), add, setQuantity, replace, clear }),
    [cart, add, setQuantity, replace, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
