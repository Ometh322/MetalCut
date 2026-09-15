import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { fmtPrice } from "@/lib/format";
import { getSellerStats, listSellerOrders } from "@/services/seller.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Кабинет продавца — MetalCut" };

export default async function SellerDashboardPage() {
  const { seller } = await requireSeller();
  const [stats, orders] = await Promise.all([getSellerStats(seller.id), listSellerOrders(seller.id)]);
  const recent = orders.slice(0, 5);

  const cards = [
    { label: "Товаров всего", value: stats.total, href: "/seller/products" },
    { label: "Опубликовано", value: stats.approved, href: "/seller/products?status=APPROVED" },
    { label: "На модерации", value: stats.pending, href: "/seller/products?status=PENDING" },
    { label: "Нет в наличии", value: stats.outOfStock, href: "/seller/products" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
          >
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-slate-900">Заказы</h2>
            <Link href="/seller/orders" className="text-sm text-orange-700 hover:text-orange-800">
              Все заказы →
            </Link>
          </div>
          <div className="mt-2 text-sm text-slate-600 space-y-1">
            <div>
              Новых заявок: <b>{stats.ordersNew}</b> · всего: <b>{stats.ordersTotal}</b>
            </div>
            <div>
              Сумма по вашим позициям: <b className="text-orange-600">{fmtPrice(stats.revenue)}</b>
            </div>
          </div>
          {recent.length > 0 && (
            <div className="mt-3 divide-y divide-slate-100 text-sm">
              {recent.map((o) => (
                <div key={o.id} className="flex justify-between py-1.5">
                  <Link href="/seller/orders" className="text-slate-800 hover:text-orange-700">
                    {o.number}
                  </Link>
                  <span className="text-slate-500">{fmtPrice(o.myTotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="font-semibold text-slate-900">Быстрые действия</h2>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/seller/products/new" className="bg-orange-600 hover:bg-orange-500 text-white text-center font-medium rounded-md py-2 transition-colors">
              Добавить товар
            </Link>
            <Link href="/seller/import" className="border border-slate-300 hover:border-slate-400 text-center rounded-md py-2 font-medium text-slate-700">
              Импорт прайса (CSV/Excel)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
