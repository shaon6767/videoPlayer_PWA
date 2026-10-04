/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "streamly-app-shell",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 86400 })],
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !url.pathname.startsWith("/api/") &&
        (request.headers.get("RSC") === "1" ||
          request.headers.get("Next-Router-Prefetch") === "1"),
      handler: new NetworkFirst({
        cacheName: "streamly-rsc-shell",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })],
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        url.pathname.startsWith("/_next/static/") &&
        ["script", "style", "font", "image"].includes(request.destination),
      handler: new CacheFirst({
        cacheName: "streamly-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

serwist.addEventListeners();
