import type { Context } from "hono";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./db/schema";

export type Db = NodePgDatabase<typeof schema>;

export type AppEnv = {
	Bindings: Env & {
		SUPABASE_URL: string;
		SUPABASE_ANON_KEY: string;
	};
	Variables: {
		db: Db;
		userId: string;
		accessToken: string;
	};
};

export type AppContext = Context<AppEnv>;
export type HandleArgs = [AppContext];
