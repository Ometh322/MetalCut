"use client";

import { useSearchParams } from "next/navigation";

/**
 * Поисковая строка шапки. После отправки запроса текст остаётся в поле:
 * берём исходный запрос из `ai` (AI-подбор) либо `q` (обычный поиск).
 * key={value} перемонтирует форму при смене запроса, обновляя defaultValue.
 */
export default function SearchForm() {
  const sp = useSearchParams();
  const value = sp.get("ai") ?? sp.get("q") ?? "";

  return (
    <form action="/catalog" className="flex flex-1 min-w-[280px] max-w-2xl" key={value}>
      <input
        type="search"
        name="q"
        defaultValue={value}
        placeholder="Опишите задачу: фреза 10 мм по нержавейке…"
        className="w-full rounded-l-md px-4 py-2 text-sm text-slate-900 bg-white outline-none"
        aria-label="Поиск по каталогу"
      />
      <button
        type="submit"
        className="bg-orange-600 hover:bg-orange-500 transition-colors rounded-r-md px-5 text-sm font-medium"
      >
        Найти
      </button>
    </form>
  );
}
