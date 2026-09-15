import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getCategoryTree } from "@/services/catalog.service";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const tree = await getCategoryTree();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header roots={tree.map((c) => ({ slug: c.slug, name: c.name }))} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
