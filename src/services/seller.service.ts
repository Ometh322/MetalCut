/**
 * Сервис кабинета продавца: свои товары/офферы, заказы по своим позициям, импорт.
 * Владение товаром определяется через оффер продавца на этом товаре.
 */
import { Prisma, type ProductStatus } from "@prisma/client";
import type { AttributeDef } from "@/data/nomenclature";
import { nextSku } from "@/data/sku";
import { prisma } from "@/lib/db";
import { validateAttributes } from "@/lib/attribute-validation";

export interface LeafCategoryInfo {
  slug: string;
  name: string;
  parentName: string | null;
  schema: AttributeDef[];
}

/** Листовые категории со схемами — для выбора при создании товара и в импорте */
export async function getLeafCategories(): Promise<LeafCategoryInfo[]> {
  const all = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const byId = new Map(all.map((c) => [c.id, c]));
  return all
    .filter((c) => c.attributeSchema !== null)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      parentName: c.parentId ? (byId.get(c.parentId)?.name ?? null) : null,
      schema: (c.attributeSchema as unknown as AttributeDef[]) ?? [],
    }));
}

export interface SellerProductRow {
  id: string;
  sku: string;
  name: string;
  status: ProductStatus;
  moderationNote: string | null;
  categoryName: string;
  price: number;
  stock: number;
  leadTimeDays: number;
  sellerSku: string | null;
  updatedAt: Date;
}

export async function listSellerProducts(
  sellerId: string,
  opts: { q?: string; status?: ProductStatus } = {},
): Promise<SellerProductRow[]> {
  const rows = await prisma.offer.findMany({
    where: {
      sellerId,
      product: {
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.q
          ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { sku: { contains: opts.q, mode: "insensitive" } }] }
          : {}),
      },
    },
    include: { product: { include: { category: true } } },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return rows.map((o) => ({
    id: o.product.id,
    sku: o.product.sku,
    name: o.product.name,
    status: o.product.status,
    moderationNote: o.product.moderationNote,
    categoryName: o.product.category.name,
    price: o.price.toNumber(),
    stock: o.stock,
    leadTimeDays: o.leadTimeDays,
    sellerSku: o.sellerSku,
    updatedAt: o.updatedAt,
  }));
}

export interface SellerProductDetail {
  product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    unit: string;
    status: ProductStatus;
    moderationNote: string | null;
    categoryId: string;
    categorySlug: string;
    attributes: Record<string, unknown>;
  };
  offer: {
    id: string;
    price: number;
    stock: number;
    leadTimeDays: number;
    minOrderQty: number;
    sellerSku: string | null;
    isActive: boolean;
  };
  schema: AttributeDef[];
}

export async function getSellerProduct(productId: string, sellerId: string): Promise<SellerProductDetail | null> {
  const offer = await prisma.offer.findFirst({
    where: { productId, sellerId },
    include: { product: { include: { category: true } } },
  });
  if (!offer) return null;
  return {
    product: {
      id: offer.product.id,
      sku: offer.product.sku,
      name: offer.product.name,
      description: offer.product.description,
      unit: offer.product.unit,
      status: offer.product.status,
      moderationNote: offer.product.moderationNote,
      categoryId: offer.product.categoryId,
      categorySlug: offer.product.category.slug,
      attributes: (offer.product.attributes as Record<string, unknown>) ?? {},
    },
    offer: {
      id: offer.id,
      price: offer.price.toNumber(),
      stock: offer.stock,
      leadTimeDays: offer.leadTimeDays,
      minOrderQty: offer.minOrderQty,
      sellerSku: offer.sellerSku,
      isActive: offer.isActive,
    },
    schema: (offer.product.category.attributeSchema as unknown as AttributeDef[]) ?? [],
  };
}

export interface ProductInput {
  categorySlug: string;
  name: string;
  description?: string;
  unit: string;
  attributes: Record<string, unknown>;
  offer: {
    price: number;
    stock: number;
    leadTimeDays: number;
    minOrderQty: number;
    sellerSku?: string;
  };
}

export type SaveResult = { ok: true; productId: string } | { ok: false; errors: Record<string, string> };

async function categoryBySlug(slug: string) {
  const cat = await prisma.category.findFirst({ where: { slug, isActive: true } });
  if (!cat?.attributeSchema) return null;
  return cat;
}

export async function createSellerProduct(sellerId: string, input: ProductInput, submit: boolean): Promise<SaveResult> {
  const cat = await categoryBySlug(input.categorySlug);
  if (!cat) return { ok: false, errors: { categorySlug: "Выберите категорию" } };
  const schema = cat.attributeSchema as unknown as AttributeDef[];

  const { errors, attrs } = validateAttributes(schema, input.attributes);
  if (submit) {
    // на модерацию можно отправить только с полными обязательными полями; черновик — как есть
    if (Object.keys(errors).length) return { ok: false, errors: attrErrorsToForm(errors) };
  }
  if (!input.name.trim()) return { ok: false, errors: { name: "Укажите название" } };
  if (!(input.offer.price > 0)) return { ok: false, errors: { price: "Укажите цену" } };

  const sku = await nextSku(cat.slug);
  const status: ProductStatus = submit ? "PENDING" : "DRAFT";
  const product = await prisma.product.create({
    data: {
      sku,
      slug: sku.toLowerCase(),
      name: input.name.trim(),
      brand: (await prisma.seller.findUnique({ where: { id: sellerId } }))?.brand ?? null,
      description: input.description?.trim() || null,
      categoryId: cat.id,
      attributes: attrs as Prisma.InputJsonValue,
      unit: input.unit,
      status,
      minPrice: input.offer.price,
      maxPrice: input.offer.price,
      offerCount: 1,
    },
  });
  await prisma.offer.create({
    data: {
      productId: product.id,
      sellerId,
      sellerSku: input.offer.sellerSku?.trim() || null,
      price: input.offer.price,
      stock: input.offer.stock,
      leadTimeDays: input.offer.leadTimeDays,
      minOrderQty: input.offer.minOrderQty,
      isActive: true,
    },
  });
  return { ok: true, productId: product.id };
}

export async function updateSellerProduct(
  sellerId: string,
  productId: string,
  input: ProductInput,
  submit: boolean,
): Promise<SaveResult> {
  const existing = await getSellerProduct(productId, sellerId);
  if (!existing) return { ok: false, errors: { _: "Товар не найден" } };
  const cat = await categoryBySlug(input.categorySlug);
  if (!cat) return { ok: false, errors: { categorySlug: "Выберите категорию" } };
  const schema = cat.attributeSchema as unknown as AttributeDef[];

  const { errors, attrs } = validateAttributes(schema, input.attributes);
  if (submit && Object.keys(errors).length) return { ok: false, errors: attrErrorsToForm(errors) };
  if (!input.name.trim()) return { ok: false, errors: { name: "Укажите название" } };
  if (!(input.offer.price > 0)) return { ok: false, errors: { price: "Укажите цену" } };

  // Контентные правки: черновик/отправка на модерацию. Оффер обновляется сразу.
  const status: ProductStatus = submit ? "PENDING" : existing.product.status === "PENDING" ? "DRAFT" : existing.product.status;
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      categoryId: cat.id,
      attributes: attrs as Prisma.InputJsonValue,
      unit: input.unit,
      status,
      moderationNote: status === "PENDING" ? null : existing.product.moderationNote,
      minPrice: input.offer.price,
      maxPrice: input.offer.price,
    },
  });
  await prisma.offer.update({
    where: { id: existing.offer.id },
    data: {
      sellerSku: input.offer.sellerSku?.trim() || null,
      price: input.offer.price,
      stock: input.offer.stock,
      leadTimeDays: input.offer.leadTimeDays,
      minOrderQty: input.offer.minOrderQty,
      isActive: true,
    },
  });
  return { ok: true, productId };
}

function attrErrorsToForm(errors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).map(([code, msg]) => [`attr.${code}`, msg]));
}

/** Быстрое редактирование только оффера (цена/остаток/срок) — без модерации */
export async function updateOfferQuick(
  sellerId: string,
  productId: string,
  data: { price: number; stock: number; leadTimeDays: number; minOrderQty?: number },
): Promise<boolean> {
  const offer = await prisma.offer.findFirst({ where: { productId, sellerId } });
  if (!offer || !(data.price > 0)) return false;
  await prisma.offer.update({
    where: { id: offer.id },
    data: {
      price: data.price,
      stock: data.stock,
      leadTimeDays: data.leadTimeDays,
      ...(data.minOrderQty ? { minOrderQty: data.minOrderQty } : {}),
    },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { minPrice: data.price, maxPrice: data.price },
  });
  return true;
}

/** Снять с продажи / вернуть (оффер isActive) */
export async function toggleOfferActive(sellerId: string, productId: string): Promise<boolean> {
  const offer = await prisma.offer.findFirst({ where: { productId, sellerId } });
  if (!offer) return false;
  await prisma.offer.update({ where: { id: offer.id }, data: { isActive: !offer.isActive } });
  return true;
}

// ---------------------------------------------------------------------------
// Заказы по своим товарам
// ---------------------------------------------------------------------------

export interface SellerOrderView {
  id: string;
  number: string;
  status: string;
  createdAt: Date;
  contactName: string;
  contactPhone: string;
  company: string | null;
  comment: string | null;
  items: { productName: string; productSku: string; qty: number; price: number }[];
  myTotal: number;
}

export async function listSellerOrders(sellerId: string): Promise<SellerOrderView[]> {
  const orders = await prisma.order.findMany({
    where: { items: { some: { sellerId } } },
    orderBy: { createdAt: "desc" },
    include: { items: { where: { sellerId } } },
    take: 200,
  });
  return orders.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    createdAt: o.createdAt,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    company: o.company,
    comment: o.comment,
    items: o.items.map((i) => ({ productName: i.productName, productSku: i.productSku, qty: i.qty, price: i.price.toNumber() })),
    myTotal: o.items.reduce((s, i) => s + i.price.toNumber() * i.qty, 0),
  }));
}

// ---------------------------------------------------------------------------
// Импорт
// ---------------------------------------------------------------------------

export interface ImportRowInput {
  name: string;
  price: number;
  stock?: number;
  leadTimeDays?: number;
  sellerSku?: string;
  description?: string;
  attributes: Record<string, unknown>;
}

export interface ImportRowResult {
  row: number;
  status: "created" | "updated" | "error";
  message?: string;
  name: string;
}

export async function importProducts(
  sellerId: string,
  categorySlug: string,
  rows: ImportRowInput[],
): Promise<ImportRowResult[]> {
  const cat = await categoryBySlug(categorySlug);
  if (!cat) return rows.map((r, i) => ({ row: i + 1, status: "error" as const, message: "Категория недоступна", name: r.name }));
  const schema = cat.attributeSchema as unknown as AttributeDef[];
  const results: ImportRowResult[] = [];

  for (const [i, row] of rows.entries()) {
    const rowNo = i + 1;
    if (!row.name?.trim()) {
      results.push({ row: rowNo, status: "error", message: "Нет названия", name: "—" });
      continue;
    }
    if (!(row.price > 0)) {
      results.push({ row: rowNo, status: "error", message: "Некорректная цена", name: row.name });
      continue;
    }
    const { errors, attrs } = validateAttributes(schema, row.attributes);
    const missing = Object.keys(errors).filter((code) => schema.find((d) => d.code === code)?.required);
    if (missing.length) {
      results.push({ row: rowNo, status: "error", message: `Не заполнено: ${missing.join(", ")}`, name: row.name });
      continue;
    }

    // Обновление по артикулу продавца, иначе создание новой карточки на модерацию
    if (row.sellerSku?.trim()) {
      const existing = await prisma.offer.findFirst({
        where: { sellerId, sellerSku: row.sellerSku.trim() },
      });
      if (existing) {
        await prisma.offer.update({
          where: { id: existing.id },
          data: { price: row.price, stock: row.stock ?? 0, leadTimeDays: row.leadTimeDays ?? 0 },
        });
        await prisma.product.update({
          where: { id: existing.productId },
          data: { minPrice: row.price, maxPrice: row.price },
        });
        results.push({ row: rowNo, status: "updated", name: row.name });
        continue;
      }
    }

    const sku = await nextSku(cat.slug);
    const product = await prisma.product.create({
      data: {
        sku,
        slug: sku.toLowerCase(),
        name: row.name.trim(),
        brand: (await prisma.seller.findUnique({ where: { id: sellerId } }))?.brand ?? null,
        description: row.description?.trim() || null,
        categoryId: cat.id,
        attributes: attrs as Prisma.InputJsonValue,
        status: "PENDING",
        minPrice: row.price,
        maxPrice: row.price,
        offerCount: 1,
      },
    });
    await prisma.offer.create({
      data: {
        productId: product.id,
        sellerId,
        sellerSku: row.sellerSku?.trim() || null,
        price: row.price,
        stock: row.stock ?? 0,
        leadTimeDays: row.leadTimeDays ?? 0,
        isActive: true,
      },
    });
    results.push({ row: rowNo, status: "created", name: row.name });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Дашборд
// ---------------------------------------------------------------------------

export async function getSellerStats(sellerId: string) {
  const offers = await prisma.offer.findMany({
    where: { sellerId },
    include: { product: { select: { status: true } } },
  });
  const orders = await listSellerOrders(sellerId);
  return {
    total: offers.length,
    approved: offers.filter((o) => o.product.status === "APPROVED").length,
    pending: offers.filter((o) => o.product.status === "PENDING").length,
    draft: offers.filter((o) => o.product.status === "DRAFT").length,
    outOfStock: offers.filter((o) => o.stock === 0).length,
    ordersTotal: orders.length,
    ordersNew: orders.filter((o) => o.status === "NEW").length,
    revenue: orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.myTotal, 0),
  };
}
