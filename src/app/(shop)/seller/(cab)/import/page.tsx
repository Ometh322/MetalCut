import ImportWizard from "@/components/seller/ImportWizard";
import { requireSeller } from "@/lib/auth";
import { getLeafCategories } from "@/services/seller.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Импорт прайса — MetalCut" };

export default async function ImportPage() {
  await requireSeller();
  const categories = await getLeafCategories();

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Импорт прайса из CSV/Excel</h2>
      <p className="text-sm text-slate-500 mb-4">
        Загрузите файл, сопоставьте колонки характеристикам категории — карточки создадутся со статусом «на модерации».
        Строки с вашим артикулом обновят цену и остаток существующих товаров.
      </p>
      <ImportWizard categories={categories} />
    </div>
  );
}
