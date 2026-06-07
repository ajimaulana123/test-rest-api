import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client using the user's JWT from the request.
 * This is used for auth operations and to enforce RLS on queries
 * that go through the Supabase REST API.
 *
 * For database queries via Hyperdrive/Drizzle, we enforce user_id
 * filtering in the application layer instead.
 */
export function createSupabaseClient(supabaseUrl: string, supabaseAnonKey: string, accessToken?: string) {
	return createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		global: accessToken
			? {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			: undefined,
	});
}
