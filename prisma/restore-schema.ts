/**
 * Одноразовый скрипт: восстановить схему атрибутов категории из номенклатуры.
 * Использование: npx tsx prisma/restore-schema.ts <slug> [<slug>…]
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { findCategory } from "../src/data/nomenclature";

async function main() {
  const slugs = process.argv.slice(2);
  if (!slugs.length) {
    console.error("Укажите slug категории: npx tsx prisma/restore-schema.ts end-mills");
    process.exit(1);
  }
  for (const slug of slugs) {
    const node = findCategory(slug);
    if (!node?.attributes) {
      console.error(`Категория ${slug} не найдена в номенклатуре или не листовая`);
      continue;
    }
    await prisma.category.update({
      where: { slug },
      data: { attributeSchema: node.attributes as unknown as Prisma.InputJsonValue },
    });
    console.log(`✓ ${slug}: схема восстановлена (${node.attributes.length} атрибутов)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
