import type { MiddlewareHandler } from "hono";
import { createSupabaseClient } from "../lib/supabase";
import type { AppEnv } from "../types";

/**
 * Auth middleware — validates JWT from Authorization header using Supabase.
 * Sets `userId` and `accessToken` in Hono context for use in handlers.
 *
 * Usage: apply to any route that requires authentication.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json(
			{ success: false, errors: [{ code: 4010, message: "Missing or invalid Authorization header" }] },
			401,
		);
	}

	const accessToken = authHeader.replace("Bearer ", "").trim();

	const supabase = createSupabaseClient(
		c.env.SUPABASE_URL,
		c.env.SUPABASE_ANON_KEY,
		accessToken,
	);

	const { data: { user }, error } = await supabase.auth.getUser();

	if (error || !user) {
		return c.json(
			{ success: false, errors: [{ code: 4011, message: "Invalid or expired token" }] },
			401,
		);
	}

	c.set("userId", user.id);
	c.set("accessToken", accessToken);

	await next();
};
