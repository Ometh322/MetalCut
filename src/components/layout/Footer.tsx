export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6 text-sm flex flex-wrap gap-4 justify-between">
        <div>
          <span className="text-white font-semibold">
            MetalCut<span className="text-orange-500">.</span>
          </span>{" "}
          — демо-версия платформы торговли металлорежущим инструментом
        </div>
        <div>© 2026 MetalCut</div>
      </div>
    </footer>
  );
}
