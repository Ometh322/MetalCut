"use client";

/** Graceful error boundary витрины: без белого экрана */
export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl mx-auto px-4 mt-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center text-2xl">⚠️</div>
      <h1 className="text-xl font-bold text-slate-900 mt-4">Что-то пошло не так</h1>
      <p className="mt-2 text-sm text-slate-500">
        Произошла ошибка при загрузке страницы. Попробуйте обновить — обычно это помогает.
      </p>
      <button
        onClick={reset}
        className="mt-5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-md px-5 py-2.5 transition-colors"
      >
        Обновить страницу
      </button>
    </div>
  );
}
