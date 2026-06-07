import { integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tasks = pgTable("tasks", {
	id: serial("id").primaryKey(),
	user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
	name: text("name").notNull(),
	slug: text("slug").notNull(),
	description: text("description").notNull(),
	// Stored as integer (0/1) to match existing schema
	completed: integer("completed").notNull().default(0),
	due_date: timestamp("due_date", { mode: "string" }).notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
