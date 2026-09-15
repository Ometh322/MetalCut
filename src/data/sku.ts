import { prisma } from "@/lib/db";

/** Коды категорий для внутренних артикулов MC-XX-NNNN */
export const CAT_CODE: Record<string, string> = {
  "end-mills": "EM",
  "keyway-mills": "KW",
  "face-mills": "FM",
  "disc-mills": "DM",
  "twist-drills": "TD",
  "step-drills": "SD",
  "center-drills": "CD",
  "core-drills": "KD",
  countersinks: "CS",
  reamers: "RM",
  taps: "TP",
  dies: "DP",
  "thread-mills": "TM",
  "turning-tools": "TT",
  inserts: "IN",
  "er-collets": "EC",
  "mill-holders": "MH",
  "drill-chucks": "DC",
};

/** Следующий свободный артикул вида MC-EM-0123 для категории */
export async function nextSku(categorySlug: string): Promise<string> {
  const code = CAT_CODE[categorySlug] ?? "XX";
  const prefix = `MC-${code}-`;
  const last = await prisma.product.findFirst({
    where: { sku: { startsWith: prefix } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });
  const lastNum = last ? parseInt(last.sku.slice(prefix.length), 10) : 0;
  return `${prefix}${String(Number.isFinite(lastNum) ? lastNum + 1 : 1).padStart(4, "0")}`;
}
