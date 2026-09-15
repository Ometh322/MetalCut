import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fmtPrice, plural } from "@/lib/format";
import { listUserOrders } from "@/services/orders.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Мои заявки — MetalCut" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  NEW: { label: "Новая", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  CONFIRMED: { label: "Подтверждена", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SHIPPED: { label: "Отгружена", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Выполнена", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Отменена", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default async function AccountOrdersPage() {
  const user = await requireUser("/account");
  const orders = await listUserOrders(user.id);

  if (orders.length === 0) {
    return (
      <div className="mt-6 bg-white border border-slate-200 rounded-lg py-16 text-center">
        <div className="text-slate-500">У вас ещё нет заявок</div>
        <Link href="/catalog" className="inline-block mt-3 text-orange-700 hover:text-orange-800 underline">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {orders.map((o) => {
        const st = STATUS_LABELS[o.status] ?? STATUS_LABELS.NEW;
        const itemsQty = o.items.reduce((s, i) => s + i.qty, 0);
        return (
          <Link
            key={o.id}
            href={`/account/orders/${o.id}`}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-white border border-slate-200 rounded-lg px-5 py-3.5 hover:border-orange-300 transition-colors"
          >
            <div className="min-w-40">
              <div className="font-semibold text-slate-900">{o.number}</div>
              <div className="text-xs text-slate-500">
                {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(o.createdAt)}
              </div>
            </div>
            <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
            <div className="text-sm text-slate-600">
              {o.items.length} {plural(o.items.length, ["позиция", "позиции", "позиций"])} · {itemsQty}{" "}
              {plural(itemsQty, ["шт", "шт", "шт"])}
            </div>
            <div className="ml-auto font-semibold text-slate-900">{fmtPrice(Number(o.total))}</div>
          </Link>
        );
      })}
    </div>
  );
}
