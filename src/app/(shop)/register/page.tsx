import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Регистрация — MetalCut" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next?.startsWith("/") ? next : "/");

  return (
    <div className="max-w-md mx-auto px-4 mt-10">
      <h1 className="text-2xl font-bold text-slate-900">Регистрация</h1>
      <div className="mt-4 bg-white border border-slate-200 rounded-lg p-6">
        <AuthForm mode="register" next={next} />
        <p className="mt-4 text-sm text-slate-600">
          Уже есть аккаунт?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-orange-700 hover:text-orange-800">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
