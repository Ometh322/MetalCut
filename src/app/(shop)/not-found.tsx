import Link from "next/link";

/** 404 витрины (несуществующий товар, категория, страница) */
export default function ShopNotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 mt-12 text-center">
      <div className="text-6xl font-bold text-slate-200">404</div>
      <h1 className="text-xl font-bold text-slate-900 mt-2">Страница не найдена</h1>
      <p className="mt-2 text-sm text-slate-500">
        Возможно, товар снят с продажи или ссылка устарела. Попробуйте найти подходящий инструмент в каталоге
        или через умный поиск — опишите задачу словами.
      </p>
      <form action="/catalog" className="flex max-w-md mx-auto mt-5">
        <input
          type="search"
          name="q"
          placeholder="Например: фреза 10 мм по нержавейке"
          className="w-full rounded-l-md px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 outline-none focus:border-orange-500"
          aria-label="Поиск по каталогу"
        />
        <button type="submit" className="bg-orange-600 hover:bg-orange-500 rounded-r-md px-5 text-sm font-medium text-white">
          Найти
        </button>
      </form>
      <div className="mt-5 flex justify-center gap-3">
        <Link href="/catalog" className="border border-slate-300 hover:border-slate-400 rounded-md px-5 py-2.5 text-sm font-medium text-slate-700">
          Весь каталог
        </Link>
        <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm underline self-center">
          На главную
        </Link>
      </div>
    </div>
  );
}
