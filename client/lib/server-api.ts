import { VideoSummary } from "@/lib/types";

const apiOrigin = (
  process.env.API_SERVER_URL || "https://youtube-lite-qwmo.onrender.com"
).replace(/\/$/, "");

async function getPublicData<T>(path: string): Promise<T> {
  const response = await fetch(`${apiOrigin}/api${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return (await response.json()) as T;
}

export async function getHomePageData() {
  return Promise.all([
    getPublicData<{ items: VideoSummary[]; nextPageToken?: string }>(
      "/youtube/popular",
    ),
    getPublicData<{ items: Array<{ id: string; title: string }> }>(
      "/youtube/categories",
    ),
  ]);
}

export async function getVideoMetadata(videoId: string) {
  return getPublicData<VideoSummary>(
    `/youtube/video/${encodeURIComponent(videoId)}`,
  );
}
