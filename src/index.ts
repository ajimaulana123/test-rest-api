import { ApiException, fromHono } from "chanfana";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import * as schema from "./db/schema";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { authRouter } from "./endpoints/auth/router";
import { tasksRouter } from "./endpoints/tasks/router";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// DB middleware — create a new pg Client per request via Hyperdrive
app.use("*", async (c, next) => {
	const client = new Client({
		connectionString: c.env.HYPERDRIVE.connectionString,
		connectionTimeoutMillis: 5000,
		query_timeout: 10000,
	});

	try {
		await client.connect();
	} catch (connectErr) {
		console.error("DB connect failed:", connectErr);
		return c.json(
			{ success: false, errors: [{ code: 7001, message: "Database connection failed" }] },
			500,
		);
	}

	const db = drizzle(client, { schema });
	c.set("db", db);

	try {
		await next();
	} finally {
		client.end().catch((e) => console.error("DB end error:", e));
	}
});

app.onError((err, c) => {
	if (err instanceof ApiException) {
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err, JSON.stringify(err, Object.getOwnPropertyNames(err)));

	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

const openapi = fromHono(app, {
	docs_url: "/",
	schema: {
		info: {
			title: "My Awesome API",
			version: "2.0.0",
			description: "This is the documentation for my awesome API.",
		},
	},
});

// Register Bearer auth scheme so Swagger UI shows the Authorize button
openapi.registry.registerComponent("securitySchemes", "bearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
	description: "JWT access_token dari POST /auth/login",
});

openapi.route("/auth", authRouter);
openapi.route("/tasks", tasksRouter);
openapi.post("/dummy/:slug", DummyEndpoint);

export default app;
