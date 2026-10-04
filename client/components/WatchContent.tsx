"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CommentSection } from "@/components/CommentSection";
import { VideoCard } from "@/components/VideoCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { loadOfflineVideos, saveOfflineVideos } from "@/lib/offline-store";
import { VideoPage, VideoSummary } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  videoId: string;
  initialVideo?: VideoSummary;
}

export function WatchContent({ videoId, initialVideo }: Props) {
  const { user, offline } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [historyError, setHistoryError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");
  const online = !offline && (typeof navigator === "undefined" || navigator.onLine);

  const videoQuery = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () =>
      (await api.get<VideoSummary>(`/youtube/video/${videoId}`)).data,
    initialData: initialVideo?.id === videoId ? initialVideo : undefined,
  });
  const video = videoQuery.data?.id === videoId ? videoQuery.data : undefined;

  const relatedQuery = useQuery({
    queryKey: ["more-in-category", videoId],
    queryFn: async () =>
      (await api.get<VideoPage>(`/youtube/video/${videoId}/related`)).data,
    enabled: Boolean(video && online),
  });

  const favoriteQuery = useQuery({
    queryKey: ["favorite-status", user?.id, videoId],
    queryFn: async () => {
      if (!user) return false;
      if (!online) {
        const favorites = await loadOfflineVideos(`favorites:${user.id}`);
        return favorites.some((favorite) => favorite.videoId === videoId);
      }
      const response = await api.get<{ isFavorite: boolean }>(
        `/favorites/${videoId}`,
      );
      return response.data.isFavorite;
    },
    enabled: Boolean(user && video),
  });

  useEffect(() => {
    if (!user || !video || video.id !== videoId || !online) return;
    setHistoryError("");
    api
      .post("/history", {
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
      })
      .then(async () => {
        try {
          const key = `history:${user.id}`;
          const previous = await loadOfflineVideos(key);
          await saveOfflineVideos(key, [
            {
              videoId: video.id,
              title: video.title,
              thumbnail: video.thumbnail,
              watchedAt: new Date().toISOString(),
            },
            ...previous.filter((item) => item.videoId !== video.id),
          ]);
        } catch {
          setHistoryError("History was saved online, but its offline copy could not be updated.");
        }
      })
      .catch(() => setHistoryError("Could not save this video to your history."));
  }, [online, user, video, videoId]);

  async function toggleFavorite() {
    if (!video || video.id !== videoId) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!online) {
      setFavoriteError("Reconnect to change your saved favorites.");
      return;
    }

    const isFavorite = Boolean(favoriteQuery.data);
    setFavoriteError("");
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${videoId}`);
      } else {
        await api.post("/favorites", {
          videoId: video.id,
          title: video.title,
          thumbnail: video.thumbnail,
        });
      }
      queryClient.setQueryData(["favorite-status", user.id, videoId], !isFavorite);
      const key = `favorites:${user.id}`;
      const saved = await loadOfflineVideos(key);
      const updated = isFavorite
        ? saved.filter((favorite) => favorite.videoId !== videoId)
        : [
            {
              videoId,
              title: video.title,
              thumbnail: video.thumbnail,
              addedAt: new Date().toISOString(),
            },
            ...saved.filter((favorite) => favorite.videoId !== videoId),
          ];
      await saveOfflineVideos(key, updated);
    } catch {
      setFavoriteError("Could not update favorites. Please try again.");
    }
  }

  if (!video && !online) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">This video needs an internet connection</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can still browse saved favorites and watch history while offline.
        </p>
      </div>
    );
  }

  if (!video && videoQuery.isError) {
    return (
      <div role="alert" className="mx-auto max-w-lg py-16 text-center">
        <p className="text-red-600">
          {apiErrorMessage(videoQuery.error, "Could not load this video. Please try again.")}
        </p>
        <Button className="mt-3" variant="outline" onClick={() => videoQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="mt-4 h-6 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const isFavorite = Boolean(favoriteQuery.data);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {online ? (
          <VideoPlayer videoId={video.id} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted p-6 text-center">
            <p className="font-medium">
              This video needs an internet connection.
            </p>
          </div>
        )}
        <h1 className="mt-3 text-lg font-semibold">{video.title}</h1>
        <div className="mt-2 flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              {video.channelTitle.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{video.channelTitle}</span>
          </div>
          <Button
            onClick={toggleFavorite}
            disabled={Boolean(user && favoriteQuery.isPending)}
            variant={isFavorite ? "default" : "outline"}
            className={isFavorite ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Heart className={`mr-2 size-4 ${isFavorite ? "fill-white" : ""}`} />
            {isFavorite ? "Saved" : "Save"}
          </Button>
        </div>
        {favoriteError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {favoriteError}
          </p>
        )}
        {favoriteQuery.isError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            Could not check whether this video is saved.
          </p>
        )}
        {historyError && (
          <p role="status" className="mt-2 text-sm text-muted-foreground">
            {historyError}
          </p>
        )}
        <CommentSection videoId={videoId} />
      </div>

      <aside className="space-y-3">
        <h2 className="font-semibold">More in this category</h2>
        {relatedQuery.isError && (
          <div role="alert" className="text-sm text-red-600">
            {apiErrorMessage(
              relatedQuery.error,
              "Could not load more videos in this category.",
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => relatedQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        )}
        {relatedQuery.isLoading && (
          <Skeleton className="aspect-video w-full rounded-lg" />
        )}
        {(relatedQuery.data?.items ?? [])
          .filter((item) => item.id !== videoId)
          .map((item) => (
            <VideoCard
              key={item.id}
              videoId={item.id}
              title={item.title}
              thumbnail={item.thumbnail}
              channelTitle={item.channelTitle}
              durationText={item.durationText}
            />
          ))}
        {relatedQuery.isSuccess && relatedQuery.data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No other popular videos are available in this category right now.
          </p>
        )}
      </aside>
    </div>
  );
}
