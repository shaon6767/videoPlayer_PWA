import { Request, Response } from "express";
import * as youtube from "../services/youtubeApi.service";
import { popularQuery, searchQuery } from "../validation/schemas";
import { getCacheStatus } from "../services/youtubeApi.service";

function respondWithCacheStatus(res: Response, data: unknown): void {
  res.setHeader("X-Cache", getCacheStatus(data));
}

export async function search(req: Request, res: Response) {
  const query = searchQuery.parse(req.query);
  const data = await youtube.searchVideos(query.q, query.pageToken);
  respondWithCacheStatus(res, data);
  res.json(data);
}

export async function popular(req: Request, res: Response) {
  const query = popularQuery.parse(req.query);
  const data = await youtube.getPopularVideos(
    query.categoryId,
    query.pageToken,
  );
  respondWithCacheStatus(res, data);
  res.json(data);
}

export async function videoDetails(
  req: Request<{ videoId: string }>,
  res: Response,
) {
  const video = await youtube.getVideoById(req.params.videoId);
  if (!video) {
    res.setHeader("Cache-Control", "no-store");
    res.status(404).json({ message: "Video not found" });
    return;
  }
  respondWithCacheStatus(res, video);
  res.json(video);
}

export async function related(
  req: Request<{ videoId: string }>,
  res: Response,
) {
  const data = await youtube.getRelatedVideos(req.params.videoId);
  respondWithCacheStatus(res, data);
  res.json(data);
}

export async function categories(_req: Request, res: Response) {
  const items = await youtube.getCategories();
  respondWithCacheStatus(res, items);
  res.json({ items });
}
