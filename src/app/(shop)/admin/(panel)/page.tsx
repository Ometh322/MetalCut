import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Админка — MetalCut" };

export default async function AdminDashboardPage() {
  const [pendingProducts, approvedProducts, activeSellers, pendingSellers, orders, revenue] = await Promise.all([
    prisma.product.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "APPROVED" } }),
    prisma.seller.count({ where: { status: "ACTIVE" } }),
    prisma.seller.count({ where: { status: "PENDING" } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
  ]);

  const totalOrders = orders.reduce((s, g) => s + g._count, 0);

  const cards = [
    { label: "Карточек на модерации", value: pendingProducts, href: "/admin/moderation", accent: pendingProducts > 0 },
    { label: "Опубликовано товаров", value: approvedProducts, href: "/admin/moderation?tab=APPROVED" },
    { label: "Активных продавцов", value: activeSellers, href: "/admin/sellers" },
    { label: "Заявок продавцов", value: pendingSellers, href: "/admin/sellers", accent: pendingSellers > 0 },
    { label: "Заказов всего", value: totalOrders, href: "/admin/orders" },
    { label: "Оборот (без отменённых)", value: fmtPrice(Number(revenue._sum.total ?? 0)), href: "/admin/orders" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`bg-white border rounded-lg p-4 hover:border-orange-300 transition-colors ${
              c.accent ? "border-amber-300 bg-amber-50/50" : "border-slate-200"
            }`}
          >
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>

      {pendingProducts > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          Есть карточки, ожидающие модерации.{" "}
          <Link href="/admin/moderation" className="underline font-medium">
            Перейти к модерации →
          </Link>
        </div>
      )}
    </div>
  );
}
