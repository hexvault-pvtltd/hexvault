import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
// Route bundles in the same process must share a pool in production as well.
globalForPrisma.prisma = db;
