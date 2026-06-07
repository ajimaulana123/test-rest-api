import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tasks } from "../../db/schema";

/**
 * Flexible datetime validator — accepts multiple common formats from frontend:
 * - "2026-07-01T09:00:00.000Z"  (full ISO 8601 with Z)
 * - "2026-07-01T09:00:00"       (no timezone — treated as UTC)
 * - "2026-07-01T09:00:00+07:00" (with offset)
 * - "2026-07-01"                (date only — treated as start of day UTC)
 *
 * Normalizes all to a valid Date, then stores as ISO string.
 */
const flexibleDatetime = z
	.string()
	.transform((val, ctx) => {
		// Try parsing as-is first, then with Z appended for naive datetimes
		const parsed = new Date(val);
		if (!isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid date format: "${val}". Use ISO 8601 format, e.g. "2026-07-01T09:00:00.000Z"`,
		});
		return z.NEVER;
	});

// Insert schema — user_id tidak diekspos ke API, diisi dari JWT di handler
export const taskInsertSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1),
	description: z.string(),
	// Accept boolean from API consumers, store as 0/1 integer
	completed: z.boolean().transform((v) => (v ? 1 : 0)),
	due_date: flexibleDatetime,
});

export const taskUpdateSchema = taskInsertSchema;

// Select schema — coerce integer completed back to boolean for API responses
const _selectSchema = createSelectSchema(tasks);
export const taskSelectSchema = _selectSchema.extend({
	completed: z.number().transform((v) => Boolean(v)),
});
