"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, type OrderDraftItem } from "@/services/orders.service";

export interface CheckoutFormState {
  ok?: boolean;
  number?: string;
  error?: string;
}

const contactSchema = z.object({
  name: z.string().min(2, "Укажите контактное имя"),
  phone: z.string().min(6, "Укажите телефон"),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  company: z.string().optional(),
  comment: z.string().max(2000).optional(),
});

export async function createOrderAction(_prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || undefined,
    company: String(formData.get("company") ?? "").trim() || undefined,
    comment: String(formData.get("comment") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let items: OrderDraftItem[] = [];
  try {
    const raw = JSON.parse(String(formData.get("items") ?? "[]"));
    if (Array.isArray(raw)) {
      items = raw
        .filter((i): i is { offerId: string; qty: number } => typeof i?.offerId === "string" && Number(i?.qty) > 0)
        .map((i) => ({ offerId: i.offerId, qty: Math.floor(Number(i.qty)) }));
    }
  } catch {
    // некорректный JSON корзины обрабатываем как пустую
  }

  const user = await getCurrentUser();
  const result = await createOrder(user?.id ?? null, parsed.data, items);
  if (!result.ok) return { error: result.error };
  return { ok: true, number: result.number };
}
