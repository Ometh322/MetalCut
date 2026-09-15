"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useCart, useCartOffers } from "@/components/cart/CartProvider";
import { createOrderAction, type CheckoutFormState } from "@/app/actions/orders";
import { fmtPrice } from "@/lib/format";

const initial: CheckoutFormState = {};

export default function CheckoutForm({
  user,
}: {
  user: { name: string; phone: string; email: string } | null;
}) {
  const router = useRouter();
  const { items, clear, ready } = useCart();
  const { offers, loading } = useCartOffers();
  const [state, formAction, pending] = useActionState(createOrderAction, initial);
  const clearedFor = useRef<string | null>(null);

  const byId = new Map(offers.map((o) => [o.id, o]));
  const rows = useMemo(
    () => items.map((i) => ({ qty: i.qty, offer: byId.get(i.id)! })).filter((r) => r.offer),
    [items, offers],
  );
  const total = rows.reduce((s, r) => s + r.offer.price * r.qty, 0);

  // Успех: чистим корзину и уходим на страницу подтверждения
  useEffect(() => {
    if (state.ok && state.number && clearedFor.current !== state.number) {
      clearedFor.current = state.number;
      clear();
      router.replace(`/checkout/success?number=${encodeURIComponent(state.number)}`);
    }
  }, [state, clear, router]);

  if (!ready || loading) {
    return <div className="max-w-4xl mx-auto px-4 mt-8 text-slate-500">Загрузка…</div>;
  }

  if (items.length === 0 && !state.ok) {
    return (
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <h1 className="text-2xl font-bold text-slate-900">Оформление заявки</h1>
        <div className="mt-6 bg-white border border-slate-200 rounded-lg py-16 text-center">
          <div className="text-slate-500">Корзина пуста — оформлять нечего</div>
          <Link href="/catalog" className="inline-block mt-3 text-orange-700 hover:text-orange-800 underline">
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500";

  return (
    <div className="max-w-4xl mx-auto px-4 mt-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Оформление заявки</h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ offerId: i.id, qty: i.qty })))} />

          {state.error && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">
              {state.error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Контактное имя *</span>
              <input name="name" defaultValue={user?.name} required className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Телефон *</span>
              <input name="phone" defaultValue={user?.phone} required placeholder="+7 900 000-00-00" className={`${inputCls} mt-1`} />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input name="email" type="email" defaultValue={user?.email} className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Компания</span>
              <input name="company" placeholder="ООО «Пример»" className={`${inputCls} mt-1`} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Комментарий к заявке</span>
            <textarea
              name="comment"
              rows={3}
              placeholder="Сроки отгрузки, документы, особые требования…"
              className={`${inputCls} mt-1`}
            />
          </label>

          <div className="text-xs text-slate-500">
            {user ? "Заявка будет привязана к вашему аккаунту — история в кабинете." : "Заявка оформляется без регистрации. Менеджер свяжется по указанным контактам."}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md py-2.5 transition-colors"
          >
            {pending ? "Отправляем…" : `Отправить заявку · ${fmtPrice(total)}`}
          </button>
        </form>

        <aside className="bg-white border border-slate-200 rounded-lg p-4 lg:sticky lg:top-4">
          <div className="font-medium text-slate-900 mb-2">Ваша заявка</div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {rows.map(({ offer, qty }) => (
              <div key={offer.id} className="flex justify-between gap-2 text-sm">
                <span className="text-slate-600 min-w-0">
                  <span className="block truncate">{offer.productName}</span>
                  <span className="text-xs text-slate-400">
                    {offer.sellerBrand ?? offer.sellerName} · {qty} {offer.unit}
                  </span>
                </span>
                <span className="whitespace-nowrap">{fmtPrice(offer.price * qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-medium text-slate-900">Итого</span>
            <span className="text-xl font-bold text-orange-600">{fmtPrice(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
