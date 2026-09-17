import Link from "next/link";
import { prisma } from "@/lib/db";
import { plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Пользователи — MetalCut" };

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  SELLER: "Продавец",
  CUSTOMER: "Покупатель",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: { seller: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return (
    <div>
      <div className="text-sm text-slate-600">
        {users.length} {plural(users.length, ["пользователь", "пользователя", "пользователей"])}
      </div>
      <div className="mt-3 bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Имя</th>
              <th className="px-4 py-2 font-medium">Роль</th>
              <th className="px-4 py-2 font-medium">Продавец</th>
              <th className="px-4 py-2 font-medium">Заказов</th>
              <th className="px-4 py-2 font-medium">Регистрация</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-slate-800">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">{u.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className="text-xs border border-slate-200 bg-slate-50 rounded-full px-2 py-0.5 text-slate-600">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {u.seller ? (
                    <Link href="/admin/sellers" className="text-orange-700 hover:text-orange-800">
                      {u.seller.brand ?? u.seller.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{u._count.orders}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">
                  {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
