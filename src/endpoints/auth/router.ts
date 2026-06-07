import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { authMiddleware } from "../../middleware/auth";
import { AuthLogin } from "./login";
import { AuthLogout } from "./logout";
import { AuthMe } from "./me";
import { AuthRegister } from "./register";

export const authRouter = fromHono(new Hono<AppEnv>());

// Public routes
authRouter.post("/register", AuthRegister);
authRouter.post("/login", AuthLogin);

// Protected routes — apply middleware via use()
authRouter.use("/logout", authMiddleware);
authRouter.use("/me", authMiddleware);
authRouter.post("/logout", AuthLogout);
authRouter.get("/me", AuthMe);
