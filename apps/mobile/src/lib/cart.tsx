import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  businessId: string;
  businessName: string;
  businessSlug: string;
  lines: CartLine[];
}

interface CartApi {
  cart: Cart | null;
  count: number;
  subtotal: number;
  add(business: Omit<Cart, 'lines'>, line: Omit<CartLine, 'quantity'>): 'added' | 'replaced';
  setQuantity(productId: string, quantity: number): void;
  replace(cart: Cart): void;
  clear(): void;
}

const KEY = 'dari.cart.v1';
const CartContext = createContext<CartApi | null>(null);

/** Single-merchant cart persisted on the device (same rules as the web app). */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((raw) => raw && setCart(JSON.parse(raw) as Cart)).catch(() => undefined);
  }, []);
  useEffect(() => {
    void (cart?.lines.length ? AsyncStorage.setItem(KEY, JSON.stringify(cart)) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
  }, [cart]);

  const add = useCallback<CartApi['add']>((business, line) => {
    let outcome: 'added' | 'replaced' = 'added';
    setCart((current) => {
      if (!current || current.businessId !== business.businessId) {
        if (current?.lines.length) outcome = 'replaced';
        return { ...business, lines: [{ ...line, quantity: 1 }] };
      }
      const exists = current.lines.some((l) => l.productId === line.productId);
      return {
        ...current,
        lines: exists
          ? current.lines.map((l) => (l.productId === line.productId ? { ...l, quantity: Math.min(l.quantity + 1, 99) } : l))
          : [...current.lines, { ...line, quantity: 1 }],
      };
    });
    return outcome;
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((current) => {
      if (!current) return current;
      const lines = current.lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, 99) } : l)).filter((l) => l.quantity > 0);
      return lines.length ? { ...current, lines } : null;
    });
  }, []);

  const replace = useCallback((next: Cart) => setCart(next.lines.length ? next : null), []);
  const clear = useCallback(() => setCart(null), []);

  const value = useMemo<CartApi>(
    () => ({
      cart,
      count: cart?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0,
      subtotal: cart?.lines.reduce((n, l) => n + l.quantity * l.price, 0) ?? 0,
      add,
      setQuantity,
      replace,
      clear,
    }),
    [cart, add, setQuantity, replace, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
