import "dotenv/config";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import mariadb, { type Connection } from "mariadb";

/**
 * Test database helpers.
 *
 * Automated tests must never touch the development database. We derive a
 * separate database name (for example `recruitment_portal_test`) from the
 * configured `DATABASE_URL`, create it when missing, apply the Prisma
 * migration SQL files, and truncate it before a run.
 */

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");
const MIGRATIONS_TABLE = "`_test_migrations`";

/** Tables emptied before each run (child tables first). */
const TABLES = [
  "ApplicationDocument",
  "StagedDocument",
  "ApplicationStatusHistory",
  "ApplicationEvaluation",
  "JobDocumentRequirement",
  "Application",
  "Job",
  "DocumentType",
  "PasswordResetToken",
  "User",
];

/** Builds the test database URL from the configured `DATABASE_URL`. */
export function getTestDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env before running tests.",
    );
  }

  const url = new URL(raw);
  const currentName = url.pathname.replace(/^\//, "");
  if (!currentName) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  if (currentName.endsWith("_test")) {
    return url.toString();
  }

  url.pathname = `/${currentName}_test`;
  return url.toString();
}

/** Quotes a MySQL identifier, escaping embedded backticks. */
function quote(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}

/** Builds connection options from a URL, optionally overriding the database. */
function connectionOptions(url: string, database?: string | null) {
  const parsed = new URL(url);
  const resolvedDatabase =
    database === null
      ? undefined
      : database ?? parsed.pathname.replace(/^\//, "") ?? undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: resolvedDatabase || undefined,
    multipleStatements: true,
  };
}

/** Creates the test database when it does not exist. */
async function ensureDatabase(testUrl: string): Promise<void> {
  const databaseName = new URL(testUrl).pathname.replace(/^\//, "");
  const connection = await mariadb.createConnection(
    connectionOptions(testUrl, null),
  );
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quote(databaseName)}`,
    );
  } finally {
    await connection.end();
  }
}

/** Drops and recreates the test database, discarding all of its contents. */
async function resetSchema(testUrl: string): Promise<void> {
  const databaseName = new URL(testUrl).pathname.replace(/^\//, "");
  const connection = await mariadb.createConnection(
    connectionOptions(testUrl, null),
  );
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quote(databaseName)}`);
    await connection.query(`CREATE DATABASE ${quote(databaseName)}`);
  } finally {
    await connection.end();
  }
}

function readMigrations(): Array<{ name: string; sql: string }> {
  const directories = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return directories.map((name) => ({
    name,
    sql: readFileSync(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8"),
  }));
}

async function ensureMigrationsTable(
  connection: Connection,
): Promise<void> {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
       \`name\` VARCHAR(191) NOT NULL,
       \`applied_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       PRIMARY KEY (\`name\`)
     )`,
  );
}

/**
 * Applies any migration SQL that has not been recorded yet. Migration history
 * is tracked in a dedicated table so that new (additive) migrations created
 * after the test database was first provisioned are still applied. A legacy
 * database built before tracking existed is rebuilt once from scratch.
 */
async function applyMigrations(testUrl: string): Promise<void> {
  let connection = await mariadb.createConnection(connectionOptions(testUrl));
  try {
    const userTable = (await connection.query(
      `SELECT TABLE_NAME AS table_name
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User'`,
    )) as Array<{ table_name: string }>;
    await ensureMigrationsTable(connection);

    const recorded = (await connection.query(
      `SELECT \`name\` FROM ${MIGRATIONS_TABLE}`,
    )) as Array<{ name: string }>;
    const applied = new Set<string>(recorded.map((row) => row.name));

    if (applied.size === 0 && userTable.length > 0) {
      // Pre-tracking database: rebuild deterministically, then track.
      await connection.end();
      await resetSchema(testUrl);
      connection = await mariadb.createConnection(connectionOptions(testUrl));
      await ensureMigrationsTable(connection);
    }

    for (const migration of readMigrations()) {
      if (applied.has(migration.name)) continue;
      await connection.query(migration.sql);
      await connection.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (\`name\`) VALUES (?)
           ON DUPLICATE KEY UPDATE \`name\` = \`name\``,
        [migration.name],
      );
    }
  } finally {
    await connection.end();
  }
}

/** Removes all rows so each test run starts from a known empty state. */
async function resetDatabase(testUrl: string): Promise<void> {
  const connection = await mariadb.createConnection(connectionOptions(testUrl));
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of TABLES) {
      await connection.query(`TRUNCATE TABLE ${quote(table)}`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  } finally {
    await connection.end();
  }
}

/**
 * Ensures the test database exists, is migrated, and is empty.
 * Returns the connection string the test workers should use.
 */
export async function setupTestDatabase(): Promise<string> {
  const testUrl = getTestDatabaseUrl();
  await ensureDatabase(testUrl);
  await applyMigrations(testUrl);
  await resetDatabase(testUrl);
  return testUrl;
}

/** Convenience for the `npm run test:setup` script. */
export async function resetTestDatabase(): Promise<string> {
  return setupTestDatabase();
}
