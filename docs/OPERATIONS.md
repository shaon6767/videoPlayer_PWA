# Streamly operations: caching, quota, auth, and offline use

## Request and cache flow

```text
Browser
  │  TanStack Query (60s stale time; revalidates lists/details)
  ▼
Same-origin /api ── Next.js rewrite ──► Express
  │                                      │
  │ Vercel edge (s-maxage)               ├─ ETag + Cache-Control
  │                                      ▼
  └──────────────────────────────► Redis fresh (1h) + stale (7d)
                                         │
                              single-flight identical misses
                                         ▼
                                  YouTube Data API
```

The Next rewrite keeps browser requests same-origin when the UI and API are deployed on different hosts. Server-rendered home/watch metadata requests go directly to `API_SERVER_URL` with Next's fetch cache disabled, so the application does not introduce a fifth response-cache layer.

## Verify each cache layer

1. **Browser HTTP cache and ETag**
   - Request a public route twice and inspect `Cache-Control`, `ETag`, and `X-Cache`:
     `curl.exe -i "http://localhost:5000/api/youtube/popular"`
   - Re-request with `If-None-Match: <ETag>` and confirm a `304` when the representation is unchanged. Public YouTube routes use browser `max-age`; user routes use `private, no-store`.
2. **Vercel CDN**
   - Deploy with `API_SERVER_URL` set to the backend origin and keep `NEXT_PUBLIC_API_URL=/api`.
   - Request the same public `/api/youtube/popular` URL twice. Verify `Cache-Control` contains `s-maxage` and inspect Vercel's `x-vercel-cache` response header for an edge `HIT` after the initial `MISS`. Do not claim an edge hit if the deployment's response shows otherwise.
3. **TanStack Query**
   - Load home, search, or a watch page and inspect the browser Network panel. Navigate away and back within 60 seconds; the list/video data should render from the query cache without an immediate duplicate request. After the stale time or focus revalidation, a refresh is expected.
4. **Redis**
   - Make one popular/search request, then repeat it. Confirm `X-Cache: MISS` followed by `X-Cache: HIT`.
   - For single-flight, issue several simultaneous identical requests against an empty key; only one set of YouTube calls should occur, and other responses should report `X-Cache: COALESCED`.
   - Inspect Redis keys with `SCAN 0 MATCH ytlite:youtube:*`; fresh keys expire after an hour and `:stale:` copies after seven days. If YouTube fails with no fresh value, a retained stale response has `X-Cache: STALE`; if no stale response exists, quota failures return HTTP 429 with a daily-limit message.

`GET /api/stats` and `/stats` expose aggregate counters only. No search query, account, or video identifiers are included.

## Quota costs and honest measurement

The counters use YouTube Data API endpoint costs: `search.list` = 100 units, `videos.list` = 1 unit, and `videoCategories.list` = 1 unit. A non-empty search currently makes one `search.list` plus one batched `videos.list` for durations (101 units total); an empty search uses 100. Popular feeds/details use one `videos.list` call (1 unit). A cache hit/coalesced request records the units that its suppressed request would have needed; actual upstream attempts increment `quotaUnitsUsed`.

For a defensible resume metric:

1. Take a timestamped `/api/stats` snapshot and record the YouTube Cloud Console quota-used value for the same project.
2. Run a fixed workload with a cold Redis key (for example, one normalized search and one popular category); record API calls and quota-unit deltas.
3. Repeat the exact requests while their fresh Redis entries are valid. Confirm no additional YouTube calls for hits, then check the `quotaUnitsSaved` delta and `/stats` hit rate.
4. For before/after comparison, compare matched workloads or a preserved pre-change deployment over equal observation windows. The stats counters are cumulative since Redis was last cleared; take snapshots and compute deltas. Do not present cache-estimated savings as Google-reported quota unless it agrees with the Cloud Console measurement.

The chart displays public YouTube-route request counts by hour for the latest 24 hours. The server keeps no per-query or per-user series.

## Authentication deployment decision

The browser uses an `httpOnly`, `SameSite=Lax` JWT cookie instead of localStorage. On Vercel, the browser calls same-origin `/api`; Next rewrites that request to the separately hosted backend. The browser therefore stores the cookie for the Vercel app origin, avoiding third-party-cookie restrictions in Safari/Brave. Set `API_SERVER_URL` in the client deployment to the backend origin, and configure the backend `CLIENT_URL` for any direct cross-origin tooling. Production cookies are `Secure`; logout clears the cookie using matching path/site/security options.

Trade-off for interviews: httpOnly cookies prevent JavaScript from reading/exfiltrating the JWT, but cookies are attached automatically, so CSRF protection matters. `SameSite=Lax`, same-origin proxying, restricted CORS, and JSON-only state-changing routes reduce cross-site request risk; deployments that require cross-site cookies would need `SameSite=None; Secure` and explicit CSRF tokens, which is intentionally avoided here. localStorage is simpler for APIs on unrelated origins but is directly readable by injected JavaScript and is especially brittle with third-party-cookie blocking.

## Offline/PWA behavior

Serwist (Turbopack integration, Next 15+; this app uses Next 16 App Router) precaches the app shell/offline page and bundles static Next assets. Capped runtime navigation and same-origin App Router RSC shell caches support reloads and in-app navigation. They intentionally exclude `/api`, YouTube thumbnails, and YouTube media/embeds. Favorites/history snapshots are stored separately in IndexedDB with a 60-entry and 2 MiB-per-list cap. Test with DevTools **Application → Service Workers / IndexedDB**, then switch Network to **Offline**: the offline banner and saved lists should remain available, while a watch route explains it requires internet.
