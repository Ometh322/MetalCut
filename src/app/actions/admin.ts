"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { AttributeDef } from "@/data/nomenclature";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// --- Продавцы ---

export async function sellerStatusAction(formData: FormData): Promise<void> {
  if (!(await requireAdminUser())) return;
  const sellerId = String(formData.get("sellerId") ?? "");
  const action = String(formData.get("action") ?? "");
  const status = action === "approve" ? "ACTIVE" : action === "block" ? "BLOCKED" : null;
  if (!sellerId || !status) return;
  await prisma.seller.update({ where: { id: sellerId }, data: { status } });
  revalidatePath("/admin/sellers");
  revalidatePath("/admin");
}

// --- Модерация карточек ---

export async function moderateProductAction(formData: FormData): Promise<void> {
  if (!(await requireAdminUser())) return;
  const productId = String(formData.get("productId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!productId) return;

  let status: ProductStatus | null = null;
  if (decision === "approve") status = "APPROVED";
  if (decision === "reject") status = "REJECTED";
  if (!status) return;

  const note = String(formData.get("note") ?? "").trim();
  await prisma.product.update({
    where: { id: productId },
    data: { status, moderationNote: status === "REJECTED" ? note || "Причина не указана" : null },
  });

  // Публикация активирует оффер, снятие — деактивирует (корзина/каталог видят только APPROVED + isActive)
  await prisma.offer.updateMany({
    where: { productId },
    data: { isActive: status === "APPROVED" },
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  revalidatePath("/catalog");
  revalidatePath("/seller/products");
}

// --- Категории ---

export interface CategoryFormResult {
  ok?: boolean;
  error?: string;
  id?: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function saveCategoryAction(
  _prev: CategoryFormResult,
  formData: FormData,
): Promise<CategoryFormResult> {
  if (!(await requireAdminUser())) return { error: "Нет доступа" };

  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
  const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0;
  const isActive = formData.get("isActive") === "on";

  if (name.length < 2) return { error: "Укажите название" };
  if (!SLUG_RE.test(slug)) return { error: "Slug: строчные латинские буквы, цифры и дефисы (например, end-mills)" };

  // Не позволяем делать родителем листовую категорию (со схемой) — дерево остаётся 2-уровневым
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) return { error: "Родительская категория не найдена" };
    if (parent.attributeSchema) return { error: "Родителем не может быть листовая категория" };
  }

  const clash = await prisma.category.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { error: "Категория с таким slug уже существует" };

  try {
    const saved = id
      ? await prisma.category.update({ where: { id }, data: { name, slug, parentId, seoTitle, seoDescription, sortOrder, isActive } })
      : await prisma.category.create({ data: { name, slug, parentId, seoTitle, seoDescription, sortOrder, isActive } });
    revalidatePath("/admin/categories");
    revalidatePath("/catalog");
    return { ok: true, id: saved.id };
  } catch {
    return { error: "Не удалось сохранить (проверьте, что slug не создаёт цикл)" };
  }
}

// --- Редактор схем атрибутов ---

function normalizeSchema(raw: unknown): { schema: AttributeDef[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: "Схема должна быть массивом атрибутов" };
  const schema: AttributeDef[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return { error: "Некорректный атрибут" };
    const a = item as Record<string, unknown>;
    const code = String(a.code ?? "").trim();
    const label = String(a.label ?? "").trim();
    const type = String(a.type ?? "");
    const filter = String(a.filter ?? "none");
    if (!/^[a-z][a-z0-9_]*$/.test(code)) return { error: `Код «${code || "—"}»: латиница в нижнем регистре, цифры, _` };
    if (seen.has(code)) return { error: `Дубликат кода: ${code}` };
    seen.add(code);
    if (label.length < 2) return { error: `Атрибут ${code}: укажите название` };
    if (!["enum", "number", "bool", "string"].includes(type)) return { error: `Атрибут ${code}: некорректный тип` };
    if (!["checkbox", "range", "none"].includes(filter)) return { error: `Атрибут ${code}: некорректный тип фильтра` };

    let values: (string | number)[] | undefined;
    if (Array.isArray(a.values)) {
      values = a.values.map((v) => (type === "number" && Number.isFinite(Number(v)) ? Number(v) : String(v).trim())).filter((v) => v !== "");
      if (values.length === 0) values = undefined;
    }

    const def: AttributeDef = {
      code,
      label,
      type: type as AttributeDef["type"],
      filter: filter as AttributeDef["filter"],
      ...(values ? { values } : {}),
      ...(typeof a.unit === "string" && a.unit.trim() ? { unit: a.unit.trim() } : {}),
      ...(a.required === true ? { required: true } : {}),
      ...(a.isKey === true ? { isKey: true } : {}),
      ...(Number.isFinite(Number(a.min)) ? { min: Number(a.min) } : {}),
      ...(Number.isFinite(Number(a.max)) ? { max: Number(a.max) } : {}),
      ...(Number.isFinite(Number(a.step)) ? { step: Number(a.step) } : {}),
    };
    schema.push(def);
  }
  return { schema };
}

export async function saveSchemaAction(_prev: CategoryFormResult, formData: FormData): Promise<CategoryFormResult> {
  if (!(await requireAdminUser())) return { error: "Нет доступа" };
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return { error: "Категория не найдена" };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("schema") ?? "[]"));
  } catch {
    return { error: "Некорректный JSON схемы" };
  }
  const res = normalizeSchema(raw);
  if ("error" in res) return { error: res.error };

  await prisma.category.update({
    where: { id: categoryId },
    data: { attributeSchema: res.schema.length ? (res.schema as unknown as Prisma.InputJsonValue) : Prisma.DbNull },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/catalog");
  return { ok: true };
}

// --- Заказы ---

const ORDER_STATUSES = ["NEW", "CONFIRMED", "SHIPPED", "COMPLETED", "CANCELLED"];

export async function orderStatusAction(formData: FormData): Promise<void> {
  if (!(await requireAdminUser())) return;
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!orderId || !ORDER_STATUSES.includes(status)) return;
  await prisma.order.update({ where: { id: orderId }, data: { status: status as never } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}
