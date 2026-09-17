import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Bits";
import CatalogView from "@/components/catalog/CatalogView";
import { parseFilters, spToUrlSearchParams } from "@/lib/catalog-url";
import { getCategoryPage, getCategoryPathBySlug, getCategoryTree, subtreeIds } from "@/services/catalog.service";
import { parseQuery } from "@/services/ai";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Все товары — MetalCut",
};

/** /catalog — все товары / глобальный поиск (?q=…). Запрос сначала проходит AI-подбор. */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const urlParams = spToUrlSearchParams(sp);
  const q = (urlParams.get("q") ?? "").trim();
  const rawMode = urlParams.get("raw") === "1";

  // AI-подбор: понятые фильтры переносим в категорию, исходный запрос — в параметр ai
  if (q && !urlParams.has("ai") && !rawMode) {
    const { parsed } = await parseQuery(q);
    if (parsed?.categorySlug) {
      const chain = await getCategoryPathBySlug(parsed.categorySlug);
      if (chain) {
        const path = `/catalog/${[...chain.ancestors.map((a) => a.slug), chain.category.slug].join("/")}`;
        const params = new URLSearchParams();
        for (const f of parsed.attrs) {
          for (const v of f.values ?? []) params.append(`a_${f.code}`, v);
          if (f.min !== undefined) params.set(`a_${f.code}_min`, String(f.min));
          if (f.max !== undefined) params.set(`a_${f.code}_max`, String(f.max));
        }
        if (parsed.leftover) params.set("q", parsed.leftover);
        params.set("ai", q);
        redirect(`${path}?${params.toString()}`);
      }
    }
  }

  const state = parseFilters(urlParams, []);

  const tree = await getCategoryTree();
  const allIds = tree.flatMap((root) => subtreeIds(tree, root.id));
  const data = await getCategoryPage({ categoryIds: allIds, schema: [], state });

  const title = q ? `Результаты поиска` : "Все товары";

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Каталог" }]} />
      <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-4">
        {title}
        {q && <span className="text-slate-500 font-normal text-xl"> — «{q}»</span>}
      </h1>
      <CatalogView basePath="/catalog" state={state} data={data} schema={[]} />
    </div>
  );
}
