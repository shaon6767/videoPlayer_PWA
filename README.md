# Streamly

Streamly is a YouTube discovery app built with Next.js and an Express API. Browse popular videos by category, search and watch videos, save favorites and watch history, and view aggregate cache/quota statistics. Authenticated browser sessions use an `httpOnly` JWT cookie. The PWA caches the app shell and keeps a small offline copy of saved lists.

## Project layout

- `client/` — Next.js App Router UI, PWA service worker, and browser API client.
- `server/` — Express API, MongoDB models, Redis-backed YouTube response cache, and auth.
- `shared/` — types shared by the client and server.
- `docs/OPERATIONS.md` — cache, quota measurement, deployment, and offline verification details.

The browser calls same-origin `/api` routes; the Next.js rewrite forwards them to the Express backend. The server-rendered home page calls the backend directly using `API_SERVER_URL`.

## Requirements

- Node.js 20.9 or later and npm.
- MongoDB and Redis.
- A YouTube Data API v3 key.

## Local setup

Install dependencies in both workspaces:

```powershell
cd server
npm install
Copy-Item .env.example .env
```

Fill in `server/.env` with your MongoDB URI, Redis URL, a long random JWT secret, and YouTube API key. Then in another terminal:

```powershell
cd client
npm install
Copy-Item .env.example .env.local
```

For the default local setup, the client `.env.local` values can remain `NEXT_PUBLIC_API_URL=/api` and `API_SERVER_URL=http://localhost:5000`. Start the API and UI in separate terminals:

```powershell
# server/
npm run dev
```

```powershell
# client/
npm run dev
```

Open `http://localhost:3000`. The API health check is `http://localhost:5000/health`.

### Environment variables

`server/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express port (default `5000`). |
| `NODE_ENV` | Set to `production` for secure auth cookies. |
| `MONGO_URI` | MongoDB connection string. |
| `REDIS_URL` | Redis connection string for cache and aggregate stats. |
| `JWT_SECRET` | Secret used to sign session cookies; use a long random value. |
| `JWT_EXPIRES_IN` | JWT lifetime such as `7d` (default `7d`). |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key. |
| `CLIENT_URL` | Allowed browser origin for CORS (default `http://localhost:3000`). |

`client/.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Browser API base URL; use `/api` for same-origin proxying. |
| `API_SERVER_URL` | Express origin used by the Next.js rewrite and server-rendered requests. |

Do not commit `.env` or `.env.local` files or expose the YouTube key in a `NEXT_PUBLIC_` variable.

## Scripts

Run each command from its workspace:

| Workspace | Command | Description |
| --- | --- | --- |
| `client/` | `npm run dev` | Start Next.js development server. |
| `client/` | `npm run build` | Build the production client. |
| `client/` | `npm run start` | Serve the production client. |
| `client/` | `npm run lint` | Run ESLint. |
| `client/` | `npm run typecheck` | Run TypeScript without emitting files. |
| `server/` | `npm run dev` | Start the API with nodemon. |
| `server/` | `npm run build` | Compile the API into `server/dist/`. |
| `server/` | `npm run start` | Start the compiled API. |
| `server/` | `npm run typecheck` | Type-check the API without emitting files. |

## Main routes

API routes are mounted under `/api`:

- `GET /youtube/popular?categoryId=...` — popular videos, optionally filtered by category.
- `GET /youtube/categories` — available assignable categories.
- `GET /youtube/search?q=...` — search results.
- `GET /youtube/video/:videoId` and `GET /youtube/video/:videoId/related` — video detail and related popular videos.
- `GET /stats` — aggregate cache, quota, and request counters.
- `/auth`, `/favorites`, `/history`, and `/comments` — account and saved-content routes. `GET /favorites?page=1` returns up to 60 entries plus `totalCount` and `totalPages`.

An unavailable YouTube popular chart for a category (`videoChartNotFound`) is treated as an empty feed instead of a failed request.

## Limits and offline behavior

- Login and registration each have a separate limit of 8 unsuccessful requests per IP in 15 minutes.
- Rate limits use the default in-memory store: counters reset on process restart and are not shared across multiple backend replicas. Use a shared rate-limit store if deployment runs more than one instance.
- Favorites are paginated in groups of 60 and the profile reports the account-wide favorite count. Watch history currently returns only the 50 newest entries, so its profile count is limited to those returned rows.
- Offline favorites/history snapshots keep at most 60 entries and 2 MiB per list. The offline profile stores only the user's ID, name, and join date—not their email.
- The service worker explicitly precaches `/` with revision `streamly-shell-v1` and `/offline` with revision `streamly-offline-v1`. Runtime caches exclude `/api`, YouTube thumbnails, and video media.
- `app.set("trust proxy", 1)` assumes exactly one trusted proxy hop in front of Express; adjust it to match the deployed proxy chain or `req.ip` may not identify the client correctly. IP addresses are not written to application logs by default.

For cache, quota, cookie, and offline operations, see [docs/OPERATIONS.md](./docs/OPERATIONS.md).

## Manual smoke checks

With valid credentials and both services running:

1. Open the home page, click **All**, then each category tab. Inspect `GET /api/youtube/popular` requests. Each selection should return videos or an empty `items` list; a category with no YouTube chart should not produce a server error.
2. Register, log out, and log in. Failed attempts on one form should not consume the other form's rate-limit bucket.
3. Save more than 60 favorites and page through them; confirm the profile count matches the total. The watch-history list/count remains limited to the 50 newest entries.
4. In browser DevTools, verify the active service worker's precache includes `/` with revision `streamly-shell-v1`; then test the offline page and saved-list snapshots with Network set to Offline.
5. For a deployment IP diagnostic, inspect the platform's request logs or temporarily add a privacy-approved diagnostic for `req.ip`. This repository does not log client IPs by default.
