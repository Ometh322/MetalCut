"use client";

import { useRouter } from "next/navigation";
import type { FilterState, SortKey, ViewMode } from "@/lib/catalog-url";
import { SORT_OPTIONS, toSearchParams, withSort, withView } from "@/lib/catalog-url";
import { plural } from "@/lib/format";

export default function Toolbar({ basePath, state, total }: { basePath: string; state: FilterState; total: number }) {
  const router = useRouter();
  const go = (next: FilterState) => {
    const qs = toSearchParams(next).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-600">
        Найдено: <b>{total}</b> {plural(total, ["товар", "товара", "товаров"])}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={state.sort}
          onChange={(e) => go(withSort(state, e.target.value as SortKey))}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white cursor-pointer"
          aria-label="Сортировка"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-md border border-slate-300 overflow-hidden">
          <button
            onClick={() => state.view !== "list" && go(withView(state, "list" as ViewMode))}
            className={`px-2.5 py-1.5 text-sm ${state.view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
            title="Список"
          >
            ☰
          </button>
          <button
            onClick={() => state.view !== "grid" && go(withView(state, "grid" as ViewMode))}
            className={`px-2.5 py-1.5 text-sm ${state.view === "grid" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
            title="Плитка"
          >
            ▦
          </button>
        </div>
      </div>
    </div>
  );
}
