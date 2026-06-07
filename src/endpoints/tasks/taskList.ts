import { contentJson, OpenAPIRoute } from "chanfana";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "../../db/schema";
import type { AppContext } from "../../types";
import { taskSelectSchema } from "./base";

export class TaskList extends OpenAPIRoute<[AppContext]> {
	schema = {
		tags: ["Tasks"],
		summary: "List all tasks",
		description: "Returns a paginated list of tasks. Supports search and sorting.",
		security: [{ bearerAuth: [] }],
		request: {
			query: z.object({
				page: z.coerce.number().int().min(1).default(1).openapi({
					example: 1,
					description: "Page number",
				}),
				per_page: z.coerce.number().int().min(1).max(100).default(20).openapi({
					example: 20,
					description: "Number of items per page (max 100)",
				}),
				search: z.string().optional().openapi({
					example: "fix bug",
					description: "Search across name, slug, and description",
				}),
				order_by: z.enum(["id", "name", "due_date"]).default("id").openapi({
					example: "id",
					description: "Field to sort by",
				}),
				order_dir: z.enum(["asc", "desc"]).default("desc").openapi({
					example: "desc",
					description: "Sort direction",
				}),
			}),
		},
		responses: {
			"200": {
				description: "List of tasks",
				...contentJson({
					success: z.literal(true),
					result: z.array(taskSelectSchema),
					meta: z.object({
						page: z.number(),
						per_page: z.number(),
						total: z.number(),
					}),
				}),
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { page, per_page, search, order_by, order_dir } = data.query;
		const db = c.get("db");
		const userId = c.get("userId");

		const offset = (page - 1) * per_page;
		const orderCol = tasks[order_by as keyof typeof tasks] as any;
		const orderFn = order_dir === "asc" ? asc : desc;

		const userFilter = eq(tasks.user_id, userId);
		const where = search
			? and(
					userFilter,
					or(
						ilike(tasks.name, `%${search}%`),
						ilike(tasks.slug, `%${search}%`),
						ilike(tasks.description, `%${search}%`),
					),
				)
			: userFilter;

		const [rows, countResult] = await Promise.all([
			db
				.select()
				.from(tasks)
				.where(where)
				.orderBy(orderFn(orderCol))
				.limit(per_page)
				.offset(offset),
			db.$count(tasks, where),
		]);

		return c.json({
			success: true,
			result: rows,
			meta: { page, per_page, total: Number(countResult) },
		});
	}
}
