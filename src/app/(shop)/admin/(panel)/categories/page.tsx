import Link from "next/link";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";
import type { AttributeDef } from "@/data/nomenclature";

export const dynamic = "force-dynamic";

export const metadata = { title: "Категории — MetalCut" };

export default async function AdminCategoriesPage() {
  const all = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const roots = all.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => all.filter((c) => c.parentId === parentId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {all.length} {plural(all.length, ["категория", "категории", "категорий"])}
        </div>
        <Link href="/admin/categories/new" className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md px-4 py-1.5 transition-colors">
          + Категория
        </Link>
      </div>

      <div className="mt-3 bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {roots.map((root) => (
          <div key={root.id}>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/70">
              <Link href={`/admin/categories/${root.id}`} className="font-medium text-slate-900 hover:text-orange-700">
                {root.name}
              </Link>
              <code className="text-xs text-slate-400">/{root.slug}</code>
              <span className="text-xs text-slate-500 ml-auto">{childrenOf(root.id).length} подкатегорий</span>
              <Link href={`/catalog/${root.slug}`} className="text-xs text-orange-700 hover:text-orange-800">
                в каталоге →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {childrenOf(root.id).map((ch) => {
                const schema = (ch.attributeSchema as unknown as AttributeDef[] | null) ?? [];
                return (
                  <div key={ch.id} className="flex items-center gap-3 px-4 py-2 pl-8">
                    <Link href={`/admin/categories/${ch.id}`} className="text-sm text-slate-800 hover:text-orange-700">
                      {ch.name}
                    </Link>
                    <code className="text-xs text-slate-400">/{ch.slug}</code>
                    <span className="text-xs text-slate-500">
                      {ch._count.products} {plural(ch._count.products, ["товар", "товара", "товаров"])}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">{schema.length} атрибутов</span>
                    <Link href={`/admin/categories/${ch.id}`} className="text-xs text-orange-700 hover:text-orange-800">
                      схема →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
