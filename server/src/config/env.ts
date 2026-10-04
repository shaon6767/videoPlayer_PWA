import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";
dotenv.config();

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
const jwtDuration = jwtExpiresIn.match(/^(\d+)([smhd])$/);
if (!jwtDuration) {
  throw new Error("JWT_EXPIRES_IN must use a duration such as 15m, 12h, or 7d");
}
const durationMilliseconds: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI as string,
  redisUrl: process.env.REDIS_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>,
  jwtMaxAgeMs: Number(jwtDuration[1]) * durationMilliseconds[jwtDuration[2]],
  youtubeApiKey: process.env.YOUTUBE_API_KEY as string,
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
};

if (!env.mongoUri || !env.jwtSecret || !env.youtubeApiKey) {
  throw new Error("Missing required env vars. Check .env against .env.example");
}
