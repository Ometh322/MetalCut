"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export interface AuthFormState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().email("Укажите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Укажите имя (мин. 2 символа)"),
  email: z.string().email("Укажите корректный email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Пароль — минимум 6 символов"),
});

/** Куда отправлять пользователя после входа по роли */
function homeByRole(role: string, next?: string): string {
  if (next?.startsWith("/")) return next;
  if (role === "CUSTOMER") return "/account";
  if (role === "SELLER") return "/seller";
  if (role === "ADMIN") return "/admin/sellers";
  return "/";
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "Неверный email или пароль" };
  }

  await createSession(user.id);
  const next = String(formData.get("next") ?? "") || undefined;
  redirect(homeByRole(user.role, next));
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Пользователь с таким email уже зарегистрирован" };

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash: hashPassword(parsed.data.password),
      role: "CUSTOMER",
    },
  });

  await createSession(user.id);
  const next = String(formData.get("next") ?? "") || undefined;
  redirect(homeByRole(user.role, next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
