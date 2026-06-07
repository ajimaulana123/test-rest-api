import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./migrations",
	dialect: "postgresql",
	dbCredentials: {
		// Used by drizzle-kit for migration generation & push
		// Set DATABASE_URL env var or use .env file locally
		url: process.env.DATABASE_URL!,
	},
});
