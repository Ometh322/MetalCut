import Link from "next/link";
import type { FilterState } from "@/lib/catalog-url";
import {
  AVAILABILITY_LABELS,
  catalogHref,
  clearFilters,
  withAttrRange,
  withAttrValue,
  withAvailability,
  withBrand,
  withPrice,
  withQ,
} from "@/lib/catalog-url";
import type { AttrFacetData } from "@/services/catalog.service";

/** Чипсы применённых фильтров над списком (каждый — ссылка, снимающая фильтр) */
export default function ActiveChips({
  basePath,
  state,
  attrFacets,
}: {
  basePath: string;
  state: FilterState;
  attrFacets: AttrFacetData[];
}) {
  const chips: { label: string; href: string }[] = [];

  if (state.q) chips.push({ label: `Поиск: «${state.q}»`, href: catalogHref(withQ(state, ""), basePath) });

  if (state.availability) {
    chips.push({
      label: AVAILABILITY_LABELS[state.availability],
      href: catalogHref(withAvailability(state, state.availability), basePath),
    });
  }

  if (state.priceMin !== undefined || state.priceMax !== undefined) {
    const from = state.priceMin !== undefined ? state.priceMin : "…";
    const to = state.priceMax !== undefined ? state.priceMax : "…";
    chips.push({ label: `Цена: ${from}–${to} ₽`, href: catalogHref(withPrice(state, undefined, undefined), basePath) });
  }

  for (const b of state.brands) {
    chips.push({ label: b, href: catalogHref(withBrand(state, b), basePath) });
  }

  for (const f of attrFacets) {
    const af = state.attrs[f.def.code];
    if (!af) continue;
    for (const v of af.values ?? []) {
      chips.push({ label: `${f.def.label}: ${v}`, href: catalogHref(withAttrValue(state, f.def.code, v), basePath) });
    }
    if (af.min !== undefined || af.max !== undefined) {
      const from = af.min !== undefined ? af.min : "…";
      const to = af.max !== undefined ? af.max : "…";
      const unit = f.def.unit ? ` ${f.def.unit}` : "";
      chips.push({ label: `${f.def.label}: ${from}–${to}${unit}`, href: catalogHref(withAttrRange(state, f.def.code, undefined, undefined), basePath) });
    }
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {chips.map((c, i) => (
        <Link
          key={i}
          href={c.href}
          className="inline-flex items-center gap-1.5 text-sm bg-orange-50 text-orange-800 border border-orange-200 rounded-full pl-3 pr-2 py-0.5 hover:bg-orange-100"
        >
          {c.label}
          <span className="text-orange-400 hover:text-orange-700" aria-hidden>
            ×
          </span>
        </Link>
      ))}
      <Link href={catalogHref(clearFilters(state), basePath)} className="text-sm text-slate-500 hover:text-slate-800 underline">
        Сбросить всё
      </Link>
    </div>
  );
}
