import { NextFunction, Request, Response } from "express";

export function publicCache(maxAgeSeconds: number, edgeSeconds = maxAgeSeconds) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Cache-Control",
      `public, max-age=${maxAgeSeconds}, s-maxage=${edgeSeconds}, stale-while-revalidate=300`,
    );
    next();
  };
}
