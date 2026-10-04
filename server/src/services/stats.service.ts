import { redis } from "../config/redis";

const TOTALS_KEY = "stats:totals";
const HOURLY_KEY = "stats:hourly";
const TRACKED_COUNTERS = [
  "cacheHits",
  "cacheMisses",
  "staleServes",
  "cacheStaleAvailable",
  "youtubeApiCalls",
  "quotaUnitsUsed",
  "quotaUnitsSaved",
  "requests",
] as const;

export type StatsCounter = (typeof TRACKED_COUNTERS)[number];

function currentHour(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

export async function incrementStat(
  counter: StatsCounter,
  amount = 1,
): Promise<void> {
  try {
    const pipeline = redis.pipeline();
    pipeline.hincrby(TOTALS_KEY, counter, amount);
    if (counter === "requests") {
      pipeline.hincrby(`${HOURLY_KEY}:${currentHour()}`, "requests", 1);
      pipeline.expire(`${HOURLY_KEY}:${currentHour()}`, 60 * 60 * 24 * 32);
    }
    await pipeline.exec();
  } catch (error) {
    console.error(`Unable to record ${counter} statistics in Redis.`, error);
  }
}

export interface PublicStats {
  cacheHits: number;
  cacheMisses: number;
  staleServes: number;
  youtubeApiCalls: number;
  quotaUnitsUsed: number;
  quotaUnitsSaved: number;
  hitRate: number;
  requestsByHour: Array<{ hour: string; requests: number }>;
}

export async function getPublicStats(): Promise<PublicStats> {
  const totals = await redis.hgetall(TOTALS_KEY);
  const hours: Array<{ hour: string; requests: number }> = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const hourKeys = Array.from({ length: 24 }, (_, index) => {
    const hour = new Date(now.getTime() - (23 - index) * 60 * 60 * 1000);
    return { hour: hour.toISOString(), key: `${HOURLY_KEY}:${hour.toISOString()}` };
  });
  const counts = await Promise.all(
    hourKeys.map(({ key }) => redis.hget(key, "requests")),
  );
  for (const [index, entry] of hourKeys.entries()) {
    hours.push({
      hour: entry.hour,
      requests: Number(counts[index] ?? 0),
    });
  }

  const cacheHits = Number(totals.cacheHits ?? 0);
  const cacheMisses = Number(totals.cacheMisses ?? 0);
  const attempts = cacheHits + cacheMisses;
  return {
    cacheHits,
    cacheMisses,
    staleServes: Number(totals.staleServes ?? 0),
    youtubeApiCalls: Number(totals.youtubeApiCalls ?? 0),
    quotaUnitsUsed: Number(totals.quotaUnitsUsed ?? 0),
    quotaUnitsSaved: Number(totals.quotaUnitsSaved ?? 0),
    hitRate: attempts ? cacheHits / attempts : 0,
    requestsByHour: hours,
  };
}
