import { Router } from "express";
import {
    addFavorite,
    getFavorites,
    getFavoriteStatus,
    removeFavorite,
} from "../controllers/favorites.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest.middleware";
import {
  emptyQuery,
  favoritesQuery,
  savedVideoBody,
  videoIdParams,
} from "../validation/schemas";

const router = Router();
router.use(requireAuth);

router.post("/", validateRequest({ body: savedVideoBody }), addFavorite);
router.get("/", validateRequest({ query: favoritesQuery }), getFavorites);
router.get(
  "/:videoId",
  validateRequest({ params: videoIdParams, query: emptyQuery }),
  getFavoriteStatus,
);
router.delete(
  "/:videoId",
  validateRequest({ params: videoIdParams, query: emptyQuery }),
  removeFavorite,
);

export default router;
