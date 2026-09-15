"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useCart, useCartOffers } from "@/components/cart/CartProvider";
import { fmtPrice, plural } from "@/lib/format";

export default function CartPage() {
  const { items, ready, setQty, remove } = useCart();
  const { offers, loading } = useCartOffers();

  // Позиции, пропавшие с продажи, убираем из корзины с уведомлением
  const dropped = useMemo(
    () => items.filter((i) => offers.length > 0 && !offers.some((o) => o.id === i.id)),
    [items, offers],
  );
  useEffect(() => {
    if (!loading && dropped.length) dropped.forEach((d) => remove(d.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, dropped.length]);

  const byId = new Map(offers.map((o) => [o.id, o]));

  // Группировка по продавцу
  const groups = useMemo(() => {
    const map = new Map<string, { sellerName: string; rows: { offer: (typeof offers)[number]; qty: number }[] }>();
    for (const item of items) {
      const offer = byId.get(item.id);
      if (!offer) continue;
      const key = offer.sellerSlug;
      const group = map.get(key) ?? { sellerName: offer.sellerBrand ?? offer.sellerName, rows: [] };
      group.rows.push({ offer, qty: item.qty });
      map.set(key, group);
    }
    return [...map.values()];
  }, [items, offers]);

  const total = groups.reduce(
    (sum, g) => sum + g.rows.reduce((s, r) => s + r.offer.price * r.qty, 0),
    0,
  );
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  if (!ready || loading) {
    return <div className="max-w-5xl mx-auto px-4 mt-8 text-slate-500">Загрузка корзины…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <h1 className="text-2xl font-bold text-slate-900">Корзина</h1>
        <div className="mt-6 bg-white border border-slate-200 rounded-lg py-16 text-center">
          <div className="text-slate-500">Корзина пуста</div>
          <Link href="/catalog" className="inline-block mt-3 text-orange-700 hover:text-orange-800 underline">
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">
        Корзина <span className="text-base font-normal text-slate-500">{totalQty} {plural(totalQty, ["позиция", "позиции", "позиций"])}</span>
      </h1>

      {dropped.length > 0 && (
        <div className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-2">
          {dropped.length} {plural(dropped.length, ["позиция удалена", "позиции удалены", "позиций удалены"])} — предложение продавца больше неактуально.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.sellerName} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-800">
                Продавец: {g.sellerName}
              </div>
              <div className="divide-y divide-slate-100">
                {g.rows.map(({ offer, qty }) => (
                  <div key={offer.id} className="flex gap-3 px-4 py-3 items-center">
                    <div className="flex-1 min-w-0">
                      <Link href={`/product/${offer.productSlug}`} className="text-sm font-medium text-slate-900 hover:text-orange-700">
                        {offer.productName}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Арт. {offer.productSku}
                        {offer.sellerSku && <span> · арт. продавца {offer.sellerSku}</span>}
                        <span> · {offer.categoryName}</span>
                      </div>
                      <div className="text-xs mt-1">
                        {offer.stock > 0 ? (
                          <span className="text-emerald-700">В наличии: {offer.stock} шт</span>
                        ) : (
                          <span className="text-amber-700">Под заказ, срок {offer.leadTimeDays} дн.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center rounded-md border border-slate-300 overflow-hidden shrink-0">
                      <button
                        onClick={() => setQty(offer.id, qty - 1)}
                        className="w-8 h-8 text-slate-600 hover:bg-slate-100"
                        aria-label="Уменьшить"
                      >
                        −
                      </button>
                      <input
                        value={qty}
                        onChange={(e) => setQty(offer.id, Number(e.target.value.replace(/\D/g, "")) || 0)}
                        className="w-12 h-8 text-center text-sm outline-none"
                        aria-label="Количество"
                      />
                      <button
                        onClick={() => setQty(offer.id, qty + 1)}
                        className="w-8 h-8 text-slate-600 hover:bg-slate-100"
                        aria-label="Увеличить"
                      >
                        +
                      </button>
                    </div>
                    <div className="w-28 text-right shrink-0">
                      <div className="font-semibold text-slate-900">{fmtPrice(offer.price * qty)}</div>
                      <div className="text-xs text-slate-500">{fmtPrice(offer.price)} / {offer.unit}</div>
                    </div>
                    <button
                      onClick={() => remove(offer.id)}
                      className="text-slate-400 hover:text-red-600 shrink-0 px-1"
                      aria-label="Удалить позицию"
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <aside className="bg-white border border-slate-200 rounded-lg p-4 lg:sticky lg:top-4">
          <div className="space-y-1.5 text-sm">
            {groups.map((g) => (
              <div key={g.sellerName} className="flex justify-between text-slate-600">
                <span className="truncate pr-2">{g.sellerName}</span>
                <span>{fmtPrice(g.rows.reduce((s, r) => s + r.offer.price * r.qty, 0))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-medium text-slate-900">Итого</span>
            <span className="text-2xl font-bold text-orange-600">{fmtPrice(total)}</span>
          </div>
          <Link
            href="/checkout"
            className="block mt-4 text-center bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-md py-2.5 transition-colors"
          >
            Оформить заявку
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Заявка без онлайн-оплаты: менеджер продавца свяжется с вами для согласования счёта и отгрузки.
          </p>
        </aside>
      </div>
    </div>
  );
}
