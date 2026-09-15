"use client";

import { useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import * as XLSX from "xlsx";
import type { AttributeDef } from "@/data/nomenclature";
import { importProductsAction, type ImportState } from "@/app/actions/seller";
import type { LeafCategoryInfo } from "@/services/seller.service";

const initial: ImportState = {};

type Mapping = Record<string, string>; // target → column header

const SYSTEM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "name", label: "Название", required: true },
  { key: "price", label: "Цена, ₽", required: true },
  { key: "stock", label: "Остаток, шт" },
  { key: "leadTimeDays", label: "Срок поставки, дн." },
  { key: "sellerSku", label: "Артикул продавца" },
  { key: "description", label: "Описание" },
];

/**
 * CSV читаем как текст с детекцией кодировки: UTF-8 (BOM/без), CP1251 (русский Excel).
 * XLSX-бинарники — как массив байт.
 */
async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  if (isCsv) {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    // CP1251-кириллица, прочитанная как UTF-8, даёт U+FFFD — перекодируем
    if (text.includes("\uFFFD")) {
      try {
        text = new TextDecoder("windows-1251").decode(buf);
      } catch {
        // оставляем как есть
      }
    }
    return XLSX.read(text, { type: "string" });
  }
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

export default function ImportWizard({ categories }: { categories: LeafCategoryInfo[] }) {
  const [state, formAction, pending] = useActionState(importProductsAction, initial);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const category = useMemo(() => categories.find((c) => c.slug === categorySlug), [categories, categorySlug]);
  const schema: AttributeDef[] = category?.schema ?? [];

  const [mapping, setMapping] = useState<Mapping>({});

  const parseFile = async (file: File) => {
    const wb = await readWorkbook(file);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
    if (!data.length) return;
    const hdr = (data[0] as unknown[]).map((h) => String(h ?? "").trim());
    const body = (data.slice(1, 501) as unknown[][])
      .map((r) => r.map((c) => String(c ?? "").trim()))
      .filter((r) => r.some((c) => c !== ""));
    setHeaders(hdr);
    setRows(body);
    setFileName(file.name);
    // автоподбор колонок по названиям
    const auto: Mapping = {};
    const findCol = (re: RegExp) => hdr.find((h) => re.test(h.toLowerCase()));
    const autoMap: Record<string, RegExp[]> = {
      name: [/^названи/, /^наименован/, /^товар/, /^описание товара/],
      price: [/цена/, /price/, /стоимост/],
      stock: [/остат/, /кол-?во/, /налич/],
      leadTimeDays: [/срок/, /доставк/],
      sellerSku: [/артикул/, /sku/, /код/],
      description: [/описан/],
    };
    for (const [key, res] of Object.entries(autoMap)) {
      const col = res.map((r) => findCol(r)).find(Boolean);
      if (col) auto[key] = col;
    }
    setMapping(auto);
  };

  const mappedRow = (row: string[]): { name: string; price: number; stock?: number; leadTimeDays?: number; sellerSku?: string; description?: string; attributes: Record<string, string> } => {
    const get = (target: string) => {
      const col = mapping[target];
      if (!col) return "";
      const idx = headers.indexOf(col);
      return idx >= 0 ? (row[idx] ?? "") : "";
    };
    const attributes: Record<string, string> = {};
    for (const def of schema) {
      const v = get(`attr.${def.code}`);
      if (v !== "") attributes[def.code] = v;
    }
    return {
      name: get("name"),
      price: Number(get("price").replace(",", ".").replace(/[^\d.]/g, "")),
      stock: get("stock") ? Number(get("stock").replace(/[^\d-]/g, "")) || 0 : undefined,
      leadTimeDays: get("leadTimeDays") ? Number(get("leadTimeDays").replace(/[^\d]/g, "")) || 0 : undefined,
      sellerSku: get("sellerSku") || undefined,
      description: get("description") || undefined,
      attributes,
    };
  };

  const preview = useMemo(() => rows.slice(0, 8).map(mappedRow), [rows, mapping, schema]);

  const rowIssues = (r: ReturnType<typeof mappedRow>): string[] => {
    const issues: string[] = [];
    if (!r.name) issues.push("нет названия");
    if (!(r.price > 0)) issues.push("нет цены");
    for (const def of schema) {
      if (def.required && (r.attributes[def.code] === undefined || r.attributes[def.code] === "")) {
        issues.push(def.label);
      } else if (r.attributes[def.code] !== undefined) {
        if (def.type === "enum" && def.values && !def.values.map(String).includes(r.attributes[def.code])) {
          issues.push(`${def.label}: недопустимое «${r.attributes[def.code]}»`);
        }
        if (def.type === "number" && !Number.isFinite(Number(r.attributes[def.code].replace(",", ".")))) {
          issues.push(`${def.label}: не число`);
        }
      }
    }
    return issues;
  };

  const importRows = useMemo(() => rows.map(mappedRow), [rows, mapping, schema]);
  const validCount = importRows.filter((r) => rowIssues(r).length === 0).length;

  const setMap = (target: string, col: string) =>
    setMapping((prev) => {
      const next = { ...prev };
      if (col) next[target] = col;
      else delete next[target];
      return next;
    });

  const colSelect = (target: string, label: string, required?: boolean) => (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <select
        value={mapping[target] ?? ""}
        onChange={(e) => setMap(target, e.target.value)}
        className="w-full mt-1 border border-slate-300 rounded-md px-2 py-2 text-sm bg-white"
      >
        <option value="">— не импортировать —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );

  if (state.ok && state.results) {
    const created = state.results.filter((r) => r.status === "created").length;
    const updated = state.results.filter((r) => r.status === "updated").length;
    const errors = state.results.filter((r) => r.status === "error");
    return (
      <div className="max-w-3xl">
        <h2 className="text-lg font-bold text-slate-900">Импорт завершён</h2>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="text-emerald-700 font-medium">Создано: {created}</span>
          <span className="text-blue-700 font-medium">Обновлено: {updated}</span>
          <span className="text-red-700 font-medium">Ошибок: {errors.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Созданные карточки отправлены на модерацию со статусом «На модерации».</p>
        {state.results.length > 0 && (
          <div className="mt-4 bg-white border border-slate-200 rounded-lg max-h-96 overflow-y-auto divide-y divide-slate-100 text-sm">
            {state.results.map((r) => (
              <div key={r.row} className="flex gap-3 px-4 py-2">
                <span className="text-slate-400 w-10 shrink-0">#{r.row}</span>
                <span className="flex-1 min-w-0 truncate">{r.name}</span>
                <span
                  className={
                    r.status === "created" ? "text-emerald-700" : r.status === "updated" ? "text-blue-700" : "text-red-600"
                  }
                >
                  {r.status === "created" ? "создан" : r.status === "updated" ? "обновлён" : r.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Шаг 1: файл */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="font-semibold text-slate-900">1. Файл прайса</h2>
        <p className="text-sm text-slate-500 mt-1">CSV или Excel (xlsx/xls), до 500 строк. Первая строка — заголовки колонок.</p>
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
            className="text-sm"
          />
          {fileName && <span className="text-sm text-emerald-700">✓ {fileName} ({rows.length} строк)</span>}
        </div>
        {headers.length > 0 && (
          <div className="mt-3 text-xs text-slate-500">
            Колонки файла: {headers.map((h) => `"${h}"`).join(", ")}
          </div>
        )}
      </section>

      {/* Шаг 2: категория и маппинг */}
      {headers.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900">2. Категория и соответствие колонок</h2>
          <label className="block mt-3">
            <span className="text-sm font-medium text-slate-700">Категория импортируемых товаров *</span>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full mt-1 border border-slate-300 rounded-md px-2 py-2 text-sm bg-white"
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SYSTEM_FIELDS.map((f) => colSelect(f.key, f.label, f.required))}
            {schema.map((def) => colSelect(`attr.${def.code}`, `${def.label}${def.required ? " *" : ""}${def.unit ? `, ${def.unit}` : ""}`, def.required))}
          </div>
        </section>
      )}

      {/* Шаг 3: предпросмотр */}
      {headers.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900">3. Предпросмотр</h2>
          <p className="text-sm text-slate-500 mt-1">
            Готово к импорту: <b className="text-emerald-700">{validCount}</b> из {rows.length}. Строки с вашим артикулом обновят цену/остаток существующих товаров.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-3">#</th>
                  <th className="py-1.5 pr-3">Название</th>
                  <th className="py-1.5 pr-3">Цена</th>
                  <th className="py-1.5 pr-3">Остаток</th>
                  <th className="py-1.5 pr-3">Характеристики</th>
                  <th className="py-1.5">Статус</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => {
                  const issues = rowIssues(r);
                  return (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      <td className="py-1.5 pr-3 text-slate-400">{i + 1}</td>
                      <td className="py-1.5 pr-3 max-w-48 truncate">{r.name || "—"}</td>
                      <td className="py-1.5 pr-3">{r.price || "—"}</td>
                      <td className="py-1.5 pr-3">{r.stock ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-slate-500 max-w-72 truncate">
                        {Object.entries(r.attributes)
                          .map(([code, v]) => `${schema.find((d) => d.code === code)?.label ?? code}: ${v}`)
                          .join("; ") || "—"}
                      </td>
                      <td className={`py-1.5 ${issues.length ? "text-red-600" : "text-emerald-700"}`}>
                        {issues.length ? issues.join(", ") : "ок"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form action={formAction} className="mt-4">
            <input type="hidden" name="categorySlug" value={categorySlug} />
            <input type="hidden" name="rows" value={JSON.stringify(importRows)} />
            {state.error && (
              <div className="mb-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">{state.error}</div>
            )}
            <button
              type="submit"
              disabled={pending || validCount === 0}
              className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-medium rounded-md px-5 py-2.5 transition-colors"
            >
              {pending ? "Импортируем…" : `Импортировать ${validCount} строк`}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
