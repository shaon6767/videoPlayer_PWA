import { createSerwistRoute } from "@serwist/turbopack";

export const {
  dynamic,
  dynamicParams,
  revalidate,
  generateStaticParams,
  GET,
} = createSerwistRoute({
  additionalPrecacheEntries: [
    { url: "/", revision: "streamly-shell-v1" },
    { url: "/offline", revision: "streamly-offline-v1" },
  ],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});
