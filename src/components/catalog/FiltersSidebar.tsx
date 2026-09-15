"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttributeDef } from "@/data/nomenclature";
import type { FilterState } from "@/lib/catalog-url";
import {
  clearFilters,
  hasActiveFilters,
  toSearchParams,
  withAttrRange,
  withAttrValue,
  withBrand,
  withPrice,
} from "@/lib/catalog-url";
import type { AttrFacetData, FacetCount } from "@/services/catalog.service";

interface Props {
  basePath: string;
  state: FilterState;
  attrFacets: AttrFacetData[];
  brands: FacetCount[];
  priceBounds: { min: number; max: number };
}

export default function FiltersSidebar({ basePath, state, attrFacets, brands, priceBounds }: Props) {
  const router = useRouter();
  const go = (next: FilterState) => {
    const qs = toSearchParams(next).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  const hasAny = hasActiveFilters(state);
  const filterableAttrs = attrFacets.filter((f) => f.def.filter !== "none" && (f.counts.length > 0 || f.def.filter === "range"));

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-2">
      <div className="flex items-center justify-between py-2">
        <span className="font-semibold text-slate-900">Фильтры</span>
        {hasAny && (
          <button onClick={() => go(clearFilters(state))} className="text-sm text-orange-700 hover:text-orange-800">
            Сбросить всё
          </button>
        )}
      </div>

      {priceBounds.max > 0 && (
        <Group title="Цена, ₽" defaultOpen>
          <RangeInputs
            key={`${state.priceMin ?? ""}-${state.priceMax ?? ""}`}
            bounds={priceBounds}
            curMin={state.priceMin}
            curMax={state.priceMax}
            onApply={(min, max) => go(withPrice(state, min, max))}
          />
        </Group>
      )}

      {brands.length > 1 && (
        <Group title="Бренд" defaultOpen>
          <EnumList
            counts={brands}
            selected={state.brands}
            onToggle={(v) => go(withBrand(state, v))}
          />
        </Group>
      )}

      {filterableAttrs.map((f, i) => (
        <Group key={f.def.code} title={f.def.label + (f.def.unit ? `, ${f.def.unit}` : "")} defaultOpen={i < 3}>
          {f.def.filter === "checkbox" ? (
            <EnumList
              counts={f.counts}
              selected={state.attrs[f.def.code]?.values ?? []}
              onToggle={(v) => go(withAttrValue(state, f.def.code, v))}
            />
          ) : (
            <RangeInputs
              key={`${f.def.code}-${state.attrs[f.def.code]?.min ?? ""}-${state.attrs[f.def.code]?.max ?? ""}`}
              bounds={f.bounds}
              curMin={state.attrs[f.def.code]?.min}
              curMax={state.attrs[f.def.code]?.max}
              unit={f.def.unit}
              onApply={(min, max) => go(withAttrRange(state, f.def.code, min, max))}
            />
          )}
        </Group>
      ))}
    </div>
  );
}

// --- Сворачиваемая группа (нативный details — работает без JS-состояния) ---

function Group({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="border-b border-slate-200 py-2 group last:border-b-0">
      <summary className="flex items-center justify-between cursor-pointer select-none text-sm font-medium text-slate-800 list-none">
        {title}
        <span className="text-slate-400 text-xs transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="pt-2 pb-1">{children}</div>
    </details>
  );
}

// --- Чекбокс-список значений со счётчиками (как в DNS) ---

function EnumList({ counts, selected, onToggle }: { counts: FacetCount[]; selected: string[]; onToggle: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState("");

  const needExpand = counts.length > 8;
  const visible = useMemo(() => {
    let list = counts;
    const query = q.trim().toLowerCase();
    if (query) list = list.filter((c) => c.value.toLowerCase().includes(query));
    if (needExpand && !expanded) list = list.slice(0, 8);
    return list;
  }, [counts, q, expanded, needExpand]);

  if (counts.length === 0) return <div className="text-sm text-slate-400">Нет значений</div>;

  return (
    <div>
      {needExpand && expanded && counts.length > 10 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск значения…"
          className="w-full mb-2 px-2 py-1 text-sm border border-slate-300 rounded focus:border-orange-500 outline-none"
        />
      )}
      <div className="max-h-64 overflow-y-auto pr-1">
        {visible.map((c) => (
          <label key={c.value} className="flex items-center gap-2 py-0.5 cursor-pointer text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={selected.includes(c.value)}
              onChange={() => onToggle(c.value)}
              className="accent-orange-600 w-4 h-4"
            />
            <span className="text-sm flex-1 truncate">{c.value}</span>
            <span className="text-xs text-slate-400">{c.count}</span>
          </label>
        ))}
        {visible.length === 0 && <div className="text-sm text-slate-400 py-1">Ничего не найдено</div>}
      </div>
      {needExpand && (
        <button onClick={() => setExpanded(!expanded)} className="text-sm text-orange-700 hover:text-orange-800 mt-1">
          {expanded ? "Свернуть" : `Показать все (${counts.length})`}
        </button>
      )}
    </div>
  );
}

// --- Диапазон (от/до) с кнопкой «Применить» ---

function RangeInputs({
  bounds,
  curMin,
  curMax,
  unit,
  onApply,
}: {
  bounds: { min: number; max: number };
  curMin?: number;
  curMax?: number;
  unit?: string;
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [minS, setMinS] = useState(curMin !== undefined ? String(curMin) : "");
  const [maxS, setMaxS] = useState(curMax !== undefined ? String(curMax) : "");
  const parse = (s: string): number | undefined => {
    const t = s.trim().replace(",", ".");
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };
  const active = curMin !== undefined || curMax !== undefined;

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={minS}
          onChange={(e) => setMinS(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApply(parse(minS), parse(maxS))}
          placeholder="от"
          inputMode="decimal"
          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:border-orange-500 outline-none"
        />
        <span className="text-slate-400">—</span>
        <input
          value={maxS}
          onChange={(e) => setMaxS(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApply(parse(minS), parse(maxS))}
          placeholder="до"
          inputMode="decimal"
          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:border-orange-500 outline-none"
        />
        {unit && <span className="text-xs text-slate-400 shrink-0">{unit}</span>}
      </div>
      <div className="text-[11px] text-slate-400 mt-1">
        Доступно: {String(bounds.min).replace(".", ",")} — {String(bounds.max).replace(".", ",")}
        {unit ? ` ${unit}` : ""}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onApply(parse(minS), parse(maxS))}
          className="text-sm text-white bg-orange-600 hover:bg-orange-500 rounded px-3 py-1 transition-colors"
        >
          Применить
        </button>
        {active && (
          <button onClick={() => onApply(undefined, undefined)} className="text-sm text-slate-500 hover:text-slate-700 px-1">
            Очистить
          </button>
        )}
      </div>
    </div>
  );
}
