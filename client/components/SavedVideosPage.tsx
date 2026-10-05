"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { loadOfflineVideos, saveOfflineVideos } from "@/lib/offline-store";
import { SavedVideo } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface SavedVideoDocument extends SavedVideo {
  _id: string;
}

interface Props {
  type: "favorites" | "history";
  title: string;
}

export function SavedVideosPage({ type, title }: Props) {
  const { user, loading: authLoading, offline } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (!offline) router.replace("/login");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const key = `${type}:${user.id}`;
    setLoading(true);
    setError("");

    async function load() {
      if (!navigator.onLine) {
        const cachedVideos = await loadOfflineVideos(key);
        if (!cancelled) setVideos(cachedVideos);
        return;
      }

      try {
        const response = await api.get<SavedVideoDocument[]>(`/${type}`);
        const saved = response.data.map(({ videoId, title: itemTitle, thumbnail, watchedAt, addedAt }) => ({
          videoId,
          title: itemTitle,
          thumbnail,
          watchedAt,
          addedAt,
        }));
        if (!cancelled) setVideos(saved);
        try {
          await saveOfflineVideos(key, saved);
        } catch {
          if (!cancelled) {
            setError("Loaded successfully, but could not save an offline copy.");
          }
        }
      } catch {
        if (!navigator.onLine) {
          try {
            const cachedVideos = await loadOfflineVideos(key);
            if (!cancelled) setVideos(cachedVideos);
          } catch {
            if (!cancelled) setError("Could not read saved videos from this device.");
          }
        } else if (!cancelled) {
          setError(`Could not load ${title.toLowerCase()}. Please try again.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load()
      .catch(() => {
        if (!cancelled) setError("Could not load saved videos from this device.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, offline, retry, router, title, type, user]);

  if (authLoading || loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-4 text-lg font-semibold">{title}</h1>
      {error && (
        <div role="alert" className="mb-4 flex items-center gap-3 text-sm text-red-600">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </Button>
        </div>
      )}
      {!user && offline && (
        <p className="text-sm text-muted-foreground">
          Sign in while online once to make your saved {title.toLowerCase()} available offline.
        </p>
      )}
      {videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {!user && offline
            ? `Sign in online once to make your saved ${title.toLowerCase()} available offline.`
            : offline
            ? `No saved ${title.toLowerCase()} are available offline on this device.`
            : `No ${title.toLowerCase()} yet.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard
              key={video.videoId}
              videoId={video.videoId}
              title={video.title}
              thumbnail={video.thumbnail}
            />
          ))}
        </div>
      )}
    </section>
  );
}
