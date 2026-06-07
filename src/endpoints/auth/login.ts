import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { createSupabaseClient } from "../../lib/supabase";
import type { AppContext } from "../../types";

export class AuthLogin extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Auth"],
		summary: "Login with email and password",
		request: {
			body: contentJson(
				z.object({
					email: z.string().email().openapi({ example: "user@example.com" }),
					password: z.string().openapi({ example: "password123" }),
				}),
			),
		},
		responses: {
			"200": {
				description: "Login successful",
				...contentJson(
					z.object({
						success: z.literal(true),
						result: z.object({
							access_token: z.string(),
							refresh_token: z.string(),
							user: z.object({
								id: z.string(),
								email: z.string(),
							}),
						}),
					}),
				),
			},
			"401": {
				description: "Invalid credentials",
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
		const data = await this.getValidatedData<typeof this.schema>();
		const { email, password } = data.body;

		const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

		const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

		if (error || !authData.session) {
			return c.json(
				{ success: false, errors: [{ message: "Invalid email or password" }] },
				401,
			);
		}

		return c.json({
			success: true,
			result: {
				access_token: authData.session.access_token,
				refresh_token: authData.session.refresh_token,
				user: {
					id: authData.user.id,
					email: authData.user.email!,
				},
			},
		});
	}
}
