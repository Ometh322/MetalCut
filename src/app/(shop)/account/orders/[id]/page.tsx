import Link from "next/link";
import { notFound } from "next/navigation";
import RepeatOrderButton from "@/components/cart/RepeatOrderButton";
import { requireUser } from "@/lib/auth";
import { fmtPrice, plural } from "@/lib/format";
import { getOrderForUser } from "@/services/orders.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Заявка — MetalCut" };

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  CONFIRMED: "Подтверждена",
  SHIPPED: "Отгружена",
  COMPLETED: "Выполнена",
  CANCELLED: "Отменена",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const repeatItems = order.items.map((i) => ({ offerId: i.offerId, qty: i.qty }));

  return (
    <div className="mt-4">
      <Link href="/account" className="text-sm text-orange-700 hover:text-orange-800">
        ← Все заявки
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Заявка {order.number}</h2>
        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium rounded-full px-2.5 py-0.5">
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
        <span className="text-sm text-slate-500">
          от{" "}
          {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(order.createdAt)}
        </span>
      </div>

      <div className="mt-4 grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-medium text-slate-800 text-sm">
            Состав заявки
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((i) => (
              <div key={i.id} className="flex gap-4 px-4 py-3 items-center">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{i.productName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Арт. {i.productSku}
                    {i.offerSku && <span> · арт. продавца {i.offerSku}</span>}
                    <span> · {i.offer?.seller.brand ?? i.offer?.seller.name ?? i.sellerId}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600 whitespace-nowrap">
                  {i.qty} {plural(i.qty, ["шт", "шт", "шт"])} × {fmtPrice(Number(i.price))}
                </div>
                <div className="w-28 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {fmtPrice(Number(i.price) * i.qty)}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-baseline">
            <span className="font-medium text-slate-800">Итого</span>
            <span className="text-xl font-bold text-orange-600">{fmtPrice(Number(order.total))}</span>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm space-y-1.5">
            <div className="font-medium text-slate-900 mb-1">Контакты</div>
            <div className="text-slate-700">{order.contactName}</div>
            <div className="text-slate-700">{order.contactPhone}</div>
            {order.contactEmail && <div className="text-slate-700">{order.contactEmail}</div>}
            {order.company && <div className="text-slate-500">{order.company}</div>}
          </div>
          {order.comment && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm">
              <div className="font-medium text-slate-900 mb-1">Комментарий</div>
              <div className="text-slate-600">{order.comment}</div>
            </div>
          )}
          {order.status !== "CANCELLED" && (
            <RepeatOrderButton items={repeatItems} />
          )}
        </aside>
      </div>
    </div>
  );
}
