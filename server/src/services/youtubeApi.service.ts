import axios from "axios";
import type {
  VideoCategory,
  VideoPage,
  VideoSummary,
} from "../../../shared/video";
import { env } from "../config/env";
import { redis } from "../config/redis";
import { incrementStat } from "./stats.service";

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const FRESH_TTL_SECONDS = 60 * 60;
const STALE_TTL_SECONDS = 7 * 24 * 60 * 60;
const inFlight = new Map<string, Promise<unknown>>();
const cacheStatuses = new WeakMap<object, "HIT" | "MISS" | "STALE" | "COALESCED">();

const yt = axios.create({
  baseURL: BASE_URL,
  params: { key: env.youtubeApiKey },
  timeout: 10_000,
});

interface YouTubeErrorBody {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
}

interface YouTubeSnippet {
  title: string;
  description?: string;
  channelTitle: string;
  categoryId?: string;
  thumbnails: {
    medium?: { url: string };
    high?: { url: string };
    default?: { url: string };
  };
}

interface YouTubeVideo {
  id: string | { videoId?: string };
  snippet: YouTubeSnippet;
  contentDetails?: { duration?: string };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YouTubeListResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
}

interface YouTubeCategoryResponse {
  items: Array<{ id: string; snippet: { title: string; assignable: boolean } }>;
}

export class YouTubeQuotaError extends Error {
  constructor() {
    super("YouTube daily limit reached, try again later.");
    this.name = "YouTubeQuotaError";
  }
}

export class YouTubeServiceError extends Error {
  constructor() {
    super("YouTube API request failed.");
    this.name = "YouTubeServiceError";
  }
}

function formatDuration(iso = "PT0S"): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = Number(match?.[1] || 0);
  const minutes = Number(match?.[2] || 0);
  const seconds = Number(match?.[3] || 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

function thumbnailOf(snippet: YouTubeSnippet): string {
  return (
    snippet.thumbnails.medium?.url ??
    snippet.thumbnails.high?.url ??
    snippet.thumbnails.default?.url ??
    ""
  );
}

function toSummary(video: YouTubeVideo, duration?: string): VideoSummary {
  const id = typeof video.id === "string" ? video.id : video.id.videoId ?? "";
  const statistics = video.statistics;
  return {
    id,
    title: video.snippet.title,
    thumbnail: thumbnailOf(video.snippet),
    channelTitle: video.snippet.channelTitle,
    durationText: formatDuration(duration ?? video.contentDetails?.duration),
    ...(video.snippet.categoryId
      ? { categoryId: video.snippet.categoryId }
      : {}),
    ...(video.snippet.description
      ? { description: video.snippet.description }
      : {}),
    ...(statistics
      ? {
          stats: {
            ...(statistics.viewCount
              ? { viewCount: Number(statistics.viewCount) }
              : {}),
            ...(statistics.likeCount
              ? { likeCount: Number(statistics.likeCount) }
              : {}),
            ...(statistics.commentCount
              ? { commentCount: Number(statistics.commentCount) }
              : {}),
          },
        }
      : {}),
  };
}

async function recordYouTubeCall(units: number): Promise<void> {
  await Promise.all([
    incrementStat("youtubeApiCalls"),
    incrementStat("quotaUnitsUsed", units),
  ]);
}

async function youtubeGet<T>(
  endpoint: "/search" | "/videos" | "/videoCategories",
  params: Record<string, string | number | undefined>,
  unitCost: number,
): Promise<T> {
  await recordYouTubeCall(unitCost);
  try {
    const { data } = await yt.get<T>(endpoint, { params });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as YouTubeErrorBody | undefined;
      const reasons = body?.error?.errors?.map((item) => item.reason) ?? [];
      const message = body?.error?.message?.toLowerCase() ?? "";
      if (
        reasons.some((reason) =>
          ["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(
            reason ?? "",
          ),
        ) ||
        message.includes("quota")
      ) {
        throw new YouTubeQuotaError();
      }
    }
    throw new YouTubeServiceError();
  }
}

async function cached<T>(
  key: string,
  estimatedUnits: number | ((value: T) => number),
  load: () => Promise<T>,
): Promise<T> {
  const freshKey = `youtube:fresh:${key}`;
  const staleKey = `youtube:stale:${key}`;
  let freshValue: string | null = null;
  let staleValue: string | null = null;

  try {
    [freshValue, staleValue] = await Promise.all([
      redis.get(freshKey),
      redis.get(staleKey),
    ]);
  } catch (error) {
    console.error("Redis cache read failed; continuing without cache.", error);
  }

  if (freshValue) {
    const result = JSON.parse(freshValue) as T;
    await incrementStat("cacheHits");
    await incrementStat(
      "quotaUnitsSaved",
      typeof estimatedUnits === "function"
        ? estimatedUnits(result)
        : estimatedUnits,
    );
    return setCacheStatus(result, "HIT");
  }

  await incrementStat("cacheMisses");
  if (staleValue) await incrementStat("cacheStaleAvailable");

  const existing = inFlight.get(key);
  if (existing) {
    const result = (await existing) as T;
    await incrementStat(
      "quotaUnitsSaved",
      typeof estimatedUnits === "function"
        ? estimatedUnits(result)
        : estimatedUnits,
    );
    return setCacheStatus(
      JSON.parse(JSON.stringify(result)) as T,
      "COALESCED",
    );
  }

  const pending = (async () => {
    try {
      const result = await load();
      const serialized = JSON.stringify(result);
      try {
        await Promise.all([
          redis.set(freshKey, serialized, "EX", FRESH_TTL_SECONDS),
          redis.set(staleKey, serialized, "EX", STALE_TTL_SECONDS),
        ]);
      } catch (error) {
        console.error("Redis cache write failed; response was not cached.", error);
      }
      return setCacheStatus(result, "MISS");
    } catch (error) {
      if (staleValue) {
        await incrementStat("staleServes");
        return setCacheStatus(JSON.parse(staleValue) as T, "STALE");
      }
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, pending);
  return pending as Promise<T>;
}

function setCacheStatus<T>(
  value: T,
  status: "HIT" | "MISS" | "STALE" | "COALESCED",
): T {
  if (typeof value === "object" && value !== null) {
    cacheStatuses.set(value, status);
  }
  return value;
}

export function getCacheStatus(
  value: unknown,
): "HIT" | "MISS" | "STALE" | "COALESCED" {
  return typeof value === "object" && value !== null
    ? cacheStatuses.get(value) ?? "MISS"
    : "MISS";
}

async function attachSearchDurations(
  videos: YouTubeVideo[],
): Promise<VideoSummary[]> {
  const ids = videos
    .map((video) => (typeof video.id === "string" ? video.id : video.id.videoId))
    .filter((id): id is string => Boolean(id));
  const durationsById: Record<string, string> = {};

  if (ids.length) {
    const durationResponse = await youtubeGet<YouTubeListResponse>(
      "/videos",
      { part: "contentDetails", id: ids.join(",") },
      1,
    );
    for (const video of durationResponse.items) {
      if (typeof video.id === "string") {
        durationsById[video.id] = video.contentDetails?.duration ?? "PT0S";
      }
    }
  }

  return videos.map((video) => {
    const id = typeof video.id === "string" ? video.id : video.id.videoId ?? "";
    return toSummary(video, durationsById[id]);
  });
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function searchVideos(
  query: string,
  pageToken?: string,
): Promise<VideoPage> {
  const normalizedQuery = normalizeQuery(query);
  const key = `search:${encodeURIComponent(normalizedQuery)}:${encodeURIComponent(pageToken ?? "")}`;
  return cached(key, (page) => (page.items.length ? 101 : 100), async () => {
    const data = await youtubeGet<YouTubeListResponse>(
      "/search",
      {
        part: "snippet",
        q: normalizedQuery,
        type: "video",
        maxResults: 12,
        pageToken,
      },
      100,
    );
    return {
      items: await attachSearchDurations(data.items),
      ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}),
      ...(data.pageInfo?.totalResults !== undefined
        ? { totalResults: data.pageInfo.totalResults }
        : {}),
    };
  });
}

export async function getPopularVideos(
  categoryId?: string,
  pageToken?: string,
): Promise<VideoPage> {
  const key = `popular:${categoryId ?? "all"}:${pageToken ?? ""}`;
  return cached(key, 1, async () => {
    const data = await youtubeGet<YouTubeListResponse>(
      "/videos",
      {
        part: "snippet,statistics,contentDetails",
        chart: "mostPopular",
        regionCode: "US",
        maxResults: 12,
        videoCategoryId: categoryId,
        pageToken,
      },
      1,
    );
    return {
      items: data.items.map((video) => toSummary(video)),
      ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {}),
      ...(data.pageInfo?.totalResults !== undefined
        ? { totalResults: data.pageInfo.totalResults }
        : {}),
    };
  });
}

export async function getVideoById(videoId: string): Promise<VideoSummary | null> {
  return cached(`video:${videoId}`, 1, async () => {
    const data = await youtubeGet<YouTubeListResponse>(
      "/videos",
      { part: "snippet,statistics,contentDetails", id: videoId },
      1,
    );
    const video = data.items[0];
    return video ? toSummary(video) : null;
  });
}

export async function getCategories(): Promise<VideoCategory[]> {
  return cached("categories:US", 1, async () => {
    const data = await youtubeGet<YouTubeCategoryResponse>(
      "/videoCategories",
      { part: "snippet", regionCode: "US" },
      1,
    );
    return data.items
      .filter((category) => category.snippet.assignable)
      .map((category) => ({ id: category.id, title: category.snippet.title }));
  });
}

export async function getRelatedVideos(videoId: string): Promise<VideoPage> {
  const video = await getVideoById(videoId);
  if (!video) return { items: [] };
  const page = await getPopularVideos(video?.categoryId);
  const result = {
    ...page,
    items: page.items.filter((item) => item.id !== videoId),
  };
  const status =
    getCacheStatus(video) === "STALE" || getCacheStatus(page) === "STALE"
      ? "STALE"
      : getCacheStatus(page) === "HIT" && getCacheStatus(video) === "HIT"
        ? "HIT"
        : "MISS";
  return setCacheStatus(result, status);
}
