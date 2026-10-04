import { Router } from "express";
import { stats } from "../controllers/stats.controller";
import { validateRequest } from "../middleware/validateRequest.middleware";
import { emptyQuery } from "../validation/schemas";

const router = Router();
router.get("/", validateRequest({ query: emptyQuery }), stats);

export default router;
