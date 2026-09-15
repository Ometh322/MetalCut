import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { fmtPrice, plural } from "@/lib/format";
import { PRODUCT_STATUS } from "@/lib/statuses";
import { listSellerProducts } from "@/services/seller.service";
import type { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Мои товары — MetalCut" };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "Все" },
  { key: "APPROVED", label: "Опубликовано" },
  { key: "PENDING", label: "На модерации" },
  { key: "DRAFT", label: "Черновики" },
  { key: "REJECTED", label: "Отклонённые" },
];

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { seller } = await requireSeller();
  const { status, q } = await searchParams;
  const statusFilter = TABS.some((t) => t.key === status) ? (status as ProductStatus | undefined) : undefined;
  const products = await listSellerProducts(seller.id, { q, status: statusFilter });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => {
            const params = new URLSearchParams();
            if (t.key) params.set("status", t.key);
            if (q) params.set("q", q);
            const href = `/seller/products${params.toString() ? `?${params}` : ""}`;
            const active = (status ?? "") === t.key;
            return (
              <Link
                key={t.label}
                href={href}
                className={`text-sm rounded-full px-3 py-1 border transition-colors ${
                  active ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-orange-400"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <div className="flex gap-2">
          <form action="/seller/products" className="flex">
            <input
              name="q"
              defaultValue={q}
              placeholder="Название или артикул…"
              className="border border-slate-300 rounded-l-md px-3 py-1.5 text-sm outline-none focus:border-orange-500 w-56"
            />
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <button className="bg-slate-100 border border-l-0 border-slate-300 rounded-r-md px-3 text-sm">Найти</button>
          </form>
          <Link href="/seller/products/new" className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-md px-4 py-1.5 transition-colors">
            + Товар
          </Link>
        </div>
      </div>

      <div className="mt-3 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
          {products.length} {plural(products.length, ["товар", "товара", "товаров"])}
        </div>
        {products.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            Товаров пока нет.{" "}
            <Link href="/seller/products/new" className="text-orange-700 hover:text-orange-800 underline">
              Создайте первую карточку
            </Link>{" "}
            или{" "}
            <Link href="/seller/import" className="text-orange-700 hover:text-orange-800 underline">
              импортируйте прайс
            </Link>
            .
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((p) => {
              const st = PRODUCT_STATUS[p.status];
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <div className="flex-1 min-w-56">
                    <Link href={`/seller/products/${p.id}`} className="text-sm font-medium text-slate-900 hover:text-orange-700">
                      {p.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Арт. {p.sku} · {p.categoryName}
                      {p.sellerSku && <span> · ваш арт. {p.sellerSku}</span>}
                    </div>
                    {p.status === "REJECTED" && p.moderationNote && (
                      <div className="text-xs text-red-600 mt-1">Причина: {p.moderationNote}</div>
                    )}
                  </div>
                  <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
                  <div className="w-28 text-sm">
                    <div className="font-semibold text-slate-900">{fmtPrice(p.price)}</div>
                    <div className="text-xs text-slate-500">
                      {p.stock > 0 ? `${p.stock} шт` : p.leadTimeDays > 0 ? `${p.leadTimeDays} дн.` : "—"}
                    </div>
                  </div>
                  <Link href={`/seller/products/${p.id}`} className="text-sm text-orange-700 hover:text-orange-800">
                    Редактировать →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
