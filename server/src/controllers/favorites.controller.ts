import { Response } from "express";
import { authenticatedUserId, AuthRequest } from "../middleware/auth.middleware";
import { Favorite } from "../models/Favorite";
import { z } from "zod";
import { savedVideoBody } from "../validation/schemas";

type SavedVideoBody = z.infer<typeof savedVideoBody>;

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
  const favorites = await Favorite.find({
    user: authenticatedUserId(req),
  })
    .sort({ addedAt: -1 })
    .limit(60);
  res.json(favorites);
}

export async function getFavoriteStatus(req: AuthRequest, res: Response) {
  const favorite = await Favorite.findOne({
    user: authenticatedUserId(req),
    videoId: req.params.videoId,
  }).select("_id videoId");
  res.json({ isFavorite: Boolean(favorite) });
}
