import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { authMiddleware } from "../../middleware/auth";
import { TaskCreate } from "./taskCreate";
import { TaskDelete } from "./taskDelete";
import { TaskList } from "./taskList";
import { TaskRead } from "./taskRead";
import { TaskUpdate } from "./taskUpdate";

export const tasksRouter = fromHono(new Hono<AppEnv>());

// All task routes require authentication
tasksRouter.use("*", authMiddleware);
tasksRouter.get("/", TaskList);
tasksRouter.post("/", TaskCreate);
tasksRouter.get("/:id", TaskRead);
tasksRouter.put("/:id", TaskUpdate);
tasksRouter.delete("/:id", TaskDelete);
