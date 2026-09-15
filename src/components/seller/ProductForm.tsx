"use client";

import { useActionState, useMemo, useState } from "react";
import type { AttributeDef } from "@/data/nomenclature";
import { saveProductAction, type ProductFormState } from "@/app/actions/seller";
import type { LeafCategoryInfo, SellerProductDetail } from "@/services/seller.service";

const initial: ProductFormState = {};

export default function ProductForm({
  categories,
  initialData,
}: {
  categories: LeafCategoryInfo[];
  /** Если передан — режим редактирования */
  initialData?: SellerProductDetail;
}) {
  const editing = Boolean(initialData);
  const [state, formAction, pending] = useActionState(saveProductAction, initial);

  const [categorySlug, setCategorySlug] = useState(
    initialData?.product.categorySlug ?? categories[0]?.slug ?? "",
  );
  const category = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categories, categorySlug],
  );
  const schema: AttributeDef[] = category?.schema ?? [];

  const [attrs, setAttrs] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialData?.product.attributes ?? {}).map(([k, v]) => [k, String(v)]),
    ),
  );

  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-orange-500";
  const err = (field: string) => state.errors?.[field];

  const setAttr = (code: string, value: string) => setAttrs((prev) => ({ ...prev, [code]: value }));

  const attrField = (def: AttributeDef) => {
    const value = attrs[def.code] ?? "";
    const error = err(`attr.${def.code}`);
    const label = (
      <span className="text-sm font-medium text-slate-700">
        {def.label}
        {def.required && <span className="text-red-500"> *</span>}
        {def.unit && <span className="text-slate-400 font-normal">, {def.unit}</span>}
      </span>
    );
    let control: React.ReactNode;
    if (def.type === "enum" && def.values) {
      control = (
        <select value={value} onChange={(e) => setAttr(def.code, e.target.value)} className={`${inputCls} mt-1 bg-white`}>
          <option value="">— не указано —</option>
          {def.values.map((v) => (
            <option key={String(v)} value={String(v)}>
              {String(v)}
            </option>
          ))}
        </select>
      );
    } else if (def.type === "number") {
      if (def.values?.length) {
        control = (
          <select value={value} onChange={(e) => setAttr(def.code, e.target.value)} className={`${inputCls} mt-1 bg-white`}>
            <option value="">— не указано —</option>
            {def.values.map((v) => (
              <option key={String(v)} value={String(v)}>
                {String(v)}
              </option>
            ))}
          </select>
        );
      } else {
        control = (
          <input
            type="number"
            step={def.step ?? "any"}
            min={def.min}
            max={def.max}
            value={value}
            onChange={(e) => setAttr(def.code, e.target.value)}
            className={`${inputCls} mt-1`}
          />
        );
      }
    } else if (def.type === "bool") {
      control = (
        <select value={value} onChange={(e) => setAttr(def.code, e.target.value)} className={`${inputCls} mt-1 bg-white`}>
          <option value="">— не указано —</option>
          <option value="true">Да</option>
          <option value="false">Нет</option>
        </select>
      );
    } else {
      control = (
        <input value={value} onChange={(e) => setAttr(def.code, e.target.value)} className={`${inputCls} mt-1`} />
      );
    }
    return (
      <label key={def.code} className="block">
        {label}
        {control}
        {error && <span className="text-xs text-red-600 mt-0.5 block">{error}</span>}
      </label>
    );
  };

  return (
    <form action={formAction} className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
      {editing && <input type="hidden" name="productId" value={initialData!.product.id} />}

      <div className="space-y-4">
        {err("_") && (
          <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">{err("_")}</div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Основное</h2>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Категория <span className="text-red-500">*</span>
            </span>
            <select
              name="categorySlug"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              disabled={editing}
              className={`${inputCls} mt-1 bg-white ${editing ? "opacity-60" : ""}`}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                </option>
              ))}
            </select>
            {editing && <span className="text-xs text-slate-400 mt-1 block">Категория не меняется после создания</span>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Название <span className="text-red-500">*</span>
            </span>
            <input name="name" defaultValue={initialData?.product.name} required className={`${inputCls} mt-1`} placeholder="Фреза концевая ⌀10 Z4 HSS-E" />
            {err("name") && <span className="text-xs text-red-600 mt-0.5 block">{err("name")}</span>}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Описание</span>
            <textarea name="description" rows={3} defaultValue={initialData?.product.description ?? ""} className={`${inputCls} mt-1`} />
          </label>

          <label className="block w-40">
            <span className="text-sm font-medium text-slate-700">Единица</span>
            <select name="unit" defaultValue={initialData?.product.unit ?? "шт"} className={`${inputCls} mt-1 bg-white`}>
              <option value="шт">шт</option>
              <option value="комплект">комплект</option>
              <option value="набор">набор</option>
            </select>
          </label>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Характеристики ({category?.name ?? ""})</h2>
          {schema.length === 0 ? (
            <div className="text-sm text-slate-400">Выберите категорию</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">{schema.map(attrField)}</div>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Цена и наличие</h2>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Цена, ₽ с НДС <span className="text-red-500">*</span>
            </span>
            <input name="price" type="number" step="0.01" min="0" required defaultValue={initialData?.offer.price ?? ""} className={`${inputCls} mt-1`} />
            {err("price") && <span className="text-xs text-red-600 mt-0.5 block">{err("price")}</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Остаток, шт</span>
              <input name="stock" type="number" min="0" defaultValue={initialData?.offer.stock ?? 0} className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Срок, дн.</span>
              <input name="leadTimeDays" type="number" min="0" defaultValue={initialData?.offer.leadTimeDays ?? 0} className={`${inputCls} mt-1`} />
              <span className="text-xs text-slate-400">0 — со склада</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Мин. партия</span>
              <input name="minOrderQty" type="number" min="1" defaultValue={initialData?.offer.minOrderQty ?? 1} className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Ваш артикул</span>
              <input name="sellerSku" defaultValue={initialData?.offer.sellerSku ?? ""} className={`${inputCls} mt-1`} />
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <input type="hidden" name="attributes" value={JSON.stringify(attrs)} />
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md py-2.5 transition-colors"
          >
            {pending ? "Сохраняем…" : editing ? "Сохранить и отправить на модерацию" : "Создать и отправить на модерацию"}
          </button>
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending}
            className="w-full border border-slate-300 hover:border-slate-400 rounded-md py-2 font-medium text-slate-700"
          >
            Сохранить черновик
          </button>
          <p className="text-xs text-slate-500">
            Карточка появится в каталоге после одобрения модератором. Цена и остаток обновляются сразу, без модерации.
          </p>
        </div>
      </aside>
    </form>
  );
}
