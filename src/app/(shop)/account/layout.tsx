import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");

  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Кабинет покупателя</h1>
        <span className="text-sm text-slate-500">{user.email}</span>
      </div>
      <nav className="flex gap-5 py-2 text-sm">
        <Link href="/account" className="text-orange-700 font-medium">
          Мои заявки
        </Link>
      </nav>
      {children}
    </div>
  );
}
