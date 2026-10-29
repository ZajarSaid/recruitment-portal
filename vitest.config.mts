import path from "node:path";

import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: ".env" });

/**
 * Derived from `DATABASE_URL` by appending `_test` to the database name, so
 * the automated suite never writes to the development database. Kept in sync
 * with `tests/harness/db.ts`.
 */
function deriveTestDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw || raw.trim().length === 0) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, "");
  if (!name) {
    throw new Error("DATABASE_URL must include a database name.");
  }
  if (!name.endsWith("_test")) {
    url.pathname = `/${name}_test`;
  }
  return url.toString();
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(
        import.meta.dirname,
        "tests/stubs/server-only.ts",
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // Integration tests share one MySQL database; run files serially.
    fileParallelism: false,
    env: {
      DATABASE_URL: deriveTestDatabaseUrl(),
      SESSION_SECRET:
        process.env.SESSION_SECRET ??
        "test-session-secret-please-change-0000000000",
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      // Keep uploaded test files out of the repository.
      UPLOAD_DIR: path.resolve(import.meta.dirname, ".tmp-test-uploads"),
    },
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
    },
  },
});
