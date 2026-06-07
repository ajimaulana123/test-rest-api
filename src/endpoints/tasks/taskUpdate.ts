import { NotFoundException, OpenAPIRoute } from "chanfana";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "../../db/schema";
import type { AppContext } from "../../types";
import { taskSelectSchema, taskUpdateSchema } from "./base";

export class TaskUpdate extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Tasks"],
		summary: "Update a task",
		description: "Fully replaces a task's fields. All fields are required.",
		security: [{ bearerAuth: [] }],
		request: {
			params: z.object({
				id: z.coerce.number().int().positive().openapi({
					example: 1,
					description: "The task ID to update",
				}),
			}),
			body: {
				description: "Updated task data",
				content: {
					"application/json": {
						schema: taskUpdateSchema,
						example: {
							name: "Fix login bug (resolved)",
							slug: "fix-login-bug-resolved",
							description: "Google OAuth issue on mobile has been patched.",
							completed: true,
							due_date: "2026-07-01T09:00:00.000Z",
						},
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Task updated successfully",
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
								name: "Fix login bug (resolved)",
								slug: "fix-login-bug-resolved",
								description: "Google OAuth issue on mobile has been patched.",
								completed: true,
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

		const [existing] = await db
			.select({ id: tasks.id })
			.from(tasks)
			.where(and(eq(tasks.id, data.params.id), eq(tasks.user_id, userId)))
			.limit(1);

		if (!existing) {
			throw new NotFoundException();
		}

		const [updated] = await db
			.update(tasks)
			.set(data.body)
			.where(and(eq(tasks.id, data.params.id), eq(tasks.user_id, userId)))
			.returning();

		return c.json({ success: true, result: updated });
	}
}
