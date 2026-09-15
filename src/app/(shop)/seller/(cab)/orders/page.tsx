import { requireSeller } from "@/lib/auth";
import { fmtPrice, plural } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/statuses";
import { listSellerOrders } from "@/services/seller.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Заказы — MetalCut" };

export default async function SellerOrdersPage() {
  const { seller } = await requireSeller();
  const orders = await listSellerOrders(seller.id);

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg py-14 text-center text-slate-500">
        Заказов по вашим товарам пока нет
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.NEW;
        return (
          <div key={o.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <span className="font-semibold text-slate-900">{o.number}</span>
              <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
              <span className="text-xs text-slate-500">
                {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(o.createdAt)}
              </span>
              <span className="ml-auto font-semibold text-slate-900">Ваша сумма: {fmtPrice(o.myTotal)}</span>
            </div>
            <div className="grid md:grid-cols-[1fr_260px] gap-4 px-4 py-3">
              <div className="divide-y divide-slate-100">
                {o.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between gap-3 py-1.5 text-sm">
                    <span className="text-slate-800 min-w-0">
                      {i.productName}
                      <span className="block text-xs text-slate-500">Арт. {i.productSku}</span>
                    </span>
                    <span className="whitespace-nowrap text-slate-600">
                      {i.qty} {plural(i.qty, ["шт", "шт", "шт"])} × {fmtPrice(i.price)} ={" "}
                      <b className="text-slate-900">{fmtPrice(i.price * i.qty)}</b>
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <div className="font-medium text-slate-900">Покупатель</div>
                <div>{o.contactName}</div>
                <div>{o.contactPhone}</div>
                {o.company && <div className="text-slate-500">{o.company}</div>}
                {o.comment && (
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 mt-1">
                    «{o.comment}»
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
