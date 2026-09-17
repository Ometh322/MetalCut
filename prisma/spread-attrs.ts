/**
 * Одноразовый скрипт: равномерно распределяет значения diameter и workpiece
 * по существующим товарам листовых категорий (round-robin по порядку артикула).
 * Гарантирует, что ходовые комбинации фильтров (⌀10, нержавейка и т.п.) встречаются.
 * Запуск: npx tsx prisma/spread-attrs.ts
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import type { AttributeDef } from "../src/data/nomenclature";

const POPULAR_DIAMETERS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20];

async function main() {
  const allCategories = await prisma.category.findMany();
  const categories = allCategories.filter((c) => c.attributeSchema !== null);
  let updated = 0;

  for (const cat of categories) {
    const schema = cat.attributeSchema as unknown as AttributeDef[];
    const diaDef = schema.find((d) => d.code === "diameter");
    const wpDef = schema.find((d) => d.code === "workpiece");
    if (!diaDef && !wpDef) continue;

    const products = await prisma.product.findMany({
      where: { categoryId: cat.id, status: { in: ["APPROVED", "PENDING"] } },
      orderBy: { sku: "asc" },
      select: { id: true, attributes: true, status: true },
    });

    const diaPool = POPULAR_DIAMETERS.filter((d) => d >= (diaDef?.min ?? 0) && d <= (diaDef?.max ?? 999));
    const wpValues = wpDef?.values?.map(String) ?? [];
    const flutesDef = schema.find((d) => d.code === "flutes");
    const coatingDef = schema.find((d) => d.code === "coating");
    const coatingValues = coatingDef?.values?.map(String) ?? [];

    for (const [i, p] of products.entries()) {
      const attrs = { ...((p.attributes as Record<string, unknown>) ?? {}) };
      if (diaDef && diaPool.length) attrs.diameter = diaPool[(i * 7) % diaPool.length]; // декоррелируем циклы
      if (wpDef && wpValues.length) attrs.workpiece = wpValues[i % wpValues.length];
      // Гарантия ходовых демо-комбинаций на последних товарах категории
      if (i === products.length - 1) {
        if (diaDef && diaPool.includes(10)) attrs.diameter = 10;
        if (wpDef && wpValues.includes("Нержавеющая сталь")) attrs.workpiece = "Нержавеющая сталь";
        if (flutesDef) attrs.flutes = 4;
        if (coatingValues.includes("TiAlN")) attrs.coating = "TiAlN";
      } else if (i === products.length - 2 && diaDef && diaPool.includes(8)) {
        attrs.diameter = 8;
        if (wpDef && wpValues.includes("Сталь")) attrs.workpiece = "Сталь";
        if (flutesDef) attrs.flutes = 4;
        if (coatingValues.includes("TiAlN")) attrs.coating = "TiAlN";
      }
      await prisma.product.update({
        where: { id: p.id },
        data: {
          attributes: attrs as Prisma.InputJsonValue,
          // hero-комбинации должны быть видны в каталоге
          ...(i >= products.length - 2 && p.status === "PENDING" ? { status: "APPROVED" as const, moderationNote: null } : {}),
        },
      });
      if (i >= products.length - 2 && p.status === "PENDING") {
        await prisma.offer.updateMany({ where: { productId: p.id }, data: { isActive: true } });
      }
      updated++;
    }
    console.log(`✓ ${cat.slug}: ${products.length} товаров (диаметры: ${diaPool.length}, материалов: ${wpValues.length})`);
  }
  console.log(`Обновлено товаров: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
