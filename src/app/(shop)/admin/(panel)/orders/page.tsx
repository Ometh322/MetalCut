import Link from "next/link";
import { orderStatusAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { fmtPrice, plural } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/statuses";

export const dynamic = "force-dynamic";

export const metadata = { title: "Заказы — MetalCut" };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { offer: { include: { seller: true } } } }, user: { select: { email: true } } },
    take: 200,
  });

  if (orders.length === 0) {
    return <div className="bg-white border border-slate-200 rounded-lg py-14 text-center text-slate-500">Заказов пока нет</div>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.NEW;
        const itemsQty = o.items.reduce((s, i) => s + i.qty, 0);
        return (
          <div key={o.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-semibold text-slate-900">{o.number}</span>
              <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
              <span className="text-xs text-slate-500">
                {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(o.createdAt)}
              </span>
              <span className="text-xs text-slate-500">
                {o.items.length} {plural(o.items.length, ["позиция", "позиции", "позиций"])} · {itemsQty} шт
              </span>
              <span className="font-semibold text-slate-900 ml-auto">{fmtPrice(Number(o.total))}</span>
              <form action={orderStatusAction} className="flex items-center gap-1.5">
                <input type="hidden" name="orderId" value={o.id} />
                <select
                  name="status"
                  defaultValue={o.status}
                  className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white"
                  aria-label="Статус заказа"
                >
                  {Object.entries(ORDER_STATUS).map(([key, v]) => (
                    <option key={key} value={key}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button className="text-xs bg-slate-900 hover:bg-slate-700 text-white rounded-md px-2.5 py-1">Обновить</button>
              </form>
            </div>
            <div className="grid md:grid-cols-[1fr_280px] gap-4 px-4 py-3 text-sm">
              <div className="divide-y divide-slate-100">
                {o.items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-3 py-1.5">
                    <span className="text-slate-800 min-w-0">
                      {i.productName}
                      <span className="block text-xs text-slate-500">
                        Арт. {i.productSku} ·{" "}
                        {i.offer?.seller.brand ?? i.offer?.seller.name ?? "продавец удалён"}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-slate-600">
                      {i.qty} × {fmtPrice(Number(i.price))} = <b className="text-slate-900">{fmtPrice(Number(i.price) * i.qty)}</b>
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-slate-600 space-y-1">
                <div className="font-medium text-slate-900">{o.contactName}</div>
                <div>{o.contactPhone}</div>
                {o.contactEmail && <div>{o.contactEmail}</div>}
                {o.company && <div className="text-slate-500">{o.company}</div>}
                {o.user && <div className="text-xs text-slate-400">аккаунт: {o.user.email}</div>}
                {o.comment && <div className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">«{o.comment}»</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
