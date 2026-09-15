"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export default function CartBadge() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-1.5 text-sm text-slate-200 hover:text-white transition-colors"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 2-1.6L21.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </svg>
      Корзина
      {ready && count > 0 && (
        <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 rounded-full bg-orange-600 text-white text-xs font-semibold inline-flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
