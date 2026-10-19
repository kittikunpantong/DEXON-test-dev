import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Could not connect to MySQL");
    this.name = "DatabaseUnavailableError";
  }
}

export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof DatabaseUnavailableError) return true;
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  return (
    code === "P1001" ||
    code === "P1000" ||
    code === "P1017" ||
    code === "P2021" ||
    /Can't reach database server|Authentication failed|ECONNREFUSED|connect ETIMEDOUT|Access denied|does not exist/i.test(message)
  );
}

export function dateToDb(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
