import { Response } from "express";
import { authenticatedUserId, AuthRequest } from "../middleware/auth.middleware";
import { WatchHistory } from "../models/WatchHistory";
import { z } from "zod";
import { savedVideoBody } from "../validation/schemas";

type SavedVideoBody = z.infer<typeof savedVideoBody>;

export async function addToHistory(
  req: AuthRequest<SavedVideoBody>,
  res: Response,
) {
  await WatchHistory.findOneAndUpdate(
    { user: authenticatedUserId(req), videoId: req.body.videoId },
    {
      title: req.body.title,
      thumbnail: req.body.thumbnail,
      watchedAt: new Date(),
    },
    { upsert: true, returnDocument: "after" },
  );

  res.status(204).send();
}

export async function getHistory(req: AuthRequest, res: Response) {
  const history = await WatchHistory.find({ user: authenticatedUserId(req) })
    .sort({ watchedAt: -1 })
    .limit(50);
  res.json(history);
}

export async function clearHistory(req: AuthRequest, res: Response) {
  await WatchHistory.deleteMany({ user: authenticatedUserId(req) });
  res.status(204).send();
}
