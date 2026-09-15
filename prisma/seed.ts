/**
 * Seed демо-данных MetalCut.
 * Детерминированный (фиксированный seed RNG) — повторный запуск даёт те же данные.
 *
 *   npx prisma db push && npm run db:seed
 */
import { Prisma, PrismaClient, ProductStatus } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { NOMENCLATURE, leafCategories, type AttributeDef, type CategoryNode } from "../src/data/nomenclature";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

/** mulberry32 — детерминированный ГПСЧ */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = rng(20260915);
const int = (min: number, max: number) => min + Math.floor(R() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(R() * arr.length)];
/** Выбор со смещением к началу списка (первые значения — «ходовые») */
const pickCommon = <T>(arr: readonly T[]): T => arr[Math.floor(R() * R() * arr.length)];
const chance = (p: number) => R() < p;

function hashPassword(password: string): string {
  const salt = randomBytes(8).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function roundPrice(v: number): number {
  if (v < 300) return Math.round(v / 10) * 10 - 1 + 1; // …9 рублей
  return Math.round(v / 50) * 50 - 1;
}

// ---------------------------------------------------------------------------
// Справочники сида
// ---------------------------------------------------------------------------

const SELLERS = [
  {
    email: "nordtool@demo.ru",
    password: "seller123",
    name: 'ООО «Северный Инструмент»',
    slug: "nordtool",
    brand: "NordTool",
    description: "Фрезы и свёрла для механообработки. Собственное производство HSS-E, склад в Санкт-Петербурге.",
    city: "Санкт-Петербург",
    categories: ["end-mills", "keyway-mills", "face-mills", "twist-drills", "step-drills", "center-drills", "disc-mills"],
    priceFactor: 1.0,
  },
  {
    email: "exactcut@demo.ru",
    password: "seller123",
    name: 'ООО «Точный Режим»',
    slug: "exactcut",
    brand: "ExactCut",
    description: "Резьбонарезной и осевой инструмент премиум-класса. Точное шлифование, контроль геометрии.",
    city: "Москва",
    categories: ["taps", "dies", "thread-mills", "reamers", "countersinks"],
    priceFactor: 1.15,
  },
  {
    email: "uraltool@demo.ru",
    password: "seller123",
    name: 'АО «УралИнструмент»',
    slug: "uraltool",
    brand: "UralTool",
    description: "Токарный инструмент и сменные пластины. Напайные резцы из сплавов Т5К10, ВК8 под заказ.",
    city: "Екатеринбург",
    categories: ["turning-tools", "inserts", "disc-mills", "twist-drills", "center-drills"],
    priceFactor: 0.9,
  },
  {
    email: "vectorcut@demo.ru",
    password: "seller123",
    name: 'ООО «Вектор-Инструмент»',
    slug: "vectorcut",
    brand: "VectorCut",
    description: "Твёрдосплавный инструмент для ЧПУ: концевые и резьбовые фрезы с покрытием AlTiN/AlCrN.",
    city: "Тула",
    categories: ["end-mills", "thread-mills", "core-drills", "countersinks", "reamers"],
    priceFactor: 1.25,
  },
  {
    email: "stalstandart@demo.ru",
    password: "seller123",
    name: 'ООО «Стальной Стандарт»',
    slug: "stalstandart",
    brand: "StalStandart",
    description: "Базовый режущий инструмент и оснастка. Доступные цены, отгрузка со склада в день заказа.",
    city: "Нижний Новгород",
    categories: ["twist-drills", "step-drills", "keyway-mills", "er-collets", "mill-holders", "drill-chucks"],
    priceFactor: 0.8,
  },
] as const;

const CAT_CODE: Record<string, string> = {
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

const GOSTS: Record<string, string[]> = {
  "end-mills": ["ГОСТ 17026-71", "ISO 1641-1"],
  "keyway-mills": ["ГОСТ 9140-78", "ГОСТ 6396-78"],
  "face-mills": ["ГОСТ 8571-75", "ISO 6462"],
  "disc-mills": ["ГОСТ 2679-73", "ГОСТ 10996-77"],
  "twist-drills": ["ГОСТ 10902-77", "ГОСТ 2092-77", "ISO 235"],
  "step-drills": ["ISO 9003"],
  "center-drills": ["ГОСТ 14952-75"],
  "core-drills": ["ТУ 2-351-885-82"],
  countersinks: ["ГОСТ 14953-80", "ГОСТ 12489-77"],
  reamers: ["ГОСТ 1672-80", "ГОСТ 11109-70"],
  taps: ["ГОСТ 3266-81", "ГОСТ 1604-71", "ISO 529"],
  dies: ["ГОСТ 9740-71", "ISO 2568"],
  "thread-mills": ["ISO 6968"],
  "turning-tools": ["ГОСТ 18878-73", "ГОСТ 18879-73", "ГОСТ 18881-73", "ISO 5608"],
  inserts: ["ISO 1832"],
  "er-collets": ["DIN 6499"],
  "mill-holders": ["DIN 69871"],
  "drill-chucks": ["ГОСТ 8522-79"],
};

/** «Ходные» диаметры, мм */
const NICE_DIAMETERS = [1, 1.5, 2, 2.5, 3, 3.2, 3.5, 4, 4.2, 5, 5.5, 6, 6.5, 6.8, 7, 8, 8.5, 9, 9.9, 10, 10.5, 11, 12, 12.5, 13, 14, 15, 16, 18, 20, 22, 25, 28, 30, 32];

/** Название товара в единственном числе */
const NOUNS: Record<string, string> = {
  "end-mills": "Фреза концевая",
  "keyway-mills": "Фреза шпоночная",
  "face-mills": "Фреза торцевая",
  "disc-mills": "Фреза дисковая",
  "twist-drills": "Сверло спиральное",
  "step-drills": "Сверло ступенчатое",
  "center-drills": "Сверло центровочное",
  "core-drills": "Сверло кольцевое",
  countersinks: "Зенковка",
  reamers: "Развёртка",
  taps: "Метчик",
  dies: "Плашка",
  "thread-mills": "Фреза резьбовая",
  "turning-tools": "Резец",
  inserts: "Пластина сменная",
  "er-collets": "Цанга",
  "mill-holders": "Державка",
  "drill-chucks": "Патрон сверлильный",
};

/** Базовая цена товара до факторов, руб */
function basePrice(cat: string, attrs: Record<string, string | number | boolean>): number {
  const d = typeof attrs.diameter === "number" ? attrs.diameter : 10;
  const carbide = attrs.material === "Твёрдый сплав" || attrs.material === "Минералокерамика" || attrs.material === "CBN" || attrs.material === "PCD";
  switch (cat) {
    case "end-mills": return 300 + d * 90 * (carbide ? 2.8 : 1);
    case "keyway-mills": return 200 + d * 45;
    case "face-mills": return 1800 + d * 25 * (attrs.construction === "Под сменные пластины" ? 1.4 : 1);
    case "disc-mills": return 320 + d * 9;
    case "twist-drills": return 55 + d * 28 * (carbide ? 3.5 : 1);
    case "step-drills": return 750 + d * 55;
    case "center-drills": return 140 + d * 30;
    case "core-drills": return 1100 + d * 45;
    case "countersinks": return 180 + d * 16;
    case "reamers": return 280 + d * 48 * (carbide ? 2.2 : 1);
    case "taps": return 110 + 35 * Number(String(attrs.thread_nominal ?? "M8").replace(/[^\d.]/g, "") || 8);
    case "dies": return 90 + 22 * Number(String(attrs.thread_nominal ?? "M8").replace(/[^\d.]/g, "") || 8);
    case "thread-mills": return 800 + d * 160;
    case "turning-tools": return 350 + (["10×10", "12×12", "16×10", "16×16", "20×12", "20×20", "25×16", "25×25", "32×20", "32×32", "40×25", "40×40"].indexOf(String(attrs.holder_section ?? "16×10")) + 1) * 130;
    case "inserts": return 140 + (typeof attrs.nose_radius === "number" ? attrs.nose_radius * 60 : 60);
    case "er-collets": return 320;
    case "mill-holders": return 2800 + (["BT30", "BT40", "BT50", "SK40", "CAT40", "HSK32A", "HSK63A", "ISO30"].indexOf(String(attrs.taper ?? "BT40")) + 1) * 450;
    case "drill-chucks": return 1100;
    default: return 500;
  }
}

/** Человеческое название товара из ключевых атрибутов */
function productName(node: CategoryNode, attrs: Record<string, string | number | boolean>): string {
  const parts: string[] = [];
  if (typeof attrs.diameter === "number") parts.push(`⌀${fmtNum(attrs.diameter)} мм`);
  if (attrs.thread_nominal) {
    parts.push(String(attrs.thread_nominal));
    if (typeof attrs.pitch === "number") parts[parts.length - 1] += `×${fmtNum(attrs.pitch)}`;
  }
  if (typeof attrs.flutes === "number") parts.push(`Z${attrs.flutes}`);
  if (typeof attrs.nose_radius === "number") parts.push(`R${fmtNum(attrs.nose_radius)}`);
  if (attrs.er_size) parts.push(String(attrs.er_size));
  if (attrs.taper) parts.push(String(attrs.taper));
  if (attrs.tool_kind) parts.push(String(attrs.tool_kind).toLowerCase());
  if (attrs.shape) parts.push(String(attrs.shape));
  if (attrs.disc_kind) parts.push(String(attrs.disc_kind).toLowerCase());
  if (attrs.reamer_kind) parts.push(String(attrs.reamer_kind).toLowerCase());
  if (attrs.tap_set && attrs.tap_set !== "Одиночный") parts.push(String(attrs.tap_set).toLowerCase());
  if (attrs.material) parts.push(String(attrs.material));
  if (attrs.coating && attrs.coating !== "Без покрытия") parts.push(String(attrs.coating));
  if (attrs.shank) parts.push(`хв. ${String(attrs.shank).toLowerCase()}`);
  if (attrs.holder_section) parts.push(`держ. ${attrs.holder_section}`);
  if (attrs.carbide_grade) parts.push(String(attrs.carbide_grade));
  // Зенковки/зенкеры: сам вид инструмента становится существительным
  const noun = node.slug === "countersinks" && attrs.kind ? String(attrs.kind) : (NOUNS[node.slug] ?? node.name);
  return `${noun} ${parts.join(" ")}`.trim();
}

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
}

/** Генерация значения атрибута по его определению */
function genValue(def: AttributeDef, cat: string, used: Record<string, string | number | boolean>): string | number | boolean | undefined {
  switch (def.code) {
    case "diameter": {
      const opts = NICE_DIAMETERS.filter((d) => d >= (def.min ?? 0) && d <= (def.max ?? 999));
      return opts.length ? pickCommon(opts) : def.min;
    }
    case "gost": {
      const list = GOSTS[cat];
      return list ? pick(list) : undefined;
    }
    case "flute_length":
      return typeof used.diameter === "number" ? round(used.diameter * int(3, 5) + 4) : undefined;
    case "overall_length":
      return typeof used.diameter === "number" ? round(used.diameter * int(7, 11) + 15) : undefined;
    case "working_length":
      return typeof used.diameter === "number" ? round(used.diameter * int(5, 8) + 10) : undefined;
    case "pitch": {
      const nominal = String(used.thread_nominal ?? "");
      const m = nominal.match(/M(\d+(?:\.\d+)?)/);
      if (!m) return undefined; // для дюймовых/трубных шаг не пишем
      const d = Number(m[1]);
      const coarse: Record<number, number> = { 3: 0.5, 4: 0.7, 5: 0.8, 6: 1.0, 8: 1.25, 10: 1.5, 12: 1.75, 14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5, 22: 2.5, 24: 3.0, 27: 3.0, 30: 3.5, 36: 4.0, 42: 4.5 };
      return coarse[d] ?? undefined;
    }
    case "clamp_range": {
      if (cat === "er-collets") {
        const ranges: Record<string, string> = { ER11: "1–7 мм", ER16: "1–10 мм", ER20: "1–13 мм", ER25: "2–16 мм", ER32: "3–20 мм", ER40: "6–26 мм" };
        return ranges[String(used.er_size ?? "ER16")];
      }
      if (cat === "drill-chucks") return pick(["0,8–10 мм", "1–13 мм", "3–16 мм", "2–13 мм"]);
      return undefined;
    }
    case "tool_dia_range": {
      const kind = String(used.holder_kind ?? "");
      if (kind.startsWith("Цанговая")) return pick(["1–13 мм (ER16)", "2–16 мм (ER20)", "3–20 мм (ER32)"]);
      if (kind === "Weldon") return pick(["6 мм", "8 мм", "10 мм", "12 мм", "16 мм", "20 мм"]);
      if (kind === "Термозажимная") return pick(["3–12 мм", "3–16 мм", "6–20 мм"]);
      return pick(["3–20 мм", "6–16 мм"]);
    }
    case "projection": return pick([60, 80, 100, 120, 150]);
    case "iso_designation": {
      const shape = String(used.shape ?? "");
      const r = typeof used.nose_radius === "number" ? used.nose_radius : 0.8;
      const code = shape.includes("(C") ? "CNMG" : shape.includes("(D") ? "DNMG" : shape.includes("(T") ? "TNMG" : shape.includes("(S") ? "SNMG" : shape.includes("(V") ? "VNMG" : "RNMG";
      return `${code} 1204${String(Math.round(r * 10)).padStart(2, "0")}`;
    }
    default: {
      if (def.type === "enum" && def.values) return pickCommon(def.values);
      if (def.type === "number" && def.values) return pickCommon(def.values);
      if (def.type === "number") return def.min ?? undefined;
      if (def.type === "bool") return R() < 0.5;
      return undefined;
    }
  }
}

function round(v: number): number {
  return Math.round(v / 2) * 2;
}

// ---------------------------------------------------------------------------
// Основной сценарий
// ---------------------------------------------------------------------------

async function main() {
  console.log("Очистка товаров/заказов…");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.product.deleteMany();

  // Категории — upsert по slug, проход сверху вниз по дереву
  console.log("Категории…");
  let order = 0;
  const walkCats = async (nodes: CategoryNode[], parentId: string | null) => {
    for (const n of nodes) {
      const isLeaf = !n.children?.length;
      const schema = (isLeaf && n.attributes ? n.attributes : undefined) as unknown as Prisma.InputJsonValue | undefined;
      const saved = await prisma.category.upsert({
        where: { slug: n.slug },
        create: { slug: n.slug, name: n.name, parentId, attributeSchema: schema, sortOrder: order++ },
        update: { name: n.name, parentId, attributeSchema: schema, sortOrder: order },
      });
      if (n.children) await walkCats(n.children, saved.id);
    }
  };
  await walkCats(NOMENCLATURE, null);

  const dbCats = await prisma.category.findMany();
  const catBySlug = new Map(dbCats.map((c) => [c.slug, c]));

  // Пользователи
  console.log("Пользователи…");
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.ru" },
    create: { email: "admin@demo.ru", passwordHash: hashPassword("admin123"), name: "Администратор платформы", role: "ADMIN" },
    update: { passwordHash: hashPassword("admin123") },
  });
  const customer = await prisma.user.upsert({
    where: { email: "customer@demo.ru" },
    create: { email: "customer@demo.ru", passwordHash: hashPassword("customer123"), name: "Иван Снабженец", phone: "+7 900 000-00-01", role: "CUSTOMER" },
    update: { passwordHash: hashPassword("customer123") },
  });

  // Селлеры
  console.log("Селлеры…");
  for (const [i, s] of SELLERS.entries()) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      create: { email: s.email, passwordHash: hashPassword(s.password), name: `Менеджер ${s.brand}`, role: "SELLER" },
      update: { passwordHash: hashPassword(s.password) },
    });
    await prisma.seller.upsert({
      where: { slug: s.slug },
      create: {
        slug: s.slug,
        name: s.name,
        brand: s.brand,
        description: `${s.description} ${s.city}.`,
        status: i === 4 ? "PENDING" : "ACTIVE",
        userId: user.id,
      },
      update: { name: s.name, brand: s.brand, userId: user.id },
    });
  }
  const sellers = await prisma.seller.findMany();
  const sellerBySlug = new Map(sellers.map((x) => [x.slug, x]));

  // Товары и офферы
  console.log("Товары и офферы…");
  const counters: Record<string, number> = {};
  let totalProducts = 0;
  let totalOffers = 0;

  for (const s of SELLERS) {
    const seller = sellerBySlug.get(s.slug)!;
    for (const catSlug of s.categories) {
      const node = leafCategories().find((c) => c.slug === catSlug);
      const category = catBySlug.get(catSlug);
      if (!node?.attributes || !category) continue;

      const perCat = 8 + int(0, 8);
      const seenCombos = new Set<string>();

      for (let k = 0; k < perCat; k++) {
        const attrs: Record<string, string | number | boolean> = {};
        for (const def of node.attributes) {
          // обязательные и ключевые атрибуты заполняем всегда, остальные — с вероятностью
          if (def.required || def.isKey || chance(0.82)) {
            const v = genValue(def, catSlug, attrs);
            if (v !== undefined) attrs[def.code] = v;
          }
        }
        // обязательные гарантированно заполнены
        for (const def of node.attributes) {
          if (def.required && attrs[def.code] === undefined) {
            const v = genValue(def, catSlug, attrs);
            if (v !== undefined) attrs[def.code] = v;
          }
        }

        const comboKey = JSON.stringify(attrs);
        if (seenCombos.has(comboKey)) continue;
        seenCombos.add(comboKey);

        counters[catSlug] = (counters[catSlug] ?? 0) + 1;
        const sku = `MC-${CAT_CODE[catSlug] ?? "XX"}-${String(counters[catSlug]).padStart(4, "0")}`;

        let price = basePrice(catSlug, attrs) * s.priceFactor * (0.95 + R() * 0.15);
        if (attrs.coating && attrs.coating !== "Без покрытия") price *= 1.15;
        price = roundPrice(price);

        const stock = chance(0.15) ? 0 : int(2, 140);
        const leadTimeDays = stock > 0 ? 0 : int(3, 14);
        const status: ProductStatus = chance(0.92) ? "APPROVED" : chance(0.6) ? "PENDING" : "REJECTED";

        const description = Object.entries(attrs)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([code, v]) => {
            const def = node.attributes!.find((a) => a.code === code);
            return `${def?.label ?? code}: ${typeof v === "number" ? fmtNum(v) + (def?.unit ? " " + def.unit : "") : v}`;
          })
          .join("; ");

        const product = await prisma.product.create({
          data: {
            sku,
            slug: sku.toLowerCase(),
            name: productName(node, attrs),
            brand: s.brand,
            description: `${node.name}. Характеристики: ${description}. Продавец: ${s.name} (${s.city}).`,
            categoryId: category.id,
            attributes: attrs as Prisma.InputJsonValue,
            status,
            moderationNote: status === "REJECTED" ? "Уточните материал режущей части и приложите фото маркировки." : null,
          },
        });
        totalProducts++;

        await prisma.offer.create({
          data: {
            productId: product.id,
            sellerId: seller.id,
            sellerSku: `${s.slug.toUpperCase()}-${String(counters[catSlug]).padStart(4, "0")}`,
            price,
            stock,
            leadTimeDays,
            minOrderQty: 1,
            isActive: status === "APPROVED",
          },
        });
        totalOffers++;

        await prisma.product.update({
          where: { id: product.id },
          data: { minPrice: price, maxPrice: price, offerCount: 1 },
        });
      }
    }
  }

  // Демо-заказ покупателю (2 позиции от разных селлеров)
  console.log("Демо-заказ…");
  const someOffers = await prisma.offer.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    include: { product: true },
    take: 2,
  });
  if (someOffers.length === 2) {
    const items = someOffers.map((o, i) => ({
      offerId: o.id,
      sellerId: o.sellerId,
      productId: o.productId,
      productName: o.product.name,
      productSku: o.product.sku,
      offerSku: o.sellerSku,
      qty: i + 1,
      price: o.price,
    }));
    await prisma.order.create({
      data: {
        number: "MC-2026-000001",
        userId: customer.id,
        status: "NEW",
        contactName: "Иван Снабженец",
        contactPhone: "+7 900 000-00-01",
        contactEmail: "customer@demo.ru",
        company: 'ООО «Механический Цех №7»',
        comment: "Нужна отгрузка до конца недели.",
        total: items.reduce((sum, it) => sum + Number(it.price) * it.qty, 0),
        items: { create: items },
      },
    });
  }

  const stats = {
    categories: await prisma.category.count(),
    users: await prisma.user.count(),
    sellers: await prisma.seller.count(),
    products: totalProducts,
    offers: totalOffers,
    orders: await prisma.order.count(),
  };
  console.log("Готово:", stats);
  console.log("Входы: admin@demo.ru/admin123, customer@demo.ru/customer123, seller-почты вида nordtool@demo.ru/seller123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
