import { PrismaClient } from "@prisma/client";

// Единственный инстанс PrismaClient на процесс (hot-reload Next.js dev)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
