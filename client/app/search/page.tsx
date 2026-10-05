"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { VideoPage } from "@/lib/types";

const SEARCH_LIMIT = 60;

export default function SearchPage() {
  return (
    <Suspense fallback={<p>Loading search...</p>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const params = useSearchParams();
  const queryFromUrl = params.get("q") ?? "";
  const [input, setInput] = useState(queryFromUrl);

  useEffect(() => setInput(queryFromUrl), [queryFromUrl]);

  const resultsQuery = useInfiniteQuery({
    queryKey: ["search", queryFromUrl.trim().toLowerCase().replace(/\s+/g, " ")],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<VideoPage>("/youtube/search", {
          params: { q: queryFromUrl, pageToken: pageParam },
        })
      ).data,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(queryFromUrl.trim()),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0);
      return loaded < SEARCH_LIMIT ? lastPage.nextPageToken : undefined;
    },
  });

  const videos = useMemo(
    () => resultsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [resultsQuery.data],
  );
  const sentinelRef = useInfiniteScroll(
    () => {
      if (resultsQuery.hasNextPage && !resultsQuery.isFetchingNextPage) {
        void resultsQuery.fetchNextPage();
      }
    },
    Boolean(resultsQuery.hasNextPage && !resultsQuery.isFetching),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (query) window.history.pushState(null, "", `/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <section>
      <form onSubmit={submit} role="search" className="mb-4 flex max-w-md gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search videos"
          aria-label="Search videos"
        />
        <Button type="submit">Search</Button>
      </form>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      <div ref={sentinelRef} className="h-8" />
      {resultsQuery.isFetching && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Loading results...
        </p>
      )}
      {resultsQuery.isError && (
        <div role="alert" className="mt-4 text-center text-sm text-red-600">
          <p>{apiErrorMessage(resultsQuery.error, "Could not load search results.")}</p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() =>
              videos.length ? resultsQuery.fetchNextPage() : resultsQuery.refetch()
            }
          >
            Retry
          </Button>
        </div>
      )}
      {!resultsQuery.isFetching && !resultsQuery.isError && queryFromUrl && videos.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No results for &quot;{queryFromUrl}&quot;.
        </p>
      )}
      {resultsQuery.hasNextPage && videos.length < SEARCH_LIMIT && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Scroll for more results.
        </p>
      )}
      {videos.length >= SEARCH_LIMIT && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You&apos;ve reached the end of these results.
        </p>
      )}
    </section>
  );
}
