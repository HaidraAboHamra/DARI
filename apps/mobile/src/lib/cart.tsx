import { addToCart, type Cart, type CartBusiness, cartCount, type CartLine, cartSubtotal, migrateCart, setLineQuantity } from '@dari/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const KEY = 'dari.cart.v1';
const CartContext = createContext<CartApi | null>(null);

/** Single-merchant cart persisted on the device; rules live in @dari/contracts (shared with the web). */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(KEY)
      .then((raw) => raw && setCart(migrateCart(JSON.parse(raw))))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    void (cart?.lines.length ? AsyncStorage.setItem(KEY, JSON.stringify(cart)) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
  }, [cart]);

  const add = useCallback<CartApi['add']>((business, line) => {
    let outcome: 'added' | 'replaced' = 'added';
    setCart((current) => {
      const next = addToCart(current, business, line);
      if (next.replaced) outcome = 'replaced';
      return next.cart;
    });
    return outcome;
  }, []);
  const setQuantity = useCallback((key: string, quantity: number) => setCart((c) => setLineQuantity(c, key, quantity)), []);
  const replace = useCallback((next: Cart) => setCart(next.lines.length ? next : null), []);
  const clear = useCallback(() => setCart(null), []);

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
