import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import CategoryForm from "@/components/admin/CategoryForm";
import SchemaEditor from "@/components/admin/SchemaEditor";
import { prisma } from "@/lib/db";
import type { AttributeDef } from "@/data/nomenclature";

export const dynamic = "force-dynamic";

export const metadata = { title: "Категория — MetalCut" };

export default async function AdminCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  const parents = await prisma.category.findMany({
    where: { parentId: null, id: { not: category.id }, attributeSchema: { equals: Prisma.DbNull } },
    orderBy: { sortOrder: "asc" },
  });
  const schema = (category.attributeSchema as unknown as AttributeDef[] | null) ?? [];

  return (
    <div>
      <Link href="/admin/categories" className="text-sm text-orange-700 hover:text-orange-800">
        ← Категории
      </Link>
      <h2 className="text-xl font-bold text-slate-900 mt-2 mb-4">{category.name}</h2>

      <div className="grid xl:grid-cols-[380px_1fr] gap-4 items-start">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Основное</h3>
          <CategoryForm
            data={{
              id: category.id,
              name: category.name,
              slug: category.slug,
              parentId: category.parentId,
              seoTitle: category.seoTitle,
              seoDescription: category.seoDescription,
              sortOrder: category.sortOrder,
              isActive: category.isActive,
            }}
            parents={parents}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <SchemaEditor categoryId={category.id} initialSchema={schema} />
        </div>
      </div>
    </div>
  );
}
