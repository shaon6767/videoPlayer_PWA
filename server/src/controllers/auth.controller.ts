import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {
  authenticatedUserId,
  authCookieName,
  AuthRequest,
} from "../middleware/auth.middleware";
import { User } from "../models/User";
import { ApiError } from "../errors";
import { z } from "zod";
import { loginBody, registerBody } from "../validation/schemas";

type RegisterBody = z.infer<typeof registerBody>;
type LoginBody = z.infer<typeof loginBody>;
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: env.jwtMaxAgeMs,
};

function signToken(userId: string): string {
  return jwt.sign(
    { userId },
    env.jwtSecret,
    { algorithm: "HS256", expiresIn: env.jwtExpiresIn },
  );
}

function setAuthCookie(res: Response, userId: string): void {
  res.cookie(authCookieName, signToken(userId), cookieOptions);
}

function userPayload(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function register(
  req: Request<Record<string, string>, unknown, RegisterBody>,
  res: Response,
) {
  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already in use");

  const user = await User.create({ name, email, password: req.body.password });
  setAuthCookie(res, user._id.toString());
  res.status(201).json(userPayload(user));
}

export async function login(
  req: Request<Record<string, string>, unknown, LoginBody>,
  res: Response,
) {
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  setAuthCookie(res, user._id.toString());
  res.json(userPayload(user));
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(authCookieName, {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });
  res.json({ message: "Logged out" });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(authenticatedUserId(req));
  if (!user) throw new ApiError(404, "User not found");
  res.json(userPayload(user));
}
