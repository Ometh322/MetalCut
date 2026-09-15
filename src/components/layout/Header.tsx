import Link from "next/link";
import CartBadge from "@/components/cart/CartBadge";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export default function Header({
  roots,
  user,
}: {
  roots: { slug: string; name: string }[];
  user: SessionUser | null;
}) {
  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/" className="text-xl font-bold tracking-tight shrink-0">
          MetalCut<span className="text-orange-500">.</span>
        </Link>

        <form action="/catalog" className="flex flex-1 min-w-[280px] max-w-2xl">
          <input
            type="search"
            name="q"
            placeholder="Фреза концевая 10 мм, метчик M8, артикул…"
            className="w-full rounded-l-md px-4 py-2 text-sm text-slate-900 bg-white outline-none"
            aria-label="Поиск по каталогу"
          />
          <button type="submit" className="bg-orange-600 hover:bg-orange-500 transition-colors rounded-r-md px-5 text-sm font-medium">
            Найти
          </button>
        </form>

        <div className="flex items-center gap-5 ml-auto">
          <CartBadge />
          {user ? (
            <>
              {user.role === "CUSTOMER" && (
                <Link href="/account" className="text-sm text-slate-200 hover:text-white transition-colors">
                  {user.name?.split(" ")[0] ?? "Кабинет"}
                </Link>
              )}
              <form action={logoutAction}>
                <button type="submit" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Выход
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-200 hover:text-white transition-colors">
                Вход
              </Link>
              <Link
                href="/register"
                className="text-sm bg-slate-800 border border-slate-600 rounded-md px-3 py-1.5 hover:border-orange-500 transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="border-t border-slate-800 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 flex gap-6 text-sm text-slate-300 py-2">
          {roots.map((c) => (
            <Link key={c.slug} href={`/catalog/${c.slug}`} className="hover:text-white transition-colors">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
