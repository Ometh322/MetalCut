import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Обогащение корзины актуальными данными офферов (цена/остаток/продавец).
 * Клиент хранит только [{offerId, qty}] — всё остальное приходит отсюда.
 */
export async function POST(req: Request) {
  let ids: unknown;
  try {
    ids = (await req.json())?.ids;
  } catch {
    return NextResponse.json({ offers: [] });
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((x) => typeof x === "string")) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const offers = await prisma.offer.findMany({
    where: { id: { in: ids }, isActive: true },
    include: { product: { include: { category: true } }, seller: true },
    orderBy: { price: "asc" },
  });

  return NextResponse.json({
    offers: offers.map((o) => ({
      id: o.id,
      price: o.price.toNumber(),
      stock: o.stock,
      leadTimeDays: o.leadTimeDays,
      minOrderQty: o.minOrderQty,
      sellerSku: o.sellerSku,
      sellerName: o.seller.name,
      sellerBrand: o.seller.brand,
      sellerSlug: o.seller.slug,
      productName: o.product.name,
      productSlug: o.product.slug,
      productSku: o.product.sku,
      unit: o.product.unit,
      categoryName: o.product.category.name,
    })),
  });
}
