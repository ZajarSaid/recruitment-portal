import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

/** Extracts the database name from a connection string for adapter metadata. */
function databaseName(url: string): string | undefined {
  try {
    return new URL(url).pathname.replace(/^\//, "") || undefined;
  } catch {
    return undefined;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma ORM 7 requires a driver adapter. The `mariadb` adapter opens a TCP
 * connection to MySQL (or MariaDB) and is never imported by browser code.
 */
const adapter = new PrismaMariaDb(connectionString, {
  database: databaseName(connectionString),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
