import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import {
  loginLimiter,
  registerLimiter,
} from "../middleware/rateLimiter.middleware";
import { validateRequest } from "../middleware/validateRequest.middleware";
import {
  emptyBody,
  emptyQuery,
  loginBody,
  registerBody,
} from "../validation/schemas";

const router = Router();

router.post(
  "/register",
  registerLimiter,
  validateRequest({ body: registerBody }),
  register,
);
router.post("/login", loginLimiter, validateRequest({ body: loginBody }), login);
router.post("/logout", validateRequest({ body: emptyBody }), logout);
router.get("/me", validateRequest({ query: emptyQuery }), requireAuth, me);

export default router;
