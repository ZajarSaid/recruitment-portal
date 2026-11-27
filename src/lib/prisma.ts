import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

const connectionUrl = new URL(connectionString);

// Open connections on demand so one instance does not fill a shared account's quota.
for (const [option, value] of Object.entries({
  connectionLimit: "2",
  minimumIdle: "0",
  idleTimeout: "30",
})) {
  if (!connectionUrl.searchParams.has(option)) {
    connectionUrl.searchParams.set(option, value);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma ORM 7 requires a driver adapter. The `mariadb` adapter opens a TCP
 * connection to MySQL (or MariaDB) and is never imported by browser code.
 */
const adapter = new PrismaMariaDb(connectionUrl.toString(), {
  database: connectionUrl.pathname.replace(/^\//, "") || undefined,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
