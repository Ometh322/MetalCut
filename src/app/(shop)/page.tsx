import Link from "next/link";
import { ProductCard } from "@/components/catalog/ProductList";
import { plural } from "@/lib/format";
import { getHomeData } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { productCount, sellerCount, tree, latest } = await getHomeData();

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero с поиском */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl mt-4 px-6 py-10 md:px-10 md:py-14 text-white">
        <h1 className="text-2xl md:text-4xl font-bold max-w-3xl leading-tight">
          Металлорежущий инструмент от проверенных поставщиков
        </h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Фрезы, свёрла, метчики, резцы и оснастка — с подбором по техническим характеристикам и предложениями
          нескольких продавцов на одну карточку.
        </p>
        <form action="/catalog" className="mt-6 flex max-w-2xl">
          <input
            type="search"
            name="q"
            placeholder="Например: концевая фреза 10 мм по нержавейке"
            className="w-full rounded-l-lg px-4 py-3 text-slate-900 outline-none"
            aria-label="Поиск по каталогу"
          />
          <button type="submit" className="bg-orange-600 hover:bg-orange-500 transition-colors rounded-r-lg px-6 font-medium">
            Найти
          </button>
        </form>
        <div className="mt-6 flex gap-8 text-sm text-slate-300">
          <span>
            <b className="text-white text-lg">{productCount}</b> {plural(productCount, ["товар", "товара", "товаров"])}
          </span>
          <span>
            <b className="text-white text-lg">{sellerCount}</b> {plural(sellerCount, ["поставщик", "поставщика", "поставщиков"])}
          </span>
        </div>
      </section>

      {/* Категории */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900">Категории</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {tree.map((root) => (
            <div key={root.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
              <Link href={`/catalog/${root.slug}`} className="font-semibold text-slate-900 hover:text-orange-700">
                {root.name}
              </Link>
              <ul className="mt-2 space-y-1">
                {root.children.slice(0, 6).map((ch) => (
                  <li key={ch.id}>
                    <Link href={`/catalog/${root.slug}/${ch.slug}`} className="text-sm text-slate-600 hover:text-orange-700">
                      {ch.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Новинки */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Новые поступления</h2>
          <Link href="/catalog" className="text-sm text-orange-700 hover:text-orange-800">
            Весь каталог →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {latest.map((p) => (
            <ProductCard
              key={p.id}
              item={{
                id: p.id,
                slug: p.slug,
                sku: p.sku,
                name: p.name,
                brand: p.brand,
                attributes: p.attributes,
                minPrice: p.minPrice,
                offerCount: p.offerCount,
                hasStock: p.minPrice !== null,
                categoryName: p.categoryName,
                categorySlug: p.categorySlug,
              }}
              schema={p.schema}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
