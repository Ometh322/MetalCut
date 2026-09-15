import { Breadcrumbs } from "@/components/ui/Bits";
import CatalogView from "@/components/catalog/CatalogView";
import { parseFilters, spToUrlSearchParams } from "@/lib/catalog-url";
import { getCategoryPage, getCategoryTree, subtreeIds } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Все товары — MetalCut",
};

/** /catalog — все товары / глобальный поиск (?q=…) */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseFilters(spToUrlSearchParams(sp), []);

  const tree = await getCategoryTree();
  const allIds = tree.flatMap((root) => subtreeIds(tree, root.id));
  const data = await getCategoryPage({ categoryIds: allIds, schema: [], state });

  const title = state.q ? `Результаты поиска` : "Все товары";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Каталог" }]} />
      <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-4">
        {title}
        {state.q && <span className="text-slate-500 font-normal text-xl"> — «{state.q}»</span>}
      </h1>
      <CatalogView basePath="/catalog" state={state} data={data} schema={[]} />
    </div>
  );
}
