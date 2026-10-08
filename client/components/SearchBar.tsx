"use client";

import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { VideoPage, VideoSummary } from "@/lib/types";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

export function SearchBar() {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<VideoSummary[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLFormElement>(null);
  const query = value.trim();

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setSuggestions([]);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      api
        .get<VideoPage>("/youtube/search", {
          params: { q: query },
          signal: controller.signal,
        })
        .then((response) => setSuggestions(response.data.items.slice(0, 5)))
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        });
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  return (
    <form
      ref={containerRef}
      onSubmit={submit}
      role="search"
      className="relative w-full max-w-lg"
    >
      <button
        type="submit"
        aria-label="Search videos"
        className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="size-4" />
      </button>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Search videos"
        aria-label="Search videos"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="video-search-suggestions"
        className="pl-10"
      />
      {open && suggestions.length > 0 && (
        <div
          id="video-search-suggestions"
          className="absolute top-full z-50 mt-1.5 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          {suggestions.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/watch/${video.id}`);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
            >
              <img
                src={video.thumbnail}
                alt=""
                className="h-9 w-16 shrink-0 rounded object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm">{video.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {video.channelTitle}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
