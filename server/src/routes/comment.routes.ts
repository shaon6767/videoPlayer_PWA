import { Router } from "express";
import {
    addComment,
    deleteComment,
    getComments,
} from "../controllers/comment.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest.middleware";
import {
  commentBody,
  commentIdParams,
  emptyQuery,
  videoIdParams,
} from "../validation/schemas";

const router = Router();

router.get(
  "/:videoId",
  validateRequest({ params: videoIdParams, query: emptyQuery }),
  getComments,
);
router.post("/", requireAuth, validateRequest({ body: commentBody }), addComment);
router.delete(
  "/:id",
  requireAuth,
  validateRequest({ params: commentIdParams, query: emptyQuery }),
  deleteComment,
);

export default router;
