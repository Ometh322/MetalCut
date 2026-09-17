import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sellerStatusAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Продавцы — админка MetalCut" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "На модерации", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ACTIVE: { label: "Активен", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BLOCKED: { label: "Заблокирован", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function AdminSellersPage() {
  await requireAdmin();
  const sellers = await prisma.seller.findMany({
    include: { user: { select: { email: true, name: true } }, _count: { select: { offers: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <h1 className="text-2xl font-bold text-slate-900">Продавцы</h1>
      <p className="text-sm text-slate-500 mt-1">
        Модерация заявок продавцов. Полная админка (категории, карточки, заказы) — следующий этап.
      </p>

      <div className="mt-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-slate-100">
          {sellers.map((s) => {
            const st = STATUS[s.status];
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="flex-1 min-w-56">
                  <div className="text-sm font-medium text-slate-900">
                    {s.brand ?? s.name}
                    <span className="text-slate-400 font-normal"> · {s.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {s.user.email} · товаров: {s._count.offers}
                    {s.inn && <span> · ИНН {s.inn}</span>}
                  </div>
                </div>
                <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
                <form action={sellerStatusAction} className="flex gap-1.5">
                  <input type="hidden" name="sellerId" value={s.id} />
                  {s.status !== "ACTIVE" && (
                    <button
                      name="action"
                      value="approve"
                      className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-md px-3 py-1.5"
                    >
                      Одобрить
                    </button>
                  )}
                  {s.status === "ACTIVE" && (
                    <button
                      name="action"
                      value="block"
                      className="text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded-md px-3 py-1.5"
                    >
                      Заблокировать
                    </button>
                  )}
                </form>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
