"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveCategoryAction, type CategoryFormResult } from "@/app/actions/admin";

const initial: CategoryFormResult = {};

export interface CategoryFormData {
  id?: string;
  name: string;
  slug: string;
  parentId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  isActive: boolean;
}

export default function CategoryForm({
  data,
  parents,
}: {
  data: CategoryFormData;
  parents: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveCategoryAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.id) router.push(`/admin/categories/${state.id}`);
  }, [state, router]);

  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500";

  return (
    <form action={formAction} className="space-y-3">
      {data.id && <input type="hidden" name="id" value={data.id} />}
      {state.error && (
        <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">{state.error}</div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Название *</span>
          <input name="name" defaultValue={data.name} required className={`${inputCls} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Slug (URL) *</span>
          <input name="slug" defaultValue={data.slug} required pattern="[a-z0-9-]+" className={`${inputCls} mt-1`} placeholder="end-mills" />
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Родительская категория</span>
          <select name="parentId" defaultValue={data.parentId ?? ""} className={`${inputCls} mt-1 bg-white`}>
            <option value="">— корневая —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Порядок сортировки</span>
          <input name="sortOrder" type="number" defaultValue={data.sortOrder} className={`${inputCls} mt-1`} />
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input type="checkbox" name="isActive" defaultChecked={data.isActive} className="accent-orange-600 w-4 h-4" />
          <span className="text-sm text-slate-700">Активна</span>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">SEO-заголовок</span>
        <input name="seoTitle" defaultValue={data.seoTitle ?? ""} className={`${inputCls} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">SEO-описание</span>
        <textarea name="seoDescription" rows={2} defaultValue={data.seoDescription ?? ""} className={`${inputCls} mt-1`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md px-5 py-2 text-sm transition-colors"
      >
        {pending ? "Сохраняем…" : data.id ? "Сохранить категорию" : "Создать категорию"}
      </button>
    </form>
  );
}
