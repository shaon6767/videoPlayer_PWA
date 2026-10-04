import { NextFunction, Request, Response } from "express";
import { incrementStat } from "../services/stats.service";

export async function trackPublicRequest(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  await incrementStat("requests");
  next();
}
