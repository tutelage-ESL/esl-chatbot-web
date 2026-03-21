import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.ts";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Tests the database connection and logs table info.
 * Called once at server startup.
 */
export async function connectDatabase(): Promise<void> {
  try {
    console.log("\n┌─────────────────────────────────────────┐");
    console.log("│        DATABASE CONNECTION CHECK         │");
    console.log("└─────────────────────────────────────────┘\n");

    // Test raw connection
    await prisma.$connect();
    console.log("✅ PostgreSQL connected successfully");

    // Log which database we're connected to
    const result = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
    console.log(`📦 Database: ${result[0]?.current_database}`);

    // Check existing tables
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;

    if (tables.length === 0) {
      console.log("⚠️  No tables found — run 'bun run db:push' to create them");
    } else {
      console.log(`📋 Tables found (${tables.length}):`);
      for (const table of tables) {
        // Count rows in each table
        const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM "${table.tablename}"`
        );
        const rowCount = Number(countResult[0]?.count ?? 0);
        console.log(`   • ${table.tablename} (${rowCount} rows)`);
      }
    }

    console.log("");
    logger.info("Database connection established");
  } catch (error) {
    console.log("❌ PostgreSQL connection FAILED");
    console.error(error);
    logger.error("Failed to connect to database", error);
    process.exit(1);
  }
}

/**
 * Drops all tables in the public schema and recreates them via Prisma.
 * Only runs when RESET_DB=true in your .env.
 * ⚠️  DESTROYS ALL DATA — development use only.
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.RESET_DB !== "true") return;
  if (process.env.NODE_ENV === "production") {
    logger.warn("RESET_DB is ignored in production");
    return;
  }

  console.log("\n⚠️  RESET_DB=true — dropping and recreating all tables...");

  // Drop every table in the public schema in one shot
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("🗑️  All tables dropped.");

  // Re-push the Prisma schema (creates tables without migration history)
  const { execSync } = await import("child_process");
  execSync("bunx prisma db push --force-reset", { stdio: "inherit" });

  console.log("✅ Database reset complete.\n");
}

/**
 * Disconnects from the database gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}
