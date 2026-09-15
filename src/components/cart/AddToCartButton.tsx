"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

export default function AddToCartButton({
  offerId,
  qty = 1,
  small = false,
  label = "В корзину",
  className = "",
}: {
  offerId: string;
  qty?: number;
  small?: boolean;
  label?: string;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = () => {
    add(offerId, qty);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  };

  const base = small
    ? "text-xs px-2.5 py-1 rounded"
    : "text-sm px-4 py-2 rounded-md font-medium";

  return (
    <button
      onClick={onClick}
      className={`${base} ${className} transition-colors ${
        added
          ? "bg-emerald-600 text-white"
          : "bg-orange-600 text-white hover:bg-orange-500"
      }`}
    >
      {added ? "✓ Добавлено" : label}
    </button>
  );
}
