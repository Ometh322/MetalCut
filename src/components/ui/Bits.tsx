import Link from "next/link";

/** Плейсхолдер изображения товара (реальные фото — позже) */
export function ToolPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-slate-100 rounded-md ${className}`} aria-hidden>
      <svg viewBox="0 0 48 48" className="w-1/2 h-1/2 text-slate-300" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="24" cy="24" r="9" />
        <path d="M24 4v7M24 37v7M4 24h7M37 24h7M9.9 9.9l4.9 4.9M33.2 33.2l4.9 4.9M38.1 9.9l-4.9 4.9M14.8 33.2l-4.9 4.9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function StockBadge({ hasStock }: { hasStock: boolean }) {
  return hasStock ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />В наличии
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Под заказ
    </span>
  );
}

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-sm text-slate-500 flex flex-wrap items-center gap-1.5" aria-label="Хлебные крошки">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-orange-700">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-700">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
