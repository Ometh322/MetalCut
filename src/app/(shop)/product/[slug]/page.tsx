import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { ProductCard } from "@/components/catalog/ProductList";
import { Breadcrumbs, StockBadge, ToolPlaceholder } from "@/components/ui/Bits";
import { fmtPrice, formatAttrValue, plural } from "@/lib/format";
import { getProductBySlug, getSimilarProducts } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product ? `${product.name} — MetalCut` : "Товар — MetalCut",
    description: product?.description?.slice(0, 160) ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const best = product.offers[0];
  const categoryPath = product.ancestors.length
    ? `/catalog/${product.ancestors.map((a) => a.slug).join("/")}/${product.categorySlug}`
    : `/catalog/${product.categorySlug}`;
  const similar = await getSimilarProducts(product.id, product.categoryId, product.attributes, product.schema);
  const attrEntries = product.schema
    .map((def) => ({ def, value: product.attributes?.[def.code] }))
    .filter((e) => e.value !== undefined && e.value !== null && e.value !== "");

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <Breadcrumbs
        items={[
          { href: "/", label: "Главная" },
          { href: "/catalog", label: "Каталог" },
          ...product.ancestors.map((a) => ({ href: `/catalog/${a.slug}`, label: a.name })),
          { href: categoryPath, label: product.categoryName },
          { label: product.name },
        ]}
      />

      <div className="mt-3 grid lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* Галерея-заглушка */}
        <ToolPlaceholder className="w-full aspect-square" />

        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>Арт. {product.sku}</span>
            {product.brand && (
              <span className="bg-slate-200 text-slate-700 rounded px-2 py-0.5 text-xs font-medium">{product.brand}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 leading-snug">{product.name}</h1>

          {best && (
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <div>
                <div className="text-3xl font-bold text-orange-600">{fmtPrice(best.price)}</div>
                <div className="text-xs text-slate-500">с НДС, за {product.unit}</div>
                {product.offers.length > 1 && (
                  <div className="text-sm text-slate-500">
                    от {product.offers.length} {plural(product.offers.length, ["продавца", "продавцов", "продавцов"])}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <StockBadge hasStock={best.stock > 0} />
                <span className="text-xs text-slate-500">Продавец: {best.sellerBrand ?? best.sellerName}</span>
              </div>
              <AddToCartButton offerId={best.id} label="В корзину" />
            </div>
          )}

          {/* Ключевые характеристики */}
          <div className="mt-5 bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="font-semibold text-slate-900 mb-2">Характеристики</h2>
            <table className="w-full text-sm">
              <tbody>
                {attrEntries.map(({ def, value }) => (
                  <tr key={def.code} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-4 text-slate-500 whitespace-nowrap align-top">{def.label}</td>
                    <td className="py-1.5 text-slate-900">{formatAttrValue(def, value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {product.description && (
            <div className="mt-4 text-sm text-slate-600 leading-relaxed">{product.description}</div>
          )}
        </div>
      </div>

      {/* Предложения продавцов */}
      {product.offers.length > 0 && (
        <div className="mt-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900">Предложения продавцов</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-4 py-2 font-medium">Продавец</th>
                <th className="px-4 py-2 font-medium">Цена</th>
                <th className="px-4 py-2 font-medium">Наличие</th>
                <th className="px-4 py-2 font-medium">Срок поставки</th>
                <th className="px-4 py-2 font-medium">Мин. партия</th>
                <th className="px-4 py-2 font-medium">Арт. продавца</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {product.offers.map((o, i) => (
                <tr key={o.id} className={`border-b border-slate-100 last:border-0 ${i === 0 ? "bg-orange-50/50" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-slate-900">{o.sellerBrand ?? o.sellerName}</span>
                    <span className="block text-xs text-slate-500">{o.sellerName}</span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-orange-600 whitespace-nowrap">{fmtPrice(o.price)}</td>
                  <td className="px-4 py-2.5">
                    {o.stock > 0 ? <StockBadge hasStock /> : <span className="text-xs text-slate-500">нет в наличии</span>}
                    {o.stock > 0 && <span className="block text-xs text-slate-500">{o.stock} {plural(o.stock, ["шт", "шт", "шт"])}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {o.leadTimeDays === 0 ? "со склада" : `${o.leadTimeDays} дн.`}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {o.minOrderQty} {plural(o.minOrderQty, ["шт", "шт", "шт"])}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{o.sellerSku ?? "—"}</td>
                  <td className="px-4 py-2.5"><AddToCartButton offerId={o.id} small /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Похожие / альтернативные (атрибутные дистанции) */}
      {similar.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Похожие и альтернативные</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {similar.map((s) => (
              <ProductCard key={s.id} item={s} schema={product.schema} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-slate-500">
        <Link href={categoryPath} className="text-orange-700 hover:text-orange-800">
          ← Все товары категории «{product.categoryName}»
        </Link>
      </div>
    </div>
  );
}
