import Link from "next/link";
import { requireSeller } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/seller", label: "Обзор" },
  { href: "/seller/products", label: "Товары" },
  { href: "/seller/orders", label: "Заказы" },
  { href: "/seller/import", label: "Импорт CSV/Excel" },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { seller } = await requireSeller();

  if (seller.status === "PENDING") {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-10">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-2xl">⏳</div>
          <h1 className="text-xl font-bold text-slate-900 mt-4">Заявка на модерации</h1>
          <p className="mt-2 text-slate-600">
            Ваша компания «{seller.brand ?? seller.name}» ожидает проверки администратором платформы.
            Как только продавец будет одобрен, кабинет станет доступен.
          </p>
        </div>
      </div>
    );
  }

  if (seller.status === "BLOCKED") {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-10">
        <div className="bg-white border border-red-200 rounded-lg p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Доступ приостановлен</h1>
          <p className="mt-2 text-slate-600">Продавец заблокирован администратором платформы. Свяжитесь с поддержкой.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Кабинет продавца</h1>
        <span className="text-sm text-slate-500">{seller.brand ?? seller.name}</span>
      </div>
      <nav className="flex gap-5 py-2 text-sm border-b border-slate-100">
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
