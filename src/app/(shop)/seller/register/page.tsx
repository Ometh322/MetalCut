import Link from "next/link";
import { redirect } from "next/navigation";
import SellerRegisterForm from "@/components/seller/SellerRegisterForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Регистрация продавца — MetalCut" };

export default async function SellerRegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "CUSTOMER" ? "/" : "/seller");
  }

  return (
    <div className="max-w-xl mx-auto px-4 mt-8">
      <h1 className="text-2xl font-bold text-slate-900">Стать продавцом на MetalCut</h1>
      <p className="mt-2 text-sm text-slate-600">
        Разместите свой инструмент на платформе: карточки с характеристиками, цены и остатки,
        заказы покупателей. После регистрации компания проходит модерацию администратором.
      </p>
      <div className="mt-4 bg-white border border-slate-200 rounded-lg p-6">
        <SellerRegisterForm />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Уже есть аккаунт?{" "}
        <Link href="/login?next=/seller" className="text-orange-700 hover:text-orange-800">
          Войти
        </Link>
      </p>
    </div>
  );
}
