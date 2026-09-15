import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Заявка отправлена — MetalCut" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const { number } = await searchParams;
  const user = await getCurrentUser();

  return (
    <div className="max-w-xl mx-auto px-4 mt-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mt-4">Заявка отправлена</h1>
      {number && (
        <p className="mt-2 text-slate-600">
          Номер заявки: <b className="text-slate-900">{number}</b>
        </p>
      )}
      <p className="mt-3 text-sm text-slate-500">
        Менеджер продавца свяжется с вами для подтверждения наличия, выставления счёта и согласования отгрузки.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/catalog" className="bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-md px-5 py-2.5 transition-colors">
          Продолжить покупки
        </Link>
        {user?.role === "CUSTOMER" && (
          <Link href="/account" className="border border-slate-300 hover:border-slate-400 rounded-md px-5 py-2.5 font-medium text-slate-700">
            Мои заявки
          </Link>
        )}
      </div>
    </div>
  );
}
