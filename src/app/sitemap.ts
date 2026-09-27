import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getAncestors } from "@/services/catalog.service";

export const dynamic = "force-dynamic";

/** Динамический sitemap: статика + дерево категорий + одобренные товары */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.product.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  for (const c of categories) {
    const ancestors = await getAncestors(c);
    const path = [...ancestors.map((a) => a.slug), c.slug].join("/");
    entries.push({
      url: `${base}/catalog/${path}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: c.attributeSchema ? 0.8 : 0.6,
    });
  }

  for (const p of products) {
    entries.push({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
