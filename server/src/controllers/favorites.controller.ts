import { Response } from "express";
import { authenticatedUserId, AuthRequest } from "../middleware/auth.middleware";
import { Favorite } from "../models/Favorite";
import { z } from "zod";
import { favoritesQuery, savedVideoBody } from "../validation/schemas";

type SavedVideoBody = z.infer<typeof savedVideoBody>;
const FAVORITES_PAGE_SIZE = 60;

export async function addFavorite(
  req: AuthRequest<SavedVideoBody>,
  res: Response,
) {
  const favorite = await Favorite.create({
    user: authenticatedUserId(req),
    ...req.body,
  });
  res.status(201).json(favorite);
}

export async function removeFavorite(req: AuthRequest, res: Response) {
  await Favorite.deleteOne({
    user: authenticatedUserId(req),
    videoId: req.params.videoId,
  });
  res.status(204).send();
}

export async function getFavorites(req: AuthRequest, res: Response) {
  const { page } = favoritesQuery.parse(req.query);
  const user = authenticatedUserId(req);
  const [favorites, totalCount] = await Promise.all([
    Favorite.find({ user })
      .sort({ addedAt: -1, _id: -1 })
      .skip((page - 1) * FAVORITES_PAGE_SIZE)
      .limit(FAVORITES_PAGE_SIZE),
    Favorite.countDocuments({ user }),
  ]);
  res.json({
    items: favorites,
    page,
    pageSize: FAVORITES_PAGE_SIZE,
    totalCount,
    totalPages: Math.ceil(totalCount / FAVORITES_PAGE_SIZE),
  });
}

export async function getFavoriteStatus(req: AuthRequest, res: Response) {
  const favorite = await Favorite.findOne({
    user: authenticatedUserId(req),
    videoId: req.params.videoId,
  }).select("_id videoId");
  res.json({ isFavorite: Boolean(favorite) });
}
