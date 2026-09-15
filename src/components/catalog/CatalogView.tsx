import type { AttributeDef } from "@/data/nomenclature";
import type { FilterState } from "@/lib/catalog-url";
import { PER_PAGE } from "@/lib/catalog-url";
import type { CategoryPageData } from "@/services/catalog.service";
import ActiveChips from "@/components/catalog/ActiveChips";
import FiltersSidebar from "@/components/catalog/FiltersSidebar";
import Pagination from "@/components/catalog/Pagination";
import { ProductList } from "@/components/catalog/ProductList";
import Toolbar from "@/components/catalog/Toolbar";
import { clearFilters, catalogHref } from "@/lib/catalog-url";
import Link from "next/link";

/**
 * Сборный вид страницы каталога: тулбар + чипсы + сайдбар фильтров + список + пагинация.
 * Используется и для /catalog (все товары/поиск), и для страниц категорий.
 */
export default function CatalogView({
  basePath,
  state,
  data,
  schema,
}: {
  basePath: string;
  state: FilterState;
  data: CategoryPageData;
  schema: AttributeDef[];
}) {
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
      <aside className="lg:sticky lg:top-4 max-h-[85vh] overflow-y-auto">
        <FiltersSidebar
          basePath={basePath}
          state={state}
          attrFacets={data.facets.attrs}
          brands={data.facets.brands}
          priceBounds={data.facets.price}
        />
      </aside>

      <section>
        <Toolbar basePath={basePath} state={state} total={data.total} />
        <ActiveChips basePath={basePath} state={state} attrFacets={data.facets.attrs} />

        {data.items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg py-16 text-center">
            <div className="text-slate-500">По вашему запросу ничего не найдено</div>
            <Link href={catalogHref(clearFilters(state), basePath)} className="inline-block mt-3 text-orange-700 hover:text-orange-800 underline">
              Сбросить фильтры
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg px-4">
            <ProductList items={data.items} view={state.view} schema={schema} />
          </div>
        )}

        <Pagination basePath={basePath} state={state} total={data.total} perPage={PER_PAGE} />
      </section>
    </div>
  );
}
