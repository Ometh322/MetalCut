"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, createSession } from "@/lib/auth";
import {
  createSellerProduct,
  importProducts,
  toggleOfferActive,
  updateOfferQuick,
  updateSellerProduct,
  type ImportRowInput,
} from "@/services/seller.service";

// --- Регистрация продавца ---

export interface SellerRegisterState {
  error?: string;
}

export async function registerSellerAction(_prev: SellerRegisterState, formData: FormData): Promise<SellerRegisterState> {
  const schema = z.object({
    email: z.string().email("Укажите корректный email"),
    password: z.string().min(6, "Пароль — минимум 6 символов"),
    managerName: z.string().min(2, "Укажите имя контактного лица"),
    company: z.string().min(2, "Укажите название компании"),
    brand: z.string().min(2, "Укажите бренд"),
    inn: z.string().optional(),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    managerName: String(formData.get("managerName") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    inn: String(formData.get("inn") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Пользователь с таким email уже зарегистрирован" };

  const slugBase =
    parsed.data.brand
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "seller";
  let slug = slugBase;
  for (let i = 2; ; i++) {
    const taken = await prisma.seller.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `${slugBase}-${i}`;
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.managerName,
      passwordHash: hashPassword(parsed.data.password),
      role: "SELLER",
    },
  });
  await prisma.seller.create({
    data: {
      slug,
      name: parsed.data.company,
      brand: parsed.data.brand,
      inn: parsed.data.inn,
      description: parsed.data.description,
      status: "PENDING",
      userId: user.id,
    },
  });
  await createSession(user.id);
  redirect("/seller");
}

// --- Сохранение товара (создание/редактирование) ---

export interface ProductFormState {
  ok?: boolean;
  productId?: string;
  errors?: Record<string, string>;
}

function parseFloatSafe(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").trim().replace(",", "."));
}

export async function saveProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const user = await getCurrentUser();
  if (!user || user.role === "CUSTOMER") return { errors: { _: "Нет доступа" } };
  const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
  if (!seller) return { errors: { _: "Нет профиля продавца" } };

  const submit = String(formData.get("intent") ?? "draft") === "submit";
  const productId = String(formData.get("productId") ?? "");

  let attributes: Record<string, unknown> = {};
  try {
    const raw = JSON.parse(String(formData.get("attributes") ?? "{}"));
    if (raw && typeof raw === "object") attributes = raw as Record<string, unknown>;
  } catch {
    return { errors: { _: "Некорректные данные атрибутов" } };
  }

  const input = {
    categorySlug: String(formData.get("categorySlug") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? "шт"),
    attributes,
    offer: {
      price: parseFloatSafe(formData.get("price")),
      stock: Math.max(0, Math.floor(parseFloatSafe(formData.get("stock")) || 0)),
      leadTimeDays: Math.max(0, Math.floor(parseFloatSafe(formData.get("leadTimeDays")) || 0)),
      minOrderQty: Math.max(1, Math.floor(parseFloatSafe(formData.get("minOrderQty")) || 1)),
      sellerSku: String(formData.get("sellerSku") ?? ""),
    },
  };

  const result = productId
    ? await updateSellerProduct(seller.id, productId, input, submit)
    : await createSellerProduct(seller.id, input, submit);

  if (!result.ok) return { errors: result.errors };

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${result.productId}`);
  redirect(submit ? "/seller/products?status=PENDING" : "/seller/products");
}

/** Быстрое обновление цены/остатка без пересохранения карточки */
export async function quickOfferAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const user = await getCurrentUser();
  const seller = user ? await prisma.seller.findUnique({ where: { userId: user.id } }) : null;
  if (!seller) return { errors: { _: "Нет доступа" } };

  const ok = await updateOfferQuick(seller.id, String(formData.get("productId") ?? ""), {
    price: parseFloatSafe(formData.get("price")),
    stock: Math.max(0, Math.floor(parseFloatSafe(formData.get("stock")) || 0)),
    leadTimeDays: Math.max(0, Math.floor(parseFloatSafe(formData.get("leadTimeDays")) || 0)),
  });
  if (!ok) return { errors: { _: "Не удалось сохранить" } };
  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${String(formData.get("productId") ?? "")}`);
  return { ok: true };
}

export async function toggleOfferAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const seller = user ? await prisma.seller.findUnique({ where: { userId: user.id } }) : null;
  if (!seller) return;
  await toggleOfferActive(seller.id, String(formData.get("productId") ?? ""));
  revalidatePath("/seller/products");
}

// --- Импорт ---

export interface ImportState {
  ok?: boolean;
  results?: { row: number; status: string; message?: string; name: string }[];
  error?: string;
}

export async function importProductsAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await getCurrentUser();
  if (!user || user.role === "CUSTOMER") return { error: "Нет доступа" };
  const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
  if (!seller) return { error: "Нет профиля продавца" };

  const categorySlug = String(formData.get("categorySlug") ?? "");
  if (!categorySlug) return { error: "Выберите категорию" };

  let rows: ImportRowInput[] = [];
  try {
    const raw = JSON.parse(String(formData.get("rows") ?? "[]"));
    if (Array.isArray(raw)) rows = raw.slice(0, 500);
  } catch {
    return { error: "Некорректные данные импорта" };
  }
  if (!rows.length) return { error: "Нет строк для импорта" };

  const results = await importProducts(seller.id, categorySlug, rows);
  revalidatePath("/seller/products");
  return { ok: true, results };
}
