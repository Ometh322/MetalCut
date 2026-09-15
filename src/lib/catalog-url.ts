/**
 * Состояние фильтров каталога и его (де)сериализация в URL.
 * Модуль чистый (без серверных зависимостей) — используется и в server-компонентах,
 * и в клиентском сайдбаре фильтров.
 */
import type { AttributeDef } from "@/data/nomenclature";

export type SortKey = "popular" | "price_asc" | "price_desc" | "new" | "name";
export type ViewMode = "list" | "grid";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Популярные" },
  { key: "price_asc", label: "Сначала дешёвые" },
  { key: "price_desc", label: "Сначала дорогие" },
  { key: "new", label: "Новинки" },
  { key: "name", label: "По названию" },
];

export const PER_PAGE = 20;

export interface AttrFilterState {
  /** Выбранные значения (enum или дискретные числа — всегда строки для URL/SQL) */
  values?: string[];
  min?: number;
  max?: number;
}

export interface FilterState {
  q: string;
  brands: string[];
  priceMin?: number;
  priceMax?: number;
  attrs: Record<string, AttrFilterState>;
  sort: SortKey;
  page: number;
  view: ViewMode;
}

export function defaultFilterState(): FilterState {
  return { q: "", brands: [], attrs: {}, sort: "popular", page: 1, view: "list" };
}

const num = (v: string | null | undefined): number | undefined => {
  if (v === null || v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/** searchParams страницы Next.js (объект со строками/массивами) → URLSearchParams */
export function spToUrlSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) for (const x of v) out.append(k, x);
    else if (v !== undefined) out.append(k, v);
  }
  return out;
}

/** searchParams страницы → состояние. Схема нужна для валидации кодов атрибутов. */
export function parseFilters(sp: URLSearchParams, schema: AttributeDef[]): FilterState {
  const st = defaultFilterState();
  st.q = (sp.get("q") ?? "").trim().slice(0, 100);
  st.brands = sp.getAll("brand").filter(Boolean);
  st.priceMin = num(sp.get("price_min"));
  st.priceMax = num(sp.get("price_max"));
  const sort = sp.get("sort");
  if (sort && SORT_OPTIONS.some((o) => o.key === sort)) st.sort = sort as SortKey;
  const page = parseInt(sp.get("page") ?? "1", 10);
  st.page = Number.isFinite(page) && page > 0 ? page : 1;
  st.view = sp.get("view") === "grid" ? "grid" : "list";

  for (const def of schema) {
    if (def.filter === "checkbox") {
      const allowed = new Set((def.values ?? []).map(String));
      const values = sp.getAll(`a_${def.code}`).filter((v) => allowed.size === 0 || allowed.has(v));
      if (values.length) st.attrs[def.code] = { values };
    } else if (def.filter === "range") {
      const min = num(sp.get(`a_${def.code}_min`));
      const max = num(sp.get(`a_${def.code}_max`));
      if (min !== undefined || max !== undefined) st.attrs[def.code] = { min, max };
    }
  }
  return st;
}

/** Состояние → URL (значения по умолчанию не пишем — чистые ссылки) */
export function toSearchParams(st: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (st.q) p.set("q", st.q);
  for (const b of st.brands) p.append("brand", b);
  if (st.priceMin !== undefined) p.set("price_min", String(st.priceMin));
  if (st.priceMax !== undefined) p.set("price_max", String(st.priceMax));
  for (const [code, f] of Object.entries(st.attrs)) {
    for (const v of f.values ?? []) p.append(`a_${code}`, v);
    if (f.min !== undefined) p.set(`a_${code}_min`, String(f.min));
    if (f.max !== undefined) p.set(`a_${code}_max`, String(f.max));
  }
  if (st.sort !== "popular") p.set("sort", st.sort);
  if (st.page > 1) p.set("page", String(st.page));
  if (st.view === "grid") p.set("view", "grid");
  return p;
}

export function catalogHref(st: FilterState, basePath = "/catalog"): string {
  const qs = toSearchParams(st).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// --- Чистые мутаторы: возвращают новое состояние со сброшенной страницей ---

function resetPage(st: FilterState): FilterState {
  return { ...st, page: 1 };
}

export function withAttrValue(st: FilterState, code: string, value: string): FilterState {
  const cur = st.attrs[code]?.values ?? [];
  const values = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  const attrs = { ...st.attrs };
  if (values.length) attrs[code] = { ...attrs[code], values };
  else if (attrs[code]) {
    const { values: _drop, ...rest } = attrs[code];
    if (rest.min !== undefined || rest.max !== undefined) attrs[code] = rest;
    else delete attrs[code];
  }
  return resetPage({ ...st, attrs });
}

export function withAttrRange(st: FilterState, code: string, min: number | undefined, max: number | undefined): FilterState {
  if (min === undefined && max === undefined) {
    const { [code]: _drop, ...attrs } = st.attrs;
    return resetPage({ ...st, attrs });
  }
  const attrs = { ...st.attrs, [code]: { ...st.attrs[code], values: undefined, min, max } };
  return resetPage({ ...st, attrs });
}

export function withBrand(st: FilterState, brand: string): FilterState {
  const brands = st.brands.includes(brand) ? st.brands.filter((b) => b !== brand) : [...st.brands, brand];
  return resetPage({ ...st, brands });
}

export function withPrice(st: FilterState, min: number | undefined, max: number | undefined): FilterState {
  const next = { ...st };
  if (min === undefined) delete next.priceMin;
  else next.priceMin = min;
  if (max === undefined) delete next.priceMax;
  else next.priceMax = max;
  return resetPage(next);
}

export function withSort(st: FilterState, sort: SortKey): FilterState {
  return resetPage({ ...st, sort });
}

export function withView(st: FilterState, view: ViewMode): FilterState {
  return { ...st, view };
}

export function withPage(st: FilterState, page: number): FilterState {
  return { ...st, page };
}

export function withQ(st: FilterState, q: string): FilterState {
  return resetPage({ ...st, q: q.trim() });
}

export function hasActiveFilters(st: FilterState): boolean {
  return Boolean(
    st.brands.length ||
      Object.values(st.attrs).some((f) => (f.values?.length ?? 0) > 0 || f.min !== undefined || f.max !== undefined) ||
      st.priceMin !== undefined ||
      st.priceMax !== undefined,
  );
}

/** Сброс всех фильтров (поисковый запрос сохраняем — как DNS) */
export function clearFilters(st: FilterState): FilterState {
  return { ...defaultFilterState(), q: st.q, sort: st.sort, view: st.view };
}
