import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { tasks } from "../../db/schema";
import type { AppContext } from "../../types";
import { taskInsertSchema, taskSelectSchema } from "./base";

const exampleTask = {
	name: "Fix login bug",
	slug: "fix-login-bug",
	description: "Users are unable to log in with Google OAuth on mobile devices.",
	completed: false,
	due_date: "2026-07-01T09:00:00.000Z",
};

const exampleTaskResponse = {
	id: 1,
	...exampleTask,
};

export class TaskCreate extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Tasks"],
		summary: "Create a new task",
		description: "Creates a new task and returns the created object with its generated ID.",
		security: [{ bearerAuth: [] }],
		request: {
			body: {
				description: "Task data",
				content: {
					"application/json": {
						schema: taskInsertSchema,
						example: exampleTask,
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Task created successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(true),
							result: taskSelectSchema,
						}),
						example: {
							success: true,
							result: exampleTaskResponse,
						},
					},
				},
			},
			"400": {
				description: "Validation error",
				content: {
					"application/json": {
						schema: z.object({
							success: z.literal(false),
							errors: z.array(
								z.object({ code: z.number(), message: z.string(), path: z.string().optional() }),
							),
						}),
						example: {
							success: false,
							errors: [{ code: 1001, message: "Required", path: "name" }],
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

		const [created] = await db
			.insert(tasks)
			.values({ ...data.body, user_id: userId })
			.returning();

		return c.json({ success: true, result: created }, 201);
	}
}
