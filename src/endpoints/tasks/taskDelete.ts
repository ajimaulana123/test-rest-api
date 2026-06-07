import { NotFoundException, OpenAPIRoute } from "chanfana";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "../../db/schema";
import type { AppContext } from "../../types";
import { taskSelectSchema } from "./base";

export class TaskDelete extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Tasks"],
		summary: "Delete a task",
		description: "Permanently deletes a task. Returns the deleted task object.",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({
					example: 1,
					description: "The task ID to delete",
				}),
			}),
		},
		responses: {
			"200": {
				description: "Task deleted successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true),
							result: taskSelectSchema,
						}),
						example: {
							success: true,
							result: {
								id: 1,
								name: "Fix login bug",
								slug: "fix-login-bug",
								description: "Users are unable to log in with Google OAuth on mobile devices.",
								completed: false,
								due_date: "2026-07-01T09:00:00.000Z",
							},
						},
					},
				},
			},
			"404": {
				description: "Task not found",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(false),
							errors: z.array(z.object({ message: z.string() })),
						}),
						example: {
							success: false,
							errors: [{ message: "Not Found" }],
						},
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const db = c.get("db");
		const userId = c.get("userId");

		const [deleted] = await db
			.delete(tasks)
			.where(and(eq(tasks.id, data.params.id), eq(tasks.user_id, userId)))
			.returning();

		if (!deleted) {
			throw new NotFoundException();
		}

		return c.json({ success: true, result: deleted });
	}
}
