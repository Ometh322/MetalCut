"use client";

import { useActionState, useState } from "react";
import type { AttributeDef } from "@/data/nomenclature";
import { saveSchemaAction, type CategoryFormResult } from "@/app/actions/admin";

const initial: CategoryFormResult = {};

interface Draft {
  uid: string;
  code: string;
  label: string;
  type: AttributeDef["type"];
  unit: string;
  required: boolean;
  isKey: boolean;
  filter: AttributeDef["filter"];
  valuesText: string; // значения по одному в строке / через запятую
  min: string;
  max: string;
  step: string;
}

const newUid = () => Math.random().toString(36).slice(2, 10);

const toDraft = (def: AttributeDef): Draft => ({
  uid: newUid(),
  code: def.code,
  label: def.label,
  type: def.type,
  unit: def.unit ?? "",
  required: Boolean(def.required),
  isKey: Boolean(def.isKey),
  filter: def.filter,
  valuesText: (def.values ?? []).map(String).join("\n"),
  min: def.min !== undefined ? String(def.min) : "",
  max: def.max !== undefined ? String(def.max) : "",
  step: def.step !== undefined ? String(def.step) : "",
});

const fromDraft = (d: Draft): AttributeDef => {
  const values = d.valuesText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    code: d.code.trim(),
    label: d.label.trim(),
    type: d.type,
    filter: d.filter,
    ...(values.length ? { values: d.type === "number" ? values.map(Number) : values } : {}),
    ...(d.unit.trim() ? { unit: d.unit.trim() } : {}),
    ...(d.required ? { required: true } : {}),
    ...(d.isKey ? { isKey: true } : {}),
    ...(d.min.trim() && Number.isFinite(Number(d.min)) ? { min: Number(d.min) } : {}),
    ...(d.max.trim() && Number.isFinite(Number(d.max)) ? { max: Number(d.max) } : {}),
    ...(d.step.trim() && Number.isFinite(Number(d.step)) ? { step: Number(d.step) } : {}),
  };
};

export default function SchemaEditor({
  categoryId,
  initialSchema,
}: {
  categoryId: string;
  initialSchema: AttributeDef[];
}) {
  const [state, formAction, pending] = useActionState(saveSchemaAction, initial);
  const [drafts, setDrafts] = useState<Draft[]>(initialSchema.map(toDraft));
  const [expanded, setExpanded] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const move = (i: number, dir: -1 | 1) =>
    setDrafts((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const add = () => {
    const d: Draft = {
      uid: newUid(),
      code: "",
      label: "",
      type: "enum",
      unit: "",
      required: false,
      isKey: false,
      filter: "checkbox",
      valuesText: "",
      min: "",
      max: "",
      step: "",
    };
    setDrafts((prev) => [...prev, d]);
    setExpanded(d.uid);
  };

  const inputCls = "w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm outline-none focus:border-orange-500";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Схема атрибутов ({drafts.length})</h2>
        <button onClick={add} className="text-sm bg-slate-900 hover:bg-slate-700 text-white rounded-md px-3 py-1.5">
          + Атрибут
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Схема управляет формой карточки продавца, фильтрами каталога, целью AI-подбора и маппингом импорта.
        Изменение кода существующего атрибута не переносит уже заполненные значения товаров.
      </p>

      {state.error && (
        <div className="mt-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">{state.error}</div>
      )}
      {state.ok && (
        <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md px-4 py-2">
          Схема сохранена
        </div>
      )}

      <form action={formAction} className="mt-3">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="schema" value={JSON.stringify(drafts.map(fromDraft))} />

        <div className="space-y-2">
          {drafts.map((d, i) => {
            const open = expanded === d.uid;
            return (
              <div key={d.uid} className="border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : d.uid)}
                    className="text-slate-400 hover:text-slate-700 text-xs w-4"
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <code className="text-xs text-orange-800 bg-orange-50 rounded px-1.5 py-0.5 min-w-16 text-center">{d.code || "?"}</code>
                  <span className="text-sm text-slate-800 flex-1 truncate">{d.label || "(без названия)"}</span>
                  <span className="text-xs text-slate-400">{d.type}</span>
                  {d.required && <span className="text-[10px] text-red-500 border border-red-200 rounded px-1">обяз.</span>}
                  {d.isKey && <span className="text-[10px] text-blue-600 border border-blue-200 rounded px-1">ключ.</span>}
                  <span className="text-xs text-slate-400">фильтр: {d.filter === "checkbox" ? "чекбоксы" : d.filter === "range" ? "диапазон" : "нет"}</span>
                  <button type="button" onClick={() => move(i, -1)} className="text-slate-400 hover:text-slate-700 px-1" title="Выше">↑</button>
                  <button type="button" onClick={() => move(i, 1)} className="text-slate-400 hover:text-slate-700 px-1" title="Ниже">↓</button>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-600 px-1"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
                {open && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 px-3 pb-3 pt-1 border-t border-slate-100">
                    <label className="block">
                      <span className="text-xs text-slate-500">Код (ключ в JSONB)</span>
                      <input value={d.code} onChange={(e) => update(i, { code: e.target.value })} className={`${inputCls} mt-0.5`} placeholder="diameter" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500">Название</span>
                      <input value={d.label} onChange={(e) => update(i, { label: e.target.value })} className={`${inputCls} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500">Тип</span>
                      <select value={d.type} onChange={(e) => update(i, { type: e.target.value as Draft["type"] })} className={`${inputCls} mt-0.5 bg-white`}>
                        <option value="enum">Список (enum)</option>
                        <option value="number">Число</option>
                        <option value="bool">Да/Нет</option>
                        <option value="string">Строка</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500">Единица (мм, °…)</span>
                      <input value={d.unit} onChange={(e) => update(i, { unit: e.target.value })} className={`${inputCls} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500">Фильтр в каталоге</span>
                      <select value={d.filter} onChange={(e) => update(i, { filter: e.target.value as Draft["filter"] })} className={`${inputCls} mt-0.5 bg-white`}>
                        <option value="checkbox">Чекбоксы</option>
                        <option value="range">Диапазон от/до</option>
                        <option value="none">Без фильтра</option>
                      </select>
                    </label>
                    <div className="flex items-center gap-4 pt-5">
                      <label className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="checkbox" checked={d.required} onChange={(e) => update(i, { required: e.target.checked })} className="accent-orange-600" />
                        Обязательный
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-slate-700">
                        <input type="checkbox" checked={d.isKey} onChange={(e) => update(i, { isKey: e.target.checked })} className="accent-orange-600" />
                        Ключевой
                      </label>
                    </div>
                    {(d.type === "enum" || (d.type === "number" && d.filter === "checkbox")) && (
                      <label className="block sm:col-span-2 lg:col-span-3">
                        <span className="text-xs text-slate-500">Допустимые значения ({d.type === "number" ? "числа" : "по одному в строке или через запятую"})</span>
                        <textarea
                          value={d.valuesText}
                          onChange={(e) => update(i, { valuesText: e.target.value })}
                          rows={Math.min(6, Math.max(2, d.valuesText.split("\n").length))}
                          className={`${inputCls} mt-0.5 font-mono`}
                          placeholder={d.type === "number" ? "2&#10;4&#10;6" : "HSS&#10;HSS-E&#10;Твёрдый сплав"}
                        />
                      </label>
                    )}
                    {d.type === "number" && (
                      <>
                        <label className="block">
                          <span className="text-xs text-slate-500">Мин.</span>
                          <input value={d.min} onChange={(e) => update(i, { min: e.target.value })} className={`${inputCls} mt-0.5`} inputMode="decimal" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-slate-500">Макс.</span>
                          <input value={d.max} onChange={(e) => update(i, { max: e.target.value })} className={`${inputCls} mt-0.5`} inputMode="decimal" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-slate-500">Шаг</span>
                          <input value={d.step} onChange={(e) => update(i, { step: e.target.value })} className={`${inputCls} mt-0.5`} inputMode="decimal" />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {drafts.length === 0 && (
            <div className="border border-dashed border-slate-300 rounded-lg py-8 text-center text-sm text-slate-400">
              Схема пуста — добавьте атрибуты категории
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md px-5 py-2 text-sm transition-colors"
        >
          {pending ? "Сохраняем…" : "Сохранить схему"}
        </button>
      </form>
    </div>
  );
}
