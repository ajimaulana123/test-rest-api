import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../../types";

export class AuthMe extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Auth"],
		summary: "Get current authenticated user",
		security: [{ bearerAuth: [] }],
		request: {
			headers: z.object({
				authorization: z.string().openapi({ example: "Bearer <access_token>" }),
			}),
		},
		responses: {
			"200": {
				description: "Current user info",
				...contentJson(
					z.object({
						success: z.literal(true),
						result: z.object({
							id: z.string(),
						}),
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
		// userId is set by authMiddleware
		const userId = c.get("userId");

		return c.json({
			success: true,
			result: { id: userId },
		});
	}
}
