import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/moderation", label: "Модерация" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/sellers", label: "Продавцы" },
  { href: "/admin/orders", label: "Заказы" },
  { href: "/admin/users", label: "Пользователи" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Админка MetalCut</h1>
        <span className="text-sm text-slate-500">demo-режим</span>
      </div>
      <nav className="flex gap-5 py-2 text-sm border-b border-slate-100 flex-wrap">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="text-slate-600 hover:text-orange-700 transition-colors">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">{children}</div>
    </div>
  );
}
