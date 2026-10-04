import { Router } from "express";
import {
    addToHistory,
    clearHistory,
    getHistory,
} from "../controllers/history.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest.middleware";
import { emptyBody, emptyQuery, savedVideoBody } from "../validation/schemas";

const router = Router();
router.use(requireAuth);

router.post("/", validateRequest({ body: savedVideoBody }), addToHistory);
router.get("/", validateRequest({ query: emptyQuery }), getHistory);
router.delete(
  "/",
  validateRequest({ body: emptyBody, query: emptyQuery }),
  clearHistory,
);

export default router;
