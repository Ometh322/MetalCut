import Link from "next/link";
import type { FilterState } from "@/lib/catalog-url";
import { catalogHref, withPage } from "@/lib/catalog-url";

export function totalPages(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

export default function Pagination({
  basePath,
  state,
  total,
  perPage,
}: {
  basePath: string;
  state: FilterState;
  total: number;
  perPage: number;
}) {
  const pages = totalPages(total, perPage);
  if (pages <= 1) return null;

  const cur = Math.min(state.page, pages);
  const window: (number | "…")[] = [];
  const push = (n: number | "…") => window.push(n);
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) push(i);
  } else {
    push(1);
    if (cur > 3) push("…");
    for (let i = Math.max(2, cur - 1); i <= Math.min(pages - 1, cur + 1); i++) push(i);
    if (cur < pages - 2) push("…");
    push(pages);
  }

  const btn = "min-w-8 h-8 px-2 inline-flex items-center justify-center text-sm rounded-md border transition-colors";
  const idle = `${btn} bg-white border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-700`;
  const active = `${btn} bg-slate-900 border-slate-900 text-white`;
  const disabled = `${btn} bg-slate-100 border-slate-200 text-slate-300 cursor-default`;

  return (
    <nav className="flex items-center justify-center gap-1.5 py-6" aria-label="Пагинация">
      {cur > 1 ? (
        <Link href={catalogHref(withPage(state, cur - 1), basePath)} className={idle}>
          ←
        </Link>
      ) : (
        <span className={disabled}>←</span>
      )}
      {window.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : p === cur ? (
          <span key={p} className={active}>
            {p}
          </span>
        ) : (
          <Link key={p} href={catalogHref(withPage(state, p), basePath)} className={idle}>
            {p}
          </Link>
        ),
      )}
      {cur < pages ? (
        <Link href={catalogHref(withPage(state, cur + 1), basePath)} className={idle}>
          →
        </Link>
      ) : (
        <span className={disabled}>→</span>
      )}
    </nav>
  );
}
