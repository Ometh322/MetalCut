import Link from "next/link";
import ProductForm from "@/components/seller/ProductForm";
import { requireSeller } from "@/lib/auth";
import { getLeafCategories } from "@/services/seller.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Новый товар — MetalCut" };

export default async function NewProductPage() {
  await requireSeller();
  const categories = await getLeafCategories();

  return (
    <div>
      <Link href="/seller/products" className="text-sm text-orange-700 hover:text-orange-800">
        ← Мои товары
      </Link>
      <h2 className="text-xl font-bold text-slate-900 mt-2 mb-4">Новая карточка товара</h2>
      <ProductForm categories={categories} />
    </div>
  );
}
