import "./backend/load-env";
import { defineConfig } from "drizzle-kit";

const requiredVars = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];

for (const variable of requiredVars) {
  if (!process.env[variable]) {
    throw new Error(`${variable} must be set in your environment or .env file.`);
  }
}

export default defineConfig({
  out: "./database/drizzle",
  schema: "./database/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: `mysql://${encodeURIComponent(process.env.DB_USER!)}:${encodeURIComponent(process.env.DB_PASSWORD!)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  },
});

