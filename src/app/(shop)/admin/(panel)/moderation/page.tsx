import Link from "next/link";
import type { ProductStatus } from "@prisma/client";
import { moderateProductAction } from "@/app/actions/admin";
import { prisma } from "@/lib/db";
import { fmtPrice, formatAttrValue, plural } from "@/lib/format";
import { PRODUCT_STATUS } from "@/lib/statuses";
import type { AttributeDef } from "@/data/nomenclature";

export const dynamic = "force-dynamic";

export const metadata = { title: "Модерация — MetalCut" };

const TABS: { key: string; label: string }[] = [
  { key: "PENDING", label: "На модерации" },
  { key: "REJECTED", label: "Отклонённые" },
  { key: "APPROVED", label: "Опубликовано" },
];

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const status = (TABS.some((t) => t.key === tab) ? tab : "PENDING") as ProductStatus;

  const products = await prisma.product.findMany({
    where: { status },
    include: { category: true, offers: { include: { seller: true } } },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/moderation?tab=${t.key}`}
            className={`text-sm rounded-full px-3 py-1 border transition-colors ${
              status === t.key ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-orange-400"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-4 bg-white border border-slate-200 rounded-lg py-14 text-center text-slate-500">
          {status === "PENDING" ? "Очередь модерации пуста" : "Нет товаров в этом статусе"}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {products.map((p) => {
            const offer = p.offers[0];
            const schema = (p.category.attributeSchema as unknown as AttributeDef[]) ?? [];
            const attrs = schema
              .map((def) => ({ def, value: (p.attributes as Record<string, unknown>)?.[def.code] }))
              .filter((a) => a.value !== undefined && a.value !== null && a.value !== "");

            return (
              <ModerationCard
                key={p.id}
                product={{
                  id: p.id,
                  sku: p.sku,
                  name: p.name,
                  categoryName: p.category.name,
                  description: p.description,
                  moderationNote: p.moderationNote,
                  sellerName: offer?.seller.brand ?? offer?.seller.name ?? "—",
                  sellerEmail: offer?.seller.name ?? "",
                  price: offer ? offer.price.toNumber() : null,
                  stock: offer?.stock ?? 0,
                  updatedAt: p.updatedAt,
                  attrs: attrs.map((a) => ({ label: a.def.label, value: formatAttrValue(a.def, a.value) })),
                  status: p.status,
                }}
                showActions={status === "PENDING" || status === "REJECTED"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CardData {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  description: string | null;
  moderationNote: string | null;
  sellerName: string;
  sellerEmail: string;
  price: number | null;
  stock: number;
  updatedAt: Date;
  attrs: { label: string; value: string }[];
  status: ProductStatus;
}

function ModerationCard({ product, showActions }: { product: CardData; showActions: boolean }) {
  const st = PRODUCT_STATUS[product.status];
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="font-medium text-slate-900">{product.name}</span>
        <span className="text-xs text-slate-500">Арт. {product.sku} · {product.categoryName}</span>
        <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
        <span className="ml-auto text-xs text-slate-500">
          Продавец: <b className="text-slate-700">{product.sellerName}</b>
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-4 px-4 py-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Характеристики:</div>
          <div className="flex flex-wrap gap-1.5">
            {product.attrs.map((a, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-0.5">
                {a.label}: <b>{a.value}</b>
              </span>
            ))}
          </div>
          {product.description && (
            <div className="text-xs text-slate-500 mt-2 line-clamp-2">{product.description}</div>
          )}
          {product.status === "REJECTED" && product.moderationNote && (
            <div className="text-xs text-red-600 mt-2">Причина отклонения: {product.moderationNote}</div>
          )}
        </div>
        <div className="text-sm space-y-1">
          <div className="font-semibold text-orange-600">
            {fmtPrice(product.price)} <span className="text-xs text-slate-500 font-normal">· остаток {product.stock} {plural(product.stock, ["шт", "шт", "шт"])}</span>
          </div>
          <div className="text-xs text-slate-400">обновлено {new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(product.updatedAt)}</div>
        </div>
      </div>

      {showActions && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
          <form action={moderateProductAction} className="flex gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <button
              name="decision"
              value="approve"
              className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-md px-4 py-1.5 font-medium"
            >
              Одобрить и опубликовать
            </button>
          </form>
          <form action={moderateProductAction} className="flex flex-wrap items-center gap-2 flex-1">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="decision" value="reject" />
            <input
              name="note"
              placeholder="Причина отклонения (видна продавцу)"
              className="flex-1 min-w-56 border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-orange-500"
            />
            <button className="text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded-md px-4 py-1.5">
              Отклонить
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
