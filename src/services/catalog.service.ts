/**
 * Сервис каталога: дерево категорий, выборка товаров с фильтрами/фасетами,
 * полнотекстовый поиск (Postgres FTS + ILIKE по артикулу), карточка товара.
 *
 * Фильтрация атрибутов — по JSONB (attributes->>'code'); фасетные счётчики
 * считаются по базовой выборке категории в JS (объёмы демо это позволяют;
 * при росте — на Meilisearch за тем же интерфейсом страницы).
 */
import { Prisma, type Category, type Seller } from "@prisma/client";
import type { AttributeDef } from "@/data/nomenclature";
import { prisma } from "@/lib/db";
import type { AttrFilterState, FilterState, SortKey } from "@/lib/catalog-url";

// ---------------------------------------------------------------------------
// Категории
// ---------------------------------------------------------------------------

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const all = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const byParent = new Map<string | null, Category[]>();
  for (const c of all) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c);
    byParent.set(c.parentId, list);
  }
  const build = (parentId: string | null): CategoryTreeNode[] =>
    (byParent.get(parentId) ?? []).map((c) => ({ ...c, children: build(c.id) }));
  return build(null);
}

/** Резолвит цепочку slug'ов (/catalog/milling/end-mills) в категорию + предков */
export async function resolveCategoryChain(
  slugs: string[],
): Promise<{ category: Category; ancestors: Category[] } | null> {
  if (slugs.length === 0) return null;
  const leaf = await prisma.category.findFirst({ where: { slug: slugs[slugs.length - 1] } });
  if (!leaf) return null;

  const ancestors: Category[] = [];
  let cur: Category | null = leaf;
  while (cur?.parentId) {
    // eslint-disable-next-line no-await-in-loop
    const parent: Category | null = await prisma.category.findUnique({ where: { id: cur.parentId } });
    if (!parent) break;
    ancestors.unshift(parent);
    cur = parent;
  }

  // Цепочка из URL должна совпадать с реальным путём в дереве
  const realPath = [...ancestors.map((a) => a.slug), leaf.slug];
  if (realPath.length !== slugs.length || realPath.some((s, i) => s !== slugs[i])) return null;

  return { category: leaf, ancestors: ancestors.slice(0, -1) };
}

/** Все id категорий поддерева (включая саму) */
export function subtreeIds(tree: CategoryTreeNode[], rootId: string): string[] {
  const collect = (n: CategoryTreeNode, acc: string[]) => {
    acc.push(n.id);
    n.children.forEach((c) => collect(c, acc));
    return acc;
  };
  const find = (nodes: CategoryTreeNode[]): CategoryTreeNode | null => {
    for (const n of nodes) {
      if (n.id === rootId) return n;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  };
  const root = find(tree);
  return root ? collect(root, []) : [rootId];
}

// ---------------------------------------------------------------------------
// Выборка товаров с фильтрами
// ---------------------------------------------------------------------------

export interface ProductListItem {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string | null;
  attributes: Record<string, unknown> | null;
  minPrice: number | null;
  offerCount: number;
  hasStock: boolean;
  categoryName: string;
  categorySlug: string;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface AttrFacetData {
  def: AttributeDef;
  counts: FacetCount[];
  bounds: { min: number; max: number };
}

export interface FacetsData {
  attrs: AttrFacetData[];
  brands: FacetCount[];
  price: { min: number; max: number };
}

export interface CategoryPageData {
  items: ProductListItem[];
  total: number;
  facets: FacetsData;
}

const SORT_SQL: Record<SortKey, Prisma.Sql> = {
  popular: Prisma.sql`p."offerCount" DESC, p."createdAt" DESC`,
  price_asc: Prisma.sql`p."minPrice" ASC NULLS LAST`,
  price_desc: Prisma.sql`p."minPrice" DESC NULLS LAST`,
  new: Prisma.sql`p."createdAt" DESC`,
  name: Prisma.sql`p."name" ASC`,
};

function textSearchCond(q: string): Prisma.Sql {
  const like = `%${q}%`;
  return Prisma.sql`(to_tsvector('russian', p.name) @@ websearch_to_tsquery('russian', ${q}) OR p.name ILIKE ${like} OR p.sku ILIKE ${like} OR p.brand ILIKE ${like})`;
}

/** Общие условия: статус + категория(и) + текстовый поиск */
function baseConds(categoryIds: string[], q: string): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [Prisma.sql`p."status" = 'APPROVED'`];
  conds.push(Prisma.sql`p."categoryId" IN (${Prisma.join(categoryIds)})`);
  if (q) conds.push(textSearchCond(q));
  return conds;
}

function attrConds(schema: AttributeDef[], attrs: Record<string, AttrFilterState>): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [];
  for (const def of schema) {
    const f = attrs[def.code];
    if (!f) continue;
    if (f.values?.length) {
      conds.push(Prisma.sql`(p.attributes ->> ${def.code}) IN (${Prisma.join(f.values)})`);
    }
    if (f.min !== undefined) {
      conds.push(Prisma.sql`p.attributes ? ${def.code} AND (p.attributes ->> ${def.code})::numeric >= ${f.min}`);
    }
    if (f.max !== undefined) {
      conds.push(Prisma.sql`p.attributes ? ${def.code} AND (p.attributes ->> ${def.code})::numeric <= ${f.max}`);
    }
  }
  return conds;
}

function brandConds(brands: string[]): Prisma.Sql[] {
  return brands.length ? [Prisma.sql`p.brand IN (${Prisma.join(brands)})`] : [];
}

function priceConds(st: FilterState): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [];
  if (st.priceMin !== undefined) conds.push(Prisma.sql`p."minPrice" >= ${st.priceMin}`);
  if (st.priceMax !== undefined) conds.push(Prisma.sql`p."minPrice" <= ${st.priceMax}`);
  return conds;
}

interface FacetRow {
  attributes: Record<string, unknown> | null;
  brand: string | null;
  minPrice: number | null;
}

/** Проверка строки базовой выборки на соответствие фильтрам атрибутов (для фасетов) */
function rowMatchesAttrs(row: FacetRow, schema: AttributeDef[], attrs: Record<string, AttrFilterState>, exceptCode?: string): boolean {
  for (const def of schema) {
    if (def.code === exceptCode) continue;
    const f = attrs[def.code];
    if (!f) continue;
    if (f.values?.length) {
      const v = row.attributes?.[def.code];
      if (v === undefined || v === null || !f.values.includes(String(v))) return false;
    }
    if (f.min !== undefined || f.max !== undefined) {
      const n = Number(row.attributes?.[def.code]);
      if (!Number.isFinite(n)) return false;
      if (f.min !== undefined && n < f.min) return false;
      if (f.max !== undefined && n > f.max) return false;
    }
  }
  return true;
}

export async function getCategoryPage(opts: {
  categoryIds: string[];
  schema: AttributeDef[];
  state: FilterState;
}): Promise<CategoryPageData> {
  const { categoryIds, schema, state } = opts;
  const perPage = 20;

  const where = [
    ...baseConds(categoryIds, state.q),
    ...attrConds(schema, state.attrs),
    ...brandConds(state.brands),
    ...priceConds(state),
  ];
  const whereSql = Prisma.join(where, " AND ");

  const offset = (state.page - 1) * perPage;
  const items = await prisma.$queryRaw<ProductListItem[]>(Prisma.sql`
    SELECT p.id, p.slug, p.sku, p.name, p.brand, p.attributes,
           p."minPrice"::float8 AS "minPrice", p."offerCount",
           EXISTS (SELECT 1 FROM "Offer" o WHERE o."productId" = p.id AND o."isActive" AND o.stock > 0) AS "hasStock",
           c.name AS "categoryName", c.slug AS "categorySlug"
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${whereSql}
    ORDER BY ${SORT_SQL[state.sort]}
    LIMIT ${perPage} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
    SELECT count(*)::int AS n FROM "Product" p WHERE ${whereSql}
  `);
  const total = countRows[0]?.n ?? 0;

  // Базовая выборка для фасетов: без фасетных фильтров (только статус + категория + поиск)
  const facetRows = await prisma.$queryRaw<FacetRow[]>(Prisma.sql`
    SELECT p.attributes, p.brand, p."minPrice"::float8 AS "minPrice"
    FROM "Product" p
    WHERE ${Prisma.join(baseConds(categoryIds, state.q), " AND ")}
  `);

  const matchesBrand = (r: FacetRow) => !state.brands.length || (r.brand !== null && state.brands.includes(r.brand));
  const matchesPrice = (r: FacetRow) =>
    (state.priceMin === undefined || (r.minPrice !== null && r.minPrice >= state.priceMin)) &&
    (state.priceMax === undefined || (r.minPrice !== null && r.minPrice <= state.priceMax));

  const attrsFacets: AttrFacetData[] = [];
  for (const def of schema) {
    if (def.filter === "none") continue;
    if (def.filter === "checkbox") {
      const counter = new Map<string, number>();
      for (const r of facetRows) {
        if (!rowMatchesAttrs(r, schema, state.attrs, def.code) || !matchesBrand(r) || !matchesPrice(r)) continue;
        const v = r.attributes?.[def.code];
        if (v !== undefined && v !== null) {
          const key = String(v);
          counter.set(key, (counter.get(key) ?? 0) + 1);
        }
      }
      const selected = new Set(state.attrs[def.code]?.values ?? []);
      let counts: FacetCount[];
      if (def.values?.length) {
        counts = def.values
          .map((val) => ({ value: String(val), count: counter.get(String(val)) ?? 0 }))
          .filter((c) => c.count > 0 || selected.has(c.value));
      } else {
        counts = [...counter.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      }
      attrsFacets.push({ def, counts, bounds: { min: 0, max: 0 } });
    } else {
      // range: считаем границы по подмножеству без собственного фильтра
      const nums: number[] = [];
      for (const r of facetRows) {
        if (!rowMatchesAttrs(r, schema, state.attrs, def.code) || !matchesBrand(r) || !matchesPrice(r)) continue;
        const n = Number(r.attributes?.[def.code]);
        if (Number.isFinite(n)) nums.push(n);
      }
      attrsFacets.push({
        def,
        counts: [],
        bounds: nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : { min: def.min ?? 0, max: def.max ?? 0 },
      });
    }
  }

  // Фасет брендов: все атрибутные фильтры применены, сам бренд — нет
  const brandCounter = new Map<string, number>();
  for (const r of facetRows) {
    if (!rowMatchesAttrs(r, schema, state.attrs) || !matchesPrice(r)) continue;
    if (r.brand) brandCounter.set(r.brand, (brandCounter.get(r.brand) ?? 0) + 1);
  }
  const brands = [...brandCounter.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .filter((c) => c.count > 0 || state.brands.includes(c.value));

  // Границы цены: все фильтры кроме цены
  const prices = facetRows.filter((r) => rowMatchesAttrs(r, schema, state.attrs) && matchesBrand(r))
    .map((r) => r.minPrice)
    .filter((v): v is number => v !== null);
  const priceFacet = prices.length
    ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
    : { min: 0, max: 0 };

  return { items, total, facets: { attrs: attrsFacets, brands, price: priceFacet } };
}

// ---------------------------------------------------------------------------
// Карточка товара
// ---------------------------------------------------------------------------

export interface ProductWithOffers {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  attributes: Record<string, unknown> | null;
  unit: string;
  categoryName: string;
  categorySlug: string;
  ancestors: Category[];
  schema: AttributeDef[];
  offers: {
    id: string;
    price: number;
    oldPrice: number | null;
    stock: number;
    leadTimeDays: number;
    minOrderQty: number;
    sellerSku: string | null;
    sellerName: string;
    sellerBrand: string | null;
    sellerSlug: string;
  }[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithOffers | null> {
  const product = await prisma.product.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      category: true,
      offers: {
        where: { isActive: true },
        include: { seller: true },
        orderBy: [{ price: "asc" }, { stock: "desc" }],
      },
    },
  });
  if (!product) return null;

  const ancestors = await getAncestors(product.category);
  const schema = (product.category.attributeSchema as unknown as AttributeDef[] | null) ?? [];

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    description: product.description,
    attributes: (product.attributes as Record<string, unknown> | null) ?? null,
    unit: product.unit,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    ancestors,
    schema,
    offers: product.offers.map((o) => ({
      id: o.id,
      price: o.price.toNumber(),
      oldPrice: o.oldPrice ? o.oldPrice.toNumber() : null,
      stock: o.stock,
      leadTimeDays: o.leadTimeDays,
      minOrderQty: o.minOrderQty,
      sellerSku: o.sellerSku,
      sellerName: o.seller.name,
      sellerBrand: o.seller.brand,
      sellerSlug: o.seller.slug,
    })),
  };
}

/** Предки категории от корня до родителя (для хлебных крошек) */
export async function getAncestors(category: Category): Promise<Category[]> {
  const ancestors: Category[] = [];
  let cur: Category | null = category;
  while (cur?.parentId) {
    // eslint-disable-next-line no-await-in-loop
    const parent: Category | null = await prisma.category.findUnique({ where: { id: cur.parentId } });
    if (!parent) break;
    ancestors.unshift(parent);
    cur = parent;
  }
  return ancestors;
}

// ---------------------------------------------------------------------------
// Главная страница
// ---------------------------------------------------------------------------

export async function getHomeData() {
  const [productCount, sellerCount, tree, latest] = await Promise.all([
    prisma.product.count({ where: { status: "APPROVED" } }),
    prisma.seller.count({ where: { status: "ACTIVE" } }),
    getCategoryTree(),
    prisma.product.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { category: true },
    }),
  ]);
  return {
    productCount,
    sellerCount,
    tree,
    latest: latest.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      minPrice: p.minPrice ? p.minPrice.toNumber() : null,
      offerCount: p.offerCount,
      attributes: (p.attributes as Record<string, unknown> | null) ?? null,
      categoryName: p.category.name,
      categorySlug: p.category.slug,
      schema: (p.category.attributeSchema as unknown as AttributeDef[] | null) ?? [],
    })),
  };
}
