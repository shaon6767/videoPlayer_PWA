import { Router } from "express";
import {
    categories,
    popular,
    related,
    search,
    videoDetails,
} from "../controllers/youtube.controller";
import { searchLimiter } from "../middleware/rateLimiter.middleware";
import { publicCache } from "../middleware/publicCache.middleware";
import { trackPublicRequest } from "../middleware/trackRequests.middleware";
import { validateRequest } from "../middleware/validateRequest.middleware";
import {
  emptyQuery,
  popularQuery,
  searchQuery,
  videoIdParams,
} from "../validation/schemas";

const router = Router();

router.use(trackPublicRequest);
router.get(
  "/search",
  searchLimiter,
  publicCache(60, 300),
  validateRequest({ query: searchQuery }),
  search,
);
router.get(
  "/popular",
  publicCache(60, 300),
  validateRequest({ query: popularQuery }),
  popular,
);
router.get(
  "/categories",
  publicCache(3600, 86400),
  validateRequest({ query: emptyQuery }),
  categories,
);
router.get(
  "/video/:videoId",
  publicCache(60, 300),
  validateRequest({ params: videoIdParams, query: emptyQuery }),
  videoDetails,
);
router.get(
  "/video/:videoId/related",
  publicCache(60, 300),
  validateRequest({ params: videoIdParams, query: emptyQuery }),
  related,
);

export default router;
