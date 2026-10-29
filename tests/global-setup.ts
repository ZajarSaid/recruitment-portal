import { setupTestDatabase } from "./harness/db";

/**
 * Vitest global setup: creates and migrates the isolated test database once
 * per run. The derived connection string is also injected into the test
 * environment through `vitest.config.mts` (`test.env.DATABASE_URL`).
 */
export default async function globalSetup(): Promise<void> {
  const url = await setupTestDatabase();
  // Surfaced for debugging only; the value is safe (local test database).
  console.log(`[tests] using test database: ${url.replace(/:[^:@]*@/, ":***@")}`);
}
