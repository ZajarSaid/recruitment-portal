import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Smoke test for the database layer. Verifies connectivity and that the
 * expected tables are queryable. Run with `npm run db:test`.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Configure .env first.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(connectionString),
});

async function main() {
  await prisma.$queryRaw`SELECT 1`;

  const [users, jobs, applications, publishedJobs] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.job.count({ where: { status: "PUBLISHED" } }),
  ]);

  console.log("Database connection OK.");
  console.log(`  Users:                ${users}`);
  console.log(`  Jobs:                 ${jobs}`);
  console.log(`  Published jobs:       ${publishedJobs}`);
  console.log(`  Applications:         ${applications}`);
}

main()
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
