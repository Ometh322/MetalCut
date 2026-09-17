import Link from "next/link";

/**
 * Баннер AI-подбора на странице категории: показывает, что понял разбор запроса
 * (текущие применённые фильтры), и даёт уйти в обычный текстовый поиск.
 */
export default function AiBanner({
  originalQuery,
  chips,
  basePath,
}: {
  originalQuery: string;
  chips: string[];
  basePath: string;
}) {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2l1.9 5.7L19.6 9.6l-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9L12 2z" strokeLinejoin="round" />
          <path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" strokeLinejoin="round" />
        </svg>
        AI-подбор по запросу «{originalQuery}»
      </span>
      {chips.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {chips.slice(0, 6).map((c, i) => (
            <span key={i} className="text-xs bg-white/10 border border-white/20 rounded-full px-2.5 py-0.5">
              {c}
            </span>
          ))}
        </span>
      )}
      <Link
        href={`/catalog?q=${encodeURIComponent(originalQuery)}&raw=1`}
        className="ml-auto text-xs text-slate-300 hover:text-white underline"
      >
        Искать как обычный текст
      </Link>
    </div>
  );
}
