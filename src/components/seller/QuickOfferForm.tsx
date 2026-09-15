"use client";

import { useActionState } from "react";
import { quickOfferAction, type ProductFormState } from "@/app/actions/seller";

const initial: ProductFormState = {};

/** Быстрое обновление цены/остатка/срока без отправки карточки на модерацию */
export default function QuickOfferForm({
  productId,
  initial: init,
}: {
  productId: string;
  initial: { price: number; stock: number; leadTimeDays: number };
}) {
  const [state, formAction, pending] = useActionState(quickOfferAction, initial);

  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500";

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h2 className="font-semibold text-slate-900">Быстрое обновление</h2>
      <p className="text-xs text-slate-500">Только цена и наличие — карточка не уходит на модерацию.</p>
      <input type="hidden" name="productId" value={productId} />
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Цена, ₽</span>
          <input name="price" type="number" step="0.01" min="0" defaultValue={init.price} className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Остаток</span>
          <input name="stock" type="number" min="0" defaultValue={init.stock} className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Срок, дн.</span>
          <input name="leadTimeDays" type="number" min="0" defaultValue={init.leadTimeDays} className={`${inputCls} mt-1`} />
        </label>
      </div>
      {state.ok && <div className="text-xs text-emerald-700">Сохранено ✓</div>}
      {state.errors?.["_"] && <div className="text-xs text-red-600">{state.errors["_"]}</div>}
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-slate-300 hover:border-slate-400 rounded-md py-2 font-medium text-slate-700 text-sm disabled:opacity-50"
      >
        {pending ? "Сохраняем…" : "Обновить цену/остаток"}
      </button>
    </form>
  );
}
