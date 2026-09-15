/**
 * Аутентификация демо-этапа: email+пароль (scrypt), сессия — JWT в httpOnly-cookie.
 * Пароли совместимы с форматом сида: scrypt:$salt:$hash
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-metalcut");
const COOKIE_NAME = "mc_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "ADMIN" | "SELLER" | "CUSTOMER";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(8).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const calc = scryptSync(password, salt, 32);
  const orig = Buffer.from(hash, "hex");
  return calc.length === orig.length && timingSafeEqual(calc, orig);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, phone: true, role: true },
    });
    return user ?? null;
  } catch {
    return null;
  }
}

/** Guard для страниц кабинетов: редирект на /login с возвратом после входа */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}
