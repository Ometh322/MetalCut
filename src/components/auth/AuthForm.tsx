"use client";

import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, formAction, pending] = useActionState(mode === "login" ? loginAction : registerAction, initial);

  const inputCls =
    "w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500";

  return (
    <form action={formAction} className="space-y-3">
      {next?.startsWith("/") && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">
          {state.error}
        </div>
      )}

      {mode === "register" && (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Имя</span>
          <input name="name" required minLength={2} className={`${inputCls} mt-1`} />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input name="email" type="email" required autoComplete="email" className={`${inputCls} mt-1`} />
      </label>
      {mode === "register" && (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Телефон</span>
          <input name="phone" placeholder="+7 900 000-00-00" className={`${inputCls} mt-1`} />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Пароль</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 6 : 1}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={`${inputCls} mt-1`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md py-2.5 transition-colors"
      >
        {pending ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
      </button>
    </form>
  );
}
