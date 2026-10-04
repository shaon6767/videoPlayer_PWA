"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CategoryTabs } from "@/components/CategoryTabs";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { VideoCategory, VideoPage } from "@/lib/types";
import { useState } from "react";

const FEED_LIMIT = 60;

interface Props {
  initialVideos?: VideoPage;
  initialCategories?: VideoCategory[];
}

export function HomeFeed({ initialVideos, initialCategories }: Props) {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const videosQuery = useInfiniteQuery({
    queryKey: ["popular", categoryId ?? "all"],
    queryFn: async ({ pageParam }) =>
      (await api.get<VideoPage>("/youtube/popular", {
        params: { categoryId, pageToken: pageParam },
      })).data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < FEED_LIMIT ? lastPage.nextPageToken : undefined;
    },
    initialData:
      !categoryId && initialVideos
        ? { pages: [initialVideos], pageParams: [undefined] }
        : undefined,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await api.get<{ items: VideoCategory[] }>("/youtube/categories")).data
        .items,
    initialData: initialCategories,
  });

  const videos = videosQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const reachedLimit = videos.length >= FEED_LIMIT;
  const hasMore = Boolean(videosQuery.hasNextPage && !reachedLimit);

  return (
    <section>
      <CategoryTabs
        categories={categoriesQuery.data ?? []}
        activeId={categoryId}
        onSelect={(id) => setCategoryId(id)}
      />
      {categoriesQuery.isError && (
        <div role="alert" className="my-3 flex items-center gap-3 text-sm text-red-600">
          {apiErrorMessage(categoriesQuery.error, "Could not load categories.")}
          <Button variant="outline" size="sm" onClick={() => categoriesQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            videoId={video.id}
            title={video.title}
            thumbnail={video.thumbnail}
            channelTitle={video.channelTitle}
            durationText={video.durationText}
          />
        ))}
      </div>
      {videosQuery.isPending && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Loading videos...
        </p>
      )}
      {videosQuery.isError && (
        <div role="alert" className="mt-6 text-center text-sm text-red-600">
          <p>
            {apiErrorMessage(
              videosQuery.error,
              "Could not load videos. Check your connection and try again.",
            )}
          </p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() =>
              videos.length ? videosQuery.fetchNextPage() : videosQuery.refetch()
            }
          >
            Retry
          </Button>
        </div>
      )}
      {!videosQuery.isPending && !videosQuery.isError && videos.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No popular videos are available in this category right now.
        </p>
      )}
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => videosQuery.fetchNextPage()}
            disabled={videosQuery.isFetchingNextPage}
          >
            {videosQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
      {!hasMore && videos.length > 0 && !videosQuery.isPending && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {reachedLimit
            ? "You’ve reached the end of this feed."
            : "You’re all caught up."}
        </p>
      )}
    </section>
  );
}
