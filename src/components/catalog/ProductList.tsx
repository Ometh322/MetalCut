import Link from "next/link";
import type { AttributeDef } from "@/data/nomenclature";
import type { ProductListItem } from "@/services/catalog.service";
import { fmtPrice, keySpecs, plural } from "@/lib/format";
import { StockBadge, ToolPlaceholder } from "@/components/ui/Bits";

export function ProductList({
  items,
  view,
  schema,
}: {
  items: ProductListItem[];
  view: "list" | "grid";
  schema: AttributeDef[];
}) {
  if (view === "grid") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((p) => (
          <ProductCard key={p.id} item={p} schema={schema} />
        ))}
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-200">
      {items.map((p) => (
        <ProductRow key={p.id} item={p} schema={schema} />
      ))}
    </div>
  );
}

/** Строка списка — как в DNS: ключевые характеристики прямо в строке */
export function ProductRow({ item, schema }: { item: ProductListItem; schema: AttributeDef[] }) {
  return (
    <div className="flex gap-4 py-3 items-center">
      <Link href={`/product/${item.slug}`} className="shrink-0" aria-hidden>
        <ToolPlaceholder className="w-20 h-20" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/product/${item.slug}`} className="font-medium text-slate-900 hover:text-orange-700 leading-snug">
          {item.name}
        </Link>
        <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap gap-x-2">
          <span>Арт. {item.sku}</span>
          {item.brand && <span>· {item.brand}</span>}
          <span>
            ·{" "}
            <Link href={`/catalog/${item.categorySlug}`} className="hover:text-orange-700">
              {item.categoryName}
            </Link>
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-700">
          {keySpecs(schema, item.attributes, 5).map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>
      <div className="shrink-0 w-48 flex flex-col items-end gap-1 text-right">
        <div className="text-lg font-semibold text-orange-600">{fmtPrice(item.minPrice)}</div>
        <div className="text-xs text-slate-500">
          {item.offerCount} {plural(item.offerCount, ["предложение", "предложения", "предложений"])}
        </div>
        <StockBadge hasStock={item.hasStock} />
      </div>
    </div>
  );
}

export function ProductCard({ item, schema }: { item: ProductListItem; schema: AttributeDef[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col hover:border-orange-300 transition-colors">
      <Link href={`/product/${item.slug}`} className="mb-2" aria-hidden>
        <ToolPlaceholder className="w-full h-32" />
      </Link>
      <Link href={`/product/${item.slug}`} className="text-sm font-medium text-slate-900 hover:text-orange-700 line-clamp-2 leading-snug min-h-[2.5rem]">
        {item.name}
      </Link>
      <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-2">
        {keySpecs(schema, item.attributes, 2).map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
      <div className="mt-auto pt-2 flex items-end justify-between gap-2">
        <div>
          <div className="font-semibold text-orange-600">{fmtPrice(item.minPrice)}</div>
          <div className="text-[11px] text-slate-400">Арт. {item.sku}</div>
        </div>
        <StockBadge hasStock={item.hasStock} />
      </div>
    </div>
  );
}
