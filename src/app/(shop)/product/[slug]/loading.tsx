/** Скелетон карточки товара */
export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
      <div className="mt-3 grid lg:grid-cols-[380px_1fr] gap-8 items-start">
        <div className="w-full aspect-square bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-4">
          <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
          <div className="h-8 w-2/3 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${85 - i * 7}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
