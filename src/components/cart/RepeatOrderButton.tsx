"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

/** Кладёт все позиции заявки в корзину (актуальность цен/остатков проверит корзина) */
export default function RepeatOrderButton({ items }: { items: { offerId: string; qty: number }[] }) {
  const { add } = useCart();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = () => {
    setPending(true);
    for (const i of items) add(i.offerId, i.qty);
    router.push("/cart");
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md py-2.5 transition-colors"
    >
      {pending ? "Добавляем…" : "Повторить заявку"}
    </button>
  );
}
