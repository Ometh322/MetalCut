import type { ProductStatus } from "@prisma/client";

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Черновик", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  PENDING: { label: "На модерации", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  APPROVED: { label: "Опубликовано", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Отклонён", cls: "bg-red-50 text-red-700 border-red-200" },
};

export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: "Новая", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  CONFIRMED: { label: "Подтверждён", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SHIPPED: { label: "Отгружен", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Выполнен", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Отменён", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};
