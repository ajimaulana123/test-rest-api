import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { createSupabaseClient } from "../../lib/supabase";
import type { AppContext } from "../../types";

export class AuthRegister extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Auth"],
		summary: "Register a new user",
		description: "Register and immediately get an access token (email confirmation is disabled).",
		request: {
			body: contentJson(
				z.object({
					email: z.string().email().openapi({ example: "user@example.com" }),
					password: z.string().min(6).openapi({ example: "password123" }),
				}),
			),
		},
		responses: {
			"201": {
				description: "Registered and logged in successfully",
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
			"400": {
				description: "Registration failed (e.g. email already in use)",
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

		const { data: authData, error } = await supabase.auth.signUp({ email, password });

		if (error || !authData.user) {
			return c.json(
				{ success: false, errors: [{ message: error?.message ?? "Registration failed" }] },
				400,
			);
		}

		// Email confirmation is disabled — session is available immediately after signUp
		if (!authData.session) {
			return c.json(
				{ success: false, errors: [{ message: "Registration succeeded but no session returned. Check if email confirmation is disabled in Supabase." }] },
				400,
			);
		}

		return c.json(
			{
				success: true,
				result: {
					access_token: authData.session.access_token,
					refresh_token: authData.session.refresh_token,
					user: {
						id: authData.user.id,
						email: authData.user.email!,
					},
				},
			},
			201,
		);
	}
}
