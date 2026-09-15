import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { CartProvider } from "@/components/cart/CartProvider";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryTree } from "@/services/catalog.service";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [tree, user] = await Promise.all([getCategoryTree(), getCurrentUser()]);
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header roots={tree.map((c) => ({ slug: c.slug, name: c.name }))} user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
