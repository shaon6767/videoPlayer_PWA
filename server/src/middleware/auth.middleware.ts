import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../errors";

export type AuthRequest<Body = unknown> = Request<
  Record<string, string>,
  unknown,
  Body
> & {
  userId?: string;
};

export const authCookieName = "streamly_token";

export function requireAuth(
  req: Request<Record<string, string>, unknown, unknown> & { userId?: string },
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[authCookieName] as string | undefined;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "string"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authenticatedUserId(req: AuthRequest): string {
  if (!req.userId) throw new ApiError(401, "Not authenticated");
  return req.userId;
}