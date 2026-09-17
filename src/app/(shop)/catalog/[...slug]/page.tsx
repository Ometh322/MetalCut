import Link from "next/link";
import { notFound } from "next/navigation";
import type { AttributeDef } from "@/data/nomenclature";
import AiBanner from "@/components/catalog/AiBanner";
import CatalogView from "@/components/catalog/CatalogView";
import { Breadcrumbs } from "@/components/ui/Bits";
import { parseFilters, spToUrlSearchParams } from "@/lib/catalog-url";
import { formatAttrValue, plural } from "@/lib/format";
import { getCategoryPage, getCategoryTree, resolveCategoryChain, subtreeIds, type CategoryTreeNode } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const chain = await resolveCategoryChain(slug);
  return { title: chain ? `${chain.category.name} — MetalCut` : "Каталог — MetalCut" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const chain = await resolveCategoryChain(slug);
  if (!chain) notFound();
  const { category, ancestors } = chain;

  const tree = await getCategoryTree();
  const node = findNode(tree, category.id);
  const children = node?.children ?? [];
  const isLeaf = children.length === 0;

  const schema = (isLeaf ? ((category.attributeSchema as unknown as AttributeDef[] | null) ?? []) : []);
  const state = parseFilters(spToUrlSearchParams(sp), schema);

  const categoryIds = isLeaf ? [category.id] : subtreeIds(tree, category.id);
  const data = await getCategoryPage({ categoryIds, schema, state });

  const basePath = `/catalog/${[...ancestors.map((a) => a.slug), category.slug].join("/")}`;

  // Чипсы AI-подбора — что понял разбор (совпадает с применёнными фильтрами)
  const aiQuery = spToUrlSearchParams(sp).get("ai");
  const aiChips = [category.name];
  for (const f of data.facets.attrs) {
    const af = state.attrs[f.def.code];
    if (!af) continue;
    for (const v of af.values ?? []) aiChips.push(`${f.def.label}: ${formatAttrValue(f.def, v)}`);
    if (af.min !== undefined || af.max !== undefined) {
      const unit = f.def.unit ? ` ${f.def.unit}` : "";
      aiChips.push(`${f.def.label}: ${af.min ?? "…"}–${af.max ?? "…"}${unit}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <Breadcrumbs
        items={[
          { href: "/", label: "Главная" },
          { href: "/catalog", label: "Каталог" },
          ...ancestors.map((a) => ({ href: `/catalog/${a.slug}`, label: a.name })),
          { label: category.name },
        ]}
      />

      {aiQuery && <AiBanner originalQuery={aiQuery} chips={aiChips} basePath={basePath} />}
      <div className="mt-2 mb-4 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
        <span className="text-sm text-slate-500">
          {data.total} {plural(data.total, ["товар", "товара", "товаров"])}
        </span>
      </div>

      {/* Подкатегории (для нелистовых узлов) */}
      {children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {children.map((ch) => (
            <Link
              key={ch.id}
              href={`/catalog/${category.slug}/${ch.slug}`}
              className="bg-white border border-slate-300 rounded-full px-4 py-1 text-sm text-slate-700 hover:border-orange-400 hover:text-orange-700 transition-colors"
            >
              {ch.name}
            </Link>
          ))}
        </div>
      )}

      <CatalogView basePath={basePath} state={state} data={data} schema={schema} />
    </div>
  );
}

function findNode(tree: CategoryTreeNode[], id: string): CategoryTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}
