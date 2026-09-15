import Link from "next/link";

export default function Header({ roots }: { roots: { slug: string; name: string }[] }) {
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

        <nav className="hidden lg:flex items-center gap-4 text-sm text-slate-300">
          {roots.map((c) => (
            <Link key={c.slug} href={`/catalog/${c.slug}`} className="hover:text-white transition-colors">
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
