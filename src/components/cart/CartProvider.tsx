"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  /** id оффера (конкретное предложение селлера) */
  id: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  ready: boolean;
  count: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "metalcut-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed
              .filter((i): i is CartItem => typeof i?.id === "string" && Number(i?.qty) > 0)
              .map((i) => ({ id: i.id, qty: Math.floor(Number(i.qty)) })),
          );
        }
      }
    } catch {
      // повреждённая корзина — начинаем с пустой
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = useCallback((id: string, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { id, qty }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty: Math.floor(qty) } : i)),
    );
  }, []);

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({ items, ready, count: items.reduce((s, i) => s + i.qty, 0), add, setQty, remove, clear }),
    [items, ready, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart должен использоваться внутри CartProvider");
  return ctx;
}

/** Хук обогащения корзины данными офферов с сервера */
export interface EnrichedOffer {
  id: string;
  price: number;
  stock: number;
  leadTimeDays: number;
  minOrderQty: number;
  sellerSku: string | null;
  sellerName: string;
  sellerBrand: string | null;
  sellerSlug: string;
  productName: string;
  productSlug: string;
  productSku: string;
  unit: string;
  categoryName: string;
}

export function useCartOffers() {
  const { items, ready } = useCart();
  const [offers, setOffers] = useState<EnrichedOffer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) {
      setOffers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOffers(data.offers ?? []);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [items, ready]);

  return { offers, loading };
}
