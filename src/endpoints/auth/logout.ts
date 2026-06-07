import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { createSupabaseClient } from "../../lib/supabase";
import type { AppContext } from "../../types";

export class AuthLogout extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Auth"],
		summary: "Logout (revoke current session)",
		security: [{ bearerAuth: [] }],
		request: {
			headers: z.object({
				authorization: z.string().openapi({ example: "Bearer <access_token>" }),
			}),
		},
		responses: {
			"200": {
				description: "Logged out successfully",
				...contentJson(
					z.object({
						success: z.literal(true),
						result: z.object({ message: z.string() }),
					}),
				),
			},
			"401": {
				description: "Unauthorized",
				...contentJson(
					z.object({
						success: z.literal(false),
						errors: z.array(z.object({ message: z.string() })),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const authHeader = c.req.header("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return c.json(
				{ success: false, errors: [{ message: "Missing Authorization header" }] },
				401,
			);
		}

		const accessToken = authHeader.replace("Bearer ", "").trim();
		const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, accessToken);

		// signOut with scope "global" revokes the token on Supabase server side,
		// so subsequent requests with the same token will be rejected.
		const { error } = await supabase.auth.signOut({ scope: "global" });

		if (error) {
			console.error("Logout error:", error.message);
		}

		return c.json({ success: true, result: { message: "Logged out successfully" } });
	}
}
