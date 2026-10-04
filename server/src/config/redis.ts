import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.redisUrl, {
  keyPrefix: "ytlite:",
  connectTimeout: 5_000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (attempt) => Math.min(attempt * 250, 2_000),
});

redis.on("error", (err) => console.error("Redis error", err));
redis.on("connect", () => console.log("Redis connected"));
