/**
 * Сервис заказов (демо: заказ-заявка без оплаты).
 * Цены и остатки всегда берутся из БД на момент создания — данным клиента не доверяем.
 * Остатки на этапе заявки не списываем (резервирование — за рамками демо).
 */
import { prisma } from "@/lib/db";

export interface CheckoutContact {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  comment?: string;
}

export interface OrderDraftItem {
  offerId: string;
  qty: number;
}

export type CreateOrderResult = { ok: true; number: string } | { ok: false; error: string };

export async function createOrder(
  userId: string | null,
  contact: CheckoutContact,
  items: OrderDraftItem[],
): Promise<CreateOrderResult> {
  if (!items.length) return { ok: false, error: "Корзина пуста" };

  const offers = await prisma.offer.findMany({
    where: { id: { in: items.map((i) => i.offerId) }, isActive: true },
    include: { product: true },
  });
  const byId = new Map(offers.map((o) => [o.id, o]));

  const rows: { offer: (typeof offers)[number]; qty: number }[] = [];
  for (const it of items) {
    const offer = byId.get(it.offerId);
    if (!offer || offer.product.status !== "APPROVED") continue; // позиция недоступна — пропускаем
    let qty = Math.max(offer.minOrderQty, Math.floor(it.qty) || 1);
    if (offer.stock > 0) qty = Math.min(qty, offer.stock); // под заказ (stock=0) — не ограничиваем
    rows.push({ offer, qty });
  }
  if (!rows.length) return { ok: false, error: "Выбранные позиции больше не продаются" };

  const total = rows.reduce((sum, r) => sum + r.offer.price.toNumber() * r.qty, 0);
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const number = `MC-${year}-${String(count + 1).padStart(6, "0")}`;

  const order = await prisma.order.create({
    data: {
      number,
      userId,
      status: "NEW",
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email,
      company: contact.company,
      comment: contact.comment,
      total,
      items: {
        create: rows.map((r) => ({
          offerId: r.offer.id,
          sellerId: r.offer.sellerId,
          productId: r.offer.productId,
          productName: r.offer.product.name,
          productSku: r.offer.product.sku,
          offerSku: r.offer.sellerSku,
          qty: r.qty,
          price: r.offer.price,
        })),
      },
    },
  });
  return { ok: true, number: order.number };
}

export async function listUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: { include: { offer: { include: { seller: true } } } } },
  });
  return order ?? null;
}
