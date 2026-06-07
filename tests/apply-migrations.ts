// Database migrations are managed by drizzle-kit and applied directly to Supabase.
// Integration tests connect to the real Supabase Postgres via Hyperdrive
// using the localConnectionString defined in wrangler.jsonc.
//
// Before running tests, ensure the database schema is up to date:
//   pnpm db:push
