/**
 * Exports the Swagger spec to openapi.json.
 * Run via: bun run generate:openapi
 *
 * Uses dynamic import so placeholder env vars are set before Zod validation runs.
 * These placeholders are never used for real connections — only the spec shape matters.
 */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/placeholder";
process.env.JWT_ACCESS_SECRET ??= "placeholder-for-type-generation";
process.env.JWT_REFRESH_SECRET ??= "placeholder-for-type-generation";

const { swaggerSpec } = await import("../src/config/swagger.ts");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../openapi.json");

writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`openapi.json written to ${outputPath}`);
