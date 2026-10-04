"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

interface PublicStats {
  cacheHits: number;
  cacheMisses: number;
  staleServes: number;
  youtubeApiCalls: number;
  quotaUnitsUsed: number;
  quotaUnitsSaved: number;
  hitRate: number;
  requestsByHour: Array<{ hour: string; requests: number }>;
}

function StatCard({ label, value, detail }: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

export function StatsDashboard() {
  const query = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => (await api.get<PublicStats>("/stats")).data,
    staleTime: 30_000,
  });

  if (query.isPending) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading cache stats...</p>;
  }
  if (query.isError) {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-red-600">
          {apiErrorMessage(query.error, "Could not load cache statistics.")}
        </p>
        <button
          type="button"
          className="mt-3 rounded border px-3 py-1 text-sm"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = query.data;
  const maxRequests = Math.max(
    1,
    ...stats.requestsByHour.map(({ requests }) => requests),
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Redis cache hit rate"
          value={`${(stats.hitRate * 100).toFixed(1)}%`}
          detail={`${stats.cacheHits.toLocaleString()} hits · ${stats.cacheMisses.toLocaleString()} misses`}
        />
        <StatCard
          label="YouTube quota units"
          value={stats.quotaUnitsUsed.toLocaleString()}
          detail={`${stats.youtubeApiCalls.toLocaleString()} outbound API calls`}
        />
        <StatCard
          label="Estimated units saved"
          value={stats.quotaUnitsSaved.toLocaleString()}
          detail="From cache hits and coalesced requests"
        />
        <StatCard
          label="Stale responses"
          value={stats.staleServes.toLocaleString()}
          detail="Served after a refresh request failed"
        />
      </div>

      <article className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">API requests over the last 24 hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One bar per hour; only public YouTube API routes are counted.
        </p>
        <div className="mt-5 overflow-x-auto">
          <svg
            viewBox="0 0 720 220"
            role="img"
            aria-label="Bar chart showing public API requests per hour over the last 24 hours"
            className="h-56 min-w-[640px] w-full"
          >
            <line x1="28" y1="184" x2="710" y2="184" stroke="currentColor" opacity="0.25" />
            {stats.requestsByHour.map((entry, index) => {
              const barHeight = (entry.requests / maxRequests) * 145;
              const x = 34 + index * 28;
              return (
                <g key={entry.hour}>
                  <title>
                    {new Date(entry.hour).toLocaleString()}: {entry.requests} requests
                  </title>
                  <rect
                    x={x}
                    y={184 - barHeight}
                    width="18"
                    height={Math.max(barHeight, 1)}
                    rx="3"
                    fill="#dc2626"
                    opacity="0.85"
                  />
                  {index % 4 === 0 && (
                    <text
                      x={x + 9}
                      y="205"
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                    >
                      {new Date(entry.hour).getHours().toString().padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </article>
    </section>
  );
}
