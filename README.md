# Project Overview

Playlix is a YouTube discovery and watch-list application. It helps people browse popular YouTube videos, search for videos, and keep track of favorites, viewing history, and comments in one interface.

The frontend is a Next.js application and the backend is an Express API. The API retrieves and normalizes video data from the YouTube Data API, caches public responses in Redis, and stores user accounts and saved content in MongoDB. Users can browse without an account; an account is needed for favorites, history, and posting or deleting comments.

# Features

- **Browse and search:** Browse popular videos by category, search YouTube, and load more results where the API supplies a next-page token.
- **Watch and explore:** Open a video in YouTube's embedded player, see its details, and browse other popular videos in its category.
- **Accounts:** Register, log in, check the current session, and log out. The browser session uses an HTTP-only cookie.
- **Favorites and watch history:** Save and remove favorites, review the newest watched videos, and clear watch history. Both lists have a small offline snapshot for the signed-in profile on that device.
- **Comments and ratings:** Read comments on a video and, when signed in, post a text comment with a 1–5 rating or delete your own comment.
- **Cache and quota dashboard:** View aggregate API/cache counters and hourly public-route request counts. The dashboard does not expose search terms, account data, or video IDs.
- **Installable/offline app shell:** A service worker precaches the app shell and offline page, caches selected same-origin navigation and static assets, and provides an offline fallback. Video playback and API requests still require a network connection.
- **Theme and network feedback:** The interface supports system/light/dark themes and indicates network status.

# How the Project Works

1. The Next.js App Router renders the pages and shared UI. Home and watch pages can fetch their initial public data server-side.
2. Browser API calls use `/api` on the frontend origin. A Next.js rewrite forwards them to the Express API, so browser requests do not need a separate API origin.
3. Express validates request bodies, query strings, and route parameters with Zod, then dispatches to route controllers.
4. Public video routes call the YouTube Data API v3. Results are normalized to Playlix's video shape and cached in Redis: fresh entries last one hour and stale copies last seven days. Identical in-flight cache misses are coalesced within a server process. If an upstream request fails and a stale value exists, the API serves that value.
5. Registration and login issue a signed JWT in an `httpOnly` cookie. Authenticated API routes verify that cookie before reading or changing the current user's MongoDB records.
6. On supported browser storage, the app separately saves small favorites/history snapshots in IndexedDB for offline list viewing. The service worker does not cache `/api`, YouTube thumbnails, or video media.

The API normalizes YouTube results to fields such as `id`, `title`, `thumbnail`, `channelTitle`, and `durationText`. Search requests also fetch durations in a batched videos request. The popular feed is for the US region and returns up to 12 videos per request.

# Architecture / Project Structure

```text
youtube-lite/
├── client/
│   ├── app/              # App Router pages, layouts, loading/error and offline pages
│   ├── components/       # Feed, player, comments, saved-list and dashboard UI
│   ├── hooks/            # Shared UI hooks
│   ├── lib/              # Browser/server API clients, auth, types and offline storage
│   ├── public/           # App icons and static assets
│   └── next.config.mjs   # API rewrite and Serwist integration
├── server/
│   └── src/
│       ├── config/       # Environment, MongoDB and Redis setup
│       ├── controllers/  # HTTP request handlers
│       ├── middleware/   # Auth, validation, cache, rate limits and error handling
│       ├── models/       # Mongoose user and user-content models
│       ├── routes/       # API route definitions
│       ├── services/     # YouTube integration and aggregate statistics
│       └── validation/   # Zod request schemas
├── shared/
│   └── video.d.ts        # Video/category data contracts shared by client and server
└── docs/
    └── OPERATIONS.md     # Cache, quota, cookie and offline verification notes
```

# Technologies Used

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, TanStack Query, Axios, and next-themes.
- **Offline support:** Serwist service worker and browser IndexedDB/localStorage.
- **Backend:** Node.js, Express, and TypeScript.
- **Database and cache:** MongoDB through Mongoose; Redis through ioredis.
- **Authentication and validation:** JWT, bcryptjs, HTTP cookies, and Zod.
- **External API:** YouTube Data API v3, requested by the backend with Axios.
- **Security and request handling:** Helmet, CORS, cookie-parser, and express-rate-limit.
- **Development:** npm, TypeScript, ESLint, ts-node, and nodemon.

# Challenges / Obstacles Faced

The repository documents and implements several non-trivial integration concerns:

- **YouTube quota and upstream failures:** Search is quota-expensive, so the service batches duration lookups, caches normalized responses, coalesces identical in-process misses, and retains stale values for fallback. The trade-off is that a stale response may be served when YouTube is unavailable, and counters estimate saved quota rather than replacing the YouTube Cloud Console measurement.
- **Browser authentication across separately hosted app and API:** Browser calls go through a same-origin Next.js rewrite, while JWTs use `httpOnly`, `SameSite=Lax` cookies. This avoids relying on third-party cookies for the normal browser flow; deployments still need matching API URL and CORS configuration.
- **Useful offline behavior without pretending video playback is offline:** The service worker caches selected app navigation/assets, while saved lists are stored separately with item and size caps. API calls, thumbnails, and video media remain network-dependent.

These are implementation- and operations-level challenges evident from the code and [operations notes](./docs/OPERATIONS.md); the repository does not provide a development history from which to claim additional personal obstacles.

# Limitations

- YouTube playback is embedded from YouTube; video files are not hosted or cached by Playlix.
- The popular chart and categories use the US region. Search results and video availability depend on YouTube.
- The related list is drawn from the popular feed for the video's category; it is not a personalized recommendation system.
- Watch history returns only the 50 newest records. Favorites are paged in groups of 60, and comments return at most 100 entries per video.
- Offline snapshots hold at most 60 entries and 2 MiB per list. They do not make API actions or playback available offline.
- The API's single-flight request coalescing is held in process memory, so it does not coalesce misses across multiple backend instances.
- Rate-limit counters use the default in-memory store. They reset on restart and are not shared across backend instances.
- Aggregate statistics are stored in Redis and are cumulative until Redis data is cleared; quota-saved figures are estimates based on avoided upstream calls.
- Express trusts one proxy hop (`trust proxy: 1`). Deployments with a different proxy chain must review this setting so client IP-based limits are applied correctly.

# Future Improvements

These are proposals, not implemented features:

- Add automated API, model, and frontend tests, then run them in CI.
- Use a shared rate-limit store and distributed cache-miss coordination if the API is scaled to multiple instances.
- Add explicit CSRF defenses before supporting cross-site cookie deployments; the current design uses same-origin proxying and `SameSite=Lax`.
- Consider cursor-based or configurable history pagination if histories need to grow beyond the current 50-item response.
- Add deployment automation and documented health/monitoring checks for the actual hosting environment.

# Prerequisites

- Node.js 20.9 or newer and npm.
- A MongoDB instance and connection URI.
- A Redis instance and connection URL.
- A YouTube Data API v3 key.
- A long, private JWT signing secret.
- A browser with JavaScript, service worker, and IndexedDB support for the full offline experience.

# Installation & Setup

1. Clone the repository using its repository URL:

   ```powershell
   git clone <repository-url>
   cd youtube-lite
   ```

2. Install server dependencies and create its local environment file:

   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env
   ```

   Edit `server/.env` with the MongoDB URI, Redis URL, JWT secret, and YouTube API key. The API checks MongoDB URI, JWT secret, and YouTube key at startup; Redis is used for caching and statistics and should be available for those features.

3. In a second terminal, install client dependencies and create the frontend environment file:

   ```powershell
   cd client
   npm install
   Copy-Item .env.example .env.local
   ```

   For local development, set `API_SERVER_URL=http://localhost:5000` in `client/.env.local`. If unset, the Next.js rewrite and server-rendered page requests use the backend URL configured as the default in `client/next.config.mjs` and `client/lib/server-api.ts`.

4. Start both workspaces in separate terminals:

   ```powershell
   # From server/
   npm run dev
   ```

   ```powershell
   # From client/
   npm run dev
   ```

5. Open `http://localhost:3000`. The API health endpoint is `http://localhost:5000/health`.

# Environment Variables

Copy the example files; do not commit local environment files or expose secrets in frontend-public variables.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Express port; defaults to `5000`. |
| `NODE_ENV` | No | Runtime mode. Set to `production` to enable the secure auth-cookie flag. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `REDIS_URL` | Yes for cache/stats | Redis connection string used for YouTube response caching and aggregate counters. |
| `JWT_SECRET` | Yes | Secret used to sign and verify session JWTs. Use a long random value and keep it private. |
| `JWT_EXPIRES_IN` | No | JWT lifetime in the supported duration form, such as `7d`; defaults to `7d`. |
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 key used by the server. |
| `CLIENT_URL` | No | Allowed CORS origin; defaults to `http://localhost:3000`. |
| `API_SERVER_URL` | No | Backend origin used by the Next.js rewrite and server-rendered fetches; defaults to the configured Render API URL. Set to `http://localhost:5000` locally. |

# Running the Project

The frontend and backend are separate processes in development. Run `npm run dev` from `server/` and `client/` in two terminals.

Available scripts (run each from its workspace):

| Workspace | Command | Purpose |
|---|---|---|
| `client/` | `npm run dev` | Start the Next.js development server. |
| `client/` | `npm run build` | Create a production frontend build. |
| `client/` | `npm run start` | Serve the production frontend build. |
| `client/` | `npm run lint` | Run ESLint. |
| `client/` | `npm run typecheck` | Type-check without emitting files. |
| `server/` | `npm run dev` | Run the API with nodemon and ts-node. |
| `server/` | `npm run build` | Compile the API TypeScript into `server/dist/`. |
| `server/` | `npm run start` | Run the compiled API from `server/dist/server.js`. |
| `server/` | `npm run typecheck` | Type-check without emitting files. |

# API Documentation

All application endpoints are mounted under `/api`. JSON validation errors use `{ "message": "Invalid request", "errors": [...] }`; other API errors generally use `{ "message": "..." }`. Protected endpoints require the `streamly_token` cookie.

| Method and endpoint | Purpose and request | Authentication | Success response |
|---|---|---|---|
| `POST /api/auth/register` | JSON `{ "name", "email", "password" }` | No | `201`, user `{ id, name, email, createdAt }`, and auth cookie |
| `POST /api/auth/login` | JSON `{ "email", "password" }` | No | `200`, user payload and auth cookie |
| `GET /api/auth/me` | Read current session | Yes | User payload |
| `POST /api/auth/logout` | Empty JSON body | No | `{ "message": "Logged out" }`; clears cookie |
| `GET /api/youtube/popular` | Optional `categoryId`, `pageToken` query | No | `{ items, nextPageToken?, totalResults? }` |
| `GET /api/youtube/search` | Required `q`; optional `pageToken` query | No | `{ items, nextPageToken?, totalResults? }` |
| `GET /api/youtube/categories` | List assignable US categories | No | `{ items: [{ id, title }] }` |
| `GET /api/youtube/video/:videoId` | Fetch one valid 11-character YouTube ID | No | Video summary; `404` if not found |
| `GET /api/youtube/video/:videoId/related` | Popular videos in the video's category | No | `{ items, nextPageToken?, totalResults? }` |
| `GET /api/favorites?page=1` | List favorites; page is 1-based | Yes | `{ items, page, pageSize, totalCount, totalPages }`; `pageSize` is 60 |
| `POST /api/favorites` | JSON `{ "videoId", "title", "thumbnail" }` | Yes | `201`, created favorite |
| `GET /api/favorites/:videoId` | Check whether a video is saved | Yes | `{ "isFavorite": boolean }` |
| `DELETE /api/favorites/:videoId` | Remove a favorite | Yes | `204` |
| `POST /api/history` | JSON `{ "videoId", "title", "thumbnail" }` | Yes | `204` |
| `GET /api/history` | Get recent history | Yes | Array of up to 50 records |
| `DELETE /api/history` | Empty JSON body; clear history | Yes | `204` |
| `GET /api/comments/:videoId` | Read comments for a video | No | Array of up to 100 newest comments |
| `POST /api/comments` | JSON `{ "videoId", "text", "rating" }`, rating 1–5 | Yes | `201`, created comment with commenter name |
| `DELETE /api/comments/:id` | Delete a comment by MongoDB ID | Yes, owner only | `204` |
| `GET /api/stats` | Read public aggregate counters | No | Cache/quota totals, hit rate, and 24 hourly request buckets |

Important errors include `400` for invalid input, `401` for missing/invalid authentication, `403` when deleting another user's comment, `404` for missing video/comment/user, `409` for duplicate records or an email already in use, `429` for rate limits or exhausted YouTube quota, and `502` for other YouTube API failures.

# Authentication & Security

- Passwords are hashed with bcryptjs (10 rounds); the password field is excluded from normal user queries.
- Login and registration issue an HS256 JWT in the `streamly_token` cookie. It is `httpOnly`, `SameSite=Lax`, scoped to `/`, and marked `Secure` in production. Its lifetime follows `JWT_EXPIRES_IN`.
- `requireAuth` verifies the cookie before favorites/history operations, comment creation/deletion, and `/auth/me`. Comment deletion also checks ownership.
- Zod schemas validate and strictly reject unexpected request fields. Video IDs, comment IDs, rating ranges, text lengths, and YouTube-hosted HTTPS thumbnails are constrained.
- CORS is restricted to `CLIENT_URL` with credentials. Helmet sets security headers and a Content Security Policy; JSON request bodies are limited to 32 KB.
- The global limiter allows 300 requests per IP per 15 minutes, search allows 20 per minute, and login/registration each allow 8 unsuccessful attempts per IP per 15 minutes. The default rate-limit store is process-local.
- The cookie-based design has no explicit CSRF token. The current same-origin proxy and `SameSite=Lax` setup reduce cross-site request exposure; deployments that require cross-site cookies need a deliberate CSRF strategy. The CSP permits inline scripts and styles, which weakens that layer of protection.

# Database

MongoDB stores application accounts and user content:

- **Users:** name, unique normalized email, bcrypt password hash, and timestamps.
- **Favorites:** user reference plus video ID, title, thumbnail, and added time. A unique `{ user, videoId }` index prevents duplicate favorites; an additional compound index supports newest-first pagination.
- **Watch history:** user reference and a video snapshot with watched time. A unique `{ user, videoId }` index means a repeat watch updates the existing record.
- **Comments:** user reference, video ID, text, 1–5 rating, and creation time. Video ID is indexed for comment lookup.

Favorites, history, and comments refer to users by MongoDB ObjectId. Video metadata and playback remain with YouTube; saved records contain only the fields needed for the user's lists. Redis holds cached YouTube responses and aggregate statistics, not the primary user records.

# Testing

There is no test script or automated test suite in either workspace. The following are manual smoke checks, not automated coverage. When checking a local change, I run through the user flows with both servers running and use the browser Network panel or API responses to confirm the behavior:

The available automated checks are linting and TypeScript checks, not behavioral tests:

```powershell
# From client/
npm run lint
npm run typecheck

# From server/
npm run typecheck
```

1. Open the home page, switch between **All** and category tabs, and check that `/api/youtube/popular` returns video items or an empty `items` list for a category with no chart.
2. Search for a term, open a result, and verify the watch page, embedded player, and category-based related list.
3. Register, log out, and log back in. Check `/api/auth/me` while signed in and confirm protected favorites/history calls return `401` after logging out.
4. Save a favorite, remove it, and check the paginated response and `totalCount`. Add a video to history more than once and confirm it appears once with the latest watch time.
5. Post a comment with a valid rating, verify it appears in the list, then try deleting it as a different account and confirm the API returns `403`.
6. In browser DevTools, inspect the service worker and IndexedDB, then switch Network to Offline. Confirm the offline page and available saved-list snapshots work, while playback and API-dependent actions do not.
7. For cache behavior, call the same public endpoint twice and inspect `X-Cache` (`MISS` then `HIT` when Redis is available); use `If-None-Match` to check the public route's ETag response.

The repository has lint and TypeScript-check scripts, but no dedicated tests for endpoint behavior, cache expiry/fallback, offline edge cases, or authentication flows.

# Deployment

The project has production build/start scripts, but no checked-in deployment manifest or infrastructure configuration. The client currently defaults `API_SERVER_URL` to a Render-hosted API URL; that default is configuration in the source, not evidence that the full deployment is provisioned or maintained.

For a production deployment, build and start the frontend with `npm run build` and `npm run start` from `client/`. Build the API with `npm run build`, then run `npm run start` from `server/`. Provide the server environment variables in the backend environment and `API_SERVER_URL` to the frontend build/runtime as required by the host. Set `CLIENT_URL` to the deployed frontend origin and `NODE_ENV=production` so auth cookies are secure. MongoDB and Redis must be reachable from the API. Review proxy trust settings and CORS when adapting the app to a different host.

For cache/CDN checks, quota measurement, cookie deployment decisions, and offline verification, see [docs/OPERATIONS.md](./docs/OPERATIONS.md).

# Known Issues

I did not find an unresolved bug list or a code comment documenting a known defect. The explicit behavioral limits—such as the 50-entry history response, in-memory rate limits, and offline storage caps—are listed under [Limitations](#limitations), rather than treated as unverified bugs.

# License

No license file or license declaration is present in the repository. The project's license is therefore unspecified.
