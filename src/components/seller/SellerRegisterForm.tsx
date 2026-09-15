"use client";

import { useActionState } from "react";
import { registerSellerAction, type SellerRegisterState } from "@/app/actions/seller";

const initial: SellerRegisterState = {};

export default function SellerRegisterForm() {
  const [state, formAction, pending] = useActionState(registerSellerAction, initial);
  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500";

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">{state.error}</div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Компания *</span>
          <input name="company" required placeholder='ООО «Пример»' className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Бренд (витрина) *</span>
          <input name="brand" required placeholder="MyTool" className={`${inputCls} mt-1`} />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">ИНН</span>
          <input name="inn" placeholder="7700000000" className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Контактное лицо *</span>
          <input name="managerName" required className={`${inputCls} mt-1`} />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email *</span>
          <input name="email" type="email" required className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Пароль *</span>
          <input name="password" type="password" required minLength={6} className={`${inputCls} mt-1`} />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">О компании</span>
        <textarea name="description" rows={3} placeholder="Ассортимент, склады, сроки отгрузки…" className={`${inputCls} mt-1`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md py-2.5 transition-colors"
      >
        {pending ? "Отправляем…" : "Зарегистрировать компанию"}
      </button>
      <p className="text-xs text-slate-500">После отправки заявка попадёт на модерацию администратору платформы.</p>
    </form>
  );
}
