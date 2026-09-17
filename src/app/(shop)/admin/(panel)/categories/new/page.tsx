import Link from "next/link";
import { Prisma } from "@prisma/client";
import CategoryForm from "@/components/admin/CategoryForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Новая категория — MetalCut" };

export default async function NewCategoryPage() {
  const parents = await prisma.category.findMany({
    where: { parentId: null, attributeSchema: { equals: Prisma.DbNull } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <Link href="/admin/categories" className="text-sm text-orange-700 hover:text-orange-800">
        ← Категории
      </Link>
      <h2 className="text-xl font-bold text-slate-900 mt-2 mb-4">Новая категория</h2>
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <CategoryForm
          data={{ name: "", slug: "", parentId: null, seoTitle: null, seoDescription: null, sortOrder: 100, isActive: true }}
          parents={parents}
        />
        <p className="mt-3 text-xs text-slate-500">
          Схему атрибутов можно задать после создания: откройте категорию в дереве. Для листовой категории (без детей)
          редактор схемы появится справа.
        </p>
      </div>
    </div>
  );
}
