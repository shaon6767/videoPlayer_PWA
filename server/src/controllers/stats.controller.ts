import { Request, Response } from "express";
import { getPublicStats } from "../services/stats.service";

export async function stats(_req: Request, res: Response) {
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
  );
  res.json(await getPublicStats());
}
