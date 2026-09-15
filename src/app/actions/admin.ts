"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Мини-действия админа по продавцам (полная админка — фаза 4) */
export async function sellerStatusAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return;

  const sellerId = String(formData.get("sellerId") ?? "");
  const action = String(formData.get("action") ?? "");
  const status = action === "approve" ? "ACTIVE" : action === "block" ? "BLOCKED" : null;
  if (!sellerId || !status) return;

  await prisma.seller.update({ where: { id: sellerId }, data: { status } });
  revalidatePath("/admin/sellers");
}
