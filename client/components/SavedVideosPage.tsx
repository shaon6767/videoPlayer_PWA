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

interface FavoritesPage {
  items: SavedVideoDocument[];
  totalCount: number;
  totalPages: number;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);

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
        if (!cancelled) {
          setVideos(cachedVideos);
          setTotalCount(null);
          setTotalPages(1);
        }
        return;
      }

      try {
        let documents: SavedVideoDocument[];
        if (type === "favorites") {
          const response = await api.get<FavoritesPage>("/favorites", {
            params: { page },
          });
          documents = response.data.items;
          if (!cancelled) {
            setTotalCount(response.data.totalCount);
            const pageCount = Math.max(1, response.data.totalPages);
            setTotalPages(pageCount);
            if (page > pageCount) {
              setPage(pageCount);
              return;
            }
          }
        } else {
          const response = await api.get<SavedVideoDocument[]>("/history");
          documents = response.data;
          if (!cancelled) {
            setTotalCount(documents.length);
            setTotalPages(1);
          }
        }
        const saved = documents.map(({ videoId, title: itemTitle, thumbnail, watchedAt, addedAt }) => ({
          videoId,
          title: itemTitle,
          thumbnail,
          watchedAt,
          addedAt,
        }));
        if (!cancelled) setVideos(saved);
        if (type !== "favorites" || page === 1) {
          try {
            await saveOfflineVideos(key, saved);
          } catch {
            if (!cancelled) {
              setError("Loaded successfully, but could not save an offline copy.");
            }
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
  }, [authLoading, offline, page, retry, router, title, type, user]);

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
      {type === "favorites" && totalCount !== null && (
        <p className="mb-4 text-sm text-muted-foreground">
          {totalCount} favorite{totalCount === 1 ? "" : "s"} total
        </p>
      )}
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
      {type === "favorites" && totalPages > 1 && (
        <nav
          aria-label="Favorites pages"
          className="mt-6 flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
