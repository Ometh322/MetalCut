import Link from "next/link";
import { notFound } from "next/navigation";
import ProductForm from "@/components/seller/ProductForm";
import QuickOfferForm from "@/components/seller/QuickOfferForm";
import { requireSeller } from "@/lib/auth";
import { PRODUCT_STATUS } from "@/lib/statuses";
import { getLeafCategories, getSellerProduct } from "@/services/seller.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Редактирование товара — MetalCut" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  const [data, categories] = await Promise.all([getSellerProduct(id, seller.id), getLeafCategories()]);
  if (!data) notFound();

  const st = PRODUCT_STATUS[data.product.status];

  return (
    <div>
      <Link href="/seller/products" className="text-sm text-orange-700 hover:text-orange-800">
        ← Мои товары
      </Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
        <h2 className="text-xl font-bold text-slate-900">{data.product.name}</h2>
        <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
        <span className="text-xs text-slate-500">Арт. {data.product.sku}</span>
      </div>

      {data.product.status === "REJECTED" && data.product.moderationNote && (
        <div className="mb-4 text-sm bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2">
          Причина отклонения: {data.product.moderationNote}. Внесите правки и отправьте на модерацию повторно.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <ProductForm categories={categories} initialData={data} />
        <div className="lg:col-start-2">
          <QuickOfferForm
            productId={data.product.id}
            initial={{ price: data.offer.price, stock: data.offer.stock, leadTimeDays: data.offer.leadTimeDays }}
          />
        </div>
      </div>
    </div>
  );
}
