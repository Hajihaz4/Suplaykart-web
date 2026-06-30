import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Required by drizzle-kit for `migrate`/`push`/`studio`.
    // `generate` works offline (no connection needed).
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
