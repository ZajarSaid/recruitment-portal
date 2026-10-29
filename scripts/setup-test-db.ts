import { resetTestDatabase } from "../tests/harness/db";

/**
 * Creates (if needed), migrates, and empties the isolated test database.
 * Run with `npm run test:setup`.
 */
async function main(): Promise<void> {
  const url = await resetTestDatabase();
  console.log("Test database ready:");
  console.log(`  ${url.replace(/:[^:@]*@/, ":***@")}`);
}

main().catch((error) => {
  console.error("Failed to prepare the test database:", error);
  process.exitCode = 1;
});
